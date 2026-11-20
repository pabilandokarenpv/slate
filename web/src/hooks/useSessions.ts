import { useCallback, useEffect, useRef, useState } from "react";
import type { Bot, ChatMessage, Session } from "../lib/types";
import { storage, newId } from "../lib/storage";
import { streamChat } from "../lib/api";

export function useSessions(bots: Bot[]) {
  const [sessions, setSessions] = useState<Session[]>(() => storage.loadSessions());
  const [activeId, setActiveId] = useState<string | null>(() => sessions[0]?.id ?? null);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    storage.saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (sessions.length === 0) {
      const s: Session = { id: newId("s"), title: "New chat", history: [] };
      setSessions([s]);
      setActiveId(s.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = sessions.find((s) => s.id === activeId) ?? null;

  const newSession = useCallback((opts: { botId?: string; projectId?: string } = {}) => {
    const s: Session = {
      id: newId("s"),
      title: "New chat",
      history: [],
      botId: opts.botId ?? null,
      projectId: opts.projectId ?? null,
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    return s.id;
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (activeId === id) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId]
  );

  const updateSession = useCallback((id: string, fn: (s: Session) => Session) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  // Runs one full assistant turn: appends the streamed response as it
  // arrives (onDelta fires on every token, letting the caller re-render
  // live), honors AbortController-based stop, and persists at the end.
  const runTurn = useCallback(
    async (sessionId: string, historyForModel: ChatMessage[], system: string | undefined, onDelta: (text: string) => void) => {
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const full = await streamChat(historyForModel, system, onDelta, controller.signal);
        updateSession(sessionId, (s) => ({ ...s, history: [...s.history, { role: "assistant", content: full }] }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          updateSession(sessionId, (s) => ({
            ...s,
            history: [...s.history, { role: "assistant", content: "Error: " + (err as Error).message }],
          }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [updateSession]
  );

  const sendMessage = useCallback(
    (text: string, onDelta: (text: string) => void) => {
      if (!active) return;
      const bot = active.botId ? bots.find((b) => b.id === active.botId) : null;
      const userMsg: ChatMessage = { role: "user", content: text };
      const newHistory = [...active.history, userMsg];
      updateSession(active.id, (s) => ({
        ...s,
        history: newHistory,
        title: s.history.length === 0 ? text.slice(0, 40) + (text.length > 40 ? "…" : "") : s.title,
      }));
      void runTurn(active.id, newHistory, bot?.instructions, onDelta);
    },
    [active, bots, runTurn, updateSession]
  );

  // Regenerate: drop the last assistant turn (if any) and re-run from the
  // same user message, instead of just re-sending blindly.
  const regenerate = useCallback(
    (onDelta: (text: string) => void) => {
      if (!active) return;
      const bot = active.botId ? bots.find((b) => b.id === active.botId) : null;
      const h = active.history;
      const trimmed = h[h.length - 1]?.role === "assistant" ? h.slice(0, -1) : h;
      updateSession(active.id, (s) => ({ ...s, history: trimmed }));
      void runTurn(active.id, trimmed, bot?.instructions, onDelta);
    },
    [active, bots, runTurn, updateSession]
  );

  // Edit-and-resend: truncate history to just before the edited user
  // message, replace it, and re-run -- matches Claude's "edit message"
  // behavior (everything after the edit point is discarded for real).
  const editAndResend = useCallback(
    (messageIndex: number, newText: string, onDelta: (text: string) => void) => {
      if (!active) return;
      const bot = active.botId ? bots.find((b) => b.id === active.botId) : null;
      const truncated = active.history.slice(0, messageIndex);
      const newHistory = [...truncated, { role: "user" as const, content: newText }];
      updateSession(active.id, (s) => ({ ...s, history: newHistory }));
      void runTurn(active.id, newHistory, bot?.instructions, onDelta);
    },
    [active, bots, runTurn, updateSession]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    sessions,
    active,
    activeId,
    setActiveId,
    streaming,
    newSession,
    deleteSession,
    sendMessage,
    regenerate,
    editAndResend,
    stopGeneration,
  };
}

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Menu } from "lucide-react";
import type { ChatMessage, Session } from "../lib/types";
import { Message, TypingDots } from "./Message";

interface Props {
  session: Session | null;
  streaming: boolean;
  streamingText: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onOpenArtifact: (code: string, lang: string) => void;
  onRegenerate: () => void;
  onEditResend: (index: number, text: string) => void;
}

export function ChatPane({
  session,
  streaming,
  streamingText,
  sidebarOpen,
  onToggleSidebar,
  onSend,
  onStop,
  onOpenArtifact,
  onRegenerate,
  onEditResend,
}: Props) {
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const history: ChatMessage[] = session?.history ?? [];
  const showLiveAssistant = streaming && (history.length === 0 || history[history.length - 1].role === "user");

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, streamingText]);

  const submit = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(text);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-[5] flex shrink-0 items-center gap-3 bg-[var(--bg)] px-[22px] py-4 pt-[calc(16px+env(safe-area-inset-top))]">
        <button
          onClick={onToggleSidebar}
          className="shrink-0 rounded-[10px] p-[7px] text-[var(--text)] hover:bg-[var(--bg-glass-strong)]"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} strokeWidth={1.6} className={sidebarOpen ? "opacity-100" : "opacity-60"} />
        </button>
        <h1 className="m-0 truncate text-base font-semibold tracking-[-0.01em]">{session?.title ?? "New chat"}</h1>
      </div>

      <div ref={messagesRef} className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] pb-5 pt-2.5">
        {history.map((m, i) => (
          <Message
            key={i}
            message={m}
            index={i}
            isLast={i === history.length - 1}
            streaming={streaming}
            onOpenArtifact={onOpenArtifact}
            onRegenerate={onRegenerate}
            onEditResend={onEditResend}
          />
        ))}
        {showLiveAssistant &&
          (streamingText ? (
            <Message
              message={{ role: "assistant", content: streamingText }}
              index={history.length}
              isLast
              streaming
              onOpenArtifact={onOpenArtifact}
              onRegenerate={onRegenerate}
              onEditResend={onEditResend}
            />
          ) : (
            <TypingDots />
          ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex shrink-0 items-end gap-2.5 bg-[var(--bg)] px-[22px] py-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
          }}
          onKeyDown={(e) => {
            const isTouch = matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !isTouch) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message Whitekernel..."
          rows={1}
          className="max-h-40 flex-1 resize-none rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] px-[18px] py-3 text-base text-[var(--text)] transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] focus:outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] transition-opacity hover:opacity-85 active:scale-[0.94]"
            aria-label="Stop generating"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] transition-opacity hover:opacity-85 active:scale-[0.94] disabled:opacity-30"
            aria-label="Send"
          >
            <ArrowUp size={18} strokeWidth={1.6} />
          </button>
        )}
      </form>
    </div>
  );
}

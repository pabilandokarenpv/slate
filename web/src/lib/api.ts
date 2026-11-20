import type { ChatMessage, CronJob } from "./types";

// Streams a chat response token-by-token, same SSE protocol the Worker's
// /api/chat has always used (data: {"response": "..."}\n\n ... data: [DONE]).
// `signal` lets the caller abort mid-stream for a real stop-generation
// button, not just a UI no-op -- the underlying fetch is actually cancelled.
export async function streamChat(
  history: ChatMessage[],
  system: string | undefined,
  onToken: (fullTextSoFar: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: history, system }),
    signal,
  });
  if (!res.body) throw new Error("no response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let first = true;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as { response?: string };
        const token = parsed.response ?? "";
        full = first ? token : full + token;
        first = false;
        onToken(full);
      } catch {
        // partial/non-JSON line, ignore
      }
    }
  }
  return full;
}

export const cronApi = {
  list: async (): Promise<CronJob[]> => {
    const res = await fetch("/api/cron");
    const data = (await res.json()) as { jobs: CronJob[] };
    return data.jobs ?? [];
  },
  create: async (prompt: string, scheduleMinutes: number): Promise<void> => {
    await fetch("/api/cron", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, scheduleMinutes }),
    });
  },
  remove: async (id: string): Promise<void> => {
    await fetch(`/api/cron?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

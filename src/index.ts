export interface Env {
  ASSETS: Fetcher;
}

// Kernel AI's own model, served from a Cloudflare Tunnel to a persistent
// process running the real trained checkpoint (see kernel-llm's
// ARD-006-cloudflare-tunnel-serving.md) — never a hosted/third-party model.
// Cloudflare Workers Free's 10ms CPU-time-per-request wall made serving
// the real model directly from a Worker impossible (ARD-003), so the
// actual forward pass runs on real persistent infra behind this tunnel;
// this Worker is just the chat UI + a thin proxy to it.
const KERNEL_AI_BACKEND = "https://kernel-ai.forgirlswhobuild.com/api/generate";

async function handleChat(request: Request): Promise<Response> {
  const body = await request.json<{ messages: { role: string; content: string }[] }>();
  const encoder = new TextEncoder();

  let fullText: string;
  try {
    const res = await fetch(KERNEL_AI_BACKEND, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: body.messages, max_new_tokens: 60, temperature: 0.8 }),
    });
    if (!res.ok) {
      throw new Error(`backend returned ${res.status}`);
    }
    const data = await res.json<{ text: string }>();
    fullText = data.text;
  } catch (err) {
    fullText =
      `Couldn't reach Kernel AI's own model backend (${(err as Error).message}). ` +
      `This is a real connectivity error, not a placeholder — the backend ` +
      `(a Cloudflare Tunnel to our own trained checkpoint) may be down.`;
  }

  // Stream the (already fully-generated) real response word-by-word for
  // the same typewriter UX the frontend expects — the computation already
  // happened server-side, this just paces the DISPLAY, it isn't fake.
  const words = fullText.split(/(\s+)/);
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        const chunk = { response: w };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        await new Promise((r) => setTimeout(r, 15));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request);
    }
    return env.ASSETS.fetch(request);
  },
};

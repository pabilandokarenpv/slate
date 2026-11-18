export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}

const SYSTEM_PROMPT = `You are Kernel AI, a helpful AI coding assistant. When you write
a runnable HTML, CSS, JS, or React snippet that the user could preview live,
wrap it in a fenced code block tagged \`artifact-html\`, \`artifact-jsx\`, or
similar — the UI renders those in a live sandboxed preview panel. Normal code
examples in other languages (python, rust, etc.) just use a normal fenced
code block with the language name, no live preview needed for those. Keep
responses concise and direct.

Note on identity: this chat currently runs on a hosted model as a bridge
while Kernel AI's own from-scratch model (trained on Kaggle, served via a
pure-numpy Cloudflare Python Worker) is still being trained up to usable
quality. If asked what model you are, be honest about this rather than
claiming to be the from-scratch model.`;

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ messages: { role: string; content: string }[] }>();
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...body.messages];

  try {
    const stream = (await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
      messages,
      stream: true,
    })) as unknown as ReadableStream;

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    });
  } catch (err) {
    // Local dev / no AI binding available yet — fall back to a canned
    // streamed mock response so the frontend (streaming parser, artifact
    // rendering) can be built and tested before Cloudflare is connected.
    return mockStreamResponse(messages[messages.length - 1]?.content ?? "");
  }
}

function mockStreamResponse(userMessage: string): Response {
  const encoder = new TextEncoder();
  const reply =
    `(mock response — real Workers AI not reachable in this environment yet)\n\n` +
    `You said: "${userMessage}"\n\n` +
    "Here's a live artifact demo:\n\n```artifact-html\n" +
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;text-align:center">` +
    `<h1>Hello from Kernel AI 👋</h1><p>This HTML is rendered live in the sandboxed artifact panel.</p>` +
    `<button onclick="this.textContent='clicked!'">click me</button></body></html>\n` +
    "```\n";

  const words = reply.split(/(\s+)/);
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
      return handleChat(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

export interface Env {
  ASSETS: Fetcher;
}

// No hosted/third-party model here, on purpose. This project's whole point
// is a model trained from scratch by us — using an existing model (even as
// a "bridge") undercuts that, so until our own checkpoint is real, chat
// stays an honest placeholder instead of borrowing someone else's brain.

function placeholderResponse(userMessage: string): Response {
  const encoder = new TextEncoder();
  const reply =
    `Kernel AI's own model isn't trained to a usable point yet — still on Kaggle.\n\n` +
    `This isn't a bug and it isn't a stand-in model either: the whole point of ` +
    `this project is a model trained from scratch by us, so chat stays an ` +
    `honest placeholder rather than quietly borrowing an existing model's answers.\n\n` +
    `You said: "${userMessage}"\n`;

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

async function handleChat(request: Request): Promise<Response> {
  const body = await request.json<{ messages: { role: string; content: string }[] }>();
  const lastUser = body.messages[body.messages.length - 1]?.content ?? "";
  return placeholderResponse(lastUser);
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

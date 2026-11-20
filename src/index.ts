export interface Env {
  ASSETS: Fetcher;
  CRON_KV: KVNamespace;
}

// Kernel AI's own model, served from a Cloudflare Tunnel to a persistent
// process running the real trained checkpoint (see kernel-llm's
// ARD-006-cloudflare-tunnel-serving.md) — never a hosted/third-party model.
// Cloudflare Workers Free's 10ms CPU-time-per-request wall made serving
// the real model directly from a Worker impossible (ARD-003), so the
// actual forward pass runs on real persistent infra behind this tunnel;
// this Worker is just the chat UI + a thin proxy to it.
const KERNEL_AI_BACKEND = "https://kernel-ai.forgirlswhobuild.com/api/generate";

async function callModel(messages: { role: string; content: string }[], system?: string): Promise<string> {
  try {
    const res = await fetch(KERNEL_AI_BACKEND, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, system, max_new_tokens: 60, temperature: 0.8 }),
    });
    if (!res.ok) throw new Error(`backend returned ${res.status}`);
    const data = await res.json<{ text: string }>();
    return data.text;
  } catch (err) {
    return (
      `Couldn't reach Whitekernel's own model backend (${(err as Error).message}). ` +
      `This is a real connectivity error, not a placeholder — the backend ` +
      `(a Cloudflare Tunnel to our own trained checkpoint) may be down.`
    );
  }
}

async function handleChat(request: Request): Promise<Response> {
  const body = await request.json<{ messages: { role: string; content: string }[]; system?: string }>();
  const encoder = new TextEncoder();

  const fullText = await callModel(body.messages, body.system);

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

// ---- Cron Jobs: real server-side scheduled prompts ----
// A job = { id, prompt, system?, scheduleMinutes, createdAt, lastRunAt?, lastResult? }
// scheduleMinutes is "run every N minutes" — the simplest schedule that's
// both genuinely useful and trivial to evaluate against lastRunAt without
// needing a full cron-expression parser. The actual trigger granularity is
// the Worker's own Cron Trigger (every 5 min, see wrangler-equiv config),
// so anything scheduled for less than 5 minutes will still only run every
// 5 minutes — that's a real platform floor, not a bug.
interface CronJob {
  id: string;
  prompt: string;
  system?: string;
  scheduleMinutes: number;
  createdAt: number;
  lastRunAt?: number;
  lastResult?: string;
}

const CRON_INDEX_KEY = "_index";

async function getCronIndex(env: Env): Promise<string[]> {
  const raw = await env.CRON_KV.get(CRON_INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function handleCronApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

  if (request.method === "GET") {
    const ids = await getCronIndex(env);
    const jobs = (
      await Promise.all(ids.map(async (id) => {
        const raw = await env.CRON_KV.get(`job:${id}`);
        return raw ? (JSON.parse(raw) as CronJob) : null;
      }))
    ).filter(Boolean);
    return json({ jobs });
  }

  if (request.method === "POST") {
    const body = await request.json<{ prompt: string; system?: string; scheduleMinutes: number }>();
    if (!body.prompt || !body.scheduleMinutes) return json({ error: "prompt and scheduleMinutes required" }, 400);
    const job: CronJob = {
      id: "cron" + Date.now(),
      prompt: body.prompt,
      system: body.system,
      scheduleMinutes: Math.max(5, Math.floor(body.scheduleMinutes)),
      createdAt: Date.now(),
    };
    const ids = await getCronIndex(env);
    ids.unshift(job.id);
    await env.CRON_KV.put(CRON_INDEX_KEY, JSON.stringify(ids));
    await env.CRON_KV.put(`job:${job.id}`, JSON.stringify(job));
    return json({ job });
  }

  if (request.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id required" }, 400);
    const ids = (await getCronIndex(env)).filter((x) => x !== id);
    await env.CRON_KV.put(CRON_INDEX_KEY, JSON.stringify(ids));
    await env.CRON_KV.delete(`job:${id}`);
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}

// Runs on the Worker's Cron Trigger (every 5 minutes). Checks every stored
// job against its own schedule and calls the real model for any job due to
// run, storing the result back in KV so the Cron Jobs tab can show it next
// time the user opens the app — genuine server-side execution, not a
// client-side timer that stops the moment the tab closes.
async function runDueCronJobs(env: Env): Promise<void> {
  const ids = await getCronIndex(env);
  const now = Date.now();
  for (const id of ids) {
    const raw = await env.CRON_KV.get(`job:${id}`);
    if (!raw) continue;
    const job: CronJob = JSON.parse(raw);
    const dueAt = (job.lastRunAt ?? job.createdAt) + job.scheduleMinutes * 60_000;
    if (now < dueAt) continue;
    const result = await callModel([{ role: "user", content: job.prompt }], job.system);
    job.lastRunAt = now;
    job.lastResult = result;
    await env.CRON_KV.put(`job:${id}`, JSON.stringify(job));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request);
    }
    if (url.pathname === "/api/cron") {
      return handleCronApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDueCronJobs(env));
  },
};

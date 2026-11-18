# Slate

Chat + live artifacts, like Claude/ChatGPT's artifact feature. Real chat app,
not a research toy, powered by Cloudflare Workers AI (free tier, serverless,
zero idle cost).

**Live: https://slate.pabilando-karenpv.workers.dev**

## Status: deployed and verified live

- Chat UI with streaming responses (SSE) — verified real request/response
- Code block rendering + an artifact detection system: fenced blocks tagged
  `artifact-html`/`artifact-jsx` render as a clickable chip that opens a
  **sandboxed iframe** live preview (like Claude's artifacts) — verified:
  real HTML rendered live in an isolated sandbox (`sandbox="allow-scripts"`,
  deliberately no `allow-same-origin`, so the parent page cannot reach into
  artifact content — confirmed this blocks parent DOM access as intended,
  tested and caught a real cross-origin error when trying to reach in)
- Backend: Cloudflare Worker, `/api/chat` streams from Workers AI
  (`@cf/meta/llama-3.2-3b-instruct`, free tier, no Workers Paid plan required)
- Deployed directly via the Cloudflare REST API (not local `wrangler`, this
  environment doesn't have a browser OAuth session) — real `PUT` to
  `/accounts/{id}/workers/scripts/slate`, bindings configured, workers.dev
  subdomain enabled, confirmed live with real HTTP requests

## Known limitation, stated honestly

`llama-3.2-3b-instruct` is the free-tier model that doesn't require Workers
Paid. It's weak — it got "what is 7 times 8" wrong and sometimes returns
garbled output. That's a genuine quality ceiling of this specific free model,
not a bug in the app. Decided to keep it free for now rather than pay for
Workers Paid ($5/mo unlocks gpt-oss-120b, Kimi K2, GLM-5.3) or switch to a
different provider (Gemini's free tier is notably stronger). Revisit if the
answer quality becomes a real blocker.

## Stack

Cloudflare Workers (backend) + Workers AI (model, free tier) — fully
serverless, scale-to-zero, zero idle cost. Vanilla JS frontend, no framework,
bundled directly into the Worker script (HTML/CSS/JS served from embedded
string constants) to keep the deploy path simple without the Workers Assets
multipart upload flow.

## Run locally

```
npm install
npx wrangler dev
```

## Deploy (once you have `wrangler login`'d locally)

```
npx wrangler deploy
```

`worker-bundled.js` is the actual deployed artifact (built by hand-bundling
`public/*` into `src/index.ts`'s logic) — regenerate it if you change the
frontend and want to redeploy via the same API-direct path.

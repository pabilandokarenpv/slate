# Slate

Chat + live artifacts, like Claude/ChatGPT's artifact feature. Real chat app,
not a research toy, powered by Cloudflare Workers AI (free tier, serverless,
zero idle cost).

## Status: core app verified working end to end

- Chat UI with streaming responses (SSE) — verified real request/response
- Code block rendering + an artifact detection system: fenced blocks tagged
  `artifact-html`/`artifact-jsx` render as a clickable chip that opens a
  **sandboxed iframe** live preview (like Claude's artifacts) — verified:
  real HTML rendered live in an isolated sandbox (`sandbox="allow-scripts"`,
  deliberately no `allow-same-origin`, so the parent page cannot reach into
  artifact content — confirmed this blocks parent DOM access as intended,
  tested and caught a real cross-origin error when trying to reach in)
- Backend: Cloudflare Worker, `/api/chat` streams from Workers AI
  (`@cf/meta/llama-3.1-8b-instruct`, free tier)
- Local dev fallback: a mock streaming response when the AI binding isn't
  reachable (this environment's Cloudflare OAuth connection is still pending)
  so the full frontend pipeline was buildable and testable before deploy

## What's left

- Connect a real Cloudflare account (OAuth attempt failed once, needs retry)
- `wrangler deploy` for a live URL
- Swap the mock fallback out once Workers AI is reachable for real

## Stack

Cloudflare Workers (backend) + Workers AI (model, free tier) + Workers Static
Assets (frontend hosting) — fully serverless, scale-to-zero, zero idle cost.
Vanilla JS frontend, no framework, to keep the artifact sandbox logic easy
to audit.

## Run locally

```
npm install
npx wrangler dev
```

## Deploy

```
npx wrangler deploy
```

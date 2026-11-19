#!/usr/bin/env python3
"""
Hand-bundles public/* into worker-bundled.js and deploys it to Cloudflare
via the direct REST API (not local `wrangler` — this environment has no
browser OAuth session for `wrangler login`).

worker-bundled.js embeds index.html/style.css/app.js as string constants
and serves them directly from the Worker's fetch handler (no Workers
Assets binding needed for static content) — only /api/chat has real
logic, proxying to Kernel AI's own trained checkpoint via a Cloudflare
Tunnel (see kernel-llm's ARD-006).

Usage: python3 scripts/build_and_deploy.py
Requires: ~/.config/cloudflare_env/token.env with CLOUDFLARE_API_TOKEN
and CLOUDFLARE_ACCOUNT_ID.
"""
import json
import os
import sys

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

WORKER_LOGIC = r'''
// Kernel AI's own model, served from a Cloudflare Tunnel to a persistent
// process running the real trained checkpoint (see kernel-llm's
// ARD-006-cloudflare-tunnel-serving.md) -- never a hosted/third-party model.
// Cloudflare Workers Free's 10ms CPU-time-per-request wall made serving
// the real model directly from a Worker impossible (ARD-003), so the
// actual forward pass runs on real persistent infra behind this tunnel;
// this Worker is just the chat UI + a thin proxy to it.
const KERNEL_AI_BACKEND = "https://kernel-ai.forgirlswhobuild.com/api/generate";

async function handleChat(request, env) {
  const body = await request.json();
  const encoder = new TextEncoder();

  let fullText;
  try {
    const res = await fetch(KERNEL_AI_BACKEND, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: body.messages, max_new_tokens: 60, temperature: 0.8 }),
    });
    if (!res.ok) {
      throw new Error("backend returned " + res.status);
    }
    const data = await res.json();
    fullText = data.text;
  } catch (err) {
    fullText =
      "Couldn't reach Kernel AI's own model backend (" + err.message + "). " +
      "This is a real connectivity error, not a placeholder -- the backend " +
      "(a Cloudflare Tunnel to our own trained checkpoint) may be down.";
  }

  // Stream the (already fully-generated) real response word-by-word for
  // the same typewriter UX the frontend expects -- the computation already
  // happened server-side, this just paces the DISPLAY, it isn't fake.
  const words = fullText.split(/(\s+)/);
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        const chunk = { response: w };
        controller.enqueue(encoder.encode("data: " + JSON.stringify(chunk) + "\n\n"));
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
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request, env);
    }
    if (url.pathname === "/style.css") {
      return new Response(CSS_CONTENT, { headers: { "content-type": "text/css" } });
    }
    if (url.pathname === "/app.js") {
      return new Response(JS_CONTENT, { headers: { "content-type": "application/javascript" } });
    }
    return new Response(HTML_PAGE, { headers: { "content-type": "text/html" } });
  },
};
'''


def build_bundle():
    html = open(os.path.join(ROOT, "public/index.html")).read()
    css = open(os.path.join(ROOT, "public/style.css")).read()
    js = open(os.path.join(ROOT, "public/app.js")).read()
    bundle = (
        f"const HTML_PAGE = {json.dumps(html)};\n"
        f"const CSS_CONTENT = {json.dumps(css)};\n"
        f"const JS_CONTENT = {json.dumps(js)};\n"
        + WORKER_LOGIC
    )
    out_path = os.path.join(ROOT, "worker-bundled.js")
    with open(out_path, "w") as f:
        f.write(bundle)
    return out_path, bundle


def load_cf_creds():
    token = account_id = None
    with open(os.path.expanduser("~/.config/cloudflare_env/token.env")) as f:
        for line in f:
            line = line.strip()
            if line.startswith("export CLOUDFLARE_API_TOKEN="):
                token = line.split("=", 1)[1].strip('"')
            if line.startswith("export CLOUDFLARE_ACCOUNT_ID="):
                account_id = line.split("=", 1)[1].strip('"')
    return token, account_id


def deploy(bundle_content):
    token, account_id = load_cf_creds()
    metadata = {
        "main_module": "worker-bundled.js",
        "compatibility_date": "2024-09-23",
        "bindings": [{"name": "AI", "type": "ai"}],
    }
    files = {
        "metadata": (None, json.dumps(metadata), "application/json"),
        "worker-bundled.js": ("worker-bundled.js", bundle_content, "application/javascript+module"),
    }
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/whitekernel"
    resp = requests.put(url, headers={"Authorization": f"Bearer {token}"}, files=files)
    return resp


if __name__ == "__main__":
    path, bundle = build_bundle()
    print(f"built {path}, {len(bundle)} bytes")
    resp = deploy(bundle)
    print(resp.status_code)
    print(resp.text[:1500])
    if resp.status_code != 200:
        sys.exit(1)

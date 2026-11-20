#!/usr/bin/env python3
"""
Deploys Whitekernel via `wrangler deploy` (bundles src/index.ts + public/*
assets per wrangler.toml, including the CRON_KV binding and the Cron
Trigger). Uses CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID env vars for
non-interactive auth (no browser OAuth session available in this
environment for `wrangler login`).

Usage: python3 scripts/build_and_deploy.py
Requires: ~/.config/cloudflare_env/token.env with CLOUDFLARE_API_TOKEN
and CLOUDFLARE_ACCOUNT_ID.
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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


if __name__ == "__main__":
    token, account_id = load_cf_creds()
    env = dict(os.environ, CLOUDFLARE_API_TOKEN=token, CLOUDFLARE_ACCOUNT_ID=account_id)
    wrangler = os.path.join(ROOT, "node_modules/.bin/wrangler")
    result = subprocess.run([wrangler, "deploy"], cwd=ROOT, env=env)
    sys.exit(result.returncode)

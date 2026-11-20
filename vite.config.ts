import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite project root is web/ (keeps the React source tree separate from
// src/index.ts, which is the Cloudflare Worker backend, not frontend code).
// Build output goes straight into public/, which is exactly what
// wrangler.toml's [assets] directory already points at -- no wrangler.toml
// change needed, `vite build` then `wrangler deploy` is the whole pipeline.
export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});

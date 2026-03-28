import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Set VITE_DEV_HTTP=1 for plain HTTP on :5173 — pairs with `npm run tunnel:http` (avoids cloudflared ↔ Vite TLS issues).
// The public URL is still HTTPS (trycloudflare.com); camera/mic stay in a secure context.
const useHttps = process.env.VITE_DEV_HTTP !== "1";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    // Cloudflare quick tunnels (and similar) use a random *.trycloudflare.com Host header.
    allowedHosts: true,
    https: useHttps,
    // One public URL (e.g. cloudflared → :5173): browser calls /api/* here, Vite forwards to FastAPI.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});

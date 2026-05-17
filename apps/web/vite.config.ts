import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/health": "http://localhost:3001"
    }
  }
});

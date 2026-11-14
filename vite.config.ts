import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // the built game also works when opened from a sub-folder or a static host
  server: { port: 5173, open: false },
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
});

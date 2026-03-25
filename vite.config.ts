import { defineConfig } from "vite";

// Use './' so the built app works on GitHub Pages project URLs without hard-coding the repo name.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});

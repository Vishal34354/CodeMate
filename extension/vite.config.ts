import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { build as esbuild } from "esbuild";

/**
 * Custom Vite plugin to bundle Manifest V3 scripts:
 * - Content script: bundled as a self-contained IIFE without external imports (required by Chrome)
 * - Background worker: bundled as a standalone ESM service worker
 */
function chromeExtensionScripts(): Plugin {
  return {
    name: "chrome-extension-scripts",
    async writeBundle() {
      // 1. Content Script (IIFE format with inlined helpers)
      await esbuild({
        entryPoints: [resolve(__dirname, "src/content/content-script.ts")],
        outfile: resolve(__dirname, "dist/content.js"),
        bundle: true,
        target: "chrome100",
        format: "iife",
        platform: "browser",
        minify: false,
        sourcemap: false,
      });

      // 2. Background Service Worker (Standalone ESM format)
      await esbuild({
        entryPoints: [resolve(__dirname, "src/background/service-worker.ts")],
        outfile: resolve(__dirname, "dist/background.js"),
        bundle: true,
        target: "chrome100",
        format: "esm",
        platform: "browser",
        minify: false,
        sourcemap: false,
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), chromeExtensionScripts()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
      },
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: {
          "markdown-math": [
            "katex",
            "rehype-katex",
            "remark-math",
            "react-markdown",
            "remark-gfm",
          ],
          jszip: ["jszip"],
        },
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

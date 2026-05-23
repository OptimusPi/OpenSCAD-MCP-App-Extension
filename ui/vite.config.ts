import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The UI builds into one self-contained HTML file (JS + CSS inlined) so it can
// be served verbatim as an MCP App resource — the sandboxed iframe has no way
// to fetch sibling assets.
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "mcp-app.html"),
    },
  },
});

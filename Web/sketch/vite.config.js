import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const mermaidStub = fileURLToPath(new URL("./src/mermaid-stub.js", import.meta.url));
const outDir = fileURLToPath(
  new URL("../../Sources/MacAppControlDeck/Modules/Sketch/Resources/Sketch", import.meta.url)
);

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      // UI 草图不需要 Mermaid，去掉它可省约 3.6 MB。
      "@excalidraw/mermaid-to-excalidraw": mermaidStub
    }
  },
  build: {
    outDir,
    emptyOutDir: true,
    target: "safari15",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 2000
  }
});

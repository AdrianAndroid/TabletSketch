import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const target = join(
  root,
  "../../Sources/MacAppControlDeck/Modules/Sketch/Resources/Sketch/fonts"
);

// 小赖中文手写体有 209 个子集、约 12 MB，首版不打包；中文回退系统字体。
const SKIP = new Set(["Xiaolai"]);

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

let files = 0;
let bytes = 0;
for (const family of readdirSync(source)) {
  if (SKIP.has(family)) continue;
  const from = join(source, family);
  if (!statSync(from).isDirectory()) continue;
  const to = join(target, family);
  cpSync(from, to, { recursive: true });
  for (const file of readdirSync(to)) {
    files += 1;
    bytes += statSync(join(to, file)).size;
  }
}

console.log(`[sketch] fonts: ${files} files, ${(bytes / 1024).toFixed(1)} KB`);

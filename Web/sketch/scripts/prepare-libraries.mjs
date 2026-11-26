#!/usr/bin/env node
/**
 * 把 libraries/ 下的官方 .excalidrawlib 统一成 Excalidraw 0.18 的
 * libraryItems 结构，并生成 src/libraries.generated.json。
 *
 * 运行：node scripts/prepare-libraries.mjs
 * 素材来源：https://github.com/excalidraw/excalidraw-libraries（MIT）
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(join(root, "libraries/catalog.json"), "utf8"));

function stableID(prefix, index) {
  const digest = createHash("sha1").update(`${prefix}#${index}`).digest("hex");
  return `decklib${digest.slice(0, 20)}`;
}

const libraries = [];
let totalItems = 0;
let totalElements = 0;

for (const entry of catalog.libraries) {
  const raw = JSON.parse(await readFile(join(root, "libraries", entry.file), "utf8"));
  const sourceItems = raw.libraryItems || raw.library || [];
  const items = sourceItems
    .map((item, index) => {
      const elements = Array.isArray(item) ? item : item?.elements;
      if (!Array.isArray(elements) || elements.length === 0) return null;
      const base = Array.isArray(item) ? {} : item;
      const fallback = `${entry.label} · ${index + 1}`;
      const name = typeof base.name === "string" && base.name.trim() ? base.name.trim() : fallback;
      return {
        id: stableID(entry.id, index),
        status: "published",
        elements,
        created: Number(base.created) || 1710000000000,
        name: `[${entry.label}] ${name}`
      };
    })
    .filter(Boolean);

  libraries.push({
    ...entry,
    itemCount: items.length,
    elementCount: items.reduce((sum, item) => sum + item.elements.length, 0),
    items
  });
  totalItems += items.length;
  totalElements += libraries.at(-1).elementCount;
  console.log(`${entry.label.padEnd(18)} ${String(items.length).padStart(3)} 组 / ${libraries.at(-1).elementCount} 个元素`);
}

// 沿用上一次的 generatedAt：素材内容没变时输出字节完全一致，
// 避免每次 build 都产生一份 1.8 MB 的纯时间戳 diff。
const outputPath = join(root, "src/libraries.generated.json");
let previousGeneratedAt = null;
try {
  const previous = JSON.parse(await readFile(outputPath, "utf8"));
  previousGeneratedAt = previous.generatedAt ?? null;
} catch {
  previousGeneratedAt = null;
}

const output = {
  version: 1,
  source: catalog.source,
  license: catalog.license,
  generatedAt: previousGeneratedAt ?? new Date().toISOString(),
  totalItems,
  totalElements,
  libraries
};

const serialized = `${JSON.stringify(output)}\n`;
let unchanged = false;
try {
  unchanged = (await readFile(outputPath, "utf8")) === serialized;
} catch {
  unchanged = false;
}

if (unchanged) {
  console.log(`\nsrc/libraries.generated.json 未变化，跳过写入（${libraries.length} 个素材库 / ${totalItems} 组）`);
} else {
  await writeFile(outputPath, serialized, "utf8");
  console.log(`\n写入 src/libraries.generated.json：${libraries.length} 个素材库 / ${totalItems} 组 / ${totalElements} 个元素`);
}

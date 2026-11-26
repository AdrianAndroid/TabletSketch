/** 画板文件的读写。浏览器环境和 Electron 各走一条路，调用方不用关心。
 *
 *  Electron 下 `window.tsFiles` 由 preload 通过 contextBridge 注入，直接写
 *  `~/Pictures/TabletSketch/Sketches`；纯浏览器打开时退回到下载 / 选择文件。
 */

export function buildScene() {
  const api = window.tabletSketch;
  return {
    type: "excalidraw",
    version: 2,
    source: "tablet-sketch",
    elements: api?.getSceneElements?.() ?? [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {}
  };
}

function toast(message) {
  window.dispatchEvent(new CustomEvent("ts:toast", { detail: message }));
}

export async function saveScene(name) {
  const scene = buildScene();

  if (window.tsFiles?.save) {
    const result = await window.tsFiles.save({ name, scene });
    toast(result.ok ? `已保存 ${result.filePath}` : `保存失败：${result.message}`);
    return result;
  }

  const blob = new Blob([JSON.stringify(scene)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name || "画板"}.excalidraw`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("已导出 .excalidraw");
  return { ok: true };
}

export async function openScene() {
  if (window.tsFiles?.open) {
    const result = await window.tsFiles.open();
    if (result.ok) {
      window.tabletSketch?.loadScene?.(result.scene);
      toast(`已打开 ${result.filePath}`);
    } else if (!result.canceled) {
      toast(`打开失败：${result.message}`);
    }
    return result;
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".excalidraw,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve({ ok: false, canceled: true });
      try {
        const data = JSON.parse(await file.text());
        window.tabletSketch?.loadScene?.(data);
        toast("已打开画板");
        resolve({ ok: true });
      } catch {
        toast("这个文件不是有效的 .excalidraw");
        resolve({ ok: false, message: "invalid" });
      }
    };
    input.click();
  });
}

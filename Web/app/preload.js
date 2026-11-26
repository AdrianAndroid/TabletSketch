// preload：原生进程与页面之间的唯一通道。
//
// 关键约束：contextIsolation 打开后，preload 与页面处在不同的 JS 世界，
// preload 里 `window.tabletSketch` 永远是 undefined。两个世界只共享 DOM，
// 所以所有通信都走 document 上的 CustomEvent：
//   preload → 页面   ts:pen / ts:selftest / ts:chrome / ts:log(回流)
//   页面 → preload   ts:ready / ts:log
// 真正合成 PointerEvent 的逻辑在页面的 tablet-sketch.js 里，因为要在主世界
// 才能拿到 Excalidraw 的 API 对象。

const { ipcRenderer } = require("electron");

function emit(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}

// 页面侧桥装好之后，再把 chrome 切到手写板模式
document.addEventListener("ts:ready", () => {
  emit("ts:chrome", true);
  emit("ts:log", "[shell] tabletSketch 桥已就绪");
});

// 把页面日志转到主进程终端，方便不开 DevTools 时排错
document.addEventListener("ts:log", (event) => {
  ipcRenderer.send("ts:log", event.detail);
});

ipcRenderer.on("pen:samples", (_event, samples) => {
  emit("ts:pen", samples);
});

ipcRenderer.on("pen:selftest", () => {
  emit("ts:selftest");
});

ipcRenderer.on("menu:settings", () => {
  emit("ts:open-settings");
});

// 兜底：页面已经装好但 ts:ready 错过了（例如 preload 加载顺序异常）
window.addEventListener("load", () => {
  setTimeout(() => {
    if (!window.__tsChromeApplied) {
      emit("ts:chrome", true);
      window.__tsChromeApplied = true;
    }
  }, 1200);
});

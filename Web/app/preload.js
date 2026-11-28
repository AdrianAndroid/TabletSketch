// preload：原生进程与页面之间的唯一通道。
//
// 关键约束：contextIsolation 打开后，preload 与页面处在不同的 JS 世界，
// preload 里 `window.tabletSketch` 永远是 undefined。两个世界只共享 DOM，
// 所以所有通信都走 document 上的 CustomEvent：
//   preload → 页面   ts:pen / ts:selftest / ts:chrome / ts:log(回流)
//   页面 → preload   ts:ready / ts:log
// 真正合成 PointerEvent 的逻辑在页面的 tablet-sketch.js 里，因为要在主世界
// 才能拿到 Excalidraw 的 API 对象。

const { ipcRenderer, contextBridge } = require("electron");

// 文件存取走 contextBridge，主世界直接 await
contextBridge.exposeInMainWorld("tsFiles", {
  save: (payload) => ipcRenderer.invoke("ts:save-scene", payload),
  open: () => ipcRenderer.invoke("ts:open-scene"),
  reveal: () => ipcRenderer.invoke("ts:reveal-sketches")
});

// 无动画模式：截图 / 自动验收时用
contextBridge.exposeInMainWorld("tsEnv", {
  noAnim: !!process.env.TS_NO_ANIM
});

// 系统级操作：目前只有「打开输入监控设置页」（顶栏权限提示可点）
contextBridge.exposeInMainWorld("tsSystem", {
  openInputMonitoring: () => ipcRenderer.send("ts:open-input-monitoring")
});

function emit(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}

// HID 状态可能比页面还早到，缓存最后一帧，等页面就绪再补发
let lastStatus = null;
let lastGrab = null;

// 页面侧桥装好之后，再把 chrome 切到手写板模式
document.addEventListener("ts:ready", () => {
  emit("ts:chrome", true);
  if (lastStatus) emit("ts:hid-status", lastStatus);
  if (lastGrab !== null) emit("ts:hid", { t: "grab", ok: lastGrab });
  emit("ts:log", "[shell] tabletSketch 桥已就绪");
});

// 把页面日志转到主进程终端，方便不开 DevTools 时排错
document.addEventListener("ts:log", (event) => {
  ipcRenderer.send("ts:log", event.detail);
});

let lastPenLog = 0;
ipcRenderer.on("pen:event", (_event, payload) => {
  if (payload?.t === "grab") lastGrab = !!payload.ok;
  if (payload?.t === "pen" && Date.now() - lastPenLog > 1000) {
    lastPenLog = Date.now();
    emit("ts:log", `[preload] 收到笔事件 ${payload.ph}`);
  }
  emit("ts:hid", payload);
});

ipcRenderer.on("pen:status", (_event, status) => {
  lastStatus = status;
  emit("ts:hid-status", status);
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

ipcRenderer.on("menu:save", () => {
  emit("ts:menu-save");
});

ipcRenderer.on("menu:open", () => {
  emit("ts:menu-open");
});

ipcRenderer.on("menu:style-ring", () => {
  emit("ts:open-style-ring");
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

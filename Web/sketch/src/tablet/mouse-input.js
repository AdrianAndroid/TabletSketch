const STAGE_SELECTOR = ".ts-stage";

/** 只有这些工具才把鼠标转成虚拟笔；选择 / 平移 / 文字 / 图片放行原生鼠标。 */
const DRAW_TOOLS = new Set([
  "freedraw",
  "eraser",
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line"
]);

let installed = false;
let drawing = false;
let lastPoint = null;
let lastClient = null;
let cachedTool = "selection";

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function stageRect() {
  const stage = document.querySelector(STAGE_SELECTOR);
  return stage ? stage.getBoundingClientRect() : null;
}

function normalized(clientX, clientY, rect) {
  return {
    x: clamp01((clientX - rect.left) / Math.max(1, rect.width)),
    y: clamp01((clientY - rect.top) / Math.max(1, rect.height))
  };
}

function insideUi(target) {
  return !!target?.closest?.("[data-ts-ui]");
}

function insideStage(target) {
  return !!target?.closest?.(STAGE_SELECTOR);
}

function isTextInput(target) {
  return !!target?.closest?.("input, textarea, [contenteditable='true']");
}

/** 当前工具是否需要虚拟笔。选择工具必须让原生鼠标生效，否则无法选中 / 框选。 */
function needsVirtualPen() {
  const tool = window.tabletSketch?.getTool?.() || cachedTool;
  cachedTool = tool;
  return DRAW_TOOLS.has(tool);
}

function emitMousePos(x, y, down) {
  lastClient = { x, y };
  window.dispatchEvent(
    new CustomEvent("tablet:mousepos", {
      detail: { x, y, down: !!down }
    })
  );
}

function hideMousePos() {
  window.dispatchEvent(new CustomEvent("tablet:mousepos", { detail: null }));
}

export function installMouseInput({ feedPen, isStrokeActive }) {
  if (installed) return;
  installed = true;

  const openKey1 = () => {
    if (isStrokeActive()) return;
    window.dispatchEvent(
      new CustomEvent("tablet:keys", {
        detail: { kind: "side", keys: [0], source: "mouse" }
      })
    );
  };

  const onMove = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    emitMousePos(event.clientX, event.clientY, drawing);
    if (!drawing) {
      const rect = stageRect();
      if (rect && insideStage(event.target)) {
        const point = normalized(event.clientX, event.clientY, rect);
        feedPen({ t: "pen", ph: "hover", x: point.x, y: point.y, p: 0.5 });
      }
      return;
    }
    const rect = stageRect();
    if (!rect) return;
    const point = normalized(event.clientX, event.clientY, rect);
    lastPoint = point;
    event.preventDefault();
    event.stopPropagation();
    feedPen({ t: "pen", ph: "changed", x: point.x, y: point.y, p: 0.5 });
  };

  const onDown = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    // 右键：Excalidraw 会在 pointerdown 上打开自己的菜单，这里先拦住；
    // 样式环改由随后的 contextmenu 打开，避免两个菜单叠在一起。
    if (event.button === 2) {
      if (event.isTrusted && insideStage(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (event.button !== 0) return;
    if (insideUi(event.target) || !insideStage(event.target)) return;
    if (!needsVirtualPen()) return;
    if (isStrokeActive()) return;
    const rect = stageRect();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    const point = normalized(event.clientX, event.clientY, rect);
    lastPoint = point;
    drawing = true;
    emitMousePos(event.clientX, event.clientY, true);
    feedPen({ t: "pen", ph: "began", x: point.x, y: point.y, p: 0.5 });
  };

  const finish = (event) => {
    if (!drawing) return;
    const rect = stageRect();
    const point = rect ? normalized(event.clientX, event.clientY, rect) : lastPoint;
    drawing = false;
    event.preventDefault();
    event.stopPropagation();
    if (point) {
      lastPoint = point;
      feedPen({ t: "pen", ph: "ended", x: point.x, y: point.y, p: 0 });
    }
    emitMousePos(event.clientX, event.clientY, false);
  };

  const onUp = (event) => {
    if (event.button !== 0 && event.type !== "pointercancel") return;
    finish(event);
  };

  const onContextMenu = (event) => {
    // 合成的原生菜单入口（浮岛「更多 → 图层与链接」）必须放行
    if (!event.isTrusted) return;
    if (isTextInput(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    emitMousePos(event.clientX, event.clientY, drawing);
    if (drawing) return;
    openKey1();
  };

  const onKeyDown = (event) => {
    if (event.key !== "\\") return;
    if (isTextInput(event.target)) return;
    if (drawing) return;
    event.preventDefault();
    openKey1();
  };

  const onLeave = () => {
    hideMousePos();
    if (drawing) {
      drawing = false;
      if (lastPoint) feedPen({ t: "pen", ph: "ended", x: lastPoint.x, y: lastPoint.y, p: 0 });
    }
  };

  const onMouseOut = (event) => {
    if (!event.relatedTarget) onLeave();
  };

  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
  window.addEventListener("contextmenu", onContextMenu, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("blur", onLeave);
  window.addEventListener("mouseout", onMouseOut, true);
}

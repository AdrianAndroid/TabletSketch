// tablet-sketch.js — 手写板模式的 Web 侧桥与笔事件注入。
//
// 原生层通过 window.tabletSketch.* 调用；这里只做三件事：
//   1. 把浮岛/顶部条的自绘 UI 变成对 Excalidraw 公开 API 的调用
//   2. 把原生采集到的笔采样点合成为 PointerEvent 注入画布
//   3. 补两个上游不会替我们处理的坑（setPointerCapture / getCoalescedEvents）
//
// 不修改 Excalidraw 包本身。

import { restoreElements } from "@excalidraw/excalidraw";
import { installMouseInput } from "./tablet/mouse-input.js";

const NATIVE_HANDLER = "tabletSketch";

/** 合成指针的固定 id，用来在 patch 里识别"这是我们自己造的"。 */
const INJECTED_POINTER_ID = 8801;

/** 画布认可的工具名。浮岛直接传最终值，不再经过 id → 工具名的映射。 */
const TOOL_TYPES = new Set([
  "freedraw",
  "eraser",
  "hand",
  "selection",
  "rectangle",
  "ellipse",
  "arrow",
  "line",
  "text",
  "diamond",
  "image"
]);

let api = null;
let drawing = false;
let strokeSource = null;
/** 用户主动选过工具后，启动阶段的默认画笔不再覆盖。 */
let userPickedTool = false;

function post(type, payload = {}) {
  try {
    window.webkit?.messageHandlers?.[NATIVE_HANDLER]?.postMessage({ type, ...payload });
  } catch (error) {
    console.warn("tablet bridge unavailable", error);
  }
}

function canvasEl() {
  return (
    document.querySelector("canvas.excalidraw__canvas.interactive") ||
    document.querySelector("canvas.excalidraw__canvas")
  );
}

/**
 * 画布 rect 缓存：笔每个报告都要做坐标映射，getBoundingClientRect 会强制同步布局。
 * 画布尺寸只在窗口 resize / 视口变换时改变，用失效钩子清缓存即可，避免每报告读一次。
 */
let stageRectCache = null;
function stageRect() {
  if (stageRectCache) return stageRectCache;
  stageRectCache = canvasEl()?.getBoundingClientRect() || null;
  return stageRectCache;
}
function invalidateStageRect() {
  stageRectCache = null;
}

/**
 * 撤销 / 重做只能走 Excalidraw 自己的键盘动作。
 *
 * 0.18 的 imperative API 里 `history` 只剩 `clear`，没有 undo/redo（早版本才有），
 * 直接调用会抛 `history.undo is not a function`，表现就是板载键点了没反应。
 * 而它的 keydown 监听挂在 `.excalidraw` 容器上（handleKeyboardGlobally 默认关），
 * 所以要把合成事件派发到容器本身，而不是 document。
 */
function fireHistoryShortcut(shift) {
  const container = document.querySelector(".excalidraw") || canvasEl();
  if (!container) return false;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  container.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "z",
      code: "KeyZ",
      keyCode: 90,
      which: 90,
      bubbles: true,
      cancelable: true,
      metaKey: isMac,
      ctrlKey: !isMac,
      shiftKey: !!shift
    })
  );
  return true;
}

/** 上游会对自造 pointerId 调 setPointerCapture，Safari 抛 InvalidPointerId。 */
function patchPointerCapture() {
  const proto = Element.prototype;
  const originalSet = proto.setPointerCapture;
  const originalRelease = proto.releasePointerCapture;
  const originalHas = proto.hasPointerCapture;

  proto.setPointerCapture = function (id) {
    if (id === INJECTED_POINTER_ID) return;
    try {
      return originalSet.call(this, id);
    } catch (error) {
      return undefined;
    }
  };
  proto.releasePointerCapture = function (id) {
    if (id === INJECTED_POINTER_ID) return;
    try {
      return originalRelease.call(this, id);
    } catch (error) {
      return undefined;
    }
  };
  proto.hasPointerCapture = function (id) {
    if (id === INJECTED_POINTER_ID) return false;
    try {
      return originalHas.call(this, id);
    } catch (error) {
      return false;
    }
  };

  if (!PointerEvent.prototype.getCoalescedEvents) {
    PointerEvent.prototype.getCoalescedEvents = function () {
      return [this];
    };
  }
}

/**
 * Excalidraw 把 `event.pressure === 0.5` 当作"设备没有压感、改用速度模拟"的标记
 * （components/App.tsx 的 simulatePressure）。真实压感正好落在 0.5 时整条线的
 * 压力数据会被丢掉，所以必须钳开。
 */
function clampPressure(value) {
  let p = Number.isFinite(value) ? value : 0;
  p = Math.max(0, Math.min(1, p));
  return p === 0.5 ? 0.5001 : p;
}

/**
 * 压力整形。
 *
 * 硬件给的是线性 0..1，Excalidraw 用 perfect-freehand 的 thinning 直接算线宽，
 * 轻触时压力只有 0.02 左右，线宽接近发丝，看起来像"没画出来"。
 * 这里把低区抬起来、高区留余量：0 → 0，0.05 → 约 0.3，0.5 → 约 0.66，1 → 1。
 * 保证"一碰就看得见"，同时重压还能明显变粗。
 */
const PRESSURE_FLOOR = 0.35;

function shapePressure(value) {
  const p = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  // 只要笔尖接触过面板就必须留下看得见的线，不能按原始压力线性缩放。
  // 之前轻触时 p≈0.006，算出来 0.05，线宽接近 0，用户体感就是"点了没反应"。
  if (p <= 0) return PRESSURE_FLOOR;
  const lifted = 0.35 + 0.65 * Math.pow(p, 0.6);
  return Math.max(PRESSURE_FLOOR, Math.min(1, lifted));
}

function makePointerEvent(type, x, y, pressure) {
  const isUp = type === "pointerup" || type === "pointercancel";
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    pointerId: INJECTED_POINTER_ID,
    pointerType: "pen",
    isPrimary: true,
    width: 1,
    height: 1,
    pressure: isUp ? 0 : clampPressure(pressure),
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    button: type === "pointermove" ? -1 : 0,
    buttons: isUp ? 0 : 1,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y
  });
}

/** 把一帧的笔采样点推成 pointerdown / pointermove / pointerup。 */
function pushSamples(samples) {
  const target = canvasEl();
  if (!target) return;

  for (const sample of samples) {
    const [x, y, pressure, phase] = sample;
    if (phase === 1) {
      if (drawing) continue;
      drawing = true;
      target.dispatchEvent(makePointerEvent("pointerdown", x, y, pressure || 0.5));
    } else if (phase === 2) {
      if (!drawing) continue;
      target.dispatchEvent(makePointerEvent("pointermove", x, y, pressure || 0.5));
    } else if (phase === 3) {
      if (!drawing) continue;
      drawing = false;
      target.dispatchEvent(makePointerEvent("pointermove", x, y, pressure || 0.5));
      target.dispatchEvent(makePointerEvent("pointerup", x, y, 0));
    }
  }
}

/**
 * HID 事件的两个去处：落在 chrome 上就当成一次点击，落在画布上才画。
 * `elementFromPoint` 就是命中系统，不需要额外的坐标判断。
 */
function isChrome(el) {
  return !!(el && el.closest && el.closest("[data-ts-ui]"));
}

function ensureDrawTool() {
  try {
    const state = api.getAppState();
    if (state.activeTool?.type === "freedraw") return;
    api.setActiveTool({ type: "freedraw" });
    console.log("[tool] 已切到手写笔");
  } catch (error) {
    console.warn("[tool] 切换失败", error);
  }
}

function applyHidEvent(payload, source = "pen") {
  if (!payload) return;

  if (payload.t === "pen") {
    if (payload.ph === "began") {
      if (strokeSource && strokeSource !== source) return;
      strokeSource = source;
    } else if (payload.ph === "changed" || payload.ph === "ended") {
      if (strokeSource !== source) return;
    } else if (payload.ph === "hover" && strokeSource) {
      return;
    }
  }

  // 采集器独占成功：系统指针不再跟随笔，界面需要自己画一个光标
  if (payload.t === "grab") {
    window.dispatchEvent(new CustomEvent("tablet:grab", { detail: { ok: !!payload.ok } }));
    return;
  }

  // 侧键与板载键单独处理，不参与坐标映射
  if (payload.t === "side" || payload.t === "aux") {
    window.dispatchEvent(
      new CustomEvent("tablet:keys", {
        detail: { kind: payload.t, keys: payload.keys || [], source }
      })
    );
    return;
  }

  if (payload.t !== "pen") return;

  // 笔离开感应区：收起光标圆圈，别让它赖在屏幕上
  if (payload.ph === "leave") {
    strokeSource = null;
    window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: null }));
    return;
  }

  const target = canvasEl();
  if (!target) return;
  const rect = stageRect();
  if (!rect) return;
  const x = rect.left + payload.x * rect.width;
  const y = rect.top + payload.y * rect.height;

  if (source === "pen") {
    // 一个报告只派发一个呈现事件：读数板与光标都从这里取，避免两个独立事件
    // 各自触发一次 React setState（跨事件不会自动批处理）。
    window.dispatchEvent(
      new CustomEvent("tablet:penpos", {
        detail: {
          x,
          y,
          nx: payload.x,
          ny: payload.y,
          down: payload.ph === "began" || payload.ph === "changed",
          // 遥测字段合并进来，读数板随同一事件更新
          p: typeof payload.p === "number" ? payload.p : 0,
          raw: typeof payload.px === "number" ? payload.px : 0,
          tx: typeof payload.tx === "number" ? payload.tx : 0,
          ty: typeof payload.ty === "number" ? payload.ty : 0,
          ph: payload.ph,
          source
        }
      })
    );

    if (payload.ph === "hover") return;
  } else if (payload.ph === "hover") {
    return;
  }

  const hit = document.elementFromPoint(x, y);

  // 落在自绘 UI 上：转成一次点击，不碰当前工具。
  // 这里必须在 ensureDrawTool 之前返回，否则点浮岛按钮会把工具重置成画笔。
  if (isChrome(hit)) {
    if (payload.ph === "began") {
      hit.dispatchEvent(makePointerEvent("pointerdown", x, y, 0.5));
    } else if (payload.ph === "changed") {
      // 把手拖动依赖连续 pointermove；之前这里直接丢弃，笔在浮岛内移动不会跟手。
      hit.dispatchEvent(makePointerEvent("pointermove", x, y, 0.5));
    } else if (payload.ph === "ended") {
      hit.dispatchEvent(makePointerEvent("pointerup", x, y, 0));
      hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    }
    if (payload.ph === "ended" && strokeSource === source) strokeSource = null;
    return;
  }

  // 画布落笔不改工具：笔与鼠标一致，工具后续回到选择态由 Excalidraw 原生语义决定。
  const type =
    payload.ph === "began" ? "pointerdown" : payload.ph === "ended" ? "pointerup" : "pointermove";
  const pressure = payload.ph === "ended" ? 0 : shapePressure(payload.p || 0);
  target.dispatchEvent(makePointerEvent(type, x, y, pressure));
  if (payload.ph === "ended" && strokeSource === source) strokeSource = null;
}

function feedVirtualPen(payload, source = "mouse") {
  applyHidEvent(payload, source);
}

function sceneCenter() {
  const state = api.getAppState();
  const zoom = state.zoom?.value || 1;
  return {
    x: (state.width / 2 - state.scrollX) / zoom,
    y: (state.height / 2 - state.scrollY) / zoom,
    zoom
  };
}

function stylePatchToAppState(patch) {
  const next = {};
  if (patch.strokeColor !== undefined) next.currentItemStrokeColor = patch.strokeColor;
  if (patch.backgroundColor !== undefined) next.currentItemBackgroundColor = patch.backgroundColor;
  if (patch.strokeWidth !== undefined) next.currentItemStrokeWidth = patch.strokeWidth;
  if (patch.strokeStyle !== undefined) next.currentItemStrokeStyle = patch.strokeStyle;
  if (patch.fillStyle !== undefined) next.currentItemFillStyle = patch.fillStyle;
  if (patch.opacity !== undefined) next.currentItemOpacity = patch.opacity;
  if (patch.roughness !== undefined) next.currentItemRoughness = patch.roughness;
  if (patch.fontSize !== undefined) next.currentItemFontSize = patch.fontSize;
  if (patch.textAlign !== undefined) next.currentItemTextAlign = patch.textAlign;
  if (patch.fontFamily !== undefined) next.currentItemFontFamily = patch.fontFamily;
  if (patch.startArrowhead !== undefined) next.currentItemStartArrowhead = patch.startArrowhead;
  if (patch.endArrowhead !== undefined) next.currentItemEndArrowhead = patch.endArrowhead;
  return next;
}

function stylePatchToElements(elements, selectedIds, patch) {
  const selectedContainers = new Set(
    elements
      .filter((element) => selectedIds[element.id] && element.type !== "text")
      .map((element) => element.id)
  );
  return elements.map((element) => {
    if (!selectedIds[element.id]) return element;
    if (element.locked) return element;
    // 图片不参与样式修改；绑定文字不跟随形状一起变
    if (element.type === "image") return element;
    if (element.type === "text" && element.containerId && selectedContainers.has(element.containerId)) {
      return element;
    }
    const next = { ...element };
    if (patch.strokeColor !== undefined) next.strokeColor = patch.strokeColor;
    if (patch.backgroundColor !== undefined) next.backgroundColor = patch.backgroundColor;
    if (patch.strokeWidth !== undefined) next.strokeWidth = patch.strokeWidth;
    if (patch.strokeStyle !== undefined) next.strokeStyle = patch.strokeStyle;
    if (patch.fillStyle !== undefined) next.fillStyle = patch.fillStyle;
    if (patch.opacity !== undefined) next.opacity = patch.opacity;
    if (patch.roughness !== undefined) next.roughness = patch.roughness;
    if (patch.fontSize !== undefined && next.type === "text") next.fontSize = patch.fontSize;
    if (patch.textAlign !== undefined && next.type === "text") next.textAlign = patch.textAlign;
    if (patch.fontFamily !== undefined && next.type === "text") next.fontFamily = patch.fontFamily;
    if (patch.startArrowhead !== undefined) next.startArrowhead = patch.startArrowhead;
    if (patch.endArrowhead !== undefined) next.endArrowhead = patch.endArrowhead;
    if (patch.elbowed !== undefined) next.elbowed = patch.elbowed;
    if (patch.roundness !== undefined) {
      next.roundness = patch.roundness === "sharp" ? null : { type: 3 };
    }
    return next;
  });
}

async function resolveLibraryItems() {
  const raw = api.getAppState().libraryItems;
  if (raw && typeof raw.then === "function") return (await raw) || [];
  return raw || [];
}

/** 直接从打包进前端的素材 JSON 找 item，不依赖 Excalidraw 的 library 是否已合并。 */
function bundledLibraryItem(itemId) {
  const libraries = window.__tsLibraries?.libraries || [];
  for (const library of libraries) {
    const item = (library.items || []).find((entry) => entry.id === itemId);
    if (item?.elements?.length) return item;
  }
  return null;
}

function placeLibraryItem(item) {
  if (!item?.elements?.length) return false;
  const center = sceneCenter();
  const source = restoreElements(item.elements, null);
  const minX = Math.min(...source.map((element) => element.x));
  const minY = Math.min(...source.map((element) => element.y));
  const maxX = Math.max(...source.map((element) => element.x + (element.width || 0)));
  const maxY = Math.max(...source.map((element) => element.y + (element.height || 0)));
  const dx = center.x - (minX + maxX) / 2;
  const dy = center.y - (minY + maxY) / 2;

  const placed = source.map((element) => ({
    ...element,
    id: `${element.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    x: element.x + dx,
    y: element.y + dy
  }));

  api.updateScene({
    elements: [...api.getSceneElements(), ...placed],
    appState: {
      selectedElementIds: Object.fromEntries(placed.map((element) => [element.id, true])),
      activeTool: { type: "selection" }
    },
    captureUpdate: "IMMEDIATELY"
  });
  return true;
}

function insertLibraryItem(itemId) {
  const bundled = bundledLibraryItem(itemId);
  if (bundled) return Promise.resolve(placeLibraryItem(bundled));
  return resolveLibraryItems().then((items) => {
    const item = (items || []).find((entry) => entry.id === itemId);
    return placeLibraryItem(item);
  });
}

function installTabletSketch(excalidrawApi) {
  api = excalidrawApi;
  patchPointerCapture();
  // 手写板应用一打开就该是画笔；若用户已主动选过工具则不覆盖。
  setTimeout(() => {
    if (!userPickedTool) ensureDrawTool();
  }, 400);

  const bridge = {
    // ---- 工具 ----
    setTool(name) {
      if (!TOOL_TYPES.has(name)) return false;
      api.setActiveTool({ type: name });
      userPickedTool = true;
      return true;
    },
    getTool() {
      return api.getAppState().activeTool?.type || "selection";
    },
    // 工具锁：与 Excalidraw 原生工具栏锁按钮同语义（绘制后保持当前工具）。
    // imperative API 未暴露 toggleLock，改用 setActiveTool 复现其状态机：
    // 开启时保持当前工具并锁住；关闭时回退到选择工具。
    // 注意不能 setActiveTool 之后立刻 getAppState 回读：React 的 setState 是批处理的，
    // 那一刻读到的还是旧值，会导致按钮永远返回 false（提示语和图标都反了）。
    toggleToolLock() {
      const activeTool = api.getAppState().activeTool || { type: "selection" };
      const nextLocked = !activeTool.locked;
      api.setActiveTool(
        nextLocked
          ? { type: activeTool.type, locked: true }
          : { type: "selection", locked: false }
      );
      return nextLocked;
    },
    getToolLocked() {
      return !!api.getAppState().activeTool?.locked;
    },
    hasSelection() {
      const selected = api.getAppState().selectedElementIds || {};
      return Object.keys(selected).some((id) => selected[id]);
    },
    clearSelection() {
      api.updateScene({ appState: { selectedElementIds: {} } });
      return true;
    },

    // ---- 场景 ----
    getSceneElements() {
      return api.getSceneElements();
    },
    loadScene(data) {
      if (!data || !Array.isArray(data.elements)) return false;
      api.updateScene({
        elements: restoreElements(data.elements, null),
        appState: { selectedElementIds: {} },
        captureUpdate: "IMMEDIATELY"
      });
      return true;
    },
    selectAll() {
      const ids = api
        .getSceneElements()
        .filter((element) => !element.isDeleted)
        .map((element) => element.id);
      api.updateScene({
        appState: { selectedElementIds: Object.fromEntries(ids.map((id) => [id, true])) }
      });
      return true;
    },
    deleteSelection() {
      const selected = api.getAppState().selectedElementIds || {};
      if (!Object.keys(selected).length) return false;
      const rest = api.getSceneElements().filter((element) => !selected[element.id]);
      api.updateScene({
        elements: rest,
        appState: { selectedElementIds: {} },
        captureUpdate: "IMMEDIATELY"
      });
      return true;
    },
    duplicateSelection() {
      const selected = api.getAppState().selectedElementIds || {};
      const picked = api.getSceneElements().filter((element) => selected[element.id]);
      if (!picked.length) return false;
      const stamp = Date.now().toString(36);
      const clones = picked.map((element, index) => ({
        ...element,
        id: `${element.id}-dup-${stamp}-${index}`,
        x: element.x + 16,
        y: element.y + 16
      }));
      api.updateScene({
        elements: [...api.getSceneElements(), ...clones],
        appState: {
          selectedElementIds: Object.fromEntries(clones.map((element) => [element.id, true]))
        },
        captureUpdate: "IMMEDIATELY"
      });
      return true;
    },

    // ---- 历史 ----
    undo() {
      return fireHistoryShortcut(false);
    },
    redo() {
      return fireHistoryShortcut(true);
    },

    // ---- 视图 ----
    zoomToFit() {
      api.scrollToContent(api.getSceneElements(), { fitToContent: true, animate: false });
      return true;
    },
    setZoom(value) {
      api.updateScene({ appState: { zoom: { value } } });
      return true;
    },
    getZoom() {
      return api.getAppState().zoom?.value || 1;
    },

    // ---- 画布 ----
    setBackground(kind) {
      const table = {
        plain: "#ffffff",
        dark: "#121212",
        dots: "#ffffff",
        grid: "#ffffff"
      };
      const color = table[kind] || "#ffffff";
      document.body.classList.toggle("ts-dark", kind === "dark");
      document.body.classList.toggle("ts-dots", kind === "dots");
      document.body.classList.toggle("ts-grid", kind === "grid");
      api.updateScene({ appState: { viewBackgroundColor: color } });
      return true;
    },
    clearCanvas() {
      api.updateScene({
        elements: [],
        appState: { selectedElementIds: {}, editingElement: null },
        captureUpdate: "IMMEDIATELY"
      });
      return true;
    },
    elementCount() {
      return api.getSceneElements().filter((element) => !element.isDeleted).length;
    },

    // ---- 样式 ----
    setStyle(patch) {
      const state = api.getAppState();
      const selected = state.selectedElementIds || {};
      const hasSelection = Object.keys(selected).some((id) => selected[id]);
      const appStatePatch = stylePatchToAppState(patch);
      if (hasSelection) {
        const elements = stylePatchToElements(
          api.getSceneElements(),
          selected,
          patch
        );
        api.updateScene({
          elements,
          appState: appStatePatch,
          captureUpdate: "IMMEDIATELY"
        });
      } else {
        api.updateScene({ appState: appStatePatch });
      }
      return true;
    },
    getContext() {
      const state = api.getAppState();
      const selectedIds = state.selectedElementIds || {};
      const rawSelected = api
        .getSceneElements()
        .filter((element) => selectedIds[element.id] && !element.isDeleted);
      const containerIds = new Set(
        rawSelected.filter((element) => element.type !== "text").map((element) => element.id)
      );
      // 图片不进入样式环；绑定文字不跟随形状一起改
      const selected = rawSelected.filter(
        (element) =>
          element.type !== "image" &&
          !(
            element.type === "text" &&
            element.containerId &&
            containerIds.has(element.containerId)
          )
      );
      const kinds = [...new Set(selected.map((element) => element.type))];
      const first = selected[0] || null;

      const fieldValues = (field) =>
        selected.map((element) => {
          if (field === "roundness") return element.roundness ? "round" : "sharp";
          if (field === "arrowType") {
            return element.elbowed ? "elbow" : element.roundness ? "round" : "sharp";
          }
          return element[field];
        });
      const mixed = {};
      [
        "strokeColor",
        "backgroundColor",
        "strokeWidth",
        "strokeStyle",
        "roughness",
        "roundness",
        "opacity",
        "fontFamily",
        "fontSize",
        "textAlign",
        "startArrowhead",
        "endArrowhead",
        "arrowType"
      ].forEach((field) => {
        mixed[field] =
          selected.length > 1 &&
          new Set(fieldValues(field).map((value) => JSON.stringify(value))).size > 1;
      });

      const arrowType = first
        ? first.elbowed
          ? "elbow"
          : first.roundness
            ? "round"
            : "sharp"
        : "sharp";

      return {
        tool: state.activeTool?.type || "selection",
        selectedTypes: kinds,
        selectedCount: selected.length,
        allLocked: selected.length > 0 && selected.every((element) => element.locked),
        partialLocked: selected.some((element) => element.locked),
        mixed,
        style: {
          strokeColor: first?.strokeColor ?? state.currentItemStrokeColor,
          backgroundColor: first?.backgroundColor ?? state.currentItemBackgroundColor,
          strokeWidth: first?.strokeWidth ?? state.currentItemStrokeWidth,
          strokeStyle: first?.strokeStyle ?? state.currentItemStrokeStyle,
          fillStyle: first?.fillStyle ?? state.currentItemFillStyle,
          opacity: first?.opacity ?? state.currentItemOpacity,
          roughness: first?.roughness ?? state.currentItemRoughness,
          fontSize: first?.fontSize ?? state.currentItemFontSize,
          textAlign: first?.textAlign ?? state.currentItemTextAlign,
          fontFamily: first?.fontFamily ?? state.currentItemFontFamily,
          startArrowhead: first?.startArrowhead ?? state.currentItemStartArrowhead ?? null,
          endArrowhead: first?.endArrowhead ?? state.currentItemEndArrowhead ?? null,
          elbowed: first?.elbowed ?? false,
          arrowType,
          roundness: first ? (first.roundness ? "round" : "sharp") : "round"
        }
      };
    },

    // ---- 素材 ----
    insertLibraryItem(itemId) {
      return insertLibraryItem(itemId);
    },

    // ---- 事件 ----
    /** 在笔尖位置合成右键事件，交给 Excalidraw 原生菜单。 */
    contextMenu(x, y) {
      const target = canvasEl();
      if (!target) return false;
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 2,
        buttons: 2,
        clientX: x,
        clientY: y
      });
      target.dispatchEvent(event);
      return true;
    },

    /** 原生每帧批量推来的笔采样：[[x, y, pressure, phase], ...] */
    pushSamples,

    feedPen(payload) {
      feedVirtualPen(payload, "mouse");
      return true;
    },

    isStrokeActive() {
      return strokeSource !== null;
    },

    // ---- 外观 ----
    setTabletChrome(on) {
      document.body.classList.toggle("tablet-mode", !!on);
      return true;
    },
    ready: true,
    version: "1"
  };

  window.tabletSketch = bridge;

  installMouseInput({
    feedPen: (payload) => feedVirtualPen(payload, "mouse"),
    isStrokeActive: () => strokeSource !== null
  });

  // 画布 rect 只在窗口尺寸变化时失效，避免每个笔报告强制同步布局
  window.addEventListener("resize", invalidateStageRect);

  // contextIsolation 下 preload 看不到 window 上的属性，只能用 DOM 事件跨世界传话。
  // 笔采样、自测、chrome 开关都从这三个事件进。
  document.addEventListener("ts:pen", (event) => {
    const samples = event.detail;
    if (Array.isArray(samples)) pushSamples(samples);
  });
  document.addEventListener("ts:hid", (event) => applyHidEvent(event.detail));
  document.addEventListener("ts:hid-status", (event) => {
    // 缓存一份：界面可能在状态到达之后才挂载，挂载时要能读到
    window.__tsHidStatus = event.detail;
    window.dispatchEvent(new CustomEvent("tablet:hid-status", { detail: event.detail }));
  });
  // 菜单栏「设置…」从 preload 的 DOM 事件转到界面侧
  document.addEventListener("ts:open-settings", () => {
    window.dispatchEvent(new CustomEvent("tablet:open-settings"));
  });
  document.addEventListener("ts:menu-save", () => {
    window.dispatchEvent(new CustomEvent("tablet:save"));
  });
  document.addEventListener("ts:menu-open", () => {
    window.dispatchEvent(new CustomEvent("tablet:open"));
  });
  document.addEventListener("ts:open-style-ring", () => {
    window.dispatchEvent(new CustomEvent("tablet:open-style-ring"));
  });
  document.addEventListener("ts:selftest", () => runSelfTest());
  document.addEventListener("ts:chrome", (event) => {
    bridge.setTabletChrome(event.detail !== false);
  });

  // 跨 world 事件有可能在监听注册前就发出去了，这里直接切一次，
  // 保证原生 chrome 一定被藏起来、自绘界面一定出来。
  document.body.classList.add("tablet-mode");
  if (window.tsEnv?.noAnim) document.body.classList.add("ts-no-anim");

  document.dispatchEvent(new CustomEvent("ts:ready"));
  post("tabletReady");
  return bridge;
}

/** 通过 preload 把日志送到主进程终端，方便无 DevTools 时排错。 */
function log(message) {
  document.dispatchEvent(new CustomEvent("ts:log", { detail: String(message) }));
}

/** 自测：切到手写笔，注入一条压力渐变的横线。 */
async function runSelfTest() {
  const target = canvasEl();
  if (!target) {
    log("自测失败：找不到画布");
    return;
  }
  log(`自测开始，画布 ${Math.round(target.clientWidth)}×${Math.round(target.clientHeight)}`);

  api.setActiveTool({ type: "freedraw" });
  await new Promise((resolve) => setTimeout(resolve, 150));

  const rect = target.getBoundingClientRect();
  const y = rect.top + rect.height / 2;
  const x0 = rect.left + rect.width * 0.28;
  const span = rect.width * 0.44;
  const steps = 80;

  target.dispatchEvent(makePointerEvent("pointerdown", x0, y, 0.12));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + span * t;
    const pressure = 0.12 + Math.sin(t * Math.PI) * 0.83;
    target.dispatchEvent(makePointerEvent("pointermove", x, y, pressure));
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
  target.dispatchEvent(makePointerEvent("pointerup", x0 + span, y, 0));

  const count = api.getSceneElements().length;
  log(`自测完成，场景元素数 ${count}`);
}

export { installTabletSketch };

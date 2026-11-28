import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icons } from "./icons";
import { MenuPanel, CanvasPanel, LibraryPanel, MorePanel } from "./panels";
import { RadialMenu } from "./RadialMenu";
import { StyleBubble } from "./StyleBubble";
import { SettingsWindow } from "./settings/SettingsWindow";
import { saveScene, openScene } from "./scene-files";
import { PadBand } from "./PadBand.jsx";
import { PenTelemetry, PenTelemetryChip } from "./PenTelemetry.jsx";
import { LeftStyleIsland } from "./LeftStyleIsland.jsx";
import { buildLevel1, buildLevel2, categoryLabel } from "./style-wheel";
import { buildToolWheel } from "./tool-wheel";
import { TOOL_LABEL } from "./tool-slots";
import { loadLayout, buildSurfaceSlots, resolveSlot } from "./layout-config.js";
import "./chrome.css";

function bridge() {
  return window.tabletSketch ?? null;
}

const ISLAND_KEY = "tablet.island.pos";
const ISLAND_MARGIN = 12;
const ISLAND_TOP_MIN = 72;
// 左侧留给常驻样式岛：右侧工具岛水平下限收紧到右半区，禁止吸附到左侧。
const ISLAND_MIN_X_RATIO = 0.55;
// UI 等比缩放：以启动时的窗口尺寸为 100%，短边取比例，限制在 0.8–2.0。
const UI_SCALE_MIN = 0.8;
const UI_SCALE_MAX = 2.0;

/** 由窗口尺寸相对启动基准算出 UI 缩放；纯函数便于离屏回归直接断言。 */
export function computeUiScale(width, height, baseWidth, baseHeight) {
  const w = Number.isFinite(baseWidth) && baseWidth > 0 ? baseWidth : width;
  const h = Number.isFinite(baseHeight) && baseHeight > 0 ? baseHeight : height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  const raw = Math.min(width / w, height / h);
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, raw));
}

// 浮岛边距与顶部禁入区跟随 UI 缩放，避免窗口放大后浮岛压到按键带。
// 模块级变量由 Shell 的缩放 effect 写入，纯函数 clampIsland 仍可单独回归。
let islandScale = 1;
function setUiScaleContext(scale) {
  islandScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
}
const islandMargin = () => ISLAND_MARGIN * islandScale;
const islandTopMin = () => ISLAND_TOP_MIN * islandScale;

function islandMinX() {
  return window.innerWidth * ISLAND_MIN_X_RATIO;
}

function clampIsland(pos, w, h) {
  const margin = islandMargin();
  const topMin = islandTopMin();
  const minX = Math.min(islandMinX(), Math.max(margin, window.innerWidth - w - margin));
  const maxX = Math.max(minX, window.innerWidth - w - margin);
  const maxY = Math.max(topMin, window.innerHeight - h - margin);
  return {
    x: Math.min(Math.max(pos.x, minX), maxX),
    y: Math.min(Math.max(pos.y, topMin), maxY)
  };
}

function loadIslandPos() {
  try {
    const raw = localStorage.getItem(ISLAND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
      // 旧版本可能存了左侧位置；读取时就夹回右半区，避免首帧闪现在样式岛一侧。
      return { x: Math.max(parsed.x, islandMinX()), y: parsed.y };
    }
  } catch {
    /* 损坏就回默认 */
  }
  return null;
}

/** 这些工具需要精确落点：指示器显示十字准星，而不是圆点 / 圆环。 */
const CROSSHAIR_TOOLS = new Set([
  "freedraw",
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "text",
  "image"
]);

const SNAP_EDGE = 24;

/**
 * 松手吸附：距右边或上下边 24pt 内贴该边；否则贴右边。
 * 浮岛是竖栏，水平拖动时不该突然贴到顶部；左侧为样式岛保留，不再吸附。
 */
function snapIsland(pos, w, h) {
  const margin = islandMargin();
  const topMin = islandTopMin();
  const right = window.innerWidth - (pos.x + w) - margin;
  const bottom = window.innerHeight - (pos.y + h) - margin;
  const candidates = [
    { d: right, x: window.innerWidth - w - margin, y: pos.y },
    { d: pos.y - topMin, x: pos.x, y: topMin },
    { d: bottom, x: pos.x, y: window.innerHeight - h - margin }
  ];
  const near = candidates.filter((item) => item.d <= SNAP_EDGE);
  const best = near.length ? near.reduce((a, b) => (b.d < a.d ? b : a)) : candidates[0];
  return clampIsland({ x: best.x, y: best.y }, w, h);
}

export function TabletShell({ onOpenSettings }) {
  const [openPanel, setOpenPanel] = useState(null);
  const [side, setSide] = useState("right");
  const [tool, setTool] = useState("selection");
  // 工具锁状态：跟随 Excalidraw activeTool.locked，低频刷新。
  const [toolLocked, setToolLocked] = useState(false);
  const toolLockedRef = useRef(false);
  // 左侧样式岛的上下文：低频刷新（随工具轮询），有选中才显示。
  const [styleContext, setStyleContext] = useState(null);
  const styleSigRef = useRef("");
  const [hidStatus, setHidStatus] = useState(() => window.__tsHidStatus || null);
  const [radial, setRadial] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  // 独占打开成功后系统不再画指针，光标由我们自己画
  const [grabbed, setGrabbed] = useState(false);
  // 光标的低频形状状态（按下态 / 来源 / 是否显示）；位置走 ref 直写 DOM，不进 state。
  const [cursorShape, setCursorShape] = useState({ down: false, source: null, visible: false });
  const [padFlash, setPadFlash] = useState(null);
  // 读数板是否展开：收起时组件卸载，订阅随之停止。
  const [teleOpen, setTeleOpen] = useState(true);
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [islandPos, setIslandPos] = useState(loadIslandPos);
  const [islandDragging, setIslandDragging] = useState(false);
  const [layout, setLayout] = useState(loadLayout);
  const layoutRef = useRef(layout);
  // UI 缩放基准：挂载时记录一次，之后窗口变化不再重设基准。
  const baseWindowRef = useRef(null);
  const [uiScale, setUiScale] = useState(1);
  const islandRef = useRef(null);
  const dragRef = useRef(null);
  // 笔最近一次落点：径向菜单和样式气泡都以它为中心，而不是屏幕中心
  const penRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  // 唯一光标的 DOM 引用：位置直接写 transform，避免高频 setState 重渲染整棵树
  const cursorElRef = useRef(null);
  const cursorShapeRef = useRef(cursorShape);
  const radialRef = useRef(null);
  const activateRef = useRef(null);
  const toastTimerRef = useRef(0);

  const visible = useMemo(() => {
    const ids = layout.surfaces.rightIsland.ids;
    const limit = layout.surfaces.rightIsland.limit || ids.length;
    return buildSurfaceSlots("rightIsland", layout, { tool, toolLocked, panel: openPanel }).slice(0, limit);
  }, [layout, tool, toolLocked, openPanel]);
  const overflow = useMemo(() => {
    const ids = layout.surfaces.rightIsland.ids;
    const limit = layout.surfaces.rightIsland.limit || ids.length;
    return ids.slice(limit).map((id) => resolveSlot(id)).filter((slot) => {
      if (!slot) return false;
      return !visible.some((v) => v.id === slot.id);
    });
  }, [layout, visible]);
  const crosshair = CROSSHAIR_TOOLS.has(tool);

  // 工具状态跟着画布走（用户可能用快捷键切了工具）。
  // 顺带低频刷新左侧样式岛的上下文：签名不变就不 setState。
  useEffect(() => {
    const refresh = () => {
      const api = bridge();
      if (!api) return;
      const next = api.getTool();
      if (next) setTool(next);
      if (api.getToolLocked) {
        const locked = !!api.getToolLocked();
        if (locked !== toolLockedRef.current) {
          toolLockedRef.current = locked;
          setToolLocked(locked);
        }
      }
      if (!api.getContext) return;
      const context = api.getContext();
      const sig = JSON.stringify([
        context.selectedCount,
        context.selectedTypes,
        context.allLocked,
        context.style
      ]);
      if (sig === styleSigRef.current) return;
      styleSigRef.current = sig;
      setStyleContext(context.selectedCount ? context : null);
    };
    const timer = setInterval(refresh, 400);
    refresh();
    return () => clearInterval(timer);
  }, []);

  // HID 状态、板载键、侧键
  useEffect(() => {
    const onStatus = (event) => setHidStatus(event.detail);
    const onKeys = (event) => {
      const { kind, keys, source } = event.detail;
      if (radialRef.current) return;
      if (kind === "side") {
        if (keys.includes(0)) openRadial(source === "mouse" ? "mouse" : "pen");
        if (keys.includes(1)) openToolRadial(source === "mouse" ? "mouse" : "pen");
        if (keys.includes(2)) applyTool("eraser");
        return;
      }
      // 板载键：点亮位置并执行配置中的动作。键盘接口已被 seize，
      // 原生快捷键不会到达系统，动作完全由应用侧负责。
      for (const index of keys) {
        setPadFlash({ index, seq: Date.now() + index });
        const id = layoutRef.current.surfaces.onboardKeys.ids[index];
        const slot = resolveSlot(id);
        if (slot) activateRef.current?.(slot);
      }
    };
    window.addEventListener("tablet:hid-status", onStatus);
    window.addEventListener("tablet:keys", onKeys);
    return () => {
      window.removeEventListener("tablet:hid-status", onStatus);
      window.removeEventListener("tablet:keys", onKeys);
    };
  }, []);

  // 菜单栏「设置…」
  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("tablet:open-settings", handler);
    return () => window.removeEventListener("tablet:open-settings", handler);
  }, []);

  // 布局配置改动即时生效；打开的设置面板本身也广播，这里同步最新值。
  useEffect(() => {
    const handler = (event) => {
      const next = event.detail || loadLayout();
      layoutRef.current = next;
      setLayout(next);
      setRadial(null);
    };
    window.addEventListener("tablet:layout", handler);
    return () => window.removeEventListener("tablet:layout", handler);
  }, []);

  // 画布列表由原生侧维护；这里先读本地存储兜底
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tablet.boards");
      if (raw) {
        const parsed = JSON.parse(raw);
        setBoards(parsed.boards || []);
        setActiveBoard(parsed.active || null);
        return;
      }
      // 第一次打开：先给一张默认画板，别让面板空着
      const first = { id: "default", name: "未命名画板", elements: 0, updatedAt: Date.now() };
      setBoards([first]);
      setActiveBoard(first.id);
    } catch {
      /* 忽略损坏数据 */
    }
  }, []);

  /**
   * 唯一的光标更新函数：位置直接写 DOM transform，只有「形状」（按下/来源/显隐）
   * 变化时才 setState。笔每个报告都会走到这里，但绝大多数报告形状不变，
   * 因此不再有每报告一次的全树重渲染。
   */
  const paintCursor = useCallback((detail, source) => {
    const el = cursorElRef.current;
    if (el) {
      if (detail) {
        el.style.transform = `translate3d(${detail.x}px, ${detail.y}px, 0)`;
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    }
    const prev = cursorShapeRef.current;
    const down = detail ? !!detail.down : false;
    const visible = !!detail;
    const nextSource = detail ? source : prev.source;
    if (prev.down !== down || prev.source !== nextSource || prev.visible !== visible) {
      const next = { down, source: nextSource, visible };
      cursorShapeRef.current = next;
      setCursorShape(next);
    }
  }, []);

  // 笔尖位置与独占状态：一个事件里同时更新光标、笔落点 ref 与读数数据
  useEffect(() => {
    const onPos = (event) => {
      const detail = event.detail;
      if (detail && Number.isFinite(detail.x) && Number.isFinite(detail.y)) {
        penRef.current = { x: detail.x, y: detail.y };
      }
      paintCursor(detail, "pen");
    };
    const onGrab = (event) => setGrabbed(!!event.detail?.ok);
    window.addEventListener("tablet:penpos", onPos);
    window.addEventListener("tablet:grab", onGrab);
    return () => {
      window.removeEventListener("tablet:penpos", onPos);
      window.removeEventListener("tablet:grab", onGrab);
    };
  }, [paintCursor]);

  useEffect(() => {
    radialRef.current = radial;
  }, [radial]);

  // 浮岛位置：首次挂载后量一次尺寸，落到右侧垂直居中；之后全部用绝对坐标
  useLayoutEffect(() => {
    if (islandPos) return;
    const el = islandRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setIslandPos(
      clampIsland(
        { x: window.innerWidth - rect.width - islandMargin(), y: (window.innerHeight - rect.height) / 2 },
        rect.width,
        rect.height
      )
    );
  }, [islandPos]);

  // 拖动结束后重新夹回窗口，并让面板方向跟着浮岛所在的半边
  useEffect(() => {
    if (islandDragging) return;
    const el = islandRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSide(rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right");
    setIslandPos((pos) => {
      if (!pos) return pos;
      const next = clampIsland(pos, rect.width, rect.height);
      return next.x === pos.x && next.y === pos.y ? pos : next;
    });
  }, [islandDragging]);

  // UI 等比缩放：基准取挂载时的窗口尺寸，resize 时按短边比例重算并写入 CSS 变量。
  // 只改 CSS 尺寸，不动笔尖坐标映射；样式环通过 prop 同步同一比例。
  useEffect(() => {
    if (!baseWindowRef.current) {
      baseWindowRef.current = { width: window.innerWidth, height: window.innerHeight };
    }
    const apply = () => {
      const base = baseWindowRef.current;
      const scale = computeUiScale(window.innerWidth, window.innerHeight, base.width, base.height);
      document.documentElement.style.setProperty("--ts-ui-scale", String(scale));
      setUiScale(scale);
      setUiScaleContext(scale);
      window.__tsUiScale = scale;
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // 窗口尺寸变化时把浮岛拉回可视区
  useEffect(() => {
    const onResize = () => {
      const el = islandRef.current;
      if (!el || !islandPos) return;
      setIslandPos((pos) => {
        if (!pos) return pos;
        const next = clampIsland(pos, el.offsetWidth, el.offsetHeight);
        return next.x === pos.x && next.y === pos.y ? pos : next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [islandPos]);

  // 记住位置，重启后恢复。拖动中 islandPos 不变（视觉走 transform），
  // 所以这里只在松手落定时写一次盘，不再每次 move 都同步磁盘。
  useEffect(() => {
    if (!islandPos || islandDragging) return;
    try {
      localStorage.setItem(ISLAND_KEY, JSON.stringify(islandPos));
    } catch {
      /* 空间不足就放弃 */
    }
  }, [islandPos, islandDragging]);

  useEffect(() => {
    const onMouse = (event) => {
      const detail = event.detail;
      if (detail) mouseRef.current = { x: detail.x, y: detail.y };
      paintCursor(detail, "mouse");
    };
    window.addEventListener("tablet:mousepos", onMouse);
    return () => window.removeEventListener("tablet:mousepos", onMouse);
  }, [paintCursor]);

  // 画板列表和当前选择写回本地，下次打开还是这张
  useEffect(() => {
    if (!boards.length) return;
    try {
      localStorage.setItem("tablet.boards", JSON.stringify({ boards, active: activeBoard }));
    } catch {
      /* 空间不足就放弃，不影响作画 */
    }
  }, [boards, activeBoard]);

  const applyTool = useCallback((name) => {
    const api = bridge();
    if (!api) return;
    api.setTool(name);
    setTool(name === "freedraw" ? "freedraw" : name);
  }, []);

  const showToast = useCallback((text, ms = 1200) => {
    setToastText(text);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastText(""), ms);
  }, []);

  const setRadialState = useCallback((next) => {
    radialRef.current = next;
    setRadial(next);
  }, []);

  // 浮岛与笔侧键 2 工具环共用的执行路径，避免两套工具表各自派发。
  const activate = useCallback(
    (slot) => {
      if (slot.panel) {
        setRadialState(null);
        setBubble(null);
        setOpenPanel((current) => (current === slot.panel ? null : slot.panel));
        return;
      }
      if (slot.tool) {
        applyTool(slot.tool);
        setOpenPanel(null);
        return;
      }
      if (slot.action === "lock") {
        const api = bridge();
        const locked = api?.toggleToolLock?.();
        if (typeof locked === "boolean") {
          toolLockedRef.current = locked;
          setToolLocked(locked);
          showToast(locked ? "已锁定工具" : "已解锁工具", 1000);
        }
        setOpenPanel(null);
        return;
      }
      if (slot.action) {
        const api = bridge();
        if (!api) return;
        if (slot.action === "undo") api.undo?.();
        else if (slot.action === "redo") api.redo?.();
        else if (slot.action === "zoomFit") api.zoomToFit?.();
        else if (slot.action === "zoom100") api.setZoom?.(1);
        else if (slot.action === "delete") api.deleteSelection?.();
        else if (slot.action === "duplicate") api.duplicateSelection?.();
        else if (slot.action === "selectAll") api.selectAll?.();
        setOpenPanel(null);
        return;
      }
    },
    [applyTool, setRadialState, showToast]
  );
  useEffect(() => {
    activateRef.current = activate;
  }, [activate]);

  const openRadial = useCallback(
    (source = "pen") => {
      const api = bridge();
      if (!api) return;
      // 笔画进行中：忽略，不打断当前笔
      if (api.isStrokeActive?.()) return;
      const context = api.getContext?.();
      if (!context) return;
      if (!context.selectedCount) {
        showToast("先选中图形");
        return;
      }
      if (context.allLocked) {
        showToast("元素已锁定");
        return;
      }
      const built = buildLevel1(context, layoutRef.current);
      if (!built) {
        showToast("没有可调样式");
        return;
      }
      const point = source === "mouse" ? mouseRef.current : penRef.current;
      setOpenPanel(null);
      setBubble(null);
      setSettingsOpen(false);
      setTeleOpen(false);
      setRadialState({ ...built, x: point.x, y: point.y, source, context, outerOpen: false });
    },
    [setRadialState, showToast]
  );

  // 笔侧键 2：与键 1 共用弹出壳，但内容是浮岛工具槽位。
  const openToolRadial = useCallback(
    (source = "pen") => {
      const api = bridge();
      if (!api) return;
      if (api.isStrokeActive?.()) return;
      const context = api.getContext?.() || null;
      const built = buildToolWheel(api.getTool?.(), context, toolLockedRef.current, layoutRef.current, openPanel);
      const point = source === "mouse" ? mouseRef.current : penRef.current;
      setOpenPanel(null);
      setBubble(null);
      setSettingsOpen(false);
      setTeleOpen(false);
      setRadialState({ ...built, x: point.x, y: point.y, source, context, outerOpen: false });
    },
    [setRadialState, openPanel]
  );

  const closeRadial = useCallback(() => {
    setRadialState(null);
  }, [setRadialState]);

  const openLevel2 = useCallback(
    (category) => {
      const current = radialRef.current;
      if (!current) return;
      const built = buildLevel2(category, current.context, layoutRef.current);
      if (!built) return;
      setRadialState({ ...current, ...built, category, outerOpen: false });
    },
    [setRadialState]
  );

  const handleWheelAction = useCallback(
    (slot) => {
      const current = radialRef.current;
      if (!current) return;
      if (slot.kind === "more") {
        if (!current.outerSlots.length) return;
        setRadialState({ ...current, outerOpen: true });
        return;
      }
      if (slot.kind === "tool") {
        activate(slot);
        setRadialState(null);
        return;
      }
      if (slot.kind === "category") {
        openLevel2(slot.key);
        return;
      }
      if (slot.kind === "value") {
        const api = bridge();
        if (!api) return;
        try {
          api.setStyle(slot.patch);
          const label = categoryLabel(current.category);
          setRadialState(null);
          showToast(`${label} · ${slot.label}`, 1000);
        } catch (error) {
          showToast("样式写入失败", 1600);
        }
      }
    },
    [activate, openLevel2, setRadialState, showToast]
  );

  const handleWheelCenter = useCallback(() => {
    const current = radialRef.current;
    if (!current) return;
    if (current.outerOpen) {
      setRadialState({ ...current, outerOpen: false });
      return;
    }
    if (current.level === 2 && !current.initialSingle) {
      const built = buildLevel1(current.context);
      if (built) {
        setRadialState({
          ...built,
          x: current.x,
          y: current.y,
          source: current.source,
          context: current.context,
          outerOpen: false
        });
      }
      return;
    }
    setRadialState(null);
  }, [setRadialState]);

  useEffect(() => {
    const onBlur = () => closeRadial();
    const onResize = () => closeRadial();
    const onKey = (event) => {
      if (event.key === "Escape") closeRadial();
    };
    const onStatus = (event) => {
      if (event.detail?.state === "disconnected") closeRadial();
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tablet:hid-status", onStatus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tablet:hid-status", onStatus);
    };
  }, [closeRadial]);

  useEffect(() => {
    const handler = () => openRadial("mouse");
    window.addEventListener("tablet:open-style-ring", handler);
    return () => window.removeEventListener("tablet:open-style-ring", handler);
  }, [openRadial]);

  useEffect(() => {
    const handler = () => {
      const point = mouseRef.current;
      bridge()?.contextMenu(point.x, point.y);
    };
    window.addEventListener("tablet:native-menu", handler);
    return () => window.removeEventListener("tablet:native-menu", handler);
  }, []);

  const openBubble = useCallback(() => {
    const api = bridge();
    if (!api) return;
    const context = api.getContext?.();
    if (!context) return;
    // 图片不弹样式
    if (context.selectedTypes.length === 1 && context.selectedTypes[0] === "image") return;
    setOpenPanel(null);
    setRadialState(null);
    const bx = Math.min(Math.max(penRef.current.x, 176), window.innerWidth - 176);
    const by = Math.min(Math.max(penRef.current.y - 96, 80), window.innerHeight - 160);
    console.log("[bubble] open at", Math.round(bx), Math.round(by), "pen", Math.round(penRef.current.x), Math.round(penRef.current.y));
    setBubble({ context, x: bx, y: by });
  }, [setRadialState]);

  // 菜单栏的「保存画板」「打开画板…」，以及操作后的提示条
  useEffect(() => {
    const currentName = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem("tablet.boards") || "null");
        const active = parsed?.boards?.find((board) => board.id === parsed.active);
        return active?.name || "未命名画板";
      } catch {
        return "未命名画板";
      }
    };
    const onSave = () => saveScene(currentName());
    const onOpen = () => openScene();
    let timer = 0;
    const onToast = (event) => {
      setToastText(String(event.detail || ""));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToastText(""), 2600);
    };
    window.addEventListener("tablet:save", onSave);
    window.addEventListener("tablet:open", onOpen);
    window.addEventListener("ts:toast", onToast);
    return () => {
      window.removeEventListener("tablet:save", onSave);
      window.removeEventListener("tablet:open", onOpen);
      window.removeEventListener("ts:toast", onToast);
      window.clearTimeout(timer);
    };
  }, []);

  // 演示入口：主进程在全自动验收时用它逐个打开面板
  useEffect(() => {
    const handler = (event) => {
      const what = event.detail;
      if (what === "radial") openRadial("pen");
      else if (what === "toolring") openToolRadial("pen");
      else if (what === "bubble") openBubble();
      else if (what === "settings") setSettingsOpen(true);
      else if (["menu", "canvas", "library", "more"].includes(what)) {
        setRadialState(null);
        setBubble(null);
        setOpenPanel(what);
      } else {
        setOpenPanel(null);
        setSettingsOpen(false);
        setRadialState(null);
        setBubble(null);
      }
    };
    window.addEventListener("tablet:demo", handler);
    return () => window.removeEventListener("tablet:demo", handler);
  }, [openRadial, openToolRadial, openBubble, setRadialState]);

  // 拖动浮岛：按住把手跟手，松手吸附到最近的边。
  // 拖动期间只改 transform（合成层），不 setState、不触发布局与写盘。
  const onGripDown = (event) => {
    event.preventDefault();
    const el = islandRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const drag = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      w: rect.width,
      h: rect.height,
      originX: rect.left,
      originY: rect.top,
      // 未定位时 CSS 用 translateY(-50%) 垂直居中，拖动必须保留这条基线
      baseTransform: islandPos ? "" : "translateY(-50%)",
      moved: false,
      pending: null,
      raf: 0
    };
    dragRef.current = drag;
    setIslandDragging(true);
    window.__tsIslandDragging = true;

    const paint = () => {
      drag.raf = 0;
      const target = drag.pending;
      if (!target) return;
      const shift = `translate3d(${target.x - drag.originX}px, ${target.y - drag.originY}px, 0)`;
      el.style.transform = drag.baseTransform ? drag.baseTransform + " " + shift : shift;
    };

    const onMove = (moveEvent) => {
      drag.moved = true;
      drag.pending = clampIsland(
        { x: moveEvent.clientX - drag.dx, y: moveEvent.clientY - drag.dy },
        drag.w,
        drag.h
      );
      // 高频笔报告合并到每帧一次，避免重复样式写入抢占画布输入
      if (!drag.raf) drag.raf = requestAnimationFrame(paint);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (drag.raf) cancelAnimationFrame(drag.raf);
      drag.raf = 0;
      dragRef.current = null;
      window.__tsIslandDragging = false;
      setIslandDragging(false);
      if (!drag.moved || !drag.pending) {
        el.style.transform = "";
        return;
      }
      const snapped = snapIsland(drag.pending, drag.w, drag.h);
      // 先落到真实坐标再交回 React，避免提交前回弹到旧位置的中间帧
      el.style.left = snapped.x + "px";
      el.style.top = snapped.y + "px";
      el.style.transform = "";
      setIslandPos(snapped);
      // 面板朝向跟最终位置，不等下一次 effect 的时序
      setSide(snapped.x + drag.w / 2 < window.innerWidth / 2 ? "left" : "right");
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // 双击把手：复位到右侧、垂直居中
  const resetIsland = useCallback(() => {
    const el = islandRef.current;
    const w = el?.offsetWidth || 84;
    const h = el?.offsetHeight || 420;
    setIslandPos(
      clampIsland({ x: window.innerWidth - w - islandMargin(), y: (window.innerHeight - h) / 2 }, w, h)
    );
    setSide("right");
  }, []);

  const closeAll = useCallback(() => {
    setOpenPanel(null);
    setRadialState(null);
    setBubble(null);
  }, [setRadialState]);

  const currentLabel = TOOL_LABEL[tool] || "选择";
  const currentBoardName =
    boards.find((board) => board.id === activeBoard)?.name || "未命名画板";

  const panelNode = useMemo(() => {
    if (!openPanel) return null;
    const common = { onClose: () => setOpenPanel(null), side };
    if (openPanel === "menu") {
      return (
        <MenuPanel
          {...common}
          boardName={boards.find((board) => board.id === activeBoard)?.name}
          onSettings={() => {
            setOpenPanel(null);
            setSettingsOpen(true);
          }}
        />
      );
    }
    if (openPanel === "canvas") {
      return (
        <CanvasPanel
          {...common}
          boards={boards}
          active={activeBoard}
          onSelect={(id) => {
            setActiveBoard(id);
            setOpenPanel(null);
          }}
          onCreate={() => {
            const next = {
              id: `board-${Date.now().toString(36)}`,
              name: `画布 ${boards.length + 1}`,
              elements: 0,
              updated: Date.now()
            };
            setBoards((current) => [...current, next]);
            setActiveBoard(next.id);
            setOpenPanel(null);
          }}
        />
      );
    }
    if (openPanel === "library") {
      return <LibraryPanel {...common} />;
    }
    if (openPanel === "more") {
      return (
        <MorePanel
          {...common}
          boardName={boards.find((board) => board.id === activeBoard)?.name}
          slots={overflow}
          onPick={(slot) => {
            activate(slot);
            setOpenPanel(null);
          }}
        />
      );
    }
    return null;
  }, [openPanel, side, boards, activeBoard, activate, overflow]);

  return (
    <div className="ts-layer" data-ts-ui="" onClick={(event) => event.stopPropagation()}>
      {/* 按键带：窗口顶部就是真机的按键带，整条可拖窗口、双击最大化 */}
      <div className="ts-band" onDoubleClick={() => window.dispatchEvent(new Event("ts:maximize"))}>
        <div className="ts-band-head">
        <div className="ts-topbar-left">
          <span className="ts-topbar-title">{currentBoardName}</span>
          <span className="ts-topbar-sep" />
          <span className="ts-topbar-tool">{currentLabel}</span>
        </div>
        <div className="ts-topbar-right">
          <span
            className={`ts-hid-dot${hidStatus?.state === "ready" ? " is-on" : ""}${
              grabbed ? " is-grab" : ""
            }`}
          />
          <span className="ts-topbar-hid">
            {hidStatus?.state === "ready"
              ? "手写板已连接"
              : hidStatus?.state === "no-device"
                ? "未检测到手写板"
                : hidStatus?.state === "no-permission"
                  ? "缺少输入监控权限"
                  : "连接中"}
          </span>
        </div>
        </div>

        <PadBand
          flash={padFlash}
          bindings={layout.surfaces.onboardKeys.ids}
          onKey={(index) => {
            const id = layout.surfaces.onboardKeys.ids[index];
            const slot = resolveSlot(id);
            if (slot) activate(slot);
          }}
        />
      </div>

      {/* 浮岛：默认右侧居中，可拖到任意位置，松手吸附最近边 */}
      <div
        ref={islandRef}
        className={`ts-island ts-island--${side}${islandPos ? " is-positioned" : ""}${
          islandDragging ? " is-dragging" : ""
        }`}
        style={islandPos ? { left: islandPos.x, top: islandPos.y } : undefined}
      >
        <div
          className="ts-island-grip"
          title="拖动浮岛（双击复位）"
          onPointerDown={onGripDown}
          onDoubleClick={resetIsland}
        >
          <Icons.grip />
        </div>

        <div className="ts-island-grid">
          {visible.map((slot, index) => {
            const Icon = Icons[slot.icon] || Icons.more;
            const selected = slot.tool
              ? slot.tool === tool
              : slot.action === "lock"
                ? toolLocked
                : false;
            return (
              <button
                key={slot.id}
                type="button"
                className={`ts-cell${selected ? " is-on" : ""}${
                  slot.panel && openPanel === slot.panel ? " is-open" : ""
                }`}
                title={`${slot.label}${
                  slot.action === "lock"
                    ? toolLocked
                      ? "（已锁定工具）"
                      : "（绘制后保持工具）"
                    : index < 8
                      ? `（板载键 ${index + 1}）`
                      : ""
                }`}
                onClick={() => activate(slot)}
              >
                <Icon />
              </button>
            );
          })}
          <button
            type="button"
            className={`ts-cell ts-cell--more${openPanel === "more" ? " is-open" : ""}`}
            title="更多"
            onClick={() => {
              setRadialState(null);
              setBubble(null);
              setOpenPanel((current) => (current === "more" ? null : "more"));
            }}
          >
            <Icons.more />
          </button>
        </div>
      </div>

      {/* 左侧样式岛：有选中图元才显示，与侧键样式环共用定义 */}
      {styleContext ? <LeftStyleIsland context={styleContext} layout={layout} /> : null}

      {panelNode}

      {radial ? (
        <RadialMenu
          x={radial.x}
          y={radial.y}
          scale={uiScale}
          slots={radial.slots}
          outerSlots={radial.outerOpen ? radial.outerSlots : []}
          centerLabel={radial.outerOpen ? "返回" : radial.centerLabel}
          followPen={radial.source === "pen"}
          onAction={handleWheelAction}
          onCenter={handleWheelCenter}
        />
      ) : null}

      {bubble ? (
        <StyleBubble
          context={bubble.context}
          x={bubble.x}
          y={bubble.y}
          onClose={() => setBubble(null)}
          onChange={(patch) => bridge()?.setStyle(patch)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsWindow
          onClose={() => setSettingsOpen(false)}
          onClearCanvas={() => bridge()?.clearCanvas()}
        />
      ) : null}

      {/* 读数板固定右上，不再随右侧工具岛换边 */}
      {teleOpen ? (
        <PenTelemetry side="right" onClose={() => setTeleOpen(false)} />
      ) : (
        <PenTelemetryChip side="right" onClick={() => setTeleOpen(true)} />
      )}

      {/* 唯一指示器：手写笔与鼠标共用。位置由 paintCursor 直写 DOM，这里只管形状。 */}
      <div
        ref={cursorElRef}
        className={`ts-pen-cursor${cursorShape.down ? " is-down" : ""}${crosshair ? " is-cross" : ""}`}
        style={{ display: cursorShape.visible ? "" : "none" }}
      />

      {toastText ? <div className="ts-toast">{toastText}</div> : null}

      {/* 浮层打开时铺一层透明垫子，点空白关掉且不落笔 */}
      {openPanel || radial || bubble ? (
        <div className="ts-scrim" onClick={closeAll} aria-hidden="true" />
      ) : null}
    </div>
  );
}

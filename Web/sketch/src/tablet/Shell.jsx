import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "./icons";
import { MenuPanel, CanvasPanel, LibraryPanel, MorePanel } from "./panels";
import { RadialMenu } from "./RadialMenu";
import { StyleBubble } from "./StyleBubble";
import { SettingsWindow } from "./settings/SettingsWindow";
import { saveScene, openScene } from "./scene-files";
import { PadBand } from "./PadBand.jsx";
import { PenTelemetry, PenTelemetryChip } from "./PenTelemetry.jsx";
import { buildLevel1, buildLevel2, categoryLabel } from "./style-wheel";
import "./chrome.css";

/** 浮岛默认槽位：前 8 格与板载键 1–8 一一对应。 */
const DEFAULT_SLOTS = [
  { id: "menu", icon: "menu", label: "菜单", panel: "menu" },
  { id: "canvas", icon: "canvas", label: "画布", panel: "canvas" },
  { id: "library", icon: "library", label: "素材", panel: "library" },
  { id: "pen", icon: "pen", label: "笔", tool: "freedraw" },
  { id: "eraser", icon: "eraser", label: "擦", tool: "eraser" },
  { id: "hand", icon: "hand", label: "手", tool: "hand" },
  { id: "select", icon: "select", label: "选", tool: "selection" },
  { id: "rectangle", icon: "rectangle", label: "矩", tool: "rectangle" },
  { id: "ellipse", icon: "ellipse", label: "椭", tool: "ellipse" },
  { id: "arrow", icon: "arrow", label: "箭", tool: "arrow" },
  { id: "text", icon: "text", label: "字", tool: "text" },
  { id: "diamond", icon: "diamond", label: "菱", tool: "diamond" },
  { id: "line", icon: "line", label: "线", tool: "line" },
  { id: "image", icon: "image", label: "图", tool: "image" },
  { id: "lock", icon: "lock", label: "锁", action: "lock" }
];

/** 双排上限 16 格，超过部分进「更多」。 */
const VISIBLE_LIMIT = 15;

const TOOL_LABEL = {
  freedraw: "笔",
  eraser: "橡皮",
  hand: "平移",
  selection: "选择",
  rectangle: "矩形",
  ellipse: "椭圆",
  arrow: "箭头",
  line: "直线",
  text: "文字",
  diamond: "菱形",
  image: "图片"
};

function bridge() {
  return window.tabletSketch ?? null;
}

export function TabletShell({ onOpenSettings }) {
  const [openPanel, setOpenPanel] = useState(null);
  const [side, setSide] = useState("right");
  const [tool, setTool] = useState("selection");
  const [hidStatus, setHidStatus] = useState(() => window.__tsHidStatus || null);
  const [radial, setRadial] = useState(null);
  const [bubble, setBubble] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  // 独占打开成功后系统不再画指针，光标由我们自己画
  const [grabbed, setGrabbed] = useState(false);
  const [penPos, setPenPos] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [padFlash, setPadFlash] = useState(null);
  // 压感 / 倾斜测试读数
  const [telemetry, setTelemetry] = useState(null);
  const [teleOpen, setTeleOpen] = useState(true);
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const dragRef = useRef(null);
  // 笔最近一次落点：径向菜单和样式气泡都以它为中心，而不是屏幕中心
  const penRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const penPosRef = useRef(null);
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const radialRef = useRef(null);
  const toastTimerRef = useRef(0);

  const visible = DEFAULT_SLOTS.slice(0, VISIBLE_LIMIT);
  const overflow = DEFAULT_SLOTS.slice(VISIBLE_LIMIT);

  // 记住笔的悬停位置，菜单弹出时贴着笔尖
  useEffect(() => {
    const onHover = (event) => {
      if (event.detail) penRef.current = event.detail;
    };
    window.addEventListener("tablet:hover", onHover);
    return () => window.removeEventListener("tablet:hover", onHover);
  }, []);

  // 光标位置是唯一可信的"笔现在在哪"，每帧都同步给 menu 定位用。
  // 只靠 hover 会停在最后一次悬停点，笔一动就对不上。
  useEffect(() => {
    if (penPos && Number.isFinite(penPos.x) && Number.isFinite(penPos.y)) {
      penRef.current = { x: penPos.x, y: penPos.y };
    }
  }, [penPos]);

  // 工具状态跟着画布走（用户可能用快捷键切了工具）
  useEffect(() => {
    const timer = setInterval(() => {
      const api = bridge();
      if (!api) return;
      const next = api.getTool();
      if (next) setTool(next);
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // 压感 / 倾斜：只给右上角读数板用
  useEffect(() => {
    const onTele = (event) => setTelemetry(event.detail);
    window.addEventListener("tablet:telemetry", onTele);
    return () => window.removeEventListener("tablet:telemetry", onTele);
  }, []);

  // HID 状态、板载键、侧键
  useEffect(() => {
    const onStatus = (event) => setHidStatus(event.detail);
    const onKeys = (event) => {
      const { kind, keys, source } = event.detail;
      if (radialRef.current) return;
      if (kind === "side") {
        if (keys.includes(0)) openRadial(source === "mouse" ? "mouse" : "pen");
        if (keys.includes(1)) openBubble();
        if (keys.includes(2)) applyTool("eraser");
        return;
      }
      // 板载键：只点亮按键带上对应的位置。
      // 真机这 8 个键固件已经翻译成 b/e/[/]/Ctrl+Z…，动作由原生快捷键完成，
      // 这里再联动浮岛会双重执行（例如撤销被撤两次）。
      for (const index of keys) {
        setPadFlash({ index, seq: Date.now() + index });
      }
    };
    window.addEventListener("tablet:hid-status", onStatus);
    window.addEventListener("tablet:keys", onKeys);
    return () => {
      window.removeEventListener("tablet:hid-status", onStatus);
      window.removeEventListener("tablet:keys", onKeys);
    };
  }, [visible]);

  // 菜单栏「设置…」
  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("tablet:open-settings", handler);
    return () => window.removeEventListener("tablet:open-settings", handler);
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

  // 笔尖位置与独占状态
  useEffect(() => {
    const onPos = (event) => {
      const detail = event.detail;
      setPenPos(detail);
    };
    const onGrab = (event) => setGrabbed(!!event.detail?.ok);
    window.addEventListener("tablet:penpos", onPos);
    window.addEventListener("tablet:grab", onGrab);
    return () => {
      window.removeEventListener("tablet:penpos", onPos);
      window.removeEventListener("tablet:grab", onGrab);
    };
  }, []);

  useEffect(() => {
    penPosRef.current = penPos;
  }, [penPos]);

  useEffect(() => {
    radialRef.current = radial;
  }, [radial]);

  useEffect(() => {
    const onMouse = (event) => {
      const detail = event.detail;
      if (detail) mouseRef.current = { x: detail.x, y: detail.y };
      setMousePos(detail || null);
    };
    window.addEventListener("tablet:mousepos", onMouse);
    return () => window.removeEventListener("tablet:mousepos", onMouse);
  }, []);

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
      const built = buildLevel1(context);
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

  const closeRadial = useCallback(() => {
    setRadialState(null);
  }, [setRadialState]);

  const openLevel2 = useCallback(
    (category) => {
      const current = radialRef.current;
      if (!current) return;
      const built = buildLevel2(category, current.context);
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
    [openLevel2, setRadialState, showToast]
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
  }, [openRadial, openBubble, setRadialState]);

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
        const context = api?.getContext?.();
        if (context?.selectedTypes.length) api.setStyle({ locked: true });
        return;
      }
    },
    [applyTool]
  );

  // 拖动换边：按住把手移动，越过窗口中轴就翻到另一侧
  const onGripDown = (event) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, side };
    const onMove = (moveEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const mid = window.innerWidth / 2;
      const next = moveEvent.clientX < mid ? "left" : "right";
      if (next !== drag.side) {
        drag.side = next;
        setSide(next);
      }
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

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
          onKey={(index) => {
            const slot = visible[index];
            if (slot) activate(slot);
          }}
        />
      </div>

      {/* 右侧浮岛 */}
      <div className={`ts-island ts-island--${side}`}>
        <div
          className="ts-island-grip"
          title="拖动换边"
          onPointerDown={onGripDown}
          onDoubleClick={() => setSide("right")}
        >
          <Icons.grip />
        </div>

        <div className="ts-island-grid">
          {visible.map((slot, index) => {
            const Icon = Icons[slot.icon] || Icons.more;
            const selected = slot.tool && slot.tool === tool;
            return (
              <button
                key={slot.id}
                type="button"
                className={`ts-cell${selected ? " is-on" : ""}${
                  slot.panel && openPanel === slot.panel ? " is-open" : ""
                }`}
                title={`${slot.label}${index < 8 ? `（板载键 ${index + 1}）` : ""}`}
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

      {panelNode}

      {radial ? (
        <RadialMenu
          x={radial.x}
          y={radial.y}
          slots={radial.slots}
          outerSlots={radial.outerOpen ? radial.outerSlots : []}
          centerLabel={radial.outerOpen ? "返回" : radial.centerLabel}
          hoverPoint={radial.source === "pen" && penPos ? { x: penPos.x, y: penPos.y } : null}
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

      {teleOpen ? (
        <PenTelemetry data={telemetry} side={side} onClose={() => setTeleOpen(false)} />
      ) : (
        <PenTelemetryChip side={side} onClick={() => setTeleOpen(true)} />
      )}

      {penPos ? (
        <div
          className={`ts-pen-cursor${penPos.down ? " is-down" : ""}`}
          style={{ transform: `translate3d(${penPos.x}px, ${penPos.y}px, 0)` }}
        />
      ) : null}

      {mousePos ? (
        <div
          className={`ts-mouse-dot${mousePos.down ? " is-down" : ""}`}
          style={{ transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)` }}
        />
      ) : null}

      {toastText ? <div className="ts-toast">{toastText}</div> : null}

      {/* 浮层打开时铺一层透明垫子，点空白关掉且不落笔 */}
      {openPanel || radial || bubble ? (
        <div className="ts-scrim" onClick={closeAll} aria-hidden="true" />
      ) : null}
    </div>
  );
}

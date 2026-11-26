import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "./icons";

/** 下拉面板的公共外壳：标题 + 内容 + 可选页脚。 */
function Panel({ title, side, onClose, footer, children, width = 264 }) {
  return (
    <div
      className={`ts-panel ts-panel--${side}`}
      style={{ width }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="ts-panel-head">
        <span className="ts-panel-title">{title}</span>
        <button type="button" className="ts-panel-close" onClick={onClose} title="关闭">
          <Icons.close />
        </button>
      </div>
      <div className="ts-panel-body">{children}</div>
      {footer ? <div className="ts-panel-foot">{footer}</div> : null}
    </div>
  );
}

function Row({ icon, label, hint, onClick, danger, active }) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <button
      type="button"
      className={`ts-row${danger ? " is-danger" : ""}${active ? " is-on" : ""}`}
      onClick={onClick}
    >
      <span className="ts-row-icon">{Icon ? <Icon /> : null}</span>
      <span className="ts-row-label">{label}</span>
      {hint ? <span className="ts-row-hint">{hint}</span> : null}
    </button>
  );
}

// ---------------------------------------------------------------- 菜单

export function MenuPanel({ side, onClose, onSettings }) {
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    const api = window.tabletSketch;
    if (!api) return;
    const payload = {
      type: "excalidraw",
      version: 2,
      source: "tablet-sketch",
      elements: api.getSceneElements?.() ?? [],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {}
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `画板-${new Date().toISOString().slice(0, 10)}.excalidraw`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onClose();
  };

  const open = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".excalidraw,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        window.tabletSketch?.loadScene?.(data);
      } catch {
        window.alert("这个文件不是有效的 .excalidraw");
      }
      onClose();
    };
    input.click();
  };

  return (
    <Panel title="菜单" side={side} onClose={onClose}>
      <Row icon="style" label="设置…" hint="⌘," onClick={onSettings} />
      <div className="ts-divider" />
      <Row icon="canvas" label="打开画板…" onClick={open} />
      <Row icon="library" label="保存画板" hint="⌘S" onClick={save} />
      <div className="ts-divider" />
      {confirming ? (
        <div className="ts-confirm">
          <span>清空整个画布？可以撤销。</span>
          <div className="ts-confirm-actions">
            <button type="button" className="ts-btn" onClick={() => setConfirming(false)}>
              取消
            </button>
            <button
              type="button"
              className="ts-btn is-danger"
              onClick={() => {
                window.tabletSketch?.clearCanvas();
                setConfirming(false);
                onClose();
              }}
            >
              清空
            </button>
          </div>
        </div>
      ) : (
        <Row icon="trash" label="清空画布" danger onClick={() => setConfirming(true)} />
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- 画布

export function CanvasPanel({ side, onClose, boards, active, onSelect, onCreate }) {
  return (
    <Panel
      title={`画布 · ${boards.length}`}
      side={side}
      onClose={onClose}
      footer={
        <button type="button" className="ts-btn is-wide" onClick={onCreate}>
          <Icons.plus />
          新建画布
        </button>
      }
    >
      {boards.length === 0 ? (
        <div className="ts-empty">还没有其他画布</div>
      ) : (
        boards.map((board) => (
          <button
            key={board.id}
            type="button"
            className={`ts-board${board.id === active ? " is-on" : ""}`}
            onClick={() => onSelect(board.id)}
          >
            <span className="ts-board-main">
              <span className="ts-board-name">{board.name}</span>
              <span className="ts-board-meta">
                {board.elements ? `${board.elements} 个元素` : "空白"}
              </span>
            </span>
            {board.id === active ? <Icons.check /> : null}
          </button>
        ))
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- 素材

export function LibraryPanel({ side, onClose }) {
  const libraries = window.__tsLibraries?.libraries ?? [];
  const [activeId, setActiveId] = useState(null);
  const active = libraries.find((item) => item.id === activeId) || null;

  return (
    <>
      <Panel title={`素材 · ${libraries.length}`} side={side} onClose={onClose} width={280}>
        <div className="ts-lib-list">
          {libraries.map((library) => (
            <button
              key={library.id}
              type="button"
              className={`ts-lib${library.id === activeId ? " is-on" : ""}`}
              onClick={() => setActiveId(library.id)}
            >
              <span className="ts-lib-name">{library.label || library.name}</span>
              <span className="ts-lib-count">{library.itemCount}</span>
            </button>
          ))}
        </div>
      </Panel>

      {active ? (
        <div
          className={`ts-lib-detail ts-lib-detail--${side === "right" ? "left" : "right"}`}
          style={{ width: 300 }}
        >
          <div className="ts-panel-head">
            <span className="ts-panel-title">{active.label || active.name}</span>
            <button type="button" className="ts-panel-close" onClick={() => setActiveId(null)}>
              <Icons.close />
            </button>
          </div>
          <div className="ts-panel-body">
            <p className="ts-lib-desc">{active.description}</p>
            <div className="ts-lib-grid">
              {(active.items || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="ts-lib-item"
                  title={item.name}
                  onClick={() => window.tabletSketch?.insertLibraryItem(item.id)}
                >
                  {item.name || "未命名"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- 更多

export function MorePanel({ side, onClose, slots, onPick }) {
  return (
    <Panel title="更多" side={side} onClose={onClose}>
      {slots.length === 0 ? (
        <div className="ts-empty">没有超出的工具</div>
      ) : (
        slots.map((slot) => {
          const Icon = Icons[slot.icon] || Icons.more;
          return (
            <button key={slot.id} type="button" className="ts-row" onClick={() => onPick(slot)}>
              <span className="ts-row-icon">
                <Icon />
              </span>
              <span className="ts-row-label">{slot.label}</span>
            </button>
          );
        })
      )}
    </Panel>
  );
}

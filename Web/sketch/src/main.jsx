import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Excalidraw,
  exportToCanvas,
  restoreElements,
  restoreAppState,
  serializeAsJSON
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./sketch.css";
import libraryBundle from "./libraries.generated.json";
import { installTabletSketch } from "./tablet-sketch.js";
import { TabletShell } from "./tablet/Shell.jsx";

const MESSAGE_HANDLER = "deckSketch";

function post(type, payload = {}) {
  try {
    window.webkit?.messageHandlers?.[MESSAGE_HANDLER]?.postMessage({ type, ...payload });
  } catch (error) {
    console.warn("native bridge unavailable", error);
  }
}

let toastSetter = null;
function showToast(text, kind = "ok") {
  toastSetter?.({ id: Date.now(), text, kind });
}

let excalidrawAPI = null;

// 自绘界面（shell 侧面板）通过这个全局读素材库列表
window.__tsLibraries = libraryBundle;
let hydrated = false;
let pendingScene = null;
let saveTimer = null;
let boardUI = { boards: [], activeID: "" };
let boardUISetter = null;
let switchingSetter = null;
let switchStartedAt = 0;

const LIBRARY_SEED_KEY = `deck.librarySeed.v${libraryBundle.version}`;
const LIBRARY_LOADED_KEY = `deck.libraryLoaded.v${libraryBundle.version}`;

function loadedLibraryIDs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_LOADED_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function markLibrariesLoaded(entries) {
  const ids = new Set([...loadedLibraryIDs(), ...entries.map((entry) => entry.id)]);
  localStorage.setItem(LIBRARY_LOADED_KEY, JSON.stringify([...ids]));
}

function libraryItemsFor(entries) {
  return entries.flatMap((library) => library.items || []);
}

async function mergeSelectedLibraries(entries, openLibraryMenu = false) {
  if (!excalidrawAPI) throw new Error("画板还没有准备好");
  const libraryItems = libraryItemsFor(entries);
  if (libraryItems.length === 0) throw new Error("素材库为空");
  await excalidrawAPI.updateLibrary({
    libraryItems,
    merge: true,
    openLibraryMenu,
    defaultStatus: "published"
  });
  return libraryItems.length;
}

async function seedLibraries() {
  if (!excalidrawAPI) return;
  try {
    if (localStorage.getItem(LIBRARY_SEED_KEY) === "done") return;
    await mergeSelectedLibraries(libraryBundle.libraries);
    localStorage.setItem(LIBRARY_SEED_KEY, "done");
    markLibrariesLoaded(libraryBundle.libraries);
  } catch (error) {
    console.warn("seed libraries failed", error);
  }
}

function openLibrarySidebar() {
  excalidrawAPI?.updateScene({
    appState: { openSidebar: { name: "default", tab: "library" } }
  });
}

function getNonDeletedElements(elements) {
  return elements.filter((element) => !element.isDeleted);
}

function selectedElementsWithBindings(elements, selectedIDs) {
  const selected = new Set(Object.keys(selectedIDs || {}).filter((id) => selectedIDs[id]));
  if (selected.size === 0) return [];
  const byID = new Map(elements.map((element) => [element.id, element]));
  for (const id of Array.from(selected)) {
    const element = byID.get(id);
    if (!element) continue;
    if (element.containerId) selected.add(element.containerId);
    for (const bound of element.boundElements || []) selected.add(bound.id);
  }
  return elements.filter((element) => selected.has(element.id) && !element.isDeleted);
}

function sceneJSON() {
  if (!excalidrawAPI) return "";
  return serializeAsJSON(
    getNonDeletedElements(excalidrawAPI.getSceneElements()),
    excalidrawAPI.getAppState(),
    excalidrawAPI.getFiles(),
    "local"
  );
}

function loadScene(json) {
  pendingScene = json;
  if (!excalidrawAPI || !json) {
    hydrated = true;
    return;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const scene = JSON.parse(json);
    const elements = restoreElements(scene.elements || [], null, {
      refreshDimensions: true,
      repairBindings: true
    });
    const restoredAppState = restoreAppState(scene.appState || null, null);
    const savedCamera =
      scene.appState &&
      Number(scene.appState.zoom?.value) > 0 &&
      Number.isFinite(scene.appState.scrollX) &&
      Number.isFinite(scene.appState.scrollY);
    excalidrawAPI.updateScene({
      elements,
      appState: {
        ...restoredAppState,
        viewBackgroundColor: "#ffffff",
        theme: "light",
        selectedElementIds: {},
        editingElement: null,
        openDialog: null,
        openSidebar: null,
        ...(savedCamera ? {} : elements.length === 0 ? { zoom: { value: 1 }, scrollX: 0, scrollY: 0 } : {})
      }
    });
    if (scene.files && Object.keys(scene.files).length > 0) {
      excalidrawAPI.addFiles(Object.values(scene.files));
    }
    excalidrawAPI.history.clear();
    if (!savedCamera && elements.length > 0) {
      setTimeout(() => excalidrawAPI?.scrollToContent(elements, { fitToContent: true }), 60);
    }
  } catch (error) {
    console.error("load scene failed", error);
    showToast("画布读取失败，已打开空白画板", "error");
  }
  pendingScene = null;
  hydrated = true;
}

function publishBoards(activeID, boardsJson) {
  let next = [];
  try {
    const parsed = JSON.parse(boardsJson || "[]");
    if (Array.isArray(parsed)) next = parsed;
  } catch (error) {
    console.warn("board list parse failed", error);
  }
  boardUI = { boards: next, activeID: activeID || "" };
  boardUISetter?.(boardUI);
}

function beginSwitch() {
  switchStartedAt = performance.now();
  switchingSetter?.(true);
}

function finishSwitch() {
  const elapsed = performance.now() - switchStartedAt;
  const delay = Math.max(0, 180 - elapsed);
  setTimeout(() => switchingSetter?.(false), delay);
}

function endSwitch() {
  switchingSetter?.(false);
}

function currentSceneForBoardRequest() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return sceneJSON();
}

async function exportPNG(scale = 2, padding = 24, background = "white") {
  if (!excalidrawAPI) throw new Error("画板还没有准备好");
  const all = getNonDeletedElements(excalidrawAPI.getSceneElements());
  if (all.length === 0) throw new Error("画板还是空的，先画点内容");

  const appState = excalidrawAPI.getAppState();
  const selected = selectedElementsWithBindings(all, appState.selectedElementIds);
  const elements = selected.length > 0 ? selected : all;

  const canvas = await exportToCanvas({
    elements,
    appState: {
      ...appState,
      exportBackground: background !== "transparent",
      viewBackgroundColor: background === "transparent" ? "transparent" : "#ffffff",
      exportWithDarkMode: false,
      exportScale: Number(scale) || 2,
      exportEmbedScene: false
    },
    files: excalidrawAPI.getFiles(),
    exportPadding: Number(padding) || 24,
    maxWidthOrHeight: 3000
  });

  const dataURL = canvas.toDataURL("image/png");
  return {
    base64: dataURL.slice(dataURL.indexOf(",") + 1),
    width: canvas.width,
    height: canvas.height,
    selected: selected.length > 0
  };
}

function aiJSON() {
  if (!excalidrawAPI) throw new Error("画板还没有准备好");
  const all = getNonDeletedElements(excalidrawAPI.getSceneElements());
  if (all.length === 0) throw new Error("画板还是空的，先画点内容");

  const appState = excalidrawAPI.getAppState();
  const selected = selectedElementsWithBindings(all, appState.selectedElementIds);
  const elements = selected.length > 0 ? selected : all;
  const selectedOnly = selected.length > 0;

  const scene = JSON.parse(
    serializeAsJSON(
      elements,
      { ...appState, selectedElementIds: {} },
      {},
      "local"
    )
  );

  const typeCounts = elements.reduce((counts, element) => {
    const type = element.type || "unknown";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  const textElements = elements.filter(
    (element) => element.type === "text" && typeof element.text === "string"
  );
  const texts = textElements
    .map((element) => element.text.trim())
    .filter(Boolean)
    .slice(0, 100);

  const bounds = elements.reduce(
    (box, element) => {
      const x = Number(element.x) || 0;
      const y = Number(element.y) || 0;
      const width = Number(element.width) || 0;
      const height = Number(element.height) || 0;
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x + width);
      box.maxY = Math.max(box.maxY, y + height);
      return box;
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const hasImages = elements.some((element) => element.type === "image");

  return JSON.stringify(
    {
      format: "macapp-controldeck/ui-sketch",
      schemaVersion: 1,
      contentType: "application/vnd.macappcontroldeck.ui-sketch+json",
      isDiagram: true,
      diagramType: "ui-sketch",
      ai: {
        kind: "diagram",
        isDiagram: true,
        title: "UI 草图",
        message:
          "这是一个图形/示意图（UI 草图），不是普通文本。请把 scene.elements 当作画布上的图形元素来理解，而不是把坐标、颜色、尺寸当作文本内容。",
        howToRead: [
          "scene.elements 是 Excalidraw 图形元素数组；type 表示 rectangle / ellipse / diamond / arrow / line / freedraw / text / image 等。",
          "x、y 是元素左上角坐标，width、height 是尺寸；arrow、line、freedraw 的 points 是相对路径点。",
          "text 元素的 text 字段是画面上的文字；containerId 表示文字绑定在某个形状内。",
          "backgroundColor 为 transparent 表示无填充；strokeColor 是描边颜色。",
          "groupIds 相同的元素属于同一组；boundElements 表示箭头或文字与该元素的绑定关系。"
        ],
        selectedOnly
      },
      summary: {
        elementCount: elements.length,
        typeCounts,
        textCount: textElements.length,
        texts,
        bounds: {
          x: Number.isFinite(bounds.minX) ? bounds.minX : 0,
          y: Number.isFinite(bounds.minY) ? bounds.minY : 0,
          width: Number.isFinite(bounds.maxX - bounds.minX) ? bounds.maxX - bounds.minX : 0,
          height: Number.isFinite(bounds.maxY - bounds.minY) ? bounds.maxY - bounds.minY : 0
        },
        hasImages
      },
      notes: hasImages
        ? ["JSON 不包含图片二进制；image 元素只保留 fileId，纯文本无法还原位图。"]
        : [],
      scene
    },
    null,
    2
  );
}

window.deckSketch = {
  exportPNG,
  getAIJSON: aiJSON,
  getScene: sceneJSON,
  loadScene,
  initBoards: (activeID, boardsJson, scene) => {
    publishBoards(activeID, boardsJson);
    loadScene(scene);
    return true;
  },
  activateBoard: (activeID, boardsJson, scene) => {
    beginSwitch();
    publishBoards(activeID, boardsJson);
    loadScene(scene);
    finishSwitch();
    return true;
  },
  updateBoards: (activeID, boardsJson) => {
    publishBoards(activeID, boardsJson);
    return true;
  },
  endSwitch,
  requestSwitchBoard: (id) => {
    if (!id || id === boardUI.activeID) return false;
    beginSwitch();
    post("boardSwitchRequested", { id, scene: currentSceneForBoardRequest() });
    return true;
  },
  requestCreateBoard: () => {
    beginSwitch();
    post("boardCreateRequested", { scene: currentSceneForBoardRequest() });
  },
  requestRenameBoard: (id, title) => {
    post("boardRenameRequested", { id, title });
  },
  requestDeleteBoard: (id) => {
    if (id === boardUI.activeID) beginSwitch();
    post("boardDeleteRequested", { id, scene: currentSceneForBoardRequest() });
  },
  clear: () => {
    excalidrawAPI?.updateScene({
      elements: [],
      appState: { selectedElementIds: {}, editingElement: null }
    });
    excalidrawAPI?.history.clear();
    showToast("已清空当前画布");
  },
  hasContent: () =>
    !!excalidrawAPI && getNonDeletedElements(excalidrawAPI.getSceneElements()).length > 0,
  showToast
};

function Toast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    toastSetter = setToast;
    return () => {
      toastSetter = null;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  if (!toast) return null;
  return <div className={`deck-toast ${toast.kind === "error" ? "is-error" : ""}`}>{toast.text}</div>;
}

function relativeBoardTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "刚刚";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.6 2.7l2.7 2.7M3 13l1-3.4L11.4 2.6a1 1 0 011.4 0l.6.6a1 1 0 010 1.4L5.5 12 3 13z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M6.5 7v4M9.5 7v4" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.2l5.5 3.1L8 8.4 2.5 5.3 8 2.2zM2.5 8.2L8 11.3l5.5-3.1M2.5 11L8 14.1l5.5-3.1" />
    </svg>
  );
}

function BoardSwitcher({ ui, switching }) {
  const [open, setOpen] = useState(false);
  const [editingID, setEditingID] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDeleteID, setConfirmDeleteID] = useState(null);
  const rootRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const boards = ui.boards || [];
  const active = boards.find((board) => board.id === ui.activeID);

  useEffect(() => {
    document.body.classList.toggle("deck-board-menu-open", open);
    return () => document.body.classList.remove("deck-board-menu-open");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setEditingID(null);
        setConfirmDeleteID(null);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setEditingID(null);
        setConfirmDeleteID(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (editingID) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editingID]);

  const startRename = (board) => {
    setConfirmDeleteID(null);
    setEditingID(board.id);
    setEditingTitle(board.title);
  };

  const commitRename = (event) => {
    event?.preventDefault();
    const title = editingTitle.trim();
    if (!editingID) return;
    if (!title) {
      showToast("画布名称不能为空", "error");
      return;
    }
    window.deckSketch.requestRenameBoard(editingID, title);
    setEditingID(null);
  };

  const switchTo = (id) => {
    if (id === ui.activeID) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setEditingID(null);
    setConfirmDeleteID(null);
    window.deckSketch.requestSwitchBoard(id);
  };

  return (
    <div className="deck-board-switcher" ref={rootRef}>
      <button
        type="button"
        className={`deck-board-trigger${open ? " is-open" : ""}`}
        title="切换画布"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="deck-board-glyph">
          <LayersIcon />
        </span>
        <span className="deck-board-name">{active?.title || "画布"}</span>
        <span className={`deck-board-chevron${switching ? " is-spinning" : ""}`} />
      </button>

      {open ? (
        <div className="deck-board-popover" role="menu" aria-label="画布列表">
          <div className="deck-board-head">
            <span>画布</span>
            <span className="deck-board-count">{boards.length}</span>
          </div>
          <div className="deck-board-list">
            {boards.map((board) => {
              const isActive = board.id === ui.activeID;
              const isEditing = board.id === editingID;
              const isConfirming = board.id === confirmDeleteID;
              return (
                <div
                  className={`deck-board-row${isActive ? " is-active" : ""}${isConfirming ? " is-confirming" : ""}`}
                  key={board.id}
                >
                  {isEditing ? (
                    <form className="deck-board-rename" onSubmit={commitRename}>
                      <input
                        ref={inputRef}
                        value={editingTitle}
                        maxLength={40}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingID(null);
                          }
                        }}
                      />
                      <button type="submit" className="deck-board-save" title="保存名称">
                        ✓
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="deck-board-main"
                      onClick={() => switchTo(board.id)}
                    >
                      <span className="deck-board-dot" />
                      <span className="deck-board-copy">
                        <span className="deck-board-title">{board.title}</span>
                        <span className="deck-board-meta">
                          {board.elementCount > 0 ? `${board.elementCount} 个元素` : "空白画布"}
                          {board.modifiedAt ? ` · ${relativeBoardTime(board.modifiedAt)}` : ""}
                        </span>
                      </span>
                    </button>
                  )}

                  {!isEditing && !isConfirming ? (
                    <>
                      <span className="deck-board-check">✓</span>
                      <span className="deck-board-row-actions">
                        <button
                          type="button"
                          title="重命名"
                          onClick={() => startRename(board)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          title="删除画布"
                          className="is-danger"
                          onClick={() => {
                            setEditingID(null);
                            setConfirmDeleteID(board.id);
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </span>
                    </>
                  ) : null}

                  {isConfirming ? (
                    <div className="deck-board-confirm">
                      <span>删除这张画布？</span>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => {
                          window.deckSketch.requestDeleteBoard(board.id);
                          setConfirmDeleteID(null);
                        }}
                      >
                        删除
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteID(null)}>
                        取消
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="deck-board-create"
            onClick={() => {
              setOpen(false);
              window.deckSketch.requestCreateBoard();
            }}
          >
            <PlusIcon />
            新建画布
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2.5" width="5" height="5" rx="1" />
      <rect x="9" y="2.5" width="5" height="5" rx="1" />
      <rect x="2" y="8.5" width="5" height="5" rx="1" />
      <rect x="9" y="8.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function LibraryPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyID, setBusyID] = useState("");
  const rootRef = React.useRef(null);
  const searchRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const loaded = loadedLibraryIDs();
  const visible = needle
    ? libraryBundle.libraries.filter((library) =>
        `${library.label} ${library.name} ${library.description || ""}`
          .toLowerCase()
          .includes(needle)
      )
    : libraryBundle.libraries;

  const importLibraries = async (entries) => {
    if (busyID) return;
    const alreadyLoaded = loadedLibraryIDs();
    const pending = entries.filter((entry) => !alreadyLoaded.has(entry.id));
    if (pending.length === 0) {
      setOpen(false);
      openLibrarySidebar();
      showToast("该素材已在素材库中，直接打开素材库");
      return;
    }
    const key = entries.length === libraryBundle.libraries.length ? "all" : entries[0]?.id;
    setBusyID(key);
    try {
      const count = await mergeSelectedLibraries(pending, true);
      markLibrariesLoaded(pending);
      setOpen(false);
      showToast(
        pending.length === entries.length
          ? `已载入 ${pending.length} 组素材库 · ${count} 个组件`
          : `已补充 ${pending.length} 组素材库 · ${count} 个组件`
      );
    } catch (error) {
      console.error("load library failed", error);
      showToast("素材库载入失败", "error");
    } finally {
      setBusyID("");
    }
  };

  return (
    <div className="deck-library-picker" ref={rootRef}>
      <button
        type="button"
        className={`deck-action deck-library-trigger${open ? " is-open" : ""}`}
        title="浏览内置的精选素材库"
        onClick={() => setOpen((value) => !value)}
      >
        <LibraryIcon />
        精选素材
        <span className="deck-library-badge">{libraryBundle.totalItems}</span>
      </button>

      {open ? (
        <div className="deck-library-panel" role="dialog" aria-label="精选素材库">
          <div className="deck-library-head">
            <div>
              <div className="deck-library-title">精选素材库</div>
              <div className="deck-library-subtitle">
                {libraryBundle.libraries.length} 组 / {libraryBundle.totalItems} 个组件 · 离线可用
              </div>
            </div>
            <button
              type="button"
              className="deck-library-collapse"
              title="关闭"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="deck-library-search">
            <span className="deck-library-search-glyph" aria-hidden="true">
              ⌕
            </span>
            <input
              ref={searchRef}
              value={query}
              placeholder="搜索素材类别"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" title="清空搜索" onClick={() => setQuery("")}>
                ×
              </button>
            ) : null}
          </div>

          <div className="deck-library-list">
            {visible.length === 0 ? (
              <div className="deck-library-empty">没有匹配的素材库</div>
            ) : (
              visible.map((library) => (
                <button
                  type="button"
                  className="deck-library-row"
                  key={library.id}
                  disabled={!!busyID}
                  onClick={() => importLibraries([library])}
                >
                  <span className="deck-library-row-main">
                    <span className="deck-library-row-title">
                      {library.label}
                      <span className="deck-library-row-count">{library.itemCount}</span>
                    </span>
                    <span className="deck-library-row-desc">
                      {library.name}
                      {library.author ? ` · ${library.author}` : ""}
                    </span>
                  </span>
                  <span className="deck-library-row-action">
                    {busyID === library.id ? "载入中" : loaded.has(library.id) ? "已载入" : "载入"}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="deck-library-foot">
            <button
              type="button"
              className="deck-library-open"
              onClick={() => {
                setOpen(false);
                openLibrarySidebar();
              }}
            >
              打开素材库
            </button>
            <button
              type="button"
              className="deck-library-load-all"
              disabled={!!busyID}
              onClick={() => importLibraries(libraryBundle.libraries)}
            >
              {busyID === "all" ? "载入中" : "全部载入"}
            </button>
          </div>
          <div className="deck-library-source">
            素材来自 libraries.excalidraw.com · MIT License
          </div>
        </div>
      ) : null}
    </div>
  );
}

function isEditingText() {
  const active = document.activeElement;
  return (
    active &&
    (active.tagName === "TEXTAREA" ||
      active.tagName === "INPUT" ||
      active.getAttribute("contenteditable") === "true")
  );
}

function App() {
  const [boardState, setBoardState] = useState(boardUI);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    boardUISetter = setBoardState;
    switchingSetter = setSwitching;
    setBoardState(boardUI);
    return () => {
      boardUISetter = null;
      switchingSetter = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        post("saveRequested");
      } else if (key === "c" && event.shiftKey) {
        event.preventDefault();
        post("copyRequested");
      } else if (key === "n" && !event.shiftKey && !isEditingText()) {
        event.preventDefault();
        post("newRequested");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div className="deck-shell">
      <Excalidraw
        langCode="zh-CN"
        theme="light"
        name="UI 草图"
        aiEnabled={false}
        showDeprecatedFonts={false}
        validateEmbeddable={() => false}
        renderEmbeddable={() => null}
        handleKeyboardGlobally={false}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false
          },
          tools: { image: true }
        }}
        initialData={{
          elements: [],
          appState: { viewBackgroundColor: "#ffffff", currentItemFontFamily: 1 }
        }}
        excalidrawAPI={(api) => {
          excalidrawAPI = api;
          installTabletSketch(api);
          if (pendingScene) loadScene(pendingScene);
          setTimeout(() => {
            seedLibraries();
            post("ready");
          }, 80);
        }}
        onChange={(elements, appState) => {
          if (!hydrated) return;
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            post("change", { scene: sceneJSON() });
          }, 1000);
        }}
        renderTopRightUI={() => (
          <div className="deck-actions">
            <LibraryPicker />
            <button
              type="button"
              className="deck-action"
              title="复制画板或选中内容为 PNG（⌘⇧C）"
              onClick={() => post("copyRequested")}
            >
              复制图片
            </button>
            <button
              type="button"
              className="deck-action"
              title="复制带图形说明的 JSON，直接粘贴给 AI"
              onClick={() => post("jsonCopyRequested")}
            >
              复制 JSON
            </button>
            <button
              type="button"
              className="deck-action is-primary"
              title="保存 PNG 与 .excalidraw（⌘S）"
              onClick={() => post("saveRequested")}
            >
              保存
            </button>
          </div>
        )}
      />
      {boardState.boards.length > 0 ? (
        <BoardSwitcher ui={boardState} switching={switching} />
      ) : null}
      <div className={`deck-switch-veil${switching ? " is-on" : ""}`} aria-hidden={!switching}>
        <span className="deck-switch-spinner" />
      </div>
      <TabletShell />
      <Toast />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

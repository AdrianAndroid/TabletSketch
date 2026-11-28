// 五处布局的统一配置模型：动作库、默认值、校验回落、迁移与配置档。
// 纯数据与存储逻辑，不依赖 React；Node 回归可直接 import。

import { TYPE_CATEGORIES, CATEGORY_ORDER } from "./style-wheel.js";

export const LAYOUT_KEY = "tablet.layout.v2";
export const PROFILES_KEY = "tablet.profiles.v1";
export const LEGACY_SETTINGS_KEY = "tablet.settings.v1";

/** 全局动作库。同一 id 在任何 surface 都走同一个执行分支。 */
export const ACTION_LIBRARY = {
  pen: { id: "pen", label: "笔", icon: "pen", tool: "freedraw" },
  eraser: { id: "eraser", label: "擦", icon: "eraser", tool: "eraser" },
  hand: { id: "hand", label: "手", icon: "hand", tool: "hand" },
  select: { id: "select", label: "选", icon: "select", tool: "selection" },
  rectangle: { id: "rectangle", label: "矩", icon: "rectangle", tool: "rectangle" },
  diamond: { id: "diamond", label: "菱", icon: "diamond", tool: "diamond" },
  ellipse: { id: "ellipse", label: "椭", icon: "ellipse", tool: "ellipse" },
  arrow: { id: "arrow", label: "箭", icon: "arrow", tool: "arrow" },
  line: { id: "line", label: "线", icon: "line", tool: "line" },
  text: { id: "text", label: "字", icon: "text", tool: "text" },
  image: { id: "image", label: "图", icon: "image", tool: "image" },
  menu: { id: "menu", label: "菜单", icon: "menu", panel: "menu" },
  canvas: { id: "canvas", label: "画布", icon: "canvas", panel: "canvas" },
  library: { id: "library", label: "素材", icon: "library", panel: "library" },
  lock: { id: "lock", label: "锁", icon: "lock", action: "lock" },
  undo: { id: "undo", label: "撤销", icon: "undo", action: "undo" },
  redo: { id: "redo", label: "重做", icon: "redo", action: "redo" },
  zoomFit: { id: "zoomFit", label: "适应", icon: "fit", action: "zoomFit" },
  zoom100: { id: "zoom100", label: "100%", icon: "zoom100", action: "zoom100" },
  delete: { id: "delete", label: "删除", icon: "trash", action: "delete" },
  duplicate: { id: "duplicate", label: "复制", icon: "duplicate", action: "duplicate" },
  selectAll: { id: "selectAll", label: "全选", icon: "selectAll", action: "selectAll" },
  stroke: { id: "stroke", label: "描边", icon: "pen", style: true },
  background: { id: "background", label: "背景", icon: "fill", style: true },
  strokeWidth: { id: "strokeWidth", label: "宽度", icon: "width", style: true },
  strokeStyle: { id: "strokeStyle", label: "边框", icon: "border", style: true },
  roughness: { id: "roughness", label: "线条", icon: "roughness", style: true },
  roundness: { id: "roundness", label: "边角", icon: "corner", style: true },
  arrowType: { id: "arrowType", label: "类型", icon: "arrowType", style: true },
  startArrow: { id: "startArrow", label: "起点", icon: "arrowStart", style: true },
  endArrow: { id: "endArrow", label: "终点", icon: "arrowEnd", style: true },
  fontFamily: { id: "fontFamily", label: "字体", icon: "font", style: true },
  fontSize: { id: "fontSize", label: "字号", icon: "fontSize", style: true },
  textAlign: { id: "textAlign", label: "对齐", icon: "align", style: true },
  opacity: { id: "opacity", label: "透明", icon: "opacity", style: true }
};

export const ACTION_GROUPS = [
  {
    id: "tool",
    label: "工具",
    ids: ["pen", "eraser", "hand", "select", "rectangle", "diamond", "ellipse", "arrow", "line", "text", "image"]
  },
  { id: "panel", label: "面板", ids: ["menu", "canvas", "library"] },
  {
    id: "action",
    label: "动作",
    ids: ["lock", "undo", "redo", "zoomFit", "zoom100", "delete", "duplicate", "selectAll"]
  },
  {
    id: "style",
    label: "样式类别",
    ids: [
      "stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness",
      "arrowType", "startArrow", "endArrow", "fontFamily", "fontSize", "textAlign", "opacity"
    ]
  }
];

/** 每个 surface 允许放入的类别与容量参数。 */
export const SURFACE_RULES = {
  leftIsland: { label: "左浮动岛", groups: ["style"], limit: 8, geometry: "column" },
  rightIsland: { label: "右浮动岛", groups: ["tool", "panel", "action"], limit: 18, geometry: "grid", columns: 2 },
  penKey1: { label: "手写笔键 1", groups: ["style"], limit: 9, geometry: "ring", outer: 8 },
  penKey2: { label: "手写笔键 2", groups: ["tool", "panel", "action"], limit: 9, geometry: "ring", outer: 8 },
  onboardKeys: { label: "板载键", groups: ["tool", "panel", "action"], limit: 8, geometry: "band" }
};

export const SURFACE_IDS = Object.keys(SURFACE_RULES);

/** 默认样式取值：与 style-wheel 的 v1 预设一致，作为可编辑配置的出厂值。 */
const PALETTE = [
  { key: "#1e1e1e", label: "黑" },
  { key: "#e03131", label: "红" },
  { key: "#2f9e44", label: "绿" },
  { key: "#1971c2", label: "蓝" },
  { key: "#f08c00", label: "橙" },
  { key: "#868e96", label: "灰" }
];

const ARROWHEAD = [
  { key: "none", label: "无" },
  { key: "arrow", label: "箭头" },
  { key: "triangle", label: "三角" },
  { key: "bar", label: "竖线" },
  { key: "dot", label: "圆点" }
];

function arrowheadValues(field) {
  return ARROWHEAD.map((item) => ({
    key: item.key,
    label: item.label,
    patch: { [field]: item.key === "none" ? null : item.key }
  }));
}

/** 逐图元样式显隐的出厂值：直接取 style-wheel 的既有映射，真机体验不变。 */
export const DEFAULT_SHAPE_STYLES = Object.fromEntries(
  Object.entries(TYPE_CATEGORIES).map(([type, categories]) => [type, categories.slice()])
);

export const DEFAULT_VALUES = {
  stroke: PALETTE.map((c) => ({ key: c.key, label: c.label, color: c.key, patch: { strokeColor: c.key } })),
  background: PALETTE.map((c) => ({ key: c.key, label: c.label, color: c.key, patch: { backgroundColor: c.key } })).concat([
    { key: "transparent", label: "无", color: "transparent", patch: { backgroundColor: "transparent" } }
  ]),
  strokeWidth: [
    { key: "1", label: "细", patch: { strokeWidth: 1 } },
    { key: "2", label: "中", patch: { strokeWidth: 2 } },
    { key: "4", label: "粗", patch: { strokeWidth: 4 } }
  ],
  strokeStyle: [
    { key: "solid", label: "实线", patch: { strokeStyle: "solid" } },
    { key: "dashed", label: "虚线", patch: { strokeStyle: "dashed" } },
    { key: "dotted", label: "点线", patch: { strokeStyle: "dotted" } }
  ],
  roughness: [
    { key: "0", label: "平滑", patch: { roughness: 0 } },
    { key: "1", label: "手绘", patch: { roughness: 1 } },
    { key: "2", label: "粗糙", patch: { roughness: 2 } }
  ],
  roundness: [
    { key: "sharp", label: "尖角", patch: { roundness: "sharp" } },
    { key: "round", label: "圆角", patch: { roundness: "round" } }
  ],
  arrowType: [
    { key: "sharp", label: "直角", patch: { elbowed: false, roundness: "sharp" } },
    { key: "round", label: "圆角", patch: { elbowed: false, roundness: "round" } },
    { key: "elbow", label: "弧线", patch: { elbowed: true, roundness: "round" } }
  ],
  startArrow: arrowheadValues("startArrowhead"),
  endArrow: arrowheadValues("endArrowhead"),
  fontFamily: [
    { key: "1", label: "手写", patch: { fontFamily: 1 } },
    { key: "2", label: "无衬线", patch: { fontFamily: 2 } },
    { key: "3", label: "等宽", patch: { fontFamily: 3 } }
  ],
  fontSize: [
    { key: "16", label: "S", patch: { fontSize: 16 } },
    { key: "20", label: "M", patch: { fontSize: 20 } },
    { key: "28", label: "L", patch: { fontSize: 28 } },
    { key: "36", label: "XL", patch: { fontSize: 36 } }
  ],
  textAlign: [
    { key: "left", label: "左", patch: { textAlign: "left" } },
    { key: "center", label: "中", patch: { textAlign: "center" } },
    { key: "right", label: "右", patch: { textAlign: "right" } }
  ],
  opacity: [100, 90, 80, 70, 50, 30, 20, 10].map((v) => ({
    key: String(v),
    label: String(v),
    patch: { opacity: v }
  }))
};

/** 出厂布局：保持现有真机体验不变。 */
export function defaultLayout() {
  return {
    version: 2,
    surfaces: {
      leftIsland: {
        ids: ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"],
        limit: 8
      },
      rightIsland: {
        ids: [
          "menu", "canvas", "library", "pen", "eraser", "hand", "select", "rectangle",
          "ellipse", "arrow", "text", "diamond", "line", "image", "lock"
        ],
        columns: 2,
        limit: 15
      },
      penKey1: {
        ids: ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"],
        inner: 9,
        outer: 8
      },
      penKey2: {
        ids: ["pen", "eraser", "select", "hand", "rectangle", "ellipse", "arrow", "text", "diamond", "line", "image", "library", "lock"],
        inner: 9,
        outer: 8
      },
      onboardKeys: {
        ids: ["pen", "eraser", "hand", "select", "rectangle", "ellipse", "arrow", "undo"]
      }
    },
    values: JSON.parse(JSON.stringify(DEFAULT_VALUES)),
    shapeStyles: JSON.parse(JSON.stringify(DEFAULT_SHAPE_STYLES)),
    activeProfile: "default"
  };
}

export function resolveSlot(id) {
  if (!id) return null;
  const found = ACTION_LIBRARY[id];
  if (!found) return null;
  return { ...found, key: id };
}

function allowedIds(surfaceId) {
  const rules = SURFACE_RULES[surfaceId];
  if (!rules) return new Set();
  const set = new Set();
  for (const group of rules.groups) {
    const def = ACTION_GROUPS.find((item) => item.id === group);
    if (def) def.ids.forEach((id) => set.add(id));
  }
  return set;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/** 校验并回落任意输入；返回一份完整合法的布局。 */
export function normalizeLayout(raw) {
  const base = defaultLayout();
  if (!raw || typeof raw !== "object" || raw.version !== 2) return base;

  const sourceSurfaces = raw.surfaces && typeof raw.surfaces === "object" ? raw.surfaces : {};
  for (const id of SURFACE_IDS) {
    const rules = SURFACE_RULES[id];
    const incoming = sourceSurfaces[id];
    if (!incoming || !Array.isArray(incoming.ids)) continue;
    const allowed = allowedIds(id);
    const seen = new Set();
    const ids = [];
    for (const candidate of incoming.ids) {
      if (typeof candidate !== "string" || !allowed.has(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      ids.push(candidate);
      if (ids.length >= rules.limit) break;
    }
    if (!ids.length) continue;
    base.surfaces[id] = { ...base.surfaces[id], ...incoming, ids };
    if (rules.geometry === "ring") {
      base.surfaces[id].inner = clampInt(incoming.inner, 2, rules.limit, 9);
      base.surfaces[id].outer = clampInt(incoming.outer, 2, rules.outer, 8);
    }
    if (rules.geometry === "grid") {
      base.surfaces[id].columns = clampInt(incoming.columns, 1, 2, 2);
    }
    if (rules.geometry === "band" && ids.length !== rules.limit) {
      const filled = ids.slice(0, rules.limit);
      while (filled.length < rules.limit) filled.push("");
      base.surfaces[id].ids = filled;
    }
  }

  if (raw.values && typeof raw.values === "object") {
    for (const category of Object.keys(base.values)) {
      const incomingValues = raw.values[category];
      if (!Array.isArray(incomingValues)) continue;
      const seen = new Set();
      const values = [];
      for (const item of incomingValues) {
        if (!item || typeof item.key !== "string" || typeof item.label !== "string") continue;
        if (!item.patch || typeof item.patch !== "object" || Array.isArray(item.patch)) continue;
        if (seen.has(item.key)) continue;
        seen.add(item.key);
        const value = { key: item.key, label: item.label, patch: { ...item.patch } };
        if (typeof item.color === "string") value.color = item.color;
        values.push(value);
        if (values.length >= 24) break;
      }
      if (values.length) base.values[category] = values;
    }
  }

  if (raw.shapeStyles && typeof raw.shapeStyles === "object" && !Array.isArray(raw.shapeStyles)) {
    for (const type of Object.keys(base.shapeStyles)) {
      const incoming = raw.shapeStyles[type];
      // 允许空数组（该图元不显示任何样式类别），非法值才回落默认。
      if (!Array.isArray(incoming)) continue;
      const seen = new Set();
      const categories = [];
      for (const key of incoming) {
        if (typeof key !== "string" || !CATEGORY_ORDER.includes(key) || seen.has(key)) continue;
        seen.add(key);
        categories.push(key);
      }
      base.shapeStyles[type] = categories;
    }
  }

  if (typeof raw.activeProfile === "string" && raw.activeProfile) {
    base.activeProfile = raw.activeProfile;
  }
  return base;
}

function storageOrNull(storage) {
  if (storage) return storage;
  if (typeof localStorage !== "undefined") return localStorage;
  return null;
}

/** 读取布局；没有新配置时迁移旧设置项。 */
export function loadLayout(storage) {
  const store = storageOrNull(storage);
  let raw = null;
  try {
    const text = store?.getItem?.(LAYOUT_KEY);
    if (text) raw = JSON.parse(text);
  } catch {
    raw = null;
  }
  if (raw && raw.version === 2) return normalizeLayout(raw);

  const layout = defaultLayout();
  if (!store) return layout;
  try {
    const legacyRaw = store.getItem(LEGACY_SETTINGS_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (Number.isFinite(legacy.slotCount)) {
        layout.surfaces.rightIsland.limit = clampInt(legacy.slotCount, 1, 18, 15);
      }
      if (typeof legacy.doubleColumn === "boolean") {
        layout.surfaces.rightIsland.columns = legacy.doubleColumn ? 2 : 1;
      }
      store.removeItem(LEGACY_SETTINGS_KEY);
    }
  } catch {
    /* 损坏的旧设置直接忽略 */
  }
  return layout;
}

function emitLayout(layout) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tablet:layout", { detail: layout }));
  }
}

/** 写入布局并广播；广播先于返回，保证设置面板关闭前界面已刷新。 */
export function saveLayout(layout, storage) {
  const normalized = normalizeLayout(layout);
  const store = storageOrNull(storage);
  try {
    store?.setItem?.(LAYOUT_KEY, JSON.stringify(normalized));
  } catch {
    /* 存储失败不能中断界面即时生效 */
  }
  emitLayout(normalized);
  return normalized;
}

/** 只广播当前内存布局，用于配置档切换等场景。 */
export function publishLayout(layout) {
  return saveLayout(layout, null);
}

function readProfiles(storage) {
  const store = storageOrNull(storage);
  try {
    const text = store?.getItem?.(PROFILES_KEY);
    const parsed = text ? JSON.parse(text) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeProfiles(profiles, storage) {
  const store = storageOrNull(storage);
  try {
    store?.setItem?.(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* 忽略存储失败 */
  }
  return profiles;
}

export function listProfiles(storage) {
  return readProfiles(storage);
}

export function saveProfile(name, layout, storage) {
  const profiles = readProfiles(storage);
  const id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const safeName = String(name || "未命名配置").trim().slice(0, 40) || "未命名配置";
  const normalized = normalizeLayout(layout);
  profiles[id] = { id, name: safeName, layout: normalized, updatedAt: Date.now() };
  writeProfiles(profiles, storage);
  return { id, profiles };
}

export function renameProfile(id, name, storage) {
  const profiles = readProfiles(storage);
  if (!profiles[id]) return profiles;
  profiles[id].name = String(name || "未命名配置").trim().slice(0, 40) || "未命名配置";
  profiles[id].updatedAt = Date.now();
  return writeProfiles(profiles, storage);
}

export function deleteProfile(id, storage) {
  const profiles = readProfiles(storage);
  delete profiles[id];
  return writeProfiles(profiles, storage);
}

export function duplicateProfile(id, storage) {
  const profiles = readProfiles(storage);
  const source = profiles[id];
  if (!source) return { id: null, profiles };
  const nextId = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  profiles[nextId] = {
    id: nextId,
    name: `${source.name} 副本`.slice(0, 40),
    layout: normalizeLayout(source.layout),
    updatedAt: Date.now()
  };
  writeProfiles(profiles, storage);
  return { id: nextId, profiles };
}

export function applyProfile(id, storage) {
  const profiles = readProfiles(storage);
  const source = profiles[id];
  if (!source) return null;
  const layout = normalizeLayout(source.layout);
  layout.activeProfile = id;
  return publishLayout(layout);
}

/** 导出为可下载的 JSON 文本。 */
export function exportProfile(id, storage) {
  const profiles = readProfiles(storage);
  const source = profiles[id];
  if (!source) return null;
  return JSON.stringify({ kind: "tabletsketch-profile", version: 2, name: source.name, layout: source.layout }, null, 2);
}

/** 导入 JSON 文本；非法内容返回 null。 */
export function importProfile(text, storage) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || parsed.kind !== "tabletsketch-profile") return null;
  return saveProfile(parsed.name || "导入配置", normalizeLayout(parsed.layout), storage);
}

/** 从布局构建某个 surface 的槽位数组。 */
export function buildSurfaceSlots(surfaceId, layout, state = {}) {
  const surface = layout?.surfaces?.[surfaceId];
  if (!surface || !Array.isArray(surface.ids)) return [];
  return surface.ids.map((id, index) => {
    const slot = resolveSlot(id);
    if (!slot) return null;
    const current = slot.tool
      ? state.tool === slot.tool
      : slot.action === "lock"
        ? !!state.toolLocked
        : slot.panel
          ? state.panel === slot.panel
          : false;
    return {
      ...slot,
      index,
      surface: surfaceId,
      current,
      tip: current ? `${slot.label} · 当前` : slot.label
    };
  }).filter(Boolean);
}

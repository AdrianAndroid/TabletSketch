export const PALETTE = [
  { key: "#1e1e1e", label: "黑" },
  { key: "#e03131", label: "红" },
  { key: "#2f9e44", label: "绿" },
  { key: "#1971c2", label: "蓝" },
  { key: "#f08c00", label: "橙" },
  { key: "#868e96", label: "灰" }
];

const COLOR_OPTIONS = PALETTE.map((color) => ({
  key: color.key,
  label: color.label,
  color: color.key,
  patch: { strokeColor: color.key }
}));

const BACKGROUND_OPTIONS = PALETTE.map((color) => ({
  key: color.key,
  label: color.label,
  color: color.key,
  patch: { backgroundColor: color.key }
})).concat([{ key: "transparent", label: "无", color: "transparent", patch: { backgroundColor: "transparent" } }]);

const WIDTH_OPTIONS = [
  { key: "1", label: "细", patch: { strokeWidth: 1 } },
  { key: "2", label: "中", patch: { strokeWidth: 2 } },
  { key: "4", label: "粗", patch: { strokeWidth: 4 } }
];

const STROKE_STYLE_OPTIONS = [
  { key: "solid", label: "实线", patch: { strokeStyle: "solid" } },
  { key: "dashed", label: "虚线", patch: { strokeStyle: "dashed" } },
  { key: "dotted", label: "点线", patch: { strokeStyle: "dotted" } }
];

const ROUGHNESS_OPTIONS = [
  { key: "0", label: "平滑", patch: { roughness: 0 } },
  { key: "1", label: "手绘", patch: { roughness: 1 } },
  { key: "2", label: "粗糙", patch: { roughness: 2 } }
];

const ROUNDNESS_OPTIONS = [
  { key: "sharp", label: "尖角", patch: { roundness: "sharp" } },
  { key: "round", label: "圆角", patch: { roundness: "round" } }
];

const ARROW_TYPE_OPTIONS = [
  { key: "sharp", label: "直角", patch: { elbowed: false, roundness: "sharp" } },
  { key: "round", label: "圆角", patch: { elbowed: false, roundness: "round" } },
  { key: "elbow", label: "弧线", patch: { elbowed: true, roundness: "round" } }
];

const ARROWHEAD_LABELS = {
  none: "无",
  arrow: "箭头",
  triangle: "三角",
  bar: "竖线",
  dot: "圆点"
};

const ARROWHEAD_VALUES = ["none", "arrow", "triangle", "bar", "dot"];

const ARROW_TYPE_LABELS = { sharp: "直角", round: "圆角", elbow: "弧线" };

function arrowheadOptions(field) {
  return ARROWHEAD_VALUES.map((value) => ({
    key: value,
    label: ARROWHEAD_LABELS[value],
    patch: { [field]: value === "none" ? null : value }
  }));
}

const FONT_OPTIONS = [
  { key: "1", label: "手写", patch: { fontFamily: 1 } },
  { key: "2", label: "无衬线", patch: { fontFamily: 2 } },
  { key: "3", label: "等宽", patch: { fontFamily: 3 } }
];

const FONT_SIZE_OPTIONS = [
  { key: "16", label: "S", patch: { fontSize: 16 } },
  { key: "20", label: "M", patch: { fontSize: 20 } },
  { key: "28", label: "L", patch: { fontSize: 28 } },
  { key: "36", label: "XL", patch: { fontSize: 36 } }
];

const ALIGN_OPTIONS = [
  { key: "left", label: "左", patch: { textAlign: "left" } },
  { key: "center", label: "中", patch: { textAlign: "center" } },
  { key: "right", label: "右", patch: { textAlign: "right" } }
];

const OPACITY_OPTIONS = [100, 90, 80, 70, 50, 30, 20, 10].map((value) => ({
  key: String(value),
  label: String(value),
  patch: { opacity: value }
}));

const FIELD = {
  stroke: "strokeColor",
  background: "backgroundColor",
  strokeWidth: "strokeWidth",
  strokeStyle: "strokeStyle",
  roughness: "roughness",
  roundness: "roundness",
  arrowType: "arrowType",
  startArrow: "startArrowhead",
  endArrow: "endArrowhead",
  fontFamily: "fontFamily",
  fontSize: "fontSize",
  textAlign: "textAlign",
  opacity: "opacity"
};

const CATEGORIES = {
  stroke: { label: "描边", icon: "pen", options: () => COLOR_OPTIONS },
  background: { label: "背景", icon: "fill", options: () => BACKGROUND_OPTIONS },
  strokeWidth: { label: "宽度", icon: "width", options: () => WIDTH_OPTIONS },
  strokeStyle: { label: "边框", icon: "border", options: () => STROKE_STYLE_OPTIONS },
  roughness: { label: "线条", icon: "roughness", options: () => ROUGHNESS_OPTIONS },
  roundness: { label: "边角", icon: "corner", options: () => ROUNDNESS_OPTIONS },
  arrowType: { label: "类型", icon: "arrowType", options: () => ARROW_TYPE_OPTIONS },
  startArrow: { label: "起点", icon: "arrowStart", options: () => arrowheadOptions("startArrowhead") },
  endArrow: { label: "终点", icon: "arrowEnd", options: () => arrowheadOptions("endArrowhead") },
  fontFamily: { label: "字体", icon: "font", options: () => FONT_OPTIONS },
  fontSize: { label: "字号", icon: "fontSize", options: () => FONT_SIZE_OPTIONS },
  textAlign: { label: "对齐", icon: "align", options: () => ALIGN_OPTIONS },
  opacity: { label: "透明", icon: "opacity", options: () => OPACITY_OPTIONS }
};

const ORDER = [
  "stroke",
  "background",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "roundness",
  "arrowType",
  "startArrow",
  "endArrow",
  "fontFamily",
  "fontSize",
  "textAlign",
  "opacity"
];

// 按 Excalidraw 原生样式面板逐类核对：椭圆无边角、直线有边角但无箭头端点、
// 箭头无背景、自由笔有背景。左岛与侧键环共用这份映射。
const SHAPE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"];
const ELLIPSE = SHAPE.filter((key) => key !== "roundness");
const LINE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"];
const ARROW = ["stroke", "strokeWidth", "strokeStyle", "roughness", "arrowType", "startArrow", "endArrow", "opacity"];
const FREEDRAW = ["stroke", "background", "strokeWidth", "opacity"];
const TEXT = ["stroke", "fontFamily", "fontSize", "textAlign", "opacity"];
const FRAME = ["opacity"];
const EMBED = SHAPE;

/** 图元 → 样式类别的默认映射，layout-config 用它生成 shapeStyles 出厂值。 */
export const TYPE_CATEGORIES = {
  rectangle: SHAPE,
  diamond: SHAPE,
  ellipse: ELLIPSE,
  line: LINE,
  arrow: ARROW,
  freedraw: FREEDRAW,
  text: TEXT,
  frame: FRAME,
  embed: EMBED
};

/** 合法样式类别全集，用于校验 shapeStyles 中的勾选值。 */
export const CATEGORY_ORDER = ORDER;

const MORE_SLOT = {
  key: "more",
  label: "更多",
  icon: "plus",
  kind: "more",
  tip: "更多样式"
};

function rawCurrent(key, context) {
  const style = context?.style || {};
  if (key === "arrowType") return style.arrowType ?? "sharp";
  return style[FIELD[key]];
}

function isMixed(key, context) {
  const field = FIELD[key];
  return !!context?.mixed?.[field];
}

function isCurrent(key, option, context) {
  if (isMixed(key, context)) return false;
  const raw = rawCurrent(key, context);
  if (key === "startArrow" || key === "endArrow") {
    return (raw ?? "none") === option.key;
  }
  if (key === "strokeWidth" || key === "roughness" || key === "fontFamily" || key === "fontSize" || key === "opacity") {
    return String(raw) === option.key;
  }
  // 自定义取值：patch 内容可能与预设 key 不同，按 patch 字段逐一比对。
  if (option.patch && typeof option.patch === "object") {
    const entries = Object.entries(option.patch);
    if (entries.length) {
      const style = context?.style || {};
      return entries.every(([field, value]) => {
        if (key === "arrowType" && field === "roundness") return true;
        return style[field] === value || String(style[field]) === String(value);
      });
    }
  }
  return raw === option.key;
}

/** 取值来源：优先用配置里的可编辑取值，未配置时回落 v1 预设。 */
function optionsFor(category, layout, context) {
  const configured = layout?.values?.[category];
  if (Array.isArray(configured) && configured.length) return configured;
  return CATEGORIES[category]?.options(context) || [];
}

function currentLabel(key, context, layout) {
  if (!CATEGORIES[key]) return null;
  const option = optionsFor(key, layout, context).find((item) => isCurrent(key, item, context));
  return option ? option.label : null;
}

/** 当前值的可读文本：预设命中用标签，非预设直接显示真实值。 */
export function formatCurrent(key, context, layout) {
  if (!CATEGORIES[key]) return "";
  if (isMixed(key, context)) return "多值";
  const hit = currentLabel(key, context, layout);
  if (hit) return hit;
  const raw = rawCurrent(key, context);
  if (raw === null || raw === undefined) {
    if (key === "startArrow" || key === "endArrow") return ARROWHEAD_LABELS.none;
    if (key === "background") return "无";
    return "默认";
  }
  if (key === "startArrow" || key === "endArrow") return ARROWHEAD_LABELS[raw] || String(raw);
  if (key === "arrowType") return ARROW_TYPE_LABELS[raw] || String(raw);
  return String(raw);
}

/**
 * 左侧图的样式类别：优先取 layout.shapeStyles 的逐图元勾选，缺省回落内置映射。
 * 两处（左岛 / 键 1）共用 shapeStyles，各自 surface.ids 决定显示顺序与是否包含。
 */
function configuredCategories(type, layout) {
  const configured = layout?.shapeStyles?.[type];
  if (Array.isArray(configured)) return configured.filter((key) => CATEGORIES[key]);
  return TYPE_CATEGORIES[type] || [];
}

export function categoriesFor(types = [], context = null, layout = null, surfaceId = "penKey1") {
  const filtered = types.filter((type) => type !== "image" && (layout?.shapeStyles?.[type] || TYPE_CATEGORIES[type]));
  if (!filtered.length) return [];
  const lists = filtered.map((type) => configuredCategories(type, layout));
  const compatible = ORDER.filter((key) => lists.every((list) => list.includes(key)));
  const configIds = layout?.surfaces?.[surfaceId]?.ids;
  if (!Array.isArray(configIds) || !configIds.length) return compatible;
  // 配置决定显示哪些类别与顺序；仍受逐图元显隐约束。
  return configIds.filter((key) => compatible.includes(key) && CATEGORIES[key]);
}

function categorySlot(key, context, layout) {
  const def = CATEGORIES[key];
  const current = formatCurrent(key, context, layout);
  const label = def.label;
  return {
    key,
    label,
    icon: def.icon,
    kind: "category",
    tip: current ? `${label} · 当前：${current}` : label
  };
}

function valueSlot(category, option, context, layout) {
  const def = CATEGORIES[category];
  const current = isCurrent(category, option, context);
  const currentText = formatCurrent(category, context, layout);
  return {
    key: `${category}:${option.key}`,
    label: option.label,
    icon: option.icon || def.icon,
    color: option.color,
    kind: "value",
    patch: option.patch,
    current,
    tip: current
      ? `${def.label} · ${option.label}（当前）`
      : `${def.label} · ${option.label}（当前：${currentText}）`
  };
}

export function splitOverflow(items) {
  if (items.length <= 10) return { slots: items, outer: [] };
  return { slots: [...items.slice(0, 9), MORE_SLOT], outer: items.slice(9) };
}

export function buildLevel1(context, layout = null) {
  const categories = categoriesFor(context?.selectedTypes, context, layout, "penKey1");
  if (!categories.length) return null;
  if (categories.length === 1) {
    const level2 = buildLevel2(categories[0], context, layout);
    return level2 ? { ...level2, centerLabel: "取消", initialSingle: true } : null;
  }
  const slots = categories.map((key) => categorySlot(key, context, layout));
  const split = splitOverflow(slots);
  return {
    level: 1,
    category: null,
    slots: split.slots,
    outerSlots: split.outer,
    centerLabel: "取消",
    initialSingle: false
  };
}

export function buildLevel2(category, context, layout = null) {
  const def = CATEGORIES[category];
  if (!def) return null;
  const slots = optionsFor(category, layout, context).map((option) => valueSlot(category, option, context, layout));
  const split = splitOverflow(slots);
  return {
    level: 2,
    category,
    slots: split.slots,
    outerSlots: split.outer,
    centerLabel: "返回",
    initialSingle: false
  };
}

export function categoryLabel(category) {
  return CATEGORIES[category]?.label || "";
}

/**
 * 左侧样式岛的一级类别按钮。与侧键样式环共用 CATEGORIES / categoriesFor，
 * 额外补上当前值的色块与文本，供常驻可见的按钮直接预览。
 */
export function buildCategoryButtons(context, layout = null) {
  return categoriesFor(context?.selectedTypes, context, layout, "leftIsland").map((key) => {
    const def = CATEGORIES[key];
    const raw = rawCurrent(key, context);
    const showColor = key === "stroke" || key === "background";
    return {
      key,
      label: def.label,
      icon: def.icon,
      color: showColor ? (raw ?? (key === "background" ? "transparent" : undefined)) : undefined,
      current: formatCurrent(key, context, layout)
    };
  });
}

/** 左侧样式岛的取值项：合并溢出槽位，常驻条不分页。 */
export function buildValueItems(category, context, layout = null) {
  const built = buildLevel2(category, context, layout);
  if (!built) return [];
  return [...built.slots, ...built.outerSlots].filter((slot) => slot.kind === "value");
}

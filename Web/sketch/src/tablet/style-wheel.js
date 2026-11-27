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

const SHAPE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"];
const LINE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "startArrow", "endArrow", "opacity"];
const ARROW = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "arrowType", "startArrow", "endArrow", "opacity"];
const FREEDRAW = ["stroke", "strokeWidth", "opacity"];
const TEXT = ["stroke", "fontFamily", "fontSize", "textAlign", "opacity"];
const FRAME = ["opacity"];
const EMBED = SHAPE;

const TYPE_CATEGORIES = {
  rectangle: SHAPE,
  diamond: SHAPE,
  ellipse: SHAPE,
  line: LINE,
  arrow: ARROW,
  freedraw: FREEDRAW,
  text: TEXT,
  frame: FRAME,
  embed: EMBED
};

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
  return raw === option.key;
}

function currentLabel(key, context) {
  const def = CATEGORIES[key];
  if (!def) return null;
  const option = def.options(context).find((item) => isCurrent(key, item, context));
  return option ? option.label : null;
}

/** 当前值的可读文本：预设命中用标签，非预设直接显示真实值。 */
export function formatCurrent(key, context) {
  const def = CATEGORIES[key];
  if (!def) return "";
  if (isMixed(key, context)) return "多值";
  const hit = currentLabel(key, context);
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

export function categoriesFor(types = [], context = null) {
  const filtered = types.filter((type) => type !== "image" && TYPE_CATEGORIES[type]);
  if (!filtered.length) return [];
  const lists = filtered.map((type) => TYPE_CATEGORIES[type]);
  return ORDER.filter((key) => lists.every((list) => list.includes(key)));
}

function categorySlot(key, context) {
  const def = CATEGORIES[key];
  const current = formatCurrent(key, context);
  const label = def.label;
  return {
    key,
    label,
    icon: def.icon,
    kind: "category",
    tip: current ? `${label} · 当前：${current}` : label
  };
}

function valueSlot(category, option, context) {
  const def = CATEGORIES[category];
  const current = isCurrent(category, option, context);
  const currentText = formatCurrent(category, context);
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

export function buildLevel1(context) {
  const categories = categoriesFor(context?.selectedTypes, context);
  if (!categories.length) return null;
  if (categories.length === 1) {
    const level2 = buildLevel2(categories[0], context);
    return level2 ? { ...level2, centerLabel: "取消", initialSingle: true } : null;
  }
  const slots = categories.map((key) => categorySlot(key, context));
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

export function buildLevel2(category, context) {
  const def = CATEGORIES[category];
  if (!def) return null;
  const slots = def.options(context).map((option) => valueSlot(category, option, context));
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

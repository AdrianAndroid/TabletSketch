// 笔侧键 2 工具环：把配置的槽位排成两级环，不复制任何工具能力。
import { resolveSlot, defaultLayout } from "./layout-config.js";

export const TOOL_WHEEL_INNER_IDS = [
  "pen",
  "eraser",
  "select",
  "hand",
  "rectangle",
  "ellipse",
  "arrow",
  "text"
];

export const TOOL_WHEEL_OUTER_IDS = ["diamond", "line", "image", "library", "lock"];

const MORE_SLOT = {
  key: "more",
  id: "more",
  label: "更多",
  icon: "more",
  kind: "more",
  tip: "更多工具"
};

function toRadialSlot(slot, tool, toolLocked, panel) {
  const isCurrent = slot.tool
    ? tool === slot.tool
    : slot.action === "lock"
      ? !!toolLocked
      : slot.panel
        ? panel === slot.panel
        : false;
  const tip = isCurrent ? `${slot.label} · 当前` : slot.label;
  return { ...slot, kind: "tool", current: isCurrent, tip };
}

/** 构建工具环一级槽位与「更多」外圈槽位。 */
export function buildToolWheel(tool = "selection", context = null, toolLocked = false, layout = null, panel = null) {
  const config = layout?.surfaces?.penKey2;
  const ids = Array.isArray(config?.ids) && config.ids.length ? config.ids : [...TOOL_WHEEL_INNER_IDS, ...TOOL_WHEEL_OUTER_IDS];
  const innerLimit = Number.isFinite(config?.inner) ? Math.max(2, Math.round(config.inner)) : 9;
  const outerLimit = Number.isFinite(config?.outer) ? Math.max(2, Math.round(config.outer)) : 8;
  const innerIds = ids.slice(0, innerLimit - 1);
  const outerIds = ids.slice(innerLimit - 1, innerLimit - 1 + outerLimit);
  const slots = innerIds.map((id) => resolveSlot(id)).filter(Boolean).map((slot) => toRadialSlot(slot, tool, toolLocked, panel));
  const outerSlots = outerIds.map((id) => resolveSlot(id)).filter(Boolean).map((slot) => toRadialSlot(slot, tool, toolLocked, panel));
  slots.push(MORE_SLOT);
  return {
    mode: "tool",
    level: 1,
    category: null,
    slots,
    outerSlots,
    centerLabel: "取消",
    initialSingle: false
  };
}

/** 供回归与设置面板使用：出厂工具环的 id 顺序。 */
export function defaultToolWheelIds() {
  return defaultLayout().surfaces.penKey2.ids.slice();
}

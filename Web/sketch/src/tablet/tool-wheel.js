// 笔侧键 2 工具环：只负责把浮岛槽位排成两级环，不复制任何工具能力。
import { DEFAULT_SLOTS, TOOL_LABEL } from "./tool-slots.js";

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

const SLOT_BY_ID = new Map(DEFAULT_SLOTS.map((slot) => [slot.id, slot]));

function toRadialSlot(slot, tool, context) {
  const isCurrent = slot.tool
    ? tool === slot.tool
    : slot.action === "lock"
      ? !!context?.allLocked
      : false;
  const fullLabel = slot.tool ? TOOL_LABEL[slot.tool] || slot.label : slot.label;
  return {
    ...slot,
    key: slot.id,
    kind: "tool",
    current: isCurrent,
    tip: isCurrent ? `${fullLabel} · 当前` : fullLabel
  };
}

/** 构建工具环一级槽位与「更多」外圈槽位。 */
export function buildToolWheel(tool = "selection", context = null) {
  const slots = TOOL_WHEEL_INNER_IDS.map((id) => SLOT_BY_ID.get(id))
    .filter(Boolean)
    .map((slot) => toRadialSlot(slot, tool, context));
  slots.push(MORE_SLOT);

  const outerSlots = TOOL_WHEEL_OUTER_IDS.map((id) => SLOT_BY_ID.get(id))
    .filter(Boolean)
    .map((slot) => toRadialSlot(slot, tool, context));

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

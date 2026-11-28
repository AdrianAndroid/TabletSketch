// 笔侧键 2 工具环回归：直接导入纯函数，不依赖 Electron。
// 运行：node Tools/ui-test/tool-wheel.test.mjs
import assert from "node:assert/strict";
import {
  buildToolWheel,
  TOOL_WHEEL_INNER_IDS,
  TOOL_WHEEL_OUTER_IDS
} from "../../Web/sketch/src/tablet/tool-wheel.js";

let passed = 0;
function check(name, actual, want) {
  assert.deepEqual(actual, want, `${name}\n实际: ${JSON.stringify(actual)}\n期望: ${JSON.stringify(want)}`);
  passed += 1;
}

const built = buildToolWheel("selection", null);
check("内圈为八个常用工具加更多", built.slots.map((slot) => slot.key), [
  ...TOOL_WHEEL_INNER_IDS,
  "more"
]);
check("外圈为五个低频项", built.outerSlots.map((slot) => slot.key), TOOL_WHEEL_OUTER_IDS);
check("弹出壳沿用两级环", [built.mode, built.level, built.initialSingle, built.centerLabel], [
  "tool",
  1,
  false,
  "取消"
]);
check("工具环不含菜单与画布", built.slots.some((slot) => ["menu", "canvas"].includes(slot.key)), false);

const byKey = new Map(built.slots.map((slot) => [slot.key, slot]));
check("笔槽位携带浮岛工具字段", byKey.get("pen").tool, "freedraw");
check("选槽位携带浮岛工具字段", byKey.get("select").tool, "selection");
check("所有工具槽位走同一执行类型", built.slots.filter((slot) => slot.kind === "tool").length, 8);

const penCurrent = buildToolWheel("freedraw", null).slots.find((slot) => slot.key === "pen");
check("当前工具高亮", penCurrent.current, true);
const stuckByElements = buildToolWheel("selection", { allLocked: true }, false).outerSlots.find(
  (slot) => slot.key === "lock"
);
check("锁槽位不再跟随选中元素锁定态", stuckByElements.current, false);
const locked = buildToolWheel("selection", null, true).outerSlots.find((slot) => slot.key === "lock");
check("锁槽位跟随工具锁状态", locked.current, true);
check("锁槽位保留浮岛 action", locked.action, "lock");
check("锁槽位当前提示标注", locked.tip, "锁 · 当前");

console.log(`工具环回归：${passed}/${passed} 通过`);

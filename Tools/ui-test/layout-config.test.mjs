// 统一布局配置回归：纯函数，不依赖 Electron。
// 运行：node Tools/ui-test/layout-config.test.mjs
import assert from "node:assert/strict";

// 广播事件依赖 window；Node 回归里用最小 mock 捕获。
globalThis.window = {
  dispatchEvent(event) {
    globalThis.__layoutEvents.push(event);
  }
};
globalThis.__layoutEvents = [];

import {
  ACTION_LIBRARY,
  SURFACE_IDS,
  DEFAULT_SHAPE_STYLES,
  defaultLayout,
  normalizeLayout,
  loadLayout,
  saveLayout,
  buildSurfaceSlots,
  LAYOUT_KEY,
  PROFILES_KEY,
  LEGACY_SETTINGS_KEY
} from "../../Web/sketch/src/tablet/layout-config.js";

let passed = 0;
function check(name, actual, want) {
  assert.deepEqual(actual, want, `${name}\n实际: ${JSON.stringify(actual)}\n期望: ${JSON.stringify(want)}`);
  passed += 1;
}
function ok(name, value) {
  assert.ok(value, name);
  passed += 1;
}

function memoryStorage() {
  const map = new Map();
  const events = [];
  return {
    map,
    events,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    dispatchEvent: (event) => events.push(event)
  };
}

const base = defaultLayout();

check("五处 surface 齐备", Object.keys(base.surfaces).sort(), [...SURFACE_IDS].sort());
check("右岛默认 15 格", base.surfaces.rightIsland.ids.length, 15);
check("板载键默认 8 位", base.surfaces.onboardKeys.ids.length, 8);
check("板载键默认含撤销", base.surfaces.onboardKeys.ids[7], "undo");
check("键2默认内圈工具", base.surfaces.penKey2.ids[0], "pen");
check("样式取值默认含自定义色位", base.values.stroke.length, 6);

// 未知 id / 重复 / 越界被清洗。
const dirty = normalizeLayout({
  version: 2,
  surfaces: {
    rightIsland: { ids: ["pen", "pen", "unknown", "stroke", "menu"] },
    onboardKeys: { ids: ["eraser"] },
    penKey2: { ids: ["pen", "eraser"], inner: 99, outer: 99 }
  },
  values: { stroke: [{ key: "#123456", label: "自定义", color: "#123456", patch: { strokeColor: "#123456" } }] }
});
check("样式类别不能进右岛", dirty.surfaces.rightIsland.ids, ["pen", "menu"]);
check("板载键补空到 8 位", dirty.surfaces.onboardKeys.ids.length, 8);
check("内圈容量夹到 9", dirty.surfaces.penKey2.inner, 9);
check("外圈容量夹到 8", dirty.surfaces.penKey2.outer, 8);
check("自定义取值保留", dirty.values.stroke[0].label, "自定义");

check("非法布局回落默认", normalizeLayout({ version: 1 }), base);
check("空 id 回落默认", normalizeLayout({ version: 2, surfaces: { rightIsland: { ids: [] } } }).surfaces.rightIsland.ids, base.surfaces.rightIsland.ids);

// 旧设置迁移。
const store = memoryStorage();
store.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ slotCount: 9, doubleColumn: false }));
const migrated = loadLayout(store);
check("旧格数迁移", migrated.surfaces.rightIsland.limit, 9);
check("旧双排迁移", migrated.surfaces.rightIsland.columns, 1);
ok("旧键被清理", store.getItem(LEGACY_SETTINGS_KEY) === null);

// 保存 + 广播。
const eventsBefore = globalThis.__layoutEvents.length;
saveLayout(migrated, store);
check("布局写盘", JSON.parse(store.getItem(LAYOUT_KEY)).surfaces.rightIsland.limit, 9);
ok("保存后广播布局事件", globalThis.__layoutEvents.length === eventsBefore + 1);
check("广播 detail 带布局", globalThis.__layoutEvents.at(-1).detail.surfaces.rightIsland.limit, 9);

// 槽位构建与当前态统一。
const slots = buildSurfaceSlots("onboardKeys", base, { tool: "freedraw", toolLocked: false, panel: null });
check("板载键槽位 8 个", slots.length, 8);
ok("笔工具当前态", slots.find((s) => s.id === "pen").current);
ok("擦工具非当前态", !slots.find((s) => s.id === "eraser").current);
const panelSlots = buildSurfaceSlots("rightIsland", base, { tool: "selection", toolLocked: false, panel: "library" });
ok("素材面板当前态", panelSlots.find((s) => s.id === "library").current);

// 语义统一：同一 id 在不同 surface 的动作字段一致。
for (const id of ["pen", "lock", "menu", "undo"]) {
  const def = ACTION_LIBRARY[id];
  ok(`${id} 有唯一动作字段`, !!def && [def.tool, def.action, def.panel].filter(Boolean).length === 1);
}

ok("配置档键名固定", PROFILES_KEY === "tablet.profiles.v1");

// 逐图元样式显隐：默认映射、校验回落、空数组合法。
ok("shapeStyles 默认含矩形", Array.isArray(base.shapeStyles.rectangle) && base.shapeStyles.rectangle.length > 0);
ok("shapeStyles 默认椭圆无圆角", !base.shapeStyles.ellipse.includes("roundness"));
ok("shapeStyles 默认箭头有箭头端点", base.shapeStyles.arrow.includes("endArrow"));
ok("shapeStyles 默认与源映射一致", JSON.stringify(base.shapeStyles) === JSON.stringify(DEFAULT_SHAPE_STYLES));
const styled = normalizeLayout({
  version: 2,
  shapeStyles: {
    rectangle: ["stroke", "bogus", "stroke", "background"],
    ellipse: [],
    arrow: "not-an-array"
  }
});
check("shapeStyles 清洗非法与重复", styled.shapeStyles.rectangle, ["stroke", "background"]);
check("shapeStyles 空数组保留", styled.shapeStyles.ellipse, []);
check("shapeStyles 非法类型回落默认", styled.shapeStyles.arrow, DEFAULT_SHAPE_STYLES.arrow);

console.log(`统一布局配置回归：${passed}/${passed} 通过`);

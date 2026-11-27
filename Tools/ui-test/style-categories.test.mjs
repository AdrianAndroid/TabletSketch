// 图元类型 → 样式类别映射回归：直接导入纯函数，不依赖 Electron。
// 运行：node Tools/ui-test/style-categories.test.mjs
import assert from "node:assert/strict";
import { categoriesFor, buildCategoryButtons } from "../../Web/sketch/src/tablet/style-wheel.js";

const SHAPE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"];
const ELLIPSE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "opacity"];
const LINE = ["stroke", "background", "strokeWidth", "strokeStyle", "roughness", "roundness", "opacity"];
const ARROW = ["stroke", "strokeWidth", "strokeStyle", "roughness", "arrowType", "startArrow", "endArrow", "opacity"];
const FREEDRAW = ["stroke", "background", "strokeWidth", "opacity"];
const TEXT = ["stroke", "fontFamily", "fontSize", "textAlign", "opacity"];
const FRAME = ["opacity"];

const expected = {
  rectangle: SHAPE,
  diamond: SHAPE,
  ellipse: ELLIPSE,
  line: LINE,
  arrow: ARROW,
  freedraw: FREEDRAW,
  text: TEXT,
  frame: FRAME,
  embed: SHAPE
};

let passed = 0;
function check(name, actual, want) {
  assert.deepEqual(actual, want, `${name}\n实际: ${actual.join(",")}\n期望: ${want.join(",")}`);
  passed += 1;
}

for (const [type, want] of Object.entries(expected)) {
  check(`${type} 的样式类别`, categoriesFor([type]), want);
}

// 左岛入口必须与侧键环共用同一份类别集合。
for (const [type, want] of Object.entries(expected)) {
  const buttons = buildCategoryButtons({ selectedTypes: [type], selectedCount: 1, style: {} });
  check(`${type} 的左岛按钮`, buttons.map((button) => button.key), want);
}

// 多选仍取交集：椭圆与直线的公共样式、箭头与矩形的公共样式。
check("椭圆+直线取交集", categoriesFor(["ellipse", "line"]), [
  "stroke",
  "background",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "opacity"
]);
check("箭头+矩形取交集", categoriesFor(["arrow", "rectangle"]), [
  "stroke",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "opacity"
]);
check("图片被过滤", categoriesFor(["image"]), []);
check("未知类型被过滤", categoriesFor(["unknown"]), []);

console.log(`样式类别映射回归：${passed}/${passed} 通过`);

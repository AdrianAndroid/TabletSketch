# 设计 · fix-island-tool-persistence

## 1. 根因定位

`Web/sketch/src/tablet-sketch.js` 当前顺序：

1. 收到笔 `began`
2. `ensureDrawTool()` —— 只要当前不是 freedraw 就切回 freedraw
3. 计算屏幕坐标
4. `document.elementFromPoint` 判断落点
5. 命中 `[data-ts-ui]` → 合成 pointerdown/pointerup/click；否则合成画布 PointerEvent

步骤 2 在步骤 4 之前，且没有落点信息，所以点浮岛按钮和点画布走同一条「先切回笔」的路径。React 在工具状态变化后重渲染，进一步让点击后的选中态跳回「笔」。

## 2. 修改方案

### 2.1 调整 `applyHidEvent` 顺序

把 `ensureDrawTool()` 从 `if (source === "pen" && payload.ph === "began")` 块移到 `isChrome(hit)` 判断之后的「画布分支」：

- UI 分支：只发 pointerdown / pointerup / click，清 `strokeSource`，**不调用** `ensureDrawTool()`。
- 画布分支：在 `began` 时调用 `ensureDrawTool()`，然后合成画布 PointerEvent。

保留现有 `hover` 处理位置：hover 在落点判断之前就发 `tablet:penpos` 并 return，这样笔悬停在浮岛上仍显示光标圆圈，行为不变。

### 2.2 启动默认笔的竞态

`installTabletSketch` 里 `setTimeout(() => ensureDrawTool(), 400)` 用于「应用打开即可画」。若用户在这 400ms 内点了工具格，定时器会再次覆盖。用一个模块级标志 `userPickedTool` 记录用户是否主动选过工具：

- `bridge.setTool(name)` 调用成功时置 `true`。
- 定时器回调里 `if (!userPickedTool) ensureDrawTool()`。
- `runSelfTest()` 直接调用 `api.setActiveTool`，属于自测注入，不置标志——自测本来就要求画笔。

### 2.3 不改的部分

- `mouse-input.js`：鼠标点 UI 时 `insideUi` 直接 return，本来就保持工具，不动。
- `placeLibraryItem` 中 `activeTool: { type: "selection" }`：插入素材后进入选择态是既有预期行为，不属于本次 bug。
- 事件类型、坐标计算、压力整形、板载键/侧键路由：全部不动。

## 3. 取舍

- **不做「记住点 UI 前的工具再恢复」**：那会引入额外状态且语义错误。正确语义是「工具一旦选中就保持，直到用户再选另一个」。
- **不限制 `ensureDrawTool` 到某个具体工具集**：修复依据的是「落点在画布」而非「当前工具是不是绘图工具」，这样用橡皮在画布上落笔也不会被误切成画笔。
- **不改动浮岛 DOM**：问题在事件路由顺序，不在 UI 组件。

## 4. 验证方式

用现有离屏回归 `Tools/ui-test/main.js`（Electron，无窗口、不启动 HID、不抢焦点）增加一段笔路径场景：

1. 先用鼠标点「选」格，确认工具为 `selection`。
2. 对「擦」格按归一化坐标 dispatch `ts:hid` 的 `began` + `ended`（走完整笔事件路由）。
3. 断言工具变为 `eraser` 并在等待后仍为 `eraser`。
4. 对画布空白 dispatch 笔 `began` + `ended`，断言工具切回 `freedraw`（确认原有「落笔即用笔」未被破坏）。

构建前端产物后运行离屏回归，全部用例通过才算完成。

# 设计：输入渲染性能优化

## 1. 分层：笔迹链路 vs 呈现层

严格保持两层，不能混：

- **笔迹链路（不可降频）**：Swift 每报告 → Electron IPC → `applyHidEvent` → 合成 `PointerEvent` → Excalidraw。这一层每个采样都必须到达，节流会丢笔迹点，直接伤害手写笔体验（R11）。本次不动。
- **呈现层（可合并/降频）**：虚拟笔光标位置、压感读数板、浮岛拖动反馈。这一层给人看，60Hz 足够，且与「笔在哪」的语义无关。本次只优化这层。

## 2. 光标：从 state 改为 ref 直写 DOM

现状：`Shell.jsx` 的 `cursor` state 存 `{x, y, down, source}`，每笔报告 `setCursor` → 整棵树 render。

改法：

- `TabletShell` 持有 `cursorElRef`，指向唯一指示器 DOM。
- `tablet-sketch.js` 在笔报告中派发**一个**事件 `tablet:penpos`，detail 含 `{x, y, nx, ny, down, p, raw, tx, ty, ph}`（把遥测字段并进来）。
- `Shell` 的订阅回调里：
  - 直接 `cursorElRef.current.style.transform = translate3d(x, y, 0)`；
  - 维护 `cursorDownRef` / `cursorSourceRef`，只在 `down` 或 `source` 变化时 `setCursorShape({down, source, visible})` —— 这是低频状态，决定 class；
  - 位置不再进 state，`penRef.current` 同步保留，供菜单定位。
- 移除 `tablet:telemetry` 事件与 `telemetry` state；`onTele` 不再存在。

这样每个笔报告只做一次 ref DOM 写 + 一次事件派发，不再触发表层 React render。

## 3. 读数板：rAF 合并 + 独立 memo

- `PenTelemetry` 自己订阅 `tablet:penpos`，用 `requestAnimationFrame` 合并：每帧最多一次 `setState`，取该帧最后一个 detail。
- 只在 `teleOpen` 为真时挂载组件，收起时卸载订阅，彻底停止更新。
- `React.memo` 包裹，避免父级无关 render 波及。
- 保留原有 `shapePressure` / `perceive` / `tiltAngle` 计算，读数逻辑不变。

## 4. 浮岛拖动：transform 直写 + 松手落盘

现状：每次 `pointermove` 调 `setIslandPos({...})` → 全量 render + `left/top` 布局；`useEffect([islandPos])` 每次同步写 `localStorage`。

改法：

- 拖动开始时记录起始 `islandPos` 到 `dragRef`，设 `islandDragging=true`（一次 render，仅用于切 class）。
- `onMove` 直接写 `islandRef.current.style.transform = translate3d(dx, dy, 0)`，不 `setState`；`dx/dy` 相对起始位置。
- `onUp`：移除监听，清除 inline transform，用最终坐标 `setIslandPos(...)` 一次，完成吸附与 `setSide`；`islandDragging=false`。
- `localStorage` 只在非拖动状态下写（effect 依赖 `islandPos`，拖动中不改变它，故只有松手写一次）。
- CSS：`.ts-island.is-dragging` 关闭 `backdrop-filter`、`transition`，`will-change: transform`。

注意：`islandPos` 仍是「真实位置」的唯一可信来源；transform 只是拖动期间的视觉增量。

## 5. rect 缓存

`applyHidEvent` 每个报告做 `canvasEl().getBoundingClientRect()`，在高频下是强制同步布局。改为模块级缓存 + 失效钩子：

- `getStageRect()` 缓存 rect，`resize` 与 Excalidraw 的 `onChange`（视口可能变）时清空；
- 缓存未命中才真正读取。

## 6. 稳定数组引用

`visible` / `overflow` 从 render 内 `slice` 改为模块常量（配置本身不随运行时变化），使 `useEffect([visible])` 不再每次重建监听器。

## 7. 验证

- 离屏回归 `Tools/ui-test/main.js` 需新增/保持覆盖：笔点浮岛按钮切工具、笔落画布不改写工具、鼠标一致性；确认事件 detail 变更后仍通过。
- 真机验证是最终标准：拖动浮岛跟手、笔迹不断点、读数板数值正常。

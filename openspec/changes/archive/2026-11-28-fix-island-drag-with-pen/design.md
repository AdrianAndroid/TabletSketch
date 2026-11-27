# 设计：修复手写笔直接拖动浮岛把手

## 事件路由

`applyHidEvent` 的 `isChrome(hit)` 分支当前只处理 `began` / `ended`。改为：

- `began` → 合成 `pointerdown` 到命中元素（不变）
- `changed` → 合成 `pointermove` 到命中元素（新增）
- `ended` → 合成 `pointerup` + `click` 到命中元素（不变）

`makePointerEvent` 已保证 `bubbles: true`，所以 `window` 上的拖动监听器能收到。笔移出浮岛后命中画布，仍走原有画布分支，`pointermove` 同样冒泡到 `window`，拖动连续不中断。

## 拖动实现

`onGripDown` 的 `onMove` 用 `requestAnimationFrame` 合并：每次报告只更新目标坐标，下一帧再写 `transform: translate3d(...)`，避免高频事件造成重复样式写入。保留初始 `translateY(-50%)` 基线，防止未定位状态拖动时跳位。

松手时先把吸附后的 `left/top` 直接写到 DOM，清空内联 `transform`，再 `setIslandPos`，避免 React 提交前回弹到旧位置的中间帧。

## 呈现降噪

Shell 在拖动开始/结束时设置 `window.__tsIslandDragging`；`PenTelemetry` 订阅 `tablet:penpos` 时检查该标志，拖动期间不更新读数，减少每帧一次的子树渲染。光标位置仍保留，确保笔的视觉反馈不丢失。

## 兼容性

- 鼠标路径：`mouse-input.js` 对 `[data-ts-ui]` 内的 `pointerdown` 本就放行，不改变。
- 工具语义：UI 分支不调用 `ensureDrawTool`，工具不会因拖动浮岛被改写。
- 径向菜单/样式环：仍由侧键事件驱动，不受本次改动影响。

# 修正「锁」槽语义：锁定工具而非锁定元素

## 问题

右侧浮岛与笔侧键 2 工具环中的「锁」槽当前走 `activate(slot)` 的 `slot.action === "lock"` 分支，调用 `api.setStyle({ locked: true })`，实际效果是**把当前选中元素设为不可编辑**。

用户在 Excalidraw 原生工具栏截图中指出的锁，提示文案是「绘制后保持所选的工具栏状态」，语义是**工具锁**（`activeTool.locked`）：开启后画完一个图形不自动跳回选择工具，可连续绘制同类图元；关闭时回到选择工具。这是两个完全不同的功能，当前没有实现。

## 目标

- 浮岛与工具环的「锁」槽统一改为切换 Excalidraw 的 `activeTool.locked`，与原生工具栏锁按钮同语义。
- 槽位当前态（圆点/高亮）跟随工具锁状态，而不是「选中元素是否全部锁定」。
- 移除「锁槽锁定选中元素」的错误行为；元素锁定仍由原生右键菜单提供，不受影响。
- 增加离屏回归，验证切换工具锁后工具不会在绘制后跳回选择工具。

## 非目标

- 不新增第二套锁状态，不自行实现绘制后工具保持逻辑，直接调用 Excalidraw `toggleLock()`。
- 不改变键 1 样式环对锁定元素的既有处理（全锁不弹环、部分锁只改未锁元素）。
- 不增加鼠标专属入口；键 2 工具环与浮岛仍共用同一执行路径。

## 影响

- `Web/sketch/src/tablet-sketch.js`：bridge 暴露 `toggleToolLock()` / `getToolLocked()`。
- `Web/sketch/src/tablet/Shell.jsx`：`activate` 的锁分支改调工具锁；当前态读取工具锁。
- `Web/sketch/src/tablet/tool-wheel.js`：锁槽 current 用工具锁状态。
- `openspec/specs/pen-first-ui/spec.md`：替换锁槽语义条款。

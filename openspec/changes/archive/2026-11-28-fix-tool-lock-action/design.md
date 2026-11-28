# 设计：修正锁槽为工具锁

## 1. 语义对照

| 项 | 旧实现 | 目标 |
|---|---|---|
| 点击锁槽 | `setStyle({ locked: true })` → 元素不可编辑 | `toggleLock("ui")` → `activeTool.locked` 取反 |
| 当前态来源 | `context.allLocked`（元素全锁） | `getToolLocked()`（`activeTool.locked`） |
| 再次点击 | 重复锁元素，无可解除路径 | 取消工具锁，Excalidraw 自动回选择工具 |
| 提示 | 无 | `已锁定工具` / `已解锁工具`，1 秒 |

Excalidraw 源码（`dist/dev/index.js` 的 `toggleLock`）：

```js
toggleLock = (source = "ui") => {
  this.setState((prevState) => ({
    activeTool: {
      ...prevState.activeTool,
      ...updateActiveTool(
        this.state,
        prevState.activeTool.locked ? { type: "selection" } : prevState.activeTool
      ),
      locked: !prevState.activeTool.locked
    }
  }));
};
```

即：开启时保持当前工具并锁住；关闭时 `updateActiveTool` 回退到 `selection`。直接调用官方方法，不复制这套状态机。

## 2. 接线

### bridge（`tablet-sketch.js`）

在工具分组新增：

```js
toggleToolLock() {
  const activeTool = api.getAppState().activeTool || { type: "selection" };
  const next = activeTool.locked
    ? { type: "selection", locked: false }
    : { type: activeTool.type, locked: true };
  api.setActiveTool(next);
  return !!api.getAppState().activeTool?.locked;
},
getToolLocked() {
  return !!api.getAppState().activeTool?.locked;
}
```

注意：`toggleLock` 只存在于 `AppClassProperties`，**未暴露到 `ExcalidrawImperativeAPI`**，所以不能直接 `api.toggleLock()`。改用 imperative API 支持的 `setActiveTool({ type, locked })`；`updateActiveTool` 会保留显式传入的 `locked`，且解锁时按原生语义把工具回退到 `selection`。

`getContext()` 保持原样（`allLocked` / `partialLocked` 仍供样式环判断锁定元素使用），**不复用** `allLocked` 表达工具锁。

### `Shell.jsx`

- `activate` 锁分支：

```js
if (slot.action === "lock") {
  const api = bridge();
  const locked = api?.toggleToolLock?.();
  if (typeof locked === "boolean") showToast(locked ? "已锁定工具" : "已解锁工具", 1000);
  return;
}
```

- 工具轮询 `refresh` 里把 `getToolLocked()` 纳入签名，使浮岛/工具环当前态能低频刷新；`styleContext` 不变（仍表示选中元素的样式上下文）。
- 新增 `toolLocked` 状态，供浮岛网格与 `buildToolWheel` 使用。

### `tool-wheel.js`

锁槽当前态由第三参数 `toolLocked` 决定：

```js
function toRadialSlot(slot, tool, toolLocked) {
  const isCurrent = slot.tool
    ? tool === slot.tool
    : slot.action === "lock"
      ? !!toolLocked
      : false;
  ...
}

buildToolWheel(tool, context, toolLocked)
```

`context` 参数保留（兼容既有调用与测试），锁槽不再读 `context.allLocked`。

## 3. 当前态呈现

- 浮岛锁格：`is-on` 跟随 `toolLocked`，与工具格一致；title 在开启时显示「已锁定工具」，关闭时显示「绘制后保持工具」。
- 工具环锁槽：圆点跟随 `toolLocked`，tip 为「锁 · 当前 / 锁」。
- 锁槽在浮岛可见区第 15 格，不在「更多」溢出区；点击后 toast 提示「已锁定工具 / 已解锁工具」。

## 4. 边界

- 锁工具开启时不改变选中元素的 `locked` 字段；已锁定元素仍由原生菜单解锁。
- 键 1 样式环遇全锁元素不弹环的规则不变。
- 笔画进行中，键 2 工具环仍不弹出（沿用 `isStrokeActive()` 保护）。
- 桥接缺失时点击锁槽静默无操作，不抛异常。

## 5. 验证

- 纯函数回归：工具环锁槽 current 跟随传入的 `toolLocked`，不再随 `context.allLocked`。
- 离屏回归：模拟点击锁槽 → `getToolLocked()` 为 true；再次点击 → false；切换工具后绘制不回 selection 的状态由 `activeTool.locked` 断言覆盖。
- 全量离屏回归保持通过。

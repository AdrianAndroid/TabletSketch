# 设计：撤销 / 重做怎么落到 Excalidraw 上

## 为什么不能直接调 API

0.18.1 的 `ExcalidrawImperativeAPI`（`node_modules/@excalidraw/excalidraw/dist/types/excalidraw/types.d.ts`）里：

```ts
history: {
    clear: InstanceType<typeof App>["resetHistory"];
};
```

只有 `clear`。`undo/redo` 是 0.17 及更早版本的接口，升级后没有替代的公开方法（`actionManager` 与 store 都没有暴露到 imperative API）。所以任何「调 API 撤销」的写法在当前版本都必然抛错。

## 采用的方案：合成快捷键，命中它自己的 action

Excalidraw 的撤销/重做通过 `actionHistory.undo` 执行，入口是 `App.onKeyDown`。关键约束：

- 监听注册在 **容器元素** 上，不是 document：`addEventListener(this.excalidrawContainerRef.current, EVENT.KEYDOWN, ...)`。`handleKeyboardGlobally` 默认 `false`，所以 document 上没有这个监听。
- 实测确认：向 `document` 派发 `Cmd+Z` **无效**；向 `.excalidraw` 容器派发**有效**。若两处都派发，可能一次撤销执行两遍。

实现（`tablet-sketch.js`）：

```js
function fireHistoryShortcut(shift) {
  const container = document.querySelector(".excalidraw") || canvasEl();
  if (!container) return false;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  container.dispatchEvent(new KeyboardEvent("keydown", {
    key: "z", code: "KeyZ", keyCode: 90, which: 90,
    bubbles: true, cancelable: true,
    metaKey: isMac, ctrlKey: !isMac, shiftKey: !!shift
  }));
  return true;
}
```

- 同时给 `metaKey`/`ctrlKey` 只按平台置一个，避免 macOS 上被当成两次不同组合。
- `keyCode`/`which` 一并填上：Excalidraw 里既有 `event.key` 判断，也有历史代码读 `keyCode`。
- 好处：完全复用上游 action 的语义（群组整体撤销、绑定文字、选中态回滚、`history` 与 `redoStack` 一致），不需要自己维护第二套历史。

## 为什么不自己存快照

自建快照栈看起来简单，但会同时存在两套历史：用户用物理键盘 `Cmd+Z` 走上游历史，板载键走我们自己的栈，两边互相踩；而且 `updateScene` 恢复元素时 id、`versionNonce`、绑定文字关系都要自己维护，容易复现上一轮「改坏一塌糊涂」的问题。

## 工具锁为什么恒返回 false

```js
api.setActiveTool({ type, locked: true });
return !!api.getAppState().activeTool?.locked;  // 旧值 → 永远 false
```

`setActiveTool` 内部走 `this.setState()`，React 18 批处理下调用栈返回时 state 还没 flush。改为直接返回本次期望值 `nextLocked`，界面当前态交给既有的 400ms 轮询 `getToolLocked()` 校准（该轮询读的是 flush 之后的 state，是准的）。

## 去抖为什么是 220ms

`hid.log` 里同一次按压会被固件报成多帧（`aux` 连续出现），对切工具无害，但对撤销就是连撤多步。按 index 记最近触发时刻，220ms 内的后续帧只点亮卡片不执行动作：

- 覆盖固件连发（实测间隔可达 200ms 量级）。
- 不影响正常连按：笔按板载键两次的间隔通常 ≥ 300ms。

# fix-island-tool-persistence

## Why

真机用触控笔体验时发现：点击浮岛上任意工具按钮后，当前工具都会被强制切回画笔（freedraw），无法保持用户刚选的工具（选择、手、橡皮、矩形等）。用户期望「点哪个按钮就一直是那个工具」。

根因在 `Web/sketch/src/tablet-sketch.js` 的 `applyHidEvent`：笔的 `began` 阶段先无条件调用 `ensureDrawTool()`，之后才用 `document.elementFromPoint` 判断落点是不是自绘 UI。因此每次点击浮岛按钮都会先把工具重置成画笔，再做 UI 点击；工具选中态随即跳回「笔」。鼠标路径不受影响，因为 `mouse-input.js` 在 `insideUi` 时直接放行。

## What Changes

1. 把 `ensureDrawTool()` 从「所有笔 `began`」下移到「确认落点在画布之后」，只有真正落笔到画布时才切画笔。
2. 笔落在 `[data-ts-ui]`（浮岛、面板、读数板、样式气泡等）时只合成 UI 点击，不改动当前工具。
3. 启动 400ms 的「默认切画笔」定时器避让用户已经主动选过的工具：用户一旦通过浮岛或快捷键选了工具，定时器不再覆盖。

## Capabilities

- `pen-first-ui`：浮岛工具格点击后工具保持，不被笔按下重置。
- `pen-input`：笔事件落点分流（UI 点击 / 画布落笔）的先后顺序调整。

## Impact

- 修改 `Web/sketch/src/tablet-sketch.js`（事件路由）与 `Tools/ui-test/main.js`（离屏回归）。
- 需要重新构建 `Resources/Sketch` 并覆盖安装才能真机生效。
- 不涉及 Swift/HID 协议、报文解析、签名流程、存储格式。

## 非目标

- 不新增或调整浮岛按钮、布局、格子数量、光标形态。
- 不修改 Excalidraw fork 源码或素材库。
- 不解决「系统光标仍随笔移动」与「板载键外泄到前台应用」这两个已知系统层限制。
- 不引入「点 UI 后恢复上一次工具」之类的新状态机；工具本来就应当保持，不需要恢复逻辑。

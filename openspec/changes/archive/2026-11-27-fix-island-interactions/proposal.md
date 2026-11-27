# proposal · fix-island-interactions

## Why

离屏回归（`Tools/ui-test/main.js`）在真实 DOM 上复现了三类浮岛故障：

1. **抓不到拖动把手**：右上「压感/倾斜」读数板与浮岛顶部重叠约 23px，正好盖住 12pt 高的拖动手柄，实测 `elementFromPoint` 命中的是 `.ts-tele`。
2. **面板里的按钮点不动**：`.ts-scrim` 的 `z-index: 60` 高于浮岛与面板（都为 auto），面板打开后点击落到遮罩上，设置、保存、画布等入口全部失效。
3. **「笔」「选」两格无效**：`setTool()` 用 `TOOL_MAP[name]` 查表，而表键是 `pen/select`，浮岛传的是 `freedraw/selection`，两次查表都返回 `undefined`。「选」永远切不过去，「笔」只是碰巧初始工具就是它。

## What Changes

- `tablet-sketch.js`：用合法工具集合校验 `setTool`，去掉错误的 `TOOL_MAP` 查表。
- `chrome.css`：浮岛 `z-index: 62`、面板 `64`，区隔遮罩 `60`；读数板与浮岛同侧时自动换到对侧。
- `PenTelemetry.jsx` / `Shell.jsx`：读数板与 chip 接收 `side`，浮岛在右时读数板在左，反之亦然。
- 新增 `Tools/ui-test/main.js`：离屏浮岛回归，`show: false`、独立 userData、不启动 HID。

## Capabilities

- `pen-first-ui`：补「浮岛交互可用性」要求。

## Impact

- 只改前端交互与层级，不改输入解析、画布映射、存储。
- 无新增依赖，不修改 `MacAppControlDeck`。

## 非目标

- 不做浮岛自由拖动（仍是左右换边 + 双击复位）。
- 不改读数板内容与压感曲线。

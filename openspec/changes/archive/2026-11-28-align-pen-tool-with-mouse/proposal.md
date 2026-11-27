# align-pen-tool-with-mouse

## Why

上一轮 `fix-island-tool-persistence` 只修了「点浮岛按钮时不要切回画笔」，但漏掉了另一半：`applyHidEvent` 在笔落到画布时仍无条件调用 `ensureDrawTool()`，把当前工具改成 `freedraw`。结果是：

- 鼠标选了矩形后可以正常画矩形；
- 笔选了矩形后一落笔就被切回画笔，画出来的是自由笔迹。

用户在真机体验后发现笔与鼠标行为不一致，质疑是否改错了地方。核查 Excalidraw 源码与两条输入路径后确认：这段强制切笔属于本项目额外加的行为，且只存在于笔路径，是多余的。

## What Changes

1. 移除 `applyHidEvent` 画布分支中笔 `began` 时的 `ensureDrawTool()` 调用。
2. 工具状态完全由「用户选择 + Excalidraw 原生语义」决定，笔与鼠标一致。
3. 保留启动 400ms 的默认画笔（用户未主动选工具时），保证开箱即画。
4. 更新上一轮规格里「笔点画布 MUST 切回 freedraw」的场景，改为保持当前工具。

## Capabilities

- `pen-input`：笔事件落点分流不再改工具。
- `pen-first-ui`：浮岛工具选择与鼠标行为一致。

## Impact

- 修改 `Web/sketch/src/tablet-sketch.js`、`Tools/ui-test/main.js`。
- 需要重新构建前端产物并覆盖安装才能真机生效。

## 非目标

- 不改变 Excalidraw 原生工具语义：矩形等形状画完一个仍会自动回选择，橡皮用完回选择，文字/图片用完回选择；这些是上游设计，不属于本变更范围。
- 不给工具设置 `locked`（那会让用户无法退出形状工具），除非另立变更。
- 不改鼠标路径、Swift/HID 协议、签名与存储。

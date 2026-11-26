# Proposal · window-as-pad

## Why

上一版把板面做成了右下角一张 360×246.5 的示意图卡片（`onboard-pad-visualizer`）。真机上手后用户指出这是错的：

> 我想的不是这个小窗映射，而是整个窗口映射。相当于这个小窗的样式就是整个工作窗口。

即"板面"不该是窗口里的一个缩略模型，而应该是窗口本身的版式：**窗口顶部就是按键带，窗口剩下的全部就是手写区**。笔在板子上的任意位置都映射到这块手写区，比例才够大、写着才舒服。

## What Changes

- 窗口版式改为上下两段：`64px 按键带` + `flex:1 手写区`。
- 按键带上排一行 8 个板载键，x 位置按真机实测的百分比分布（首键 12.9%，间距 10.62%），不做等分。
- 按键常态完全不可见，按下瞬间在该位置亮 26pt 主色圆 + 数字，180ms 后消失。
- 手写区是圆角浅灰面（半径 14、四周留 8/12pt），Excalidraw 画布被限制在这块面内。
- 笔坐标的映射目标自动收窄到这块面：`canvasEl().getBoundingClientRect()` 现在等于手写区，不再等于整窗。
- 原顶部 32px 状态条并入按键带的上排（左：画板名 + 当前工具；右：连接状态）。
- 删除 `PadMap`（示意卡片）及其 `.ts-pad*` 样式与收起芯片。
- 画布底色改为 `#f5f7fa` 与手写区同色，超出一体的观感；导出 PNG 仍强制白底。

## Capabilities

`pen-input`（笔的映射范围与板载键可见性）

## Impact

- 新增：`Web/sketch/src/tablet/PadBand.jsx`
- 删除：`Web/sketch/src/tablet/PadMap.jsx`、`chrome.css` 中 `.ts-pad*` 整段
- 修改：`Shell.jsx`（顶部条改成按键带）、`main.jsx`（包一层 `.ts-stage`）、`chrome.css`（窗口版式）、`sketch.css`（`.deck-shell` 布局）
- 不改：HID 采集器、协议解析、存取流程

## 非目标

- 不做板框外装饰、笔槽、logo
- 不做"手写区严格 16:9 letterbox"，窗口缩放时按容器拉伸
- 不改浮岛与径向菜单的位置策略

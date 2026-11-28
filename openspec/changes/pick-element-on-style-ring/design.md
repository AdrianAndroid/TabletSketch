# 设计：如何按笔尖坐标选中图元

## 不用改 fork 的命中方案

Excalidraw 的 `App.getElementAtPosition` 是私有方法，依赖内部 scene、frame 缓存与 hit threshold；`Web/vendor/excalidraw` 还是 submodule，导出它成本高风险大。自己按 bbox 命中又要复刻线条阈值、旋转、群组、绑定文字、frame 语义，长期会和原生选择行为漂移。

采用**合成一次原生 selection 点击**：临时把工具切到 `selection`，在笔尖屏幕坐标向 `canvas.excalidraw__canvas.interactive` 派发 `pointerdown` / `pointerup`，让 Excalidraw 用自己的命中逻辑选中，再恢复原工具。坐标换算、阈值、z 序、群组都交给它。

离屏实测（`ts-pick-probe4`）：命中笔迹 → `selectedCount=1`；点空白 → `0`；点浮岛 UI → `0`；恢复工具后 `getTool()` 正确。

## 事件必须派发到 canvas

和撤销/重做那个 keydown 相反：Excalidraw 的 pointerdown 监听在 canvas 上，派发到 `.excalidraw` 容器无效（探针里两种都测过）。派发参数沿用项目现有的 `INJECTED_POINTER_ID` 与 `pointerType: "pen"`。

## 时序

`api.setActiveTool` 之后状态更新是异步 flush 的，必须等一个短延时（实现里 120ms）再派发点击，否则点击仍按原工具处理。恢复工具同理等 flush 后再取 `getContext()`，样式值才来自新选中的图元。

## 边界

- **笔离开板子**：`tablet:penpos` detail 为 null 时把「笔在板上」标记置否；按侧键时不拾取，走原 toast。
- **笔尖落在自绘 UI**：拾取前用 `document.elementFromPoint(x, y)` + `closest("[data-ts-ui]")` 判断，是 UI 就不拾取。项目里已有同样的 `isChrome` 判定。
- **正在笔画**：`openRadial` 原有的 `isStrokeActive()` 早退保留。
- **锁定元素**：拾取仍会选中（Excalidraw 本身允许），样式环原有的 `allLocked` 提示继续生效。
- **群组 / 图片**：点击命中整组时样式作用于整组（原生语义）；命中图片时原有「没有可调样式」提示继续生效。

## 不产生副作用

`bridge.setTool` 会置 `userPickedTool = true`，临时切换不能用它，必须直接调 `api.setActiveTool`，避免影响启动阶段的默认工具覆盖逻辑。

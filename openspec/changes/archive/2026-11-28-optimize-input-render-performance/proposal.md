# optimize-input-render-performance

## Why

用户真机反馈整体使用与拖动浮岛都明显卡顿。代码核查确认：每个 HID 笔报告会在渲染进程派发两个独立 CustomEvent（`tablet:telemetry`、`tablet:penpos`），各自触发 `setState`，而 React 18 的自动批处理不跨独立事件，导致每个采样约 2 次 `TabletShell` 全量重渲染（含浮岛 15 格、按键带、读数板、顶部条）。浮岛拖动又叠加了每次 `pointermove` 的 `setIslandPos` 全量重渲染、`localStorage` 同步写盘、`left/top` 触发布局，以及 `backdrop-filter: blur(16px)` 的逐帧重采样；拖动期间鼠标路径还会再触发一次光标 `setState`。多项叠加造成可感知的掉帧。

## What Changes

- 光标位置改为直接写 DOM `style.transform`（走 ref），不再随每个笔报告触发 React 重渲染；只在按下态/来源变化时更新轻量状态。
- 遥测读数以 `requestAnimationFrame` 合并更新，并只在读数板展开时订阅；读数板组件独立 memo，避免拖累整棵树。
- 笔尖位置用 ref 作为唯一可信来源，径向菜单/样式气泡仍从 ref 取位，取消高频 `penPos` state。
- 合并笔报告派发：遥测与光标位置在同一个 `CustomEvent` 中下发，渲染进程一次处理。
- 缓存画布 `getBoundingClientRect()`，仅在窗口 resize / Excalidraw 视口变化时失效，去掉每个报告的强制同步布局。
- 浮岛拖动改用 ref + `transform: translate3d` 直接改 DOM，松手时才写一次 `localStorage` 与吸附状态；拖动期间关闭 `backdrop-filter`。
- 把 `visible` / `overflow` 提升为模块常量，消除每次 render 重建数组导致的 effect 反复重订阅。

## Capabilities

- `pen-first-ui`：性能行为约束（光标/读数更新不得阻塞输入、拖动浮岛必须跟手）——属于非功能要求，附 spec delta。

## Impact

- 运行时：笔迹链路的每个合成 `PointerEvent` 保持不变（不节流、不丢点），只降低「界面呈现层」的更新频率；真机笔感不应变化。
- 交互：浮岛拖动视觉位置由 transform 直接更新，松手后的吸附/持久化/面板朝向逻辑不变。
- 存储：浮岛位置写盘次数从每次 move 降为每次松手。

## 非目标

- 不改 HID 采样率、压力整形、坐标映射、按键映射、工具切换语义。
- 不改 Excalidraw 原生笔迹链路，不对合成 `PointerEvent` 做节流或丢帧。
- 不引入第三方性能库，不改打包与签名流程。

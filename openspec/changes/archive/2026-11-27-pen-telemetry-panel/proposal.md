# pen-telemetry-panel · 压感 / 倾斜实时读数

## Why

用户想确认这台板子到底有没有压感、有没有倾斜，值不值得做倾斜笔锋。

旧实现里倾斜数据一直在解析（`PenReport.tiltX/tiltY` 来自 Digitizer descriptor 的 `09 3D` / `09 3E`），但 `Emit.pen` 从来没把它发出去，前端完全看不到。压感也只暴露了归一化后的 `p`，看不到原始 `0..16383`。

先给一个测试读数板，用肉眼确认数据真实存在、量程合理，再决定要不要进入笔锋实现。

## What Changes

- `Emit.pen` 增加 `px`（原始压力 `0..16383`）、`tx` / `ty`（倾斜角）。
- `tablet-sketch.js` 把笔事件转成 `tablet:telemetry` 事件，只喂读数板，不进画布逻辑。
- 新增 `PenTelemetry` 组件：右上角常驻卡片，显示
  - 原始压力 + 归一化 + 整形后的出墨值
  - 倾斜 X / Y 与合成笔杆倾角
- 收起后保留一个「压感」小胶囊作为重新打开入口（R0）。

## Capabilities

- `pen-first-ui`：调试读数面板
- `pen-input`：倾斜与原始压力的对外暴露

## Impact

- `Sources/TabletSketchHID/{Emit,HIDReader}.swift`：多带三个字段
- `Web/sketch/src/tablet-sketch.js`：多派一个事件
- `Web/sketch/src/tablet/{PenTelemetry.jsx,Shell.jsx,chrome.css}`
- 不影响笔迹、压感曲线、板载键、侧键

## 非目标

- 不用倾斜控制笔锋（这一版只读数）
- 不做压感曲线可视化图表
- 面板不做成可拖拽窗口

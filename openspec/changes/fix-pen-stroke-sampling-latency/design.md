# 设计决策

## 阈值单位

`PenStateMachine.feed` 的 `point` 来自 `emitPen` 的 `CGPoint(x: nx, y: ny)`，是 0..1 归一化坐标。所有与距离相关的配置项必须在这个坐标系里表达：

| 配置 | 原值（误标为 pt） | 新值（归一化） | 依据 |
|---|---|---|---|
| `jitterTolerance` | 0.35 | 0.0002 | `Emit.pen` 坐标量化到 1e-4；0.0002 可滤掉量化重复点，约合 1280px 宽画布上的 0.26px |
| `tapMaxDistance` | 3.5 | 0.003 | 约合 1280px 宽画布上的 4pt；当前 `isTap` 未被消费，但保持单位一致以防后续启用 |

## 抖动过滤逻辑

保留原「单步小于阈值且累计位移不足两倍阈值才丢弃」的滞回思路，只把阈值换到正确量级。不改状态机三态逻辑、压力阈值与离板收尾行为。

坐标量化到 1e-4 后，同一点连续上报会产生完全相同的 nx/ny；0.0002 阈值能过滤这些重复帧，同时不会吞掉 Digitizer 真实移动（实测单帧位移通常 ≥ 0.001）。

## 测试策略

在 `Tests/TabletSketchCoreTests/` 新增 `PenStateMachineTests.swift`，直接用状态机模拟一段小字笔画：

- 起笔后按 0.005 的步长连续上报 30 帧（总位移 0.15，远低于旧阈值）；
- 断言产生 1 个 `began`、30 个 `changed`、`ended` 前无直线跳变；
- 另测重复坐标帧被过滤，确认没有引入噪声点；
- 再测离板收尾仍产生 `ended` + `leave`。

测试直接依赖 `TabletSketchCore`，不需要 HID 硬件，可在离屏环境跑 `swift test --disable-sandbox`。

## 不改的部分

- 鼠标路径：本就绕过状态机，保持不变；
- `emitPen` / `applyHidEvent` / 坐标映射：不涉及；
- Excalidraw fork：不涉及。

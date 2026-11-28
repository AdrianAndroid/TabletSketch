## MODIFIED Requirements

### Requirement: 悬停 / 接触 / 抬起

应用 SHALL 区分悬停、接触、抬起三种状态。

#### Scenario: 悬停

- **WHEN** 笔在感应区且未接触面板
- **THEN** 应用 MUST 只显示笔光标圆圈
- **AND** MUST NOT 向画布写入任何笔迹

#### Scenario: 轻触起笔

- **WHEN** 笔尖接触面板（`tipDown` 为真，或压力 ≥ `pressureOn = 0.0015`）
- **THEN** 应用 MUST 立即产生 `began`，不得要求用户先施加明显压力
- **AND** 起笔与释放 MUST 使用滞回（`pressureOff = 0.0008`）避免抖动断笔

#### Scenario: 快速点击

- **WHEN** 接触时长 ≤ 0.32s 且归一化位移 ≤ 0.003
- **THEN** 应用 MAY 视为点击而非笔画

#### Scenario: 笔离开感应区

- **WHEN** 笔离开感应区
- **THEN** 正在进行的笔画 MUST 立即收尾
- **AND** 笔光标 MUST 隐藏
- **AND** 固件停止上报时 MUST 由看门狗兜底重置状态

## ADDED Requirements

### Requirement: 笔画采样不得被阈值吞掉

状态机 SHALL 只对量化噪声做抖动过滤，不得因阈值单位错配吞掉真实的笔画采样点。

#### Scenario: 阈值单位一致

- **WHEN** 状态机收到归一化坐标（0..1）的采样点
- **THEN** 所有距离阈值 MUST 以归一化坐标表达，MUST NOT 按画布 pt 解释
- **AND** `jitterTolerance` MUST 小于单帧真实位移的典型量级

#### Scenario: 小字笔画保留中间点

- **WHEN** 一笔的累计位移远小于旧阈值（如 0.15，单帧 0.005）
- **THEN** 每个真实移动帧 MUST 产生 `changed`
- **AND** MUST NOT 只剩 `began` 与 `ended` 两个端点
- **AND** 画布上 MUST NOT 出现连接首尾的直线飞线

#### Scenario: 重复帧仍被过滤

- **WHEN** 连续采样点的坐标完全相同（上报精度 1e-4 造成的重复帧）
- **THEN** 重复帧 MUST NOT 产生新的 `changed`
- **AND** 抖动过滤 MUST NOT 影响后续真实移动帧的上报

#### Scenario: 笔与鼠标一致性

- **WHEN** 同一段轨迹分别用笔和鼠标绘制
- **THEN** 两者产生的采样点数量与时机 MUST 一致
- **AND** 笔路径 MUST NOT 因状态机过滤而比鼠标路径滞后

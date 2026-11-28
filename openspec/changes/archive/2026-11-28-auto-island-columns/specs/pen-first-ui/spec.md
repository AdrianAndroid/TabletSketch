## ADDED Requirements

### Requirement: 浮岛列数自动判定

应用 SHALL 根据浮岛实际渲染的格子总数（可见内容格 + 末尾「更多」）自动决定列数：≤10 用单列，>10 用双列，不再依赖手动配置。

#### Scenario: 格数不超过十

- **WHEN** 浮岛格子总数 ≤ 10
- **THEN** 浮岛 MUST 使用单列
- **AND** 「更多」MUST 位于该列最后一位

#### Scenario: 格数超过十

- **WHEN** 浮岛格子总数 > 10
- **THEN** 浮岛 MUST 使用双列
- **AND** 第一列 MUST 自上而下填充 10 格，剩余格（含「更多」）MUST 进入第二列

#### Scenario: 按列填充

- **WHEN** 双列渲染
- **THEN** 内容 MUST 按 DOM 顺序先填满左列再填右列
- **AND** MUST NOT 按行左右交替填充

#### Scenario: 格数变化

- **WHEN** 用户增减浮岛格子或窗口缩放
- **THEN** 列数 MUST 按新格数即时重算
- **AND** 列数变化 MUST NOT 改变浮岛拖动与吸附规则，MUST NOT 影响笔尖到画布的坐标映射

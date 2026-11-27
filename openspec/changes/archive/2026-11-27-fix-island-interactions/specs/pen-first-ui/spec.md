# pen-first-ui · delta（fix-island-interactions）

## ADDED Requirements

### Requirement: 浮岛交互可用性

浮岛 SHALL 在真实鼠标与笔下可拖动、可点击，且不被同层浮层遮挡。

#### Scenario: 拖动换边

- **WHEN** 用户按住浮岛顶部把手并向窗口另一侧拖动
- **THEN** 浮岛 MUST 吸附到该侧
- **AND** 双击把手 MUST 复位到右侧
- **AND** 把手的命中区域 MUST NOT 被读数板、面板或遮罩覆盖

#### Scenario: 格子点击

- **WHEN** 用户点击浮岛工具格
- **THEN** 画布当前工具 MUST 切换为该格声明的工具
- **AND** 「笔」「选」两格 MUST 与其余工具格一致生效
- **AND** 点击失败 MUST NOT 静默无反应

#### Scenario: 面板层级

- **WHEN** 浮岛面板或样式气泡打开
- **THEN** 面板 MUST 位于遮罩之上，面板内按钮 MUST 可点
- **AND** 浮岛 MUST 仍可点击，用于切换或关闭面板
- **AND** 遮罩 MUST 只响应「点空白关闭」

#### Scenario: 与读数板不重叠

- **WHEN** 读数板展开或收起为 chip
- **THEN** 读数板 MUST 位于浮岛对侧
- **AND** MUST NOT 覆盖浮岛的把手或任一工具格

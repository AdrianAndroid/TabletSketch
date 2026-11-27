# pen-first-ui · delta（pen-telemetry-panel）

## ADDED Requirements

### Requirement: 压感 / 倾斜读数板

界面 SHALL 在右上角提供一个调试读数板，实时显示笔的压力与倾斜。

#### Scenario: 笔在感应区内

- **WHEN** 收到任意 `pen` 事件
- **THEN** 读数板 MUST 显示原始压力 `0..16383`、归一化值、整形后的出墨值
- **AND** MUST 显示倾斜 X / Y 与合成的笔杆倾角

#### Scenario: 笔离开

- **WHEN** 收到 `ph = "leave"`
- **THEN** 读数板 MUST 置灰并把数值显示为 `—`
- **AND** MUST NOT 保留上一次的假读数冒充实时值

#### Scenario: 不遮挡板载键

- **WHEN** 读数板展开
- **THEN** 其位置 MUST 在按键带下方，不得遮挡 1–8 任一键

#### Scenario: 收起与重开

- **WHEN** 用户点击读数板的关闭按钮
- **THEN** 面板收起，右上角 MUST 保留一个「压感」胶囊
- **AND** 点击胶囊 MUST 重新展开面板（R0：不得只有关闭没有打开）

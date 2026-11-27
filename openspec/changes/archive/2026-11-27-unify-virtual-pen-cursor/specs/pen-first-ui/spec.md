# pen-first-ui · delta（unify-virtual-pen-cursor）

## MODIFIED Requirements

### Requirement: 工具光标

光标指示器 SHALL 随当前工具切换形态，鼠标与手写板共用同一指示器，且不隐藏系统鼠标箭头。

#### Scenario: 绘制工具

- **WHEN** 当前工具为自由笔、矩形、菱形、椭圆、箭头、直线、文字或图片
- **THEN** 指示器 MUST 显示十字准星 `+`
- **AND** 鼠标与手写笔 MUST 显示同一个 `+`
- **AND** 落笔时 `+` MUST 加粗，不得改为实心圆

#### Scenario: 选择与平移

- **WHEN** 当前工具为选择或平移
- **THEN** 指示器 MUST 显示 14pt 空心环，落笔收成 8pt 实心
- **AND** 鼠标 MUST 显示同一个圆环，不得显示专属小圆点
- **AND** 系统箭头 MUST 始终保留

#### Scenario: 橡皮

- **WHEN** 当前工具为橡皮
- **THEN** 指示器 MUST 保持圆圈形态，用于表示擦除范围

#### Scenario: 落点一致

- **WHEN** 指示器显示 `+` 或圆环
- **THEN** 其中心 MUST 与虚拟笔落点一致
- **AND** MUST NOT 设置 `cursor: none`
- **AND** MUST NOT 替换系统光标

# pen-first-ui · delta（fix-island-tool-persistence）

## ADDED Requirements

### Requirement: 浮岛工具选择持久化

工具 SHALL 在用户通过触控笔点击浮岛按钮后保持生效，不被笔按下的默认画笔行为覆盖。

#### Scenario: 笔点工具格

- **WHEN** 用户用触控笔点击浮岛中声明了工具的格子
- **THEN** 当前工具 MUST 切换为该格声明的工具
- **AND** 该工具 MUST 在点击结束后继续保持，MUST NOT 自动切回 `freedraw`
- **AND** 「选择」「手」「橡皮」格 MUST 与其余工具格一致生效

#### Scenario: 笔点画布

- **WHEN** 用户用触控笔在画布区域按下且落点不在任何 `[data-ts-ui]` 元素上
- **THEN** 当前工具 MUST 为 `freedraw`
- **AND** 笔迹 MUST 正常产生

#### Scenario: 启动默认工具

- **WHEN** 应用启动后用户已主动选择过工具
- **THEN** 启动阶段设置默认画笔的逻辑 MUST NOT 覆盖用户的选择

#### Scenario: 鼠标路径不变

- **WHEN** 用户用鼠标点击浮岛工具格
- **THEN** 工具 MUST 与修复前一致地切换并保持

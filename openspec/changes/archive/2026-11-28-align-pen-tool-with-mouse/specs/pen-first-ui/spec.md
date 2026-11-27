# pen-first-ui · delta（align-pen-tool-with-mouse）

## MODIFIED Requirements

### Requirement: 浮岛工具选择持久化

工具 SHALL 在用户通过触控笔点击浮岛按钮后保持生效，且笔在画布上的操作 MUST NOT 额外改写工具。

#### Scenario: 笔点工具格

- **WHEN** 用户用触控笔点击浮岛中声明了工具的格子
- **THEN** 当前工具 MUST 切换为该格声明的工具
- **AND** 该工具 MUST 在点击结束后继续保持，MUST NOT 被本项目额外逻辑切回 `freedraw`

#### Scenario: 笔点画布

- **WHEN** 用户用触控笔在画布区域按下且落点不在任何 `[data-ts-ui]` 元素上
- **THEN** 当前工具 MUST 保持为按下前生效的工具
- **AND** 笔迹 MUST 按该工具的语义产生

#### Scenario: 与鼠标一致

- **WHEN** 用户分别用笔和鼠标在画布上使用同一个已选工具
- **THEN** 两者对当前工具的影响 MUST 一致
- **AND** 工具后续是否回到选择态 MUST 只由 Excalidraw 原生语义决定

#### Scenario: 启动默认工具

- **WHEN** 应用启动后用户已主动选择过工具
- **THEN** 启动阶段设置默认画笔的逻辑 MUST NOT 覆盖用户的选择

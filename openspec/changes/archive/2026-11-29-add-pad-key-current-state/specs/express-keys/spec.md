## ADDED Requirements

### Requirement: 板载键卡片显示当前状态

板载键条上的每个卡片 SHALL 显示其所绑定功能在当前画布状态下的「是否生效」，与右侧浮岛同功能槽位的当前态保持一致。

#### Scenario: 工具槽

- **WHEN** 板载键第 N 位绑定的是工具 `T`
- **AND** 当前工具 `activeTool.type` 等于 `T`
- **THEN** 该卡片 MUST 以实色强调色常亮（与浮岛 `.is-on` 同色）
- **AND** 工具切走后 MUST 立即恢复常态

#### Scenario: 工具锁槽

- **WHEN** 板载键某位绑定的是「锁」
- **AND** 工具锁 `activeTool.locked` 为真
- **THEN** 该卡片 MUST 以实色强调色常亮
- **AND** 解锁后 MUST 恢复常态

#### Scenario: 面板槽

- **WHEN** 板载键某位绑定的是面板 `P`（菜单 / 画布 / 素材）
- **AND** 面板 `P` 处于展开状态
- **THEN** 该卡片 MUST 以浅色强调色常亮（与浮岛 `.is-open` 同色）
- **AND** 面板关闭后 MUST 恢复常态

#### Scenario: 与按下反馈共存

- **WHEN** 用户按下板载键
- **THEN** 该卡片 MUST 仍有瞬时高亮反馈（约 180ms），用于确认按键被接收
- **AND** 瞬时反馈 MUST NOT 改变常亮判定所依据的状态

#### Scenario: 槽位为空

- **WHEN** 板载键某位没有绑定任何功能
- **THEN** 该卡片 MUST 保持常态，MUST NOT 常亮

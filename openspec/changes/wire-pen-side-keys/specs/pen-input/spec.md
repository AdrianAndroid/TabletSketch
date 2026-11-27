# pen-input · delta（wire-pen-side-keys）

## MODIFIED

### Requirement: 笔侧键识别

笔侧键状态 SHALL 从 Digitizer 报告的 flags 字节直接解析，不得依赖厂商通道的 `Report ID 2`。

#### Scenario: 按下侧键 1

- **WHEN** Digitizer flags 的 `bit1` 由 0 变 1
- **THEN** 采集器 MUST 发出 `{"t":"side","keys":[0]}`
- **AND** 前端 MUST 以笔尖位置为圆心呼出径向菜单

#### Scenario: 按下侧键 2

- **WHEN** Digitizer flags 的 `bit2` 由 0 变 1
- **THEN** 采集器 MUST 发出 `{"t":"side","keys":[1]}`
- **AND** 前端 MUST 弹出笔尖样式气泡

#### Scenario: 松开侧键

- **WHEN** 所有侧键位归零
- **THEN** 采集器 MUST 发出 `{"t":"side","keys":[]}`
- **AND** 前端 MUST NOT 重复触发动作

#### Scenario: 位序与真机不符

- **WHEN** 真机实测表明第二侧键不在 `bit2`
- **THEN** 实现 MUST 按实测位掩码修正
- **AND** MUST 同步更新 `openspec/specs/pen-input/spec.md`
- **AND** MUST NOT 在未实测的情况下二次猜测位序

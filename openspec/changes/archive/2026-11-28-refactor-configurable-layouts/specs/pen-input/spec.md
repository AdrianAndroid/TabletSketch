## MODIFIED Requirements

### Requirement: 板载 8 键

采集器 SHALL 读取板载 8 键的键盘报告并上报给应用。

#### Scenario: 接口抓取

- **WHEN** 采集器以 seize 方式打开设备
- **THEN** MUST 在现有鼠标 / 数位化接口之外，额外按本板 VID/PID seize 键盘接口
- **AND** MUST NOT 按 usage 全局匹配其它设备的键盘

#### Scenario: 上报

- **WHEN** 收到 Report ID 6 的键盘报告且组合键命中板载键映射表
- **THEN** MUST 发出 `{"t":"aux","keys":[index]}` 且只发一次（边沿触发）
- **AND** 应用 MUST 按当前板载键布局执行对应动作，MUST NOT 只点亮按键带

## ADDED Requirements

### Requirement: 拦截边界

应用 SHALL 保证板载键拦截不影响其它输入设备。

#### Scenario: 作用域

- **WHEN** 系统中还有其它键盘
- **THEN** 采集器 MUST NOT seize 其它键盘接口，其它键盘 MUST 正常输入
- **AND** 只有 Deco 640（VID `0x28BD` / PID `0x2904`）的键盘报告被接管

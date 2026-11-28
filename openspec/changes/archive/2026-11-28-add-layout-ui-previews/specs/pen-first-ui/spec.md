## ADDED Requirements

### Requirement: 设置内预览不接管输入

设置面板中的布局预览 SHALL 只作为配置可视化与拖动操作面，MUST NOT 成为真实笔输入的接管层。

#### Scenario: 预览只读呈现

- **WHEN** 设置面板打开且显示任一布局预览
- **THEN** 预览 MUST NOT 订阅 `tablet:penpos` / `tablet:mousepos`
- **AND** 预览 MUST NOT 挂载真实的 `RadialMenu` / `LeftStyleIsland` / `PadBand` 输入组件
- **AND** 拖动预览槽位 MUST 只走 HTML5 drag，MUST NOT 派发工具切换 / 面板 / 动作等真实行为

#### Scenario: 真机输入不受影响

- **WHEN** 设置面板关闭后用户在画布上用笔操作
- **THEN** 输入分层 MUST 与打开设置前一致（笔为准、鼠标为应用内模拟层）
- **AND** 预览组件 MUST NOT 残留任何事件订阅或全局状态

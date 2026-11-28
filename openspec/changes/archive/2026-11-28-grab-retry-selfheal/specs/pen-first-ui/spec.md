## ADDED Requirements

### Requirement: 独占失败后自动重试

采集器在独占设备失败时 SHALL 持续退避重试，而不是退回只读后永久放弃。

#### Scenario: 启动时设备被占用
- **WHEN** 采集器以 `--grab` 启动且 `IOHIDManagerOpen(seize)` 返回失败
- **THEN** MUST 退回只读模式保证笔仍可用
- **AND** MUST 按 1.5s 起、每次翻倍、8s 封顶的节奏持续重试
- **AND** MUST 上报“正在重试独占”状态，让界面可见

#### Scenario: 重试成功
- **WHEN** 某次重试成功抢到设备
- **THEN** MUST 恢复 `seized` 状态并重新锁定鼠标、Digitizer、键盘等接口
- **AND** MUST 重新枚举设备并恢复笔与板载键事件
- **AND** MUST 上报“已恢复独占”状态，不需要用户重启应用

#### Scenario: 重试过程不中断书写
- **WHEN** 重试流程关闭并重开 HID 管理器
- **THEN** MUST NOT 上报 `disconnected`，避免界面出现连接闪烁
- **AND** 重试失败 MUST 保持只读模式下的笔事件可用

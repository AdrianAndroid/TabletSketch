# app-lifecycle · delta（add-mouse-input）

## MODIFIED Requirements

### Requirement: 模式与无设备回退

应用 SHALL 在没有手写板时仍可用鼠标作为虚拟笔，且不引入鼠标/手写板模式切换。

#### Scenario: 无设备启动

- **WHEN** 启动时未检测到 Deco 640
- **THEN** 鼠标输入 MUST 可用
- **AND** MUST NOT 初始化 HID 或弹输入监控权限
- **AND** 画板 MUST 可正常用鼠标绘制
- **AND** MUST NOT 要求用户切换模式

#### Scenario: 运行中拔掉设备

- **WHEN** 手写板在运行中断开
- **THEN** 应用 MUST 停止读取并显示一次「设备已断开」
- **AND** 鼠标输入 MUST 仍然可用
- **AND** MUST NOT 崩溃或卡死

#### Scenario: 重新连接

- **WHEN** 设备重新连接
- **THEN** 应用 MAY 提示「手写板已连接」
- **AND** MUST NOT 抢占或中断当前鼠标输入

### Requirement: 权限

应用 SHALL 只在需要读取手写板时请求输入监控权限，并尊重拒绝。

#### Scenario: 首次连接手写板

- **WHEN** 应用检测到 Deco 640 且需要读取 HID
- **THEN** 应用 MAY 请求输入监控权限
- **AND** MUST 说明用途
- **AND** 不得在启动时无条件请求

#### Scenario: 权限被拒

- **WHEN** 权限被拒绝
- **THEN** 应用 MUST 继续用鼠标作为虚拟笔
- **AND** MUST 提供「打开系统设置」入口
- **AND** MUST NOT 反复弹窗

#### Scenario: 权限已授权

- **WHEN** 权限已授权且设备存在
- **THEN** 应用 MUST 正常读取 HID
- **AND** 不得额外请求辅助功能/屏幕录制/自动化权限

### Requirement: 可回退的实验性功能

手写板能力 SHALL 失败时自动回退，用户无需切换模式。

#### Scenario: HID 不可用

- **WHEN** HID 初始化失败或压感注入失败
- **THEN** 应用 MUST 保留画布可用
- **AND** 鼠标输入 MUST 继续可用
- **AND** 必须按固定压力回退线宽，不阻塞启动

#### Scenario: 设备断开

- **WHEN** 设备在运行中断开
- **THEN** 应用 MUST 停止读取 HID
- **AND** 画布与文件 MUST 不受影响
- **AND** 鼠标输入 MUST 继续可用

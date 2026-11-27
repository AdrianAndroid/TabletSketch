# app-lifecycle 变更（bootstrap-tablet-sketch）

## Purpose

定义 TabletSketch 的启动流程、主窗口、输入监控权限、单实例约束、资源释放时机，以及没有手写板时鼠标输入的可用性边界。

## Requirements

### Requirement: 独立应用

TabletSketch SHALL 作为独立 macOS 应用运行，不依赖 MacAppControlDeck。

#### Scenario: 独立启动

- **WHEN** 用户打开 TabletSketch.app
- **THEN** 应用 MUST 不要求安装或运行 MacAppControlDeck
- **AND** MUST NOT 读取主项目的 `UserDefaults`、端口、按钮配置
- **AND** MUST 使用自己的 Bundle ID `com.zhaojian.TabletSketch`

#### Scenario: 独立数据

- **WHEN** 应用写入数据
- **THEN** MUST 只写 `~/Pictures/TabletSketch` 与 `~/Library/Application Support/TabletSketch`
- **AND** MUST NOT 写 `~/Pictures/MacAppControlDeck` 或主项目配置目录

#### Scenario: 主项目不受影响

- **WHEN** TabletSketch 运行或崩溃
- **THEN** MacAppControlDeck 的 UI 草图、按钮、HTTP 服务 MUST 不受影响
- **AND** 不得占用主项目端口或共享 WebView

### Requirement: 入口与窗口

应用 SHALL 提供明确的打开入口，并保持窗口生命周期可预期。

#### Scenario: 首次启动

- **WHEN** 用户首次打开应用
- **THEN** MUST 直接显示画板窗口
- **AND** MUST NOT 要求先配置或先看设置

#### Scenario: 菜单栏入口

- **WHEN** 应用常驻菜单栏
- **THEN** 状态栏菜单 MUST 包含「打开画板」
- **AND** 点击后 MUST 激活已有窗口或新建窗口

#### Scenario: 关闭窗口

- **WHEN** 用户点击红叉或 `Command+W`
- **THEN** 窗口 MUST 关闭，应用 SHOULD 继续驻留菜单栏（可在设置改为关闭即退出）
- **AND** `Command+Q` MUST 退出应用

#### Scenario: 重复启动

- **WHEN** 用户在应用已运行时再次打开
- **THEN** MUST 激活已有实例
- **AND** MUST NOT 创建第二个 HID reader 或第二个画布窗口

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

### Requirement: 单实例与资源释放

应用 SHALL 保证同一时间只有一个输入读取器和一份画布运行时。

#### Scenario: 窗口关闭

- **WHEN** 画板窗口关闭
- **THEN** HID reader MUST 停止
- **AND** WebView MUST 释放或停止计时器
- **AND** 不得继续占用设备或 CPU

#### Scenario: 应用退出

- **WHEN** 用户 `Command+Q`
- **THEN** 应用 MUST 先 flush 当前画布
- **AND** 停止 HID、关闭 WebView、保存按键状态
- **AND** 退出后状态栏图标 MUST 消失

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

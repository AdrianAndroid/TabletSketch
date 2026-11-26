# pen-input 变更（bootstrap-tablet-sketch）

## ADDED Requirements

### Requirement: 设备识别与通道选择

TabletSketch SHALL 识别 XP-Pen Deco 640（VID `0x28bd` / PID `0x2904`），并以厂商私有通道（UsagePage `0xFF0A` / Usage `1`，Report ID `2`）作为首版主输入源。

#### Scenario: 设备存在

- **WHEN** 应用打开手写板模式且 Deco 640 已连接
- **THEN** 应用 MUST 打开 C 通道并读取 12 字节输入报告
- **AND** 设备状态显示为「已连接」
- **AND** MUST NOT 依赖 A/B 通道提供完整压感数据

#### Scenario: 设备不存在

- **WHEN** 应用启动或打开手写板模式时没有 Deco 640
- **THEN** 应用 MUST 回退鼠标模式
- **AND** MUST NOT 阻塞启动、反复重试或反复弹权限窗
- **AND** 界面 MUST 给出一次「未检测到手写板」提示

#### Scenario: 未知设备

- **WHEN** 连接的 HID 设备 VID/PID 不匹配
- **THEN** 应用 MUST 忽略该设备
- **AND** MUST NOT 尝试发送 Deco 640 的初始化报告

### Requirement: 初始化与 ACK 过滤

应用 SHALL 在打开 C 通道后发送 20 字节初始化 Output Report `02 B0 04 + 17×00`，并过滤设备 ACK。

#### Scenario: 初始化成功

- **WHEN** C 通道打开成功
- **THEN** 应用 MUST 发送一次初始化报告
- **AND** 收到 ACK `0xB4 / 0xF2 / 0xF8 / 0xC0` 时 MUST 丢弃，不得当作笔报告
- **AND** 后续 12 字节笔报告 MUST 正常进入解析器

#### Scenario: 初始化失败

- **WHEN** 初始化报告发送失败或超时
- **THEN** 应用 MUST 停止重试，提示「手写板初始化失败」
- **AND** MUST 回退鼠标模式
- **AND** MUST NOT 把 ACK 或空报告当作 `(0,0)` 坐标，导致光标跳左上角

#### Scenario: 拔插设备

- **WHEN** 设备在运行中被拔掉
- **THEN** 应用 MUST 停止读取、清除按键状态、显示「设备已断开」
- **AND** MUST 自动回退鼠标模式，不崩溃

### Requirement: 悬停 / 接触 / 下压三态

应用 SHALL 区分悬停、刚接触、下压三种状态，并分别处理。

#### Scenario: 悬停

- **WHEN** `InRange=1`、`Tip=0`、`Pressure=0`
- **THEN** 应用 MUST 只显示笔刷光标或橡皮半径预览
- **AND** MUST NOT 向画布写入任何笔迹
- **AND** 悬停抖动 MUST 被过滤，不闪烁

#### Scenario: 刚接触

- **WHEN** `Tip=1` 且压力为 0 或很小
- **THEN** 应用 MUST 立即开始笔迹，不得等待压力超过阈值
- **AND** 线宽 MUST 取当前工具的最小值
- **AND** 快速点击（时间短、位移小于 3–5pt）MAY 被视为点击而不是笔画

#### Scenario: 下压

- **WHEN** `Tip=1` 且压力超过死区
- **THEN** 应用 MUST 按压力曲线增加线宽/透明度
- **AND** 压力回落到释放阈值以下时 MUST 结束当前笔迹
- **AND** 起笔阈值与释放阈值 MUST 使用滞回，避免压力抖动导致断笔

### Requirement: 压感与倾斜

应用 SHALL 把压感 `0..16383` 映射为 `0..1`，并支持可调曲线；倾斜 SHALL 作为可选笔锋输入。

#### Scenario: 压感线宽

- **WHEN** 笔尖压力从 0 增加到 16383
- **THEN** 线宽 MUST 从 `wMin` 连续增加到 `wMax`
- **AND** `wMin` MUST 大于 0，轻画可见
- **AND** 压力曲线 MUST 支持 gamma 调整，默认 1.0

#### Scenario: 倾斜

- **WHEN** 笔报告包含 TiltX/TiltY 且当前工具启用倾斜
- **THEN** 应用 MAY 用 `atan2(tiltY, tiltX)` 调整笔锋方向
- **AND** 倾斜不可用时 MUST 忽略，不得阻塞笔迹

#### Scenario: 压感不可用

- **WHEN** 报告缺失压力字段或解析失败
- **THEN** 应用 MUST 回退固定线宽
- **AND** MUST NOT 阻止用户继续画

### Requirement: 笔侧键与橡皮

应用 SHALL 解析笔侧键、橡皮和 Aux 状态位，并做去抖。

#### Scenario: 橡皮

- **WHEN** 笔报告橡皮位为 1 且 Tip=1
- **THEN** 当前笔迹 MUST 进入擦除模式
- **AND** 压力 MAY 控制擦除半径
- **AND** 抬起后 MUST 恢复之前的工具

#### Scenario: 侧键

- **WHEN** 笔侧键按下
- **THEN** 应用 MUST 触发映射动作一次
- **AND** 长按/重复报告 MUST NOT 连续触发
- **AND** 侧键动作 MUST 只在 TabletSketch 前台生效

#### Scenario: 未知状态位

- **WHEN** 报告出现未定义状态位
- **THEN** 应用 MUST 忽略该位，不得崩溃或误触发工具

### Requirement: 输入源仲裁

应用 SHALL 保证同一时刻只有一个输入源向画布写入笔迹。

#### Scenario: 笔优先

- **WHEN** 笔在感应区或 `Tip=1`
- **THEN** 手写板源 MUST 接管画布笔迹
- **AND** 鼠标移动 MUST 暂停笔迹输入

#### Scenario: 鼠标接管

- **WHEN** 手写板空闲且鼠标移动
- **THEN** 鼠标源 MUST 接管
- **AND** 系统鼠标箭头 MUST 恢复显示
- **AND** 不得出现双光标同时绘制

#### Scenario: 窗口失焦

- **WHEN** TabletSketch 失去前台
- **THEN** 画布锁定 MUST 自动解除
- **AND** 笔事件 MUST NOT 被发送到其他应用

### Requirement: 权限与安全

应用 SHALL 只在需要时请求输入监控权限，且不得接管系统指针。

#### Scenario: 权限被拒

- **WHEN** 输入监控权限被拒绝
- **THEN** 应用 MUST 显示说明并回退鼠标模式
- **AND** MUST NOT 反复弹窗或阻塞其他功能

#### Scenario: 不接管系统指针

- **WHEN** 手写板模式运行
- **THEN** 应用 MUST NOT 生成全局 CGEvent 鼠标移动/按下
- **AND** MUST NOT 安装全局 event tap
- **AND** MUST NOT 替换系统鼠标光标

#### Scenario: 数据不外发

- **WHEN** 解析 HID 报告
- **THEN** 所有数据 MUST 只在本地内存/本地文件处理
- **AND** MUST NOT 发送到网络或 Excalidraw 云服务

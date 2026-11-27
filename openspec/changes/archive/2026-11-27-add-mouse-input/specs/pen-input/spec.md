# pen-input · delta（add-mouse-input）

## MODIFIED Requirements

### Requirement: 设备识别

TabletSketch SHALL 只识别 XP-Pen Deco 640（VID `0x28bd` / PID `0x2904`），且不引入鼠标/手写板模式切换。

#### Scenario: 设备存在

- **WHEN** 应用启动且 Deco 640 已连接
- **THEN** 应用 MUST 枚举该设备的全部 3 个接口并显示「手写板已连接」
- **AND** MUST NOT 因某个接口打开失败而阻塞启动

#### Scenario: 设备不存在

- **WHEN** 启动时没有 Deco 640
- **THEN** 应用 MUST 让鼠标输入可用
- **AND** MUST NOT 阻塞启动、反复重试或反复弹权限窗
- **AND** 界面 MUST 给出一次「未检测到手写板」提示
- **AND** MUST NOT 要求用户切换模式

#### Scenario: 拔插设备

- **WHEN** 设备在运行中被拔掉
- **THEN** 应用 MUST 停止读取、清除按键状态、显示「设备已断开」
- **AND** 鼠标输入 MUST 仍然可用
- **AND** MUST NOT 崩溃

## ADDED Requirements

### Requirement: 统一虚拟笔输入

鼠标与手写板 SHALL 共用同一套虚拟笔事件，不得维护两套独立绘制链路。

#### Scenario: 手写板来源

- **WHEN** 手写板上报笔数据
- **THEN** 应用 MUST 将 HID 坐标归一化并映射进 `.ts-stage`
- **AND** MUST 产生 `hover / began / changed / ended` 笔事件
- **AND** 压力 MUST 使用真实压感

#### Scenario: 鼠标来源

- **WHEN** 鼠标在 `.ts-stage` 内移动或按下左键
- **THEN** 应用 MUST 将 `clientX/Y` 相对 `.ts-stage` 归一化
- **AND** MUST 产生与手写板相同格式的笔事件
- **AND** 压力 MUST 固定为 0.5

#### Scenario: 同一事件格式

- **WHEN** 任一来源产生笔事件
- **THEN** 事件格式 MUST 为 `{t:"pen", ph, x, y, p}`
- **AND** MUST 走同一个画布事件入口
- **AND** 鼠标路径 MUST NOT 调用 `CanvasMapping`

### Requirement: 输入仲裁

同一时刻 SHALL 只允许一个来源写画布。

#### Scenario: 空闲

- **WHEN** 没有进行中的笔画
- **THEN** 最后产生笔事件的来源 MUST 成为 `activeSource`

#### Scenario: 笔画进行中

- **WHEN** 某一来源已经 `began`
- **THEN** 只接受该来源的 `changed / ended`
- **AND** 另一来源的 `began / changed` MUST 被忽略
- **AND** 笔画结束后 MUST 回到空闲

#### Scenario: UI 点击

- **WHEN** 鼠标点击浮岛、菜单、样式环、设置或文本输入框
- **THEN** 点击 MUST 正常生效
- **AND** MUST NOT 参与画布输入仲裁
- **AND** MUST NOT 产生笔迹

### Requirement: 鼠标不得被限制

鼠标 SHALL 保留系统鼠标的完整行为。

#### Scenario: 禁止的限制

- **WHEN** 使用鼠标输入
- **THEN** MUST NOT 使用 `requestPointerLock`
- **AND** MUST NOT 裁剪或归一化系统光标坐标
- **AND** MUST NOT 设置 `cursor: none`
- **AND** MUST NOT 替换系统光标
- **AND** MUST NOT 额外调用 `setPointerCapture`

#### Scenario: 自由移动

- **WHEN** 鼠标在窗口中移动
- **THEN** MUST 可在画布、按键带、浮岛、菜单之间自由移动
- **AND** MUST 可移出窗口、切到其他应用
- **AND** MUST NOT 被夹到画布边界或窗口边界

#### Scenario: 小圆点

- **WHEN** 鼠标在应用内移动
- **THEN** 系统箭头 MUST 保留
- **AND** 鼠标位置 MUST 显示一个小圆点作为笔尖指示
- **AND** 小圆点 MUST `pointer-events: none`
- **WHEN** 鼠标移出应用
- **THEN** 小圆点 MUST 隐藏
- **AND** 系统光标 MUST 保持正常
- **WHEN** 样式环打开
- **THEN** 小圆点 MUST 保持显示，作为瞄准点
- **AND** 小圆点 MUST NOT 拦截扇区点击

### Requirement: 笔触范围与边界

笔触 SHALL 只出现在 `.ts-stage` 内。

#### Scenario: 手写板笔圆圈

- **WHEN** 手写板在板上移动
- **THEN** 笔触圆圈 MUST 只出现在 `.ts-stage` 内
- **AND** MUST NOT 出现在按键带、浮岛或窗口留白上

#### Scenario: 鼠标笔触

- **WHEN** 鼠标在 `.ts-stage` 内按下并拖动
- **THEN** MUST 正常出墨
- **WHEN** 鼠标在 `.ts-stage` 外移动
- **THEN** MUST NOT 出墨，但小圆点 MAY 继续跟随

#### Scenario: 拖出边界

- **WHEN** 按住左键把鼠标拖出 `.ts-stage`
- **THEN** 虚拟笔坐标 MUST 夹到 `.ts-stage` 边界
- **AND** 笔触 MUST 停在边界，不得画到区外
- **AND** 拖回 `.ts-stage` 后 MUST 从边界继续
- **AND** 夹取 MUST 只作用于虚拟笔坐标，MUST NOT 作用于系统光标

### Requirement: 鼠标右键与快捷键

鼠标右键与键盘 `\` SHALL 映射到侧键 1。

#### Scenario: 右键

- **WHEN** 用户在应用内按下鼠标右键
- **THEN** MUST 触发侧键 1 的样式环动作
- **AND** MUST 抑制原生右键菜单
- **AND** 若样式环已打开，MUST NOT 重复打开或关闭

#### Scenario: 键盘

- **WHEN** 用户按 `\` 且焦点不在输入框或文本编辑器
- **THEN** MUST 触发侧键 1 的样式环动作
- **AND** MUST 使用最后一次鼠标位置作为圆心

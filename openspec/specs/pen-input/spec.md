# pen-input · 稳定规格

> 合并自 `bootstrap-tablet-sketch` → `seize-pen-input` → `onboard-pad-visualizer` → `window-as-pad` → `map-onboard-keys`。
> 早期版本中与真机实测冲突的表述已被后续变更覆盖，冲突处以后写的为准，并在下文标注「实测修正」。

## Purpose

定义 XP-Pen Deco 640 的 HID 接口解析、笔悬停与接触状态、压力整形、笔侧键、板载 8 键与坐标映射范围。

## Requirements

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

### Requirement: 数据通道

真机的 3 个接口与用途（实测修正：早期版本把厂商通道当主输入源，与事实不符）。笔数据 SHALL 只从 Digitizer 接口读取，厂商通道不得作为数据源。

| 接口 | UsagePage / Usage | 实际用途 |
|---|---|---|
| 鼠标 + 键盘复合 | `0x01` / `2` | 板载 8 键，`Report ID 6` 键盘报告；另含鼠标报告（不使用） |
| Digitizer | `0x0D` / `2` | **笔的位置、压力、倾斜、悬停——唯一真实的笔数据源** |
| 厂商通道 | `0xFF0A` / `1` | 实测在整段会话中不产生报文，不作为数据源 |

#### Scenario: 笔数据来源

- **WHEN** 笔进入感应区
- **THEN** 应用 MUST 从 Digitizer 接口读取坐标与压力
- **AND** MUST NOT 依赖厂商通道提供笔数据

#### Scenario: Digitizer 报文解析

- **WHEN** 收到 Digitizer 报告
- **THEN** 应用 MUST 先丢弃首字节 Report ID，再按 descriptor 解析
- **AND** 坐标 MUST 按 `MaxX = 15999` / `MaxY = 8999` 归一化
- **AND** 压力 MUST 按 `0..16383` 归一化

### Requirement: 悬停 / 接触 / 抬起

应用 SHALL 区分悬停、接触、抬起三种状态。

#### Scenario: 悬停

- **WHEN** 笔在感应区且未接触面板
- **THEN** 应用 MUST 只显示笔光标圆圈
- **AND** MUST NOT 向画布写入任何笔迹

#### Scenario: 轻触起笔

- **WHEN** 笔尖接触面板（`tipDown` 为真，或压力 ≥ `pressureOn = 0.0015`）
- **THEN** 应用 MUST 立即产生 `began`，不得要求用户先施加明显压力
- **AND** 起笔与释放 MUST 使用滞回（`pressureOff = 0.0008`）避免抖动断笔

#### Scenario: 快速点击

- **WHEN** 接触时长 ≤ 0.32s 且位移 ≤ 3.5pt
- **THEN** 应用 MAY 视为点击而非笔画

#### Scenario: 笔离开感应区

- **WHEN** 笔离开感应区
- **THEN** 正在进行的笔画 MUST 立即收尾
- **AND** 笔光标 MUST 隐藏
- **AND** 固件停止上报时 MUST 由看门狗兜底重置状态

### Requirement: 压力整形

注入画布的压力 SHALL 经过整形，保证「一碰就有可见线宽」（实测修正：原线性整形在轻触时线宽趋近 0，用户体感为「点了没反应」）。

- 压力下限 `PRESSURE_FLOOR = 0.35`：只要笔尖接触过面板，线宽就不得低于该值对应的宽度
- `p = 0` → `0.35`（落笔帧）
- `p > 0` → `0.35 + 0.65 × p^0.6`，上限 1
- 抬笔时压力 MUST 置 0

#### Scenario: 轻触可见

- **WHEN** 笔尖以最小压力接触面板
- **THEN** 画布上 MUST 出现肉眼可见的线，不得为发丝线或空白

#### Scenario: 压感粗细

- **WHEN** 压力从最小增加到最大
- **THEN** 线宽 MUST 单调增加，且最大与最小差异明显

### Requirement: 笔侧键与橡皮

侧键状态 MUST 从 Digitizer 报告的 flags 字节（body[0]）直接取位，不得依赖厂商通道的 `Report ID 2`——该通道零报文，任何取自它的状态恒为 `false`。

| 位 | 掩码 | 含义 | 映射 |
|---|---|---|---|
| `bit0` | `0x01` | Tip Switch | 落笔 |
| `bit1` | `0x02` | Barrel Switch | 侧键 1 → 两级样式环 |
| `bit2` | `0x04` | Eraser 位 | 侧键 2 → 工具环（Deco 640 无笔尾橡皮，固件把第二侧键接在此位，真机已确认） |
| `bit3` | `0x08` | Invert | 橡皮 |

实测 flags 只有三种取值：`0xA0` 悬停、`0xA1` 接触、`0xC0` 离开。

#### Scenario: 侧键

- **WHEN** 笔侧键按下（flags 对应位由 0 变 1）
- **THEN** 采集器 MUST 发出 `{"t":"side","keys":[<索引>]}`；索引 1 MUST 对应笔侧键 2
- **AND** 应用 MUST 触发映射动作一次
- **AND** 重复报告 MUST NOT 连续触发
- **AND** 动作 MUST 只在 TabletSketch 前台生效

#### Scenario: 橡皮

- **WHEN** 橡皮位为 1 且笔尖接触
- **THEN** 当前笔画 MUST 进入擦除模式
- **AND** 抬起后 MUST 恢复之前的工具

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

### Requirement: 坐标映射范围

笔坐标 SHALL 只映射到窗口的手写区。

#### Scenario: 笔只在手写区内

- **WHEN** 笔在板上任意位置移动
- **THEN** 归一化坐标 MUST 只映射到窗口的手写区（`.ts-stage`）
- **AND** 笔光标 MUST NOT 出现在按键带或窗口留白上

### Requirement: 独占与系统指针

应用 SHALL 尝试独占设备，但不得接管系统指针。

#### Scenario: 尝试独占

- **WHEN** 采集器以 `--grab` 启动
- **THEN** MUST 对全部接口尝试 `kIOHIDOptionsTypeSeizeDevice`
- **AND** 独占失败 MUST 退回只读且不阻塞启动

**已知偏差**

`page 1` 与 `page 13` 的独占在本机返回 `kIOReturnExclusiveAccess`（`-536870203`），系统内核 HID 驱动先占，用户态抢不到。因此当前实现：

- 板载键会同时作用到前台应用
- 笔仍会驱动系统光标

这两条尚未解决，解法见 `Docs/HANDOFF.md` 的未决项；解决前不得在文档里声称「笔已完全局限在应用内」。

#### Scenario: 不接管系统指针

- **WHEN** 手写板模式运行
- **THEN** 应用 MUST NOT 安装全局 event tap、MUST NOT 替换系统鼠标、MUST NOT 生成全局 CGEvent 鼠标移动
- **AND** 如需冻结光标，必须另立变更并修改本规格

### Requirement: 数据安全

HID 解析数据 SHALL 只在本地处理。

#### Scenario: 本地处理

- **WHEN** 解析 HID 报告
- **THEN** 所有数据 MUST 只在本地内存/本地文件处理
- **AND** MUST NOT 发送到网络或 Excalidraw 云服务

### Requirement: 统一虚拟笔输入

鼠标与手写板 SHALL 共用同一套虚拟笔事件与同一个笔尖指示器，不得维护两套独立绘制链路或两套光标。

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

#### Scenario: 共用指示器

- **WHEN** 鼠标移动
- **THEN** 手写笔的圆环 / 十字指示器 MUST 跟随鼠标位置
- **AND** MUST NOT 为鼠标显示另一套专属光标
- **AND** 指示器形态 MUST 只由当前工具决定
- **WHEN** 手写板移动
- **THEN** 同一个指示器 MUST 跟随笔的映射位置
- **AND** 最后活动的来源 MUST 决定指示器位置

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

#### Scenario: 指示器

- **WHEN** 鼠标在应用内移动
- **THEN** 系统箭头 MUST 保留
- **AND** 共用的虚拟笔指示器 MUST 跟随鼠标热点
- **AND** 指示器 MUST `pointer-events: none`
- **WHEN** 鼠标移出应用
- **THEN** 指示器 MUST 隐藏
- **AND** 系统光标 MUST 保持正常
- **WHEN** 样式环打开
- **THEN** 指示器 MUST 保持显示，作为瞄准点
- **AND** 指示器 MUST NOT 拦截扇区点击

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

## 本次变更新增需求（refactor-configurable-layouts）

### Requirement: 拦截边界

应用 SHALL 保证板载键拦截不影响其它输入设备。

#### Scenario: 作用域

- **WHEN** 系统中还有其它键盘
- **THEN** 采集器 MUST NOT seize 其它键盘接口，其它键盘 MUST 正常输入
- **AND** 只有 Deco 640（VID `0x28BD` / PID `0x2904`）的键盘报告被接管

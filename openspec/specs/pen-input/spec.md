# pen-input · 稳定规格

> 合并自 `bootstrap-tablet-sketch` → `seize-pen-input` → `onboard-pad-visualizer` → `window-as-pad` → `map-onboard-keys`。
> 早期版本中与真机实测冲突的表述已被后续变更覆盖，冲突处以后写的为准，并在下文标注「实测修正」。

## 1. 设备识别

TabletSketch SHALL 只识别 XP-Pen Deco 640（VID `0x28bd` / PID `0x2904`）。本项目不服务其他设备（见 AGENTS.md R9）。

### Scenario: 设备存在

- **WHEN** 应用启动且 Deco 640 已连接
- **THEN** 应用 MUST 枚举该设备的全部 3 个接口并显示「手写板已连接」
- **AND** MUST NOT 因某个接口打开失败而阻塞启动

### Scenario: 设备不存在

- **WHEN** 启动时没有 Deco 640
- **THEN** 应用 MUST 回退鼠标模式
- **AND** MUST NOT 阻塞启动、反复重试或反复弹权限窗
- **AND** 界面 MUST 给出一次「未检测到手写板」提示

### Scenario: 拔插设备

- **WHEN** 设备在运行中被拔掉
- **THEN** 应用 MUST 停止读取、清除按键状态、显示「设备已断开」
- **AND** MUST 自动回退鼠标模式，不崩溃

## 2. 数据通道

真机的 3 个接口与用途（实测修正：早期版本把厂商通道当主输入源，与事实不符）：

| 接口 | UsagePage / Usage | 实际用途 |
|---|---|---|
| 鼠标 + 键盘复合 | `0x01` / `2` | 板载 8 键，`Report ID 6` 键盘报告；另含鼠标报告（不使用） |
| Digitizer | `0x0D` / `2` | **笔的位置、压力、倾斜、悬停——唯一真实的笔数据源** |
| 厂商通道 | `0xFF0A` / `1` | 实测在整段会话中不产生报文，不作为数据源 |

### Scenario: 笔数据来源

- **WHEN** 笔进入感应区
- **THEN** 应用 MUST 从 Digitizer 接口读取坐标与压力
- **AND** MUST NOT 依赖厂商通道提供笔数据

### Scenario: Digitizer 报文解析

- **WHEN** 收到 Digitizer 报告
- **THEN** 应用 MUST 先丢弃首字节 Report ID，再按 descriptor 解析
- **AND** 坐标 MUST 按 `MaxX = 15999` / `MaxY = 8999` 归一化
- **AND** 压力 MUST 按 `0..16383` 归一化

## 3. 悬停 / 接触 / 抬起

应用 SHALL 区分悬停、接触、抬起三种状态。

### Scenario: 悬停

- **WHEN** 笔在感应区且未接触面板
- **THEN** 应用 MUST 只显示笔光标圆圈
- **AND** MUST NOT 向画布写入任何笔迹

### Scenario: 轻触起笔

- **WHEN** 笔尖接触面板（`tipDown` 为真，或压力 ≥ `pressureOn = 0.0015`）
- **THEN** 应用 MUST 立即产生 `began`，不得要求用户先施加明显压力
- **AND** 起笔与释放 MUST 使用滞回（`pressureOff = 0.0008`）避免抖动断笔

### Scenario: 快速点击

- **WHEN** 接触时长 ≤ 0.32s 且位移 ≤ 3.5pt
- **THEN** 应用 MAY 视为点击而非笔画

### Scenario: 笔离开感应区

- **WHEN** 笔离开感应区
- **THEN** 正在进行的笔画 MUST 立即收尾
- **AND** 笔光标 MUST 隐藏
- **AND** 固件停止上报时 MUST 由看门狗兜底重置状态

## 4. 压力整形

注入画布的压力 SHALL 经过整形，保证「一碰就有可见线宽」（实测修正：原线性整形在轻触时线宽趋近 0，用户体感为「点了没反应」）。

- 压力下限 `PRESSURE_FLOOR = 0.35`：只要笔尖接触过面板，线宽就不得低于该值对应的宽度
- `p = 0` → `0.35`（落笔帧）
- `p > 0` → `0.35 + 0.65 × p^0.6`，上限 1
- 抬笔时压力 MUST 置 0

### Scenario: 轻触可见

- **WHEN** 笔尖以最小压力接触面板
- **THEN** 画布上 MUST 出现肉眼可见的线，不得为发丝线或空白

### Scenario: 压感粗细

- **WHEN** 压力从最小增加到最大
- **THEN** 线宽 MUST 单调增加，且最大与最小差异明显

## 5. 笔侧键与橡皮

侧键状态 MUST 从 Digitizer 报告的 flags 字节（body[0]）直接取位，不得依赖厂商通道的 `Report ID 2`——该通道零报文，任何取自它的状态恒为 `false`。

| 位 | 掩码 | 含义 | 映射 |
|---|---|---|---|
| `bit0` | `0x01` | Tip Switch | 落笔 |
| `bit1` | `0x02` | Barrel Switch | 侧键 1 → 径向菜单 |
| `bit2` | `0x04` | Eraser 位 | 侧键 2 → 样式气泡（Deco 640 无笔尾橡皮，固件把第二侧键接在此位，真机已确认） |
| `bit3` | `0x08` | Invert | 橡皮 |

实测 flags 只有三种取值：`0xA0` 悬停、`0xA1` 接触、`0xC0` 离开。

### Scenario: 侧键

- **WHEN** 笔侧键按下（flags 对应位由 0 变 1）
- **THEN** 采集器 MUST 发出 `{"t":"side","keys":[<索引>]}`
- **AND** 应用 MUST 触发映射动作一次
- **AND** 重复报告 MUST NOT 连续触发
- **AND** 动作 MUST 只在 TabletSketch 前台生效

### Scenario: 橡皮

- **WHEN** 橡皮位为 1 且笔尖接触
- **THEN** 当前笔画 MUST 进入擦除模式
- **AND** 抬起后 MUST 恢复之前的工具

## 6. 板载 8 键

板载键 SHALL 通过 page 1 的 `Report ID 6` 键盘报告识别（实测修正：不再假设厂商通道 `Report ID 3` 位图）。

### Scenario: 键位识别

- **WHEN** 收到 `Report ID 6` 且 `keycode ≠ 0`
- **THEN** 应用 MUST 按 `(modifier << 8) | keycode` 查表得到 0–7 索引
- **AND** MUST 以边沿触发方式发送 `aux` 事件，按住不放只发一次

真机映射（逐键实测）：

| 键 | modifier | keycode | 固件含义 |
|---|---|---|---|
| 1 | 0 | `0x05` | `b` 画笔 |
| 2 | 0 | `0x08` | `e` 橡皮 |
| 3 | 0 | `0x2F` | `[` 笔刷变细 |
| 4 | 0 | `0x30` | `]` 笔刷变粗 |
| 5 | 1 | `0x56` | `Ctrl` + 小键盘 `-` |
| 6 | 1 | `0x57` | `Ctrl` + 小键盘 `+` |
| 7 | 1 | `0x1D` | `Ctrl+Z` 撤销 |
| 8 | 3 | `0x1D` | `Ctrl+Shift+Z` 重做 |

### Scenario: 可见反馈

- **WHEN** 收到板载键事件
- **THEN** 按键带上对应位置 MUST 点亮 26pt 主色圆 + 数字
- **AND** MUST 在 180ms 后消失
- **AND** MUST NOT 再触发画布动作（动作由固件映射的原生快捷键完成，重复执行会双重生效）

## 7. 坐标映射范围

### Scenario: 笔只在手写区内

- **WHEN** 笔在板上任意位置移动
- **THEN** 归一化坐标 MUST 只映射到窗口的手写区（`.ts-stage`）
- **AND** 笔光标 MUST NOT 出现在按键带或窗口留白上

## 8. 独占与系统指针

### Scenario: 尝试独占

- **WHEN** 采集器以 `--grab` 启动
- **THEN** MUST 对全部接口尝试 `kIOHIDOptionsTypeSeizeDevice`
- **AND** 独占失败 MUST 退回只读且不阻塞启动

### 已知偏差

`page 1` 与 `page 13` 的独占在本机返回 `kIOReturnExclusiveAccess`（`-536870203`），系统内核 HID 驱动先占，用户态抢不到。因此当前实现：

- 板载键会同时作用到前台应用
- 笔仍会驱动系统光标

这两条尚未解决，解法见 `Docs/HANDOFF.md` 的未决项；解决前不得在文档里声称「笔已完全局限在应用内」。

### Scenario: 不接管系统指针

- **WHEN** 手写板模式运行
- **THEN** 应用 MUST NOT 安装全局 event tap、MUST NOT 替换系统鼠标、MUST NOT 生成全局 CGEvent 鼠标移动
- **AND** 如需冻结光标，必须另立变更并修改本规格

## 9. 数据安全

- **WHEN** 解析 HID 报告
- **THEN** 所有数据 MUST 只在本地内存/本地文件处理
- **AND** MUST NOT 发送到网络或 Excalidraw 云服务

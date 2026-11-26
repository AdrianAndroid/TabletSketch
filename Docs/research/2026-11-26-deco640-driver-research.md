# XP-Pen Deco 640 自定义手写板驱动 · 技术预研报告

> **状态：预研，未实施。** 本文不是需求记录，未建 OpenSpec 变更，未修改任何产品代码。
> 立项时请按 R1 建 `change-id`，并在本文末尾补上反向链接。
> 日期：2026-11-26 · 设备：XP-Pen Deco 640 · 环境：macOS 15.8.3 (24H241)
> 交付形态（用户意向）：集成进 MacAppControlDeck，但**改天再做，本轮只调研**。

---

## 0. 结论摘要

1. **可以做，且比"写驱动"听起来简单**：不需要内核驱动、DriverKit、KEXT、关 SIP、开发者账号、重签名。全部在用户态用 `IOHIDManager` 完成。
2. **协议零逆向**：OpenTabletDriver 已支持 Deco 640 (IT640)，配置里的 VID/PID 与本机实测完全一致；12 字节报告的**每一个字段**都有开源 C# 源码可对照。本轮已把初始化序列和字节布局全部查实（见第 2 节）。
3. **真正的难点不是协议，是架构选择**：一旦发初始化序列切换到 vendor 模式，系统的标准 HID 指针流会停止，你必须自己用 CGEvent 生成鼠标移动／按下、处理多显示器坐标映射和滤波。这比解析报文大得多。
4. **推荐两阶段**：阶段 1 先做「只读辅助映射」（不接管指针，风险最低）；阶段 2 再决定是否做 vendor 模式完整驱动；压感接 Sketch 走 Native→JS 短路径，绕过系统 tablet 事件。
5. **本机环境干净**：未安装 XP-Pen 官方驱动，无相关 launchd 服务／系统扩展，可以直接独占私有通道。
6. **可单独配置的按键是 10 个**：板载 8 个虚拟快捷键 + P01 笔上 2 个侧键；笔尖压感/倾斜是模拟量，橡皮是按键切换出的模式。Deco 640 没有独立滚轮。
7. **等比例画布限制容易实现**：本质是二维坐标的等比缩放 + 居中偏移 + 越界丢弃/夹边。真正的难点不是数学，而是与系统唯一鼠标光标的仲裁；只在 Deck 内置 Sketch 内使用时冲突最小。

### 对上一轮结论的修正

上一轮口头判断「A/B 通道零代码就有压感、倾斜」**过于乐观，此处更正**：

- A/B 是板子默认 **HID 模式**下的标准接口，macOS 接管后主要提供基础指针输入。
- OpenTabletDriver 的 `DigitizerIdentifiers` 明确写 `InputReportLength: 12 / OutputReportLength: 20`，正好对应 **C 通道（0xFF0A）** 的 `maxInput=12 / maxOutput=20`。也就是说：**完整的笔数据（压感、倾斜、笔按钮、橡皮）与板载按键，全都来自私有通道的 12 字节报告**，需要先发初始化序列把板子切到 vendor 模式。
- 因此「要全部自定义」= 读 C 通道；A/B 通道只在阶段 1 的只读方案里作为「板载按键是否默认以键盘事件上报」的观察对象。

---

## 1. 实测设备与三条 HID 通道

本机实测命令与结果：

```bash
hidutil list                       # 列出 HID 服务与设备
system_profiler SPUSBDataType      # 确认 Manufacturer: XPPen
ioreg -l -w0 | grep -A 60 '"Product" = "Deco 640"'   # 拿 Report Descriptor
swiftc Tools/DecoProbe.swift -o /tmp/DecoProbe && /tmp/DecoProbe 6
```

| 通道 | UsagePage / Usage | Report ID | 长度 | 系统是否接管 | 内容 |
|---|---|---|---|---|---|
| A | `1 / 2` Mouse | 9（8B）、1、6 | 8B in / 1B out | 是 `AppleUserHIDEventDriver` | 绝对 X/Y + 压感；相对鼠标+5 键+滚轮；标准键盘 collection（板载按键可能走这里） |
| B | `13 / 2` Digitizer | 7（10B） | 10B in / 1B out | 是 | 笔尖/侧开关/橡皮/InRange + X/Y(≈16000×9000) + 压感(16383) + X/Y 倾斜 |
| C | `0xFF0A / 1` 厂商私有 | 2（12B） | **12B in / 20B out** | **否，无 event driver** | vendor 模式下全部笔数据 + 8 个板载按键（协议预留滚轮字段，本机型号是否有物理滚轮待实测） |

C 通道的 Report Descriptor：

```
06 0a ff   Usage Page (Vendor Defined 0xFF0A)
09 01      Usage (1)
a1 01      Collection (Application)
85 02        Report ID (2)
09 02        Usage (2)
75 08 95 0b  Report Size 8, Report Count 11
15 00 26 ff 00
81 02        Input  -> 11 字节输入
09 03        Usage (3)
75 08 95 13  Report Size 8, Report Count 19
91 02        Output -> 19 字节输出（+1 字节 Report ID = 20）
c0
```

**探针实测结论**：三条接口 `IOHIDDeviceOpen` 全部返回成功，`IOHIDDeviceGetReport(FeatureReport, 2)` 也能读回数据 —— 用户态确实可读写，且不需要抢系统设备。当时未捕获实时 input report，原因是（a）运行时无人动笔，（b）C 通道需要先发初始化 Output Report 才开始上报。这两点在第 7 节阶段 0 补验。

---

## 2. 协议：初始化序列与 12 字节报告布局（开源可查，无需逆向）

### 2.1 初始化序列

OpenTabletDriver 的 `Deco 640 (IT640).json`：

```json
{
  "Name": "XP-Pen Deco 640 (IT640)",
  "Specifications": {
    "Digitizer": { "Width": 159.99, "Height": 89.99, "MaxX": 31998, "MaxY": 17998 },
    "Pen": { "MaxPressure": 16383, "ButtonCount": 2 },
    "AuxiliaryButtons": { "ButtonCount": 8 }
  },
  "DigitizerIdentifiers": [{
    "VendorID": 10429, "ProductID": 10500,
    "InputReportLength": 12, "OutputReportLength": 20,
    "ReportParser": "OpenTabletDriver.Configurations.Parsers.XP_Pen.XP_PenReportParser",
    "OutputInitReport": [ "ArAE" ]
  }]
}
```

`"ArAE"` 是 base64，解码为 `02 B0 04`，补零到 20 字节即：

```
02 B0 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

这与 Linux `hid-uclogic` 驱动、hawku TabletDriver 的 XP-Pen 配置完全一致（后者写作 `InitReport 0x02 0xB0 0x04 0x00...`）。设备回 ACK（`02 B1 04 ...`，部分固件 `02 B4 ...`）必须过滤，否则会被当成坐标为 (0,0) 的笔报告，导致指针跳到屏幕左上角。

### 2.2 报文分发（`XP_PenReportParser.Parse`）

| `report[1]` | 含义 | 处理 |
|---|---|---|
| `0xC0` | 笔离开感应范围 | `OutOfRangeReport`，重置笔状态 |
| `0xB4` | 设备把 init 报文回显 | 忽略 |
| `0xF2` | idle report | 忽略（曾误判为 aux） |
| `0xF8` | 无线 dongle 的 ON 报文 | 忽略 |
| bit4 (`0x10`) 置位 | **Aux 报告**（板载按键／滚轮） | 走 `XP_PenAuxReport` |
| 其他 | **笔报告** | 长度 ≥12 走 `XP_PenTabletOverflowReport`（Deco 640 就是这条） |

### 2.3 笔报告（12 字节）

| 偏移 | 字段 | 说明 |
|---|---|---|
| `[0]` | Report ID | `0x02` |
| `[1]` | 状态位 | bit1=笔按钮 1，bit2=笔按钮 2，bit3=橡皮 |
| `[2..3]` | X 低 16 位 | little-endian |
| `[4..5]` | Y 低 16 位 | little-endian |
| `[6..7]` | 压感 | uint16，0..16383 |
| `[8]` | Tilt X | 有符号 `sbyte` |
| `[9]` | Tilt Y | 有符号 `sbyte` |
| `[10]` | X 高 8 位 | overflow 字节，MaxX = 31998 需要 >16bit |
| `[11]` | Y 高 8 位 | MaxY = 17998 |

对应源码：`X = ReadUnaligned<UInt16>(report[2]) | report[10] << 16`，`Y = ... | report[11] << 16`，`Pressure = ReadUnaligned<UInt16>(report[6])`，`Tilt = ((sbyte)report[8], (sbyte)report[9])`。

### 2.4 Aux 报告（板载按键／协议预留滚轮）

`XP_PenAuxReport` 默认 `auxIndex = 2, wheelIndex = 7`：

| 偏移 | 字段 | 说明 |
|---|---|---|
| `[2]` | 按键 1–8 | bit0..bit7 分别是 8 个板载键 |
| `[3]` | 按键 9–16 | 位图 |
| `[4]` | 按键 17–20 | bit0..bit3 |
| `[7]` | 滚轮 | bit0=顺时针 `+1`，bit1=逆时针 `-1`；bit4/bit5=第二滚轮 |
| `[5] [6] [8..11]` | 保留 | — |

Deco 640 只有 8 个板载键，所以 `[2]` 一个字节就够；滚轮是否有值需实测 `[7]`（见第 6 节风险 4）。

### 2.5 规格

159.99 × 89.99 mm 有效区域，坐标 31998 × 17998，压感 16383 级，笔按钮 2 个，板载按键 8 个，支持倾斜。

---

## 3. 四条自定义目标分别怎么做

用户选择了「全部调研」，下面逐条给出路径。

### 3.1 板载 8 键（协议预留滚轮）→ 自定义动作

- 数据源：Aux 报告 `[2]` 的 8 bit；`[7]` 是协议预留的滚轮方向，本机型号是否有物理滚轮需实测。
- 事件模型：`TabletEvent { kind: .auxButton(Int) / .wheel(Int), pressed: Bool, timestamp }`，在 HID 回调里做**边沿检测**（按下/抬起各一次），避免按住时重复触发。
- 映射目标可复用现有三套能力：
  - `BuiltinActions.run(id)` —— 打开画板、打开设置、打开桌宠等内置操作；
  - `KeyInjector.inject(ShortcutCombo)` —— 任意系统快捷键（`ShortcutPresets.all` 已有 19 个预设，也支持自定义组合）；
  - `QuickActionRunner` 的串行队列语义 —— 防止高频按键把执行队列打爆。
- 持久化：沿用 `Store/ConfigStore.swift` 的 JSON 配置，新增 `TabletBinding` 结构（键位/可选滚轮方向 + 修饰键 + target action）。
- UI：`UI/SettingsView.swift` 加 `.tablet` tab，做一张 8 键 + 可选滚轮的绑定表。

**两条实现路径（重要权衡）**：

| | 路径 1：只读辅助映射（推荐先做） | 路径 2：vendor 模式完整接管 |
|---|---|---|
| 是否发 init | 否 | 是 |
| 是否接管指针 | 否，系统继续用 A/B | 是，必须自己生成 CGEvent |
| 能拿到什么 | 板载按键（若默认以键盘事件上报） | 全部：按键+可选滚轮+压感+倾斜+笔按钮 |
| 复杂度 | 低 | 高 |
| 风险 | 按键来源需实测确认，可能与真实键盘冲突 | 指针流水线、多显示器、滤波、ACK 处理 |

### 3.2 压感与倾斜 → 接入 Sketch 草图模块

- 数据源：笔报告 `[6..7]` 压感、`[8]` `[9]` 倾斜；归一化 `pressure / 16383.0`。
- **推荐短路径（Native→JS）**：`Modules/Sketch/SketchWindowController.swift` L511-519 已有 `callAsyncJavaScript` / `evaluateJavaScript` 通道，直接在 Swift 侧把采样值写进 `window.deckSketch.*`，JS 侧在 `Web/sketch/src/main.jsx` 的 `pointermove` 里读 `pressure / tiltX / tiltY`。**绕过系统 tablet 事件**，不需要处理 CGEvent 字段，也不影响其他 App。
- 备选长路径（系统级压感）：用 `CGEventSetDoubleValueField` 写 `CGEventField.tabletEventPointPressure` / `tabletEventTiltX` / `tabletEventTiltY`（0.0–1.0），再配合 `tabletEventPointX/Y/Buttons` 与 `tabletProximityEvent*` 生成系统 tablet 事件。好处是任何绘图 App 都能收到；代价是需要虚拟事件源与设备 ID 管理，且合成 tablet 事件的兼容性需实测。**阶段 2 之后再评估**。
- 现成的「压感 → 笔迹宽度」管线可参考 `Sources/MacShotKit/Upstream/Overlay/PencilToolHandler.swift` L15-137 的 `rawPressureBuffer` 与 `Annotation.pressures`（`Annotation.swift` L151、L736-761）。
- 高频采样（通常 >100Hz）不要每条都过桥，建议 Swift 侧做节流/低通后再注入。

### 3.3 笔尖 / 侧开关 / 橡皮

- 数据源：笔报告 `[1]` 的 bit1（笔按钮 1）、bit2（笔按钮 2）、bit3（橡皮）；`0xC0` 为离位。
- 组合手势（例如「侧开关 + 笔尖」切换工具）在 `TabletEvent` 层做状态机，写法可参考 `Modules/Pet/PetRuntime.swift` 的状态机组织方式。
- 橡皮可直接映射为「切换橡皮工具」内置动作，或映射为 `KeyInjector` 的 `E` 快捷键。

### 3.4 通用映射框架

建议先落这层，再逐条填规则：

```
TabletHIDReader        IOHIDManager 封装，热插拔、权限检查、原始报文回调
  -> TabletReportParser  按第 2 节布局解析成结构化 TabletEvent
  -> TabletEventRouter   边沿检测、组合键、节流、滤波
  -> TabletBindingStore  键位/动作映射，持久化到 ConfigStore
  -> ActionSink          BuiltinActions / KeyInjector / QuickActionRunner
```

框架本身与具体映射规则解耦，符合用户「先做通用映射框架，规则以后慢慢填」的意愿。

---

## 4. 方案对比

| 方案 | 能拿到 | 优点 | 缺点 | 适用 |
|---|---|---|---|---|
| **A. 自研用户态 + 集成 Deck**（用户意向） | 全部 | 完全可编程、能映射到 Deck 内置动作／手机面板、复用既有权限与固定签名 | 工作量最大；vendor 模式要自己接管指针 | 想按自己要求深度定制 |
| B. OpenTabletDriver | 全部 | 开箱即用，协议已验证，Deco 640 官方支持 | macOS 仅 `osx-x64`（Apple Silicon 需 Rosetta 2）；不支持 per-app 配置、不支持触控转盘、无内置压感曲线；**无法映射到 Deck 动作**；安装前必须卸载所有其他平板驱动 | 只想压感绘图，不介意额外进程 |
| C. XP-Pen 官方驱动 | 全部 | 原厂功能完整 | 不可编程；与 A/B 冲突（双光标） | 只要原厂默认功能 |
| D. Karabiner-Elements / BetterTouchTool | 仅按键 | 零开发 | 拿不到压感／倾斜／笔按钮 | 只想改 8 个键 |

注：OTD 0.6.6.0 起正式包含 Deco 640 (IT640) 支持；macOS 版自带 .NET 运行时、无需单独安装，但仍需辅助功能 + 输入监控权限。

---

## 5. 与 MacAppControlDeck 的集成点（精确文件／行号）

| 目的 | 文件与位置 |
|---|---|
| R0 内置快捷入口 | `Control/BuiltinActions.swift`：L25 后加 `Preset(id: "tablet.open", name: "打开手写板", symbol: "✍")`；L57 `default:` 前加 `case "tablet.open": TabletModule.shared.open()` |
| 「添加内置操作」自动列举 | `UI/ButtonsSettingsView.swift` L147-153 已 `ForEach(BuiltinActions.all)`，**无需改动**；下游 `DeckState.addBuiltin` → `ConfigStore.addBuiltinButton` → `APIRouter` / `PanelHTML` / `RemoteControlModule` 全按 id 泛化处理 |
| 新模块 | 新建 `Modules/Tablet/TabletModule.swift`（遵循 `Core/FeatureModule.swift` L6-29），菜单「打开」项样板见 `Modules/Sketch/SketchModule.swift` L42-58 |
| 模块注册 | `App/DeckApp.swift` L30 后加 `register(TabletModule.shared)` |
| 设置页 | `UI/SettingsView.swift` L5-21 加 `case tablet`、L45-59 加侧栏行；`App/DeckApp.swift` L83-100 `SettingsDeepLink.map` 加 `"tablet"` |
| 全局快捷键 | `App/GlobalHotKeys.swift` L93-149 加 `id: "tablet.open"` / `hotKeyID: 11`；**同步把 `Tests/.../GlobalHotKeyTests.swift` L20 的 `count == 10` 改为 11** |
| 默认出现在两处快捷区 | `Store/ConfigStore.swift` `seedDefaultButtons` L34-107 增一段默认内置按钮播种 |
| HID 读取 | 项目当前**没有** `import IOKit` 的产品代码；移植 `Tools/DecoProbe.swift`，并在 `Package.swift` L19-33 加 `.linkedFramework("IOKit")` |
| 权限 | `App/DeckState.swift` L18-21（`accessibilityReady` / `inputMonitoringReady`）、L113-122（打开设置页、申请输入监控）可直接复用 |
| 输入骨架 | `Modules/Pet/PetInputMonitor.swift`（CGEventTap + `CGPreflightListenEventAccess` + tap 自动重启）、`Control/KeyInjector.swift`、`Control/QuickActionRunner.swift` |
| 压感入 Sketch | `Modules/Sketch/SketchBridge.swift` L4-15 / L39-78（JS→Native）、`SketchWindowController.swift` L170-193 与 L511-519（Native→JS） |
| OpenSpec | `openspec/changes/` 当前只有 `archive/`（83 个已归档），`openspec/specs/` 有 24 个 capability 且**无 tablet 相关**；新建 `add-tablet-*` 变更需 `proposal.md` + `design.md` + `tasks.md` + `specs/tablet-input/spec.md` |

### R0–R4 约束速查

| 规则 | 对本功能的要求 |
|---|---|
| R0 | 必须注册 `tablet.open` 且 `run` 里真实打开；必须能从「添加内置操作」添加后出现在菜单栏与手机面板；模块菜单保留直接「打开」项；提测前人工点一下验证确实能打开 |
| R1 | 动手前先建 `openspec/changes/<change-id>/`，含 proposal/design/tasks + capability delta；归档到 `archive/YYYY-MM-DD-.../` 并同步 `openspec/specs/`；提交说明引用 change-id；本文（Docs）届时需补反向链接 |
| R2 | 统一 `./Build/build.sh`；**不要新增 entitlements、不要改签名 flags / Bundle ID / 证书**（会重置已有 TCC 授权）；提测前后各跑一次 `verify-signing.sh` |
| R3 | 本功能只新增 builtin case，不改 `AppControl` / `QuickActionRunner` / `DeckState.perform` / `/api/activate`，**不触发**「打开应用」回归，不用跑 `DECK_RUN_ACTIVATION_E2E=1` |
| R4 | 精确过滤：`--filter ShortcutActionsTests` / `ModuleRegistryTests` / `GlobalHotKeyTests` / `APIRouterTests` / `PanelLayoutTests`；**若改了 `Package.swift` 加 IOKit，命中「改依赖」→ 跑全量 `swift test`** 并在提交说明写明原因 |

### 最小改动清单

```
1. openspec/changes/add-tablet-*/：proposal + design + tasks + specs/tablet-input/spec.md
2. Control/BuiltinActions.swift：L25 后加 preset，L57 前加 case -> TabletModule.shared.open()
3. 新建 Modules/Tablet/TabletModule.swift（FeatureModule + 菜单「打开」项 + settingsView）
4. App/DeckApp.swift：L30 后 register；L83-100 加深链 "tablet"
5. UI/SettingsView.swift：SettingsTab 加 .tablet + 侧栏行
6. App/GlobalHotKeys.swift：加 hotKeyID 11 定义；同步改 GlobalHotKeyTests 计数断言
7. Store/ConfigStore.swift：seedDefaultButtons 增默认内置按钮播种（R0 开箱可用）
8. Package.swift 加 IOKit；HID 读取移植 Tools/DecoProbe.swift；权限复用 DeckState
9. 压感：SketchBridge / SketchWindowController 增 tabletSample，或走 Native→JS 注入
10. 签名与 entitlement 一律不动；按 R4 跑过滤测试（改 Package.swift 则全量）+ R0 人工点验
```

---

## 6. 风险与未决问题

1. **vendor 模式下系统指针流可能停止**（最大风险）。切模式后 A/B 标准报告若不再上报，必须自己用 CGEvent 生成移动/按下，还要处理：多显示器坐标映射与 DPI、显示分辨率变化后重算、屏幕边缘钳制、笔悬停/离位、报告率节流与低通滤波。OTD 自己也有「显示器布局变化需重启 daemon」的已知问题。**缓解：阶段 1 先不发 init，只做只读映射。**
2. **阶段 1 的最大未决点**：不发 init 时，板载 8 键是否默认以 A 通道 Report ID 6 的标准键盘事件上报？A 通道 descriptor 里确实存在键盘 collection，且同类 XP-Pen 板子（Deco02 的 HID-BPF 补丁）按键走的是 HID keyboard usage code。若成立，可直接用 IOHIDManager 按 VID/PID 过滤来源后映射，完全不碰私有通道；若不成立，则必须走阶段 2。**此项必须实测，不能靠推断。**
3. **权限 API**：`IOHIDManagerOpen` 受 Input Monitoring TCC 保护，未授权会返回 `kIOReturnNotPermitted` / `TCC deny`。项目现用 `CGPreflightListenEventAccess()`；对 IOHID 更精确的是 `IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)` / `IOHIDRequestAccess(kIOHIDRequestTypeListenEvent)`。正式 App 已按 R2 固定签名授权，**不要为它新增 entitlement**。
4. **滚轮**：Deco 640 没有独立滚轮；通用 parser 的 `wheelIndex=7` 是协议预留字段，需实测 `[7]` 是否出现 `0x01/0x02`。若没有，按 8 键处理，不要为滚轮预留产品 UI。
5. **ACK / 状态字节差异**：不同固件的 ACK 可能是 `02 B1 04` 或 `02 B4`；必须按 `0xB4 / 0xF2 / 0xF8 / 0xC0` 过滤，否则指针会跳到 (0,0)（Linux 内核邮件列表有明确记录）。
6. **官方驱动冲突**：OTD 文档明确要求安装前卸载所有其他平板驱动，否则双光标。本机实测**未装**官方驱动、无相关 launchd 服务/系统扩展，环境干净；若日后安装，需先卸载。
7. **测试连带**：新增 `GlobalHotKeyDefinition` 会打破 `GlobalHotKeyTests.testCatalogDefaults` 的 `count == 10` 断言（属本改动相关，必须修）；改 `Package.swift` 会触发 R4 全量测试要求。
8. **合成 tablet 事件兼容性**：长路径（系统级压感）依赖 macOS 对 CGEvent tablet 字段的接受程度，未实测，建议阶段 2 之后单独验证，不要绑进阶段 1。

---

## 7. 分阶段路线（改天动手时按此推进）

### 阶段 0 · 抓包验证（只改 `Tools/`，不碰产品代码）

- 给 `Tools/DecoProbe.swift` 增加 `--init`：向 C 通道发 `02 B0 04 + 17×00` 的 Output Report，再注册回调。
- 边动笔、按 8 个键；若实测确认有滚轮，再转滚轮，dump 12 字节，对照第 2 节布局逐字段确认。
- 同时跑一次「不发 init」对照，确认板载按键是否走 A 通道键盘 collection（风险 2）。
- 验收：拿到按下/抬起的真实字节，确认 ACK 形态；若存在滚轮，再确认 `[7]` 的值。
- 无需 OpenSpec 变更（纯诊断工具）。

### 阶段 1 · 只读辅助映射（低风险，先出可用功能）

- 建 `add-tablet-aux-bindings` 变更；**不接管指针**，只做 8 键（若实测有滚轮再加滚轮）→ Deck 动作/快捷键映射。
- 按 R0 注册 `tablet.open`、按 R1 写齐四件套、按第 5 节最小清单改动。
- 测试：`swift test --filter ShortcutActionsTests --filter ModuleRegistryTests --filter GlobalHotKeyTests --filter APIRouterTests --filter PanelLayoutTests`；改了 `Package.swift` 则全量。
- 验收：R0 人工从「添加内置操作」添加后点一下能打开；按板载键确实触发配置的动作；`verify-signing.sh` 前后各一次。

### 阶段 2 · vendor 模式完整驱动

- 建 `add-tablet-vendor-mode` 变更；发 init、过滤 ACK、CGEvent 生成指针、多显示器映射、滤波、热插拔重连。
- 新增 `tablet-input` capability 的完整 delta。
- 验收：拔插、多显示器切换、笔离位/悬停、长时间稳定性；全量测试 + 签名校验。

### 阶段 3 · 压感进 Sketch

- 建 `add-sketch-tablet-pressure` 变更；Native→JS 注入 pressure/tilt，接入 Excalidraw 笔迹宽度。
- 测试：`--filter SketchRuntimeTests` / `SketchStoreTests` 等受影响用例。

> 每个阶段完成后按 R1 归档到 `openspec/changes/archive/YYYY-MM-DD-<change-id>/`，同步 `openspec/specs/`，提交说明引用 change-id，并在本文补反向链接。

---

## 8. 参考来源

- OpenTabletDriver `Deco 640 (IT640).json`（0.6.x 分支）与 PR #3589（新增支持）
- OpenTabletDriver `XP_PenReportParser.cs` / `XP_PenAuxReport.cs` / `XP_PenTabletOverflowReport.cs` / `XP_PenTabletReport.cs`（0.6.x 分支）
- OpenTabletDriver Wiki：Configuration Guide（init strings / parser 说明）、Required Permissions、General FAQ、Tablets 支持列表
- OpenTabletDriver v0.6.6.0 release notes（Deco 640 backport #3801）
- SevenPens：Install OpenTabletDriver on macOS（macOS 版限制、权限、Rosetta）
- Linux LKML：`hid: Add support for the xp-pen deco mini7 tablet` 补丁讨论（`02 b0 04` 初始化与 ACK 处理）
- hawku TabletDriver 的 XP-Pen G640 配置（`InitReport 0x02 0xB0 0x04 ...`）
- Apple Developer：`CGEventField`（`tabletEventPointPressure` / `tabletEventTiltX` / `tabletEventTiltY` 等）
- 本地实测：`hidutil list`、`ioreg`、`system_profiler` 输出，以及 `Tools/DecoProbe.swift` 运行结果

---

## 9. 补充调研：可配置按键与等比例画布

> 2026-11-26 补充。用户已确认：先调研，改天再开发；本节只记录结论与方案，不改产品代码。

### 9.1 可单独配置的按键数量

官方手册把板子顶部编号 1–8 的感应区称为「虚拟快捷键」：用笔尖点按触发，不是机械按键；每一个都可以在驱动里单独改功能（见 9.5 参考来源）。

| 输入 | 数量 | 能否单独映射 | 说明 |
|---|---|---|---|
| 板载虚拟快捷键 | 8 | 能 | 顶部 1–8，笔尖点按；官方驱动可逐键配置，支持按应用配置，最多 7 个应用 |
| P01 笔侧键 | 2 | 能 | 官方说明两个笔侧键都可自定义；可把其中一个设为「笔/橡皮切换」 |
| 笔尖压感 | 1 个模拟量 | 可映射为压感参数 | 16384 级，不是离散按键 |
| 笔倾斜 | 2 个模拟量 | 可映射为倾斜参数 | X/Y 倾斜，60° |
| 橡皮 | 1 个模式 | 由笔侧键切换 | 不单独计为第三个笔键 |
| 独立滚轮 | 0 | — | Deco 640 没有独立滚轮；协议 `[7]` 的滚轮字段是通用解析器预留，本机是否有值待实测 |

**结论：离散、可单独写驱动配置的输入是 10 个**——8 个板载虚拟快捷键 + 2 个笔侧键。
自研驱动不必受官方「最多 7 个应用配置」限制，可以按应用/按窗口做任意配置组；每个键做边沿检测，按下与抬起各触发一次。

### 9.2 把书写板限制在等比例画布内

**结论：容易。**本质是二维坐标的等比缩放、居中偏移和越界处理，不是协议或驱动难点。

Deco 640 有效区为 `160 × 90 mm`，本身就是 `16:9`：

- `16:9` 画布：整块板都能用，不需要裁
- `4:3` 画布：左右各裁掉约 `20 mm`，或保留整板、上下留黑边
- `1:1` 画布：左右各裁掉约 `35 mm`

三种「画布」范围，难度不同：

| 范围 | 做法 | 难度 |
|---|---|---|
| Deck 内置 Sketch 画布 | 画布固定宽高比 + 应用内坐标映射 + 越界丢弃；不动系统光标 | 低 |
| 屏幕上的固定矩形 | 平板坐标 → 归一化 `0..1` → 目标矩形；等比缩放 + 居中偏移 | 低到中 |
| 跟随任意窗口/画布 | 额外跟踪窗口内容区、移动、缩放、多显示器、Retina 坐标 | 中 |
| 全系统所有 App 生效 | 必须接管指针（vendor 模式或事件拦截），再叠加输入仲裁 | 中偏高 |

裁切模式（crop）的算法：

```text
目标宽高比 R = cw / ch
若 W / H > R：w = H * R，x0 = (W - w) / 2，h = H，y0 = 0
否则：        h = W / R，y0 = (H - h) / 2，w = W，x0 = 0

u = (x - x0) / w
v = (y - y0) / h
sx = cx + u * cw
sy = cy + v * ch
```

`u` 或 `v` 落在 `0..1` 之外时，绘图场景直接丢弃该报告，不要夹到边缘，否则会在画布边缘画出拖尾。
如果是“保留整板、画布内留黑边”的 contain 模式，则反过来：在目标矩形里先算出最大等比例子矩形，整板映射到该子矩形。

官方驱动本身已有同类能力，说明产品层面可行：

- **自定义手写区域**：拖拽、点选左上/右下角，或输入 X/Y/W/H
- **屏幕比例**：把设备工作区裁成与显示器同比例，代价是一部分设备区域不可用
- **精细模式**：把屏幕活动区域限制在一定范围内

OpenTabletDriver 也有 `LockAspectRatio`、`AreaClipping`（越界夹边）、`AreaLimiting`（越界丢弃）三个对应开关，可直接参考其语义。

### 9.3 与鼠标指针的冲突及解决

macOS 只有一个系统光标。数位板和鼠标不是各自拥有一个光标，而是共同往同一个光标写坐标；谁最后发事件，光标就听谁的。所以**不是天然冲突，但会争抢同一个光标**。

| 冲突 | 表现 | 解决 |
|---|---|---|
| 鼠标和笔同时动 | 光标来回跳，最后事件覆盖前一个 | 输入仲裁：笔在感应区/落笔时笔优先；鼠标一移动立即交还 |
| 从鼠标切到笔 | 光标瞬移到笔的绝对位置 | 笔进入画布时先锚定到上次画布位置或画布中心，再做绝对映射 |
| 笔移到画布外 | 光标离开画布，点击落到别的窗口 | 只丢弃画布外的笔事件；绘图不要用夹边 |
| 鼠标想离开画布 | 如果连鼠标也锁，鼠标就废了 | 只约束笔事件，鼠标事件原样放行 |
| 画布窗口不在前台 | 笔点下去点到背后的 App | 只在目标窗口是前台时启用画布锁，否则透传或禁用 |
| 官方驱动与自研驱动同时跑 | 双光标、抖动、重复点击 | 只保留一个事件源；vendor 模式停系统标准流；只读模式不要额外注入 CGEvent |

推荐的处理顺序：

1. **输入源仲裁**：记录当前输入源是笔还是鼠标；笔在感应区或落笔时接管，鼠标移动时立即让位。可加「笔优先 / 鼠标优先 / 显式切换」设置。
2. **进入画布防跳**：笔从画布外进入时，先把光标锚到上次画布位置或画布中心，再做绝对映射；也可进入后改用相对模式。不要直接从当前鼠标位置开始绝对映射。
3. **越界策略**：绘图用 `AreaLimiting`（画布外报告直接丢弃）；只做光标定位时才用 `AreaClipping`（夹到边界）。
4. **来源隔离**：自研驱动能区分笔事件和鼠标事件，只转换笔事件；鼠标事件完全不动。
5. **视觉隔离**：画布内可隐藏系统箭头，画自己的笔刷圈；鼠标一进入画布再显示系统箭头。macOS 不支持两个独立系统光标，若要“笔在画布内、鼠标指针在画布外”同时可见，只能让笔使用应用内虚拟光标，不驱动系统光标。

三种场景的最终结论：

- **只做 Deck 内置 Sketch**：只读 HID + 应用内虚拟笔光标；鼠标完全不受影响，冲突几乎为零。
- **做屏幕固定矩形**：映射容易；冲突处理是主要工作量，但可用输入仲裁解决。
- **做全系统所有 App 都锁在画布**：需要接管指针 + 输入仲裁 + 窗口跟踪，属于中等偏难，不建议第一阶段做。

### 9.4 对现有分阶段路线的影响

- **阶段 1（只读映射）**：可以做 8 个板载键和 2 个笔侧键；不能全局限制系统光标，但可以在 Deck 自己的 Sketch 画布内做虚拟笔光标和画布限制。
- **阶段 2（vendor 模式）**：再做全局画布锁，必须同时实现输入仲裁、进入锚点、越界丢弃和窗口跟踪。
- **阶段 3（压感/倾斜）**：画布限制不影响压感与倾斜；这两者继续走 Native→JS 注入。
- 本轮不开发代码；后续立项时按 R1 建 OpenSpec 变更，并按 R0 注册 `tablet.open` 内置入口。

### 9.5 补充参考来源

- XP-Pen Deco 640 官方中文说明书（8 个虚拟快捷键、自定义手写区域、屏幕比例、精细模式）：<http://www.xp-pen.cn/Uploads/images/product/detail/Deco640/online_manual/Deco%20640%20User%20Manual%20(Chinese).pdf>
- XP-Pen Deco 640 在线用户手册：<https://www.xp-pen.com.cn/user-manual/deco-640>
- XP-Pen P01 笔产品页（两个笔侧键均可自定义）：<https://www.storexppen.eu/buy/29.html>
- OpenTabletDriver Output Modes（`LockAspectRatio` / `AreaClipping` / `AreaLimiting`）：<https://deepwiki.com/OpenTabletDriver/OpenTabletDriver/6.1-output-modes>
- OpenTabletDriver General FAQ（显示器布局变化需重启 daemon）：<https://opentabletdriver.net/Wiki/FAQ/General>

---

## 附：立项时需要用户确认的事

1. 先做阶段 1（只读映射）还是直接上阶段 2（完整接管指针）？
2. 8 个板载键（以及实测确认的滚轮）各自想映射成什么动作（可先留空，框架先落）？
3. 压感是否需要「所有绘图 App 都能收到」（长路径），还是只需要 Deck 内置 Sketch 画板（短路径）？
4. 是否允许安装/卸载其他平板驱动（影响 OTD 方案共存）？

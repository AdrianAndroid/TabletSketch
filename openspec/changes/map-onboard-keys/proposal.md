# Proposal · map-onboard-keys

## Why

板载 8 键从 M9 起一直"未实现"，原因是对协议的假设错了：项目一直认为按键走厂商通道（page 65290）的 `Report ID 3`，`AuxReportParser` 据此硬猜 `bytes[2]` 是 8 位位图。

真机对拍证明这个假设不成立：**厂商通道在整个会话里一条报文都没有**，而按键实际走 page 1（Generic Desktop，鼠标+键盘复合接口）的 `Report ID 6`，是一份标准的 8 字节键盘报告——固件早就把 8 个键翻译成了 8 个快捷键。

## What Changes

- `HIDReader` 新增 `pointerDevice`，登记 page 1 / usage 2 接口（此前被当作"鼠标接口，不读"直接丢弃）。
- 新增 `handlePointer`：解析 `Report ID 6` 的 `[id, modifier, key, …]`，按实测映射表翻成 0–7 索引，发 `{t:"aux", keys:[i]}`。
- 映射表按用户逐键实测的顺序固定，不再依赖任何推测。
- 前端收到板载键**只点亮按键带**，不再联动浮岛：这 8 个键本身已经是真快捷键，再执行一次会双重生效（按一下撤销会撤两步）。

## Capabilities

`pen-input`（板载键识别与可见反馈）

## 实测映射（物理键 → HID 组合）

| 键 | modifier | keycode | 含义 |
|---|---|---|---|
| 1 | 0 | 0x05 | `b` 画笔 |
| 2 | 0 | 0x08 | `e` 橡皮 |
| 3 | 0 | 0x2F | `[` 笔刷变细 |
| 4 | 0 | 0x30 | `]` 笔刷变粗 |
| 5 | 1 | 0x56 | `Ctrl` + 小键盘 `-` |
| 6 | 1 | 0x57 | `Ctrl` + 小键盘 `+` |
| 7 | 1 | 0x1D | `Ctrl+Z` 撤销 |
| 8 | 3 | 0x1D | `Ctrl+Shift+Z` 重做 |

## Impact

- 修改：`Sources/TabletSketchHID/HIDReader.swift`（`pointerDevice` / `handlePointer` / `padKeyMap`）
- 修改：`Web/sketch/src/tablet/Shell.jsx`（板载键只高亮）
- 修改：`Web/app/main.js`（`raw` / `aux` 等报文进日志，供后续对拍）

## 非目标

- 不改写键码（`hidutil` 全局映射），因此这 8 个键仍会作用到前台应用
- 不接管 page 1 的鼠标报告，笔仍会驱动系统光标

## 遗留

`page 1` 与 `page 13` 的 `seize` 均返回 `kIOReturnExclusiveAccess`（`-536870203`），系统内核 HID 驱动先占。用户态无法抢占，导致：

1. 板载键会漏到前台应用；
2. 笔仍驱动系统光标，未做到"只在应用内"。

两条都需要在系统光标/键码层面处理，见 `Docs/HANDOFF.md` 的未决项。

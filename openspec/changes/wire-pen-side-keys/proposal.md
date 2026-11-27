# wire-pen-side-keys · 接通笔侧键

## Why

用户反馈「手写笔上的两个按键怎么没反应」。

根因：`HIDReader.handleDigitizer` 构造 `PenReport` 时，`barrel1` / `barrel2` 取自 `lastKeys`，而 `lastKeys` 只在 `Report ID 2`（厂商通道）分支里更新——该通道在真机上零报文。因此侧键状态恒为 `false`，`side` 事件从未发出。前端 `Shell.jsx` 的映射（`0`→径向菜单、`1`→样式气泡、`2`→橡皮）本身是完整的，只是收不到通知。

## What Changes

- `handleDigitizer` 直接解析 Digitizer 报文的 flags 字节：
  - `bit0` Tip Switch（已有）
  - `bit1` Barrel Switch → 侧键 1
  - `bit2` Eraser 位 → 侧键 2（Deco 640 无笔尾橡皮，固件把第二侧键接到该位，待真机确认）
  - `bit3` Invert → 橡皮
- `PenReport` 的三个按钮位改为「Digitizer 实测位 OR 旧的 `lastKeys` 兜底」，两条通道互不覆盖。
- `dflags` 诊断日志补上二进制形式，方便按真机校准位序。

## Capabilities

- `pen-input`：笔侧键识别与事件上报

## Impact

- 仅 `Sources/TabletSketchHID/HIDReader.swift`
- 前端无改动，既有映射直接生效
- 不影响笔迹、压感、板载键

## 非目标

- 不做侧键长按、双击
- 不实现设置里的 4 个 `PenSideAction` 自定义（当前固定为 径向菜单 / 样式气泡 / 橡皮）

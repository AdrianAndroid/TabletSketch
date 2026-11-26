# Design · map-onboard-keys

## 为什么之前一直是空的

三个错误假设叠加：

1. **以为按键走厂商通道**。实际上 page 65290 在整个会话里 0 条报文，笔数据全部来自 Digitizer（page 13）。
2. **以为 page 1 只是鼠标接口**。它的 report descriptor 里同时含 Mouse（Report ID 1/9）与 Keyboard（Report ID 6）：
   `05010906 a101 8506 0507 19e0 29e7 …` —— 这一句就是键盘描述符。
3. **dump 通路被日志过滤吞掉**。采集器把原始报文送到页面后，主进程只打印 `pen` 类型，`raw` 被静默丢弃，导致前几轮"按了很多遍"没有任何证据留下。

## 数据形状

```
Report ID 6，8 字节
[0] = 6              report id
[1] = modifier       bit0 LCtrl, bit1 LShift …
[2] = keycode        HID Keyboard usage
[3..7] = 0           填充（6KRO 的其余槽位）
```

判定组合键用 `(modifier << 8) | keycode`，松开时 keycode 为 0，用它复位边沿检测。

## 边沿触发

`lastPadKey` 记住上一次组合键，相同则丢弃。否则按住不放会以 200Hz 连发 aux，把界面刷成频闪。

## 为什么不联动浮岛

板载键在固件层已经是 `b` / `e` / `Ctrl+Z` 这样的真快捷键，Excalidraw 自己就会响应。如果 Shell 再调一次 `api.undo()`，一次按键会撤两步。所以前端只负责点亮按键带上的位置，动作交给原生。

## 已知副作用

按键对系统来说是普通键盘输入，会打到当前前台应用。这是 page 1 抢占失败的直接后果，本轮不处理。

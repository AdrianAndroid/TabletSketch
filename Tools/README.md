# Tools

## DecoProbe.swift

只读 HID 诊断工具，不是产品功能。

```bash
swiftc Tools/DecoProbe.swift -o /tmp/DecoProbe
/tmp/DecoProbe 6
```

首次运行若读不到数据，需要在「系统设置 → 隐私与安全性 → 输入监控」里授权终端/程序，然后重跑。

它用于确认：

- Deco 640 VID/PID
- A/B/C 三条通道是否存在
- C 通道 12 字节报告
- 初始化后是否收到笔数据
- ACK 是否被误当成坐标

**不要在产品代码里直接调用这个探针的全局状态**；后续应抽成可测试的 `HIDReader`。

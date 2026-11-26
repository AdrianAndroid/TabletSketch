import Foundation

// tablet-sketch-hid：只读 HID 采集器。
//
// 用法：
//   tablet-sketch-hid            正常输出笔与按键事件（逐行 JSON）
//   tablet-sketch-hid --dump     额外输出原始报文字节，用于核对协议
//   tablet-sketch-hid --once     打印设备信息后立即退出，用于自检
//
// 退出码：
//   0  正常退出
//   2  找不到设备
//   3  无权限（缺「输入监控」授权）
//   4  打开失败

let arguments = CommandLine.arguments
let dumpRaw = arguments.contains("--dump")
let once = arguments.contains("--once")

setvbuf(stdout, nil, _IOLBF, 0)

/// 持有信号源，避免被释放
var signalSources: [DispatchSourceSignal] = []

let reader = HIDReader(dumpRaw: dumpRaw)

reader.onFailure = { reason in
    Emit.line(["t": "error", "reason": reason])
    switch reason {
    case "PEN_NOT_FOUND":
        Emit.err("未找到 XP-Pen Deco 640（VID 0x28BD / PID 0x2904）。请确认设备已连接。")
        exit(2)
    case "PEN_PERMISSION":
        Emit.err("没有读取 HID 的权限。请到「系统设置 → 隐私与安全性 → 输入监控」里勾选本应用。")
        exit(3)
    default:
        Emit.err("打开 HID 设备失败：\(reason)")
        exit(4)
    }
}

reader.start()

if once {
    // 给设备枚举留一点时间，然后主动退出，让调用方能判断"能不能读到设备"
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
        exit(0)
    }
} else {
    // 2 秒内没有设备挂载，判定为未连接
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
        reader.checkReady()
    }
}

// 父进程关闭管道时（Electron 退出），stdout 写入会触发 SIGPIPE，正常收尾
signal(SIGPIPE, SIG_IGN)

// 收到终止信号时干净退出，避免留下半开句柄
for sig in [SIGTERM, SIGINT] {
    signal(sig, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
    source.setEventHandler {
        Emit.line(["t": "bye"])
        exit(0)
    }
    source.resume()
    // 持有引用，避免被释放
    signalSources.append(source)
}

RunLoop.main.run()

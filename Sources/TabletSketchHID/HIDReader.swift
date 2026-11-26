import Foundation
import IOKit.hid
import TabletSketchCore

/// 只读 HID 采集器。
///
/// 只做一件事：打开 XP-Pen Deco 640 的 vendor 定义接口（UsagePage 0xFF0A / Usage 1），
/// 收 12 字节笔报告和按键报告，翻译成归一化 JSON 行写到 stdout。
/// 不接管系统指针、不安装任何驱动、不改动任何系统状态。
final class HIDReader {
    struct Device {
        let vendorID: Int
        let productID: Int
        let usagePage: Int
        let usage: Int
    }

    /// 退出回调：PEN_NOT_FOUND / PEN_PERMISSION / PEN_ERROR
    var onFailure: ((String) -> Void)?

    private let device: Device
    private let dumpRaw: Bool
    private var manager: IOHIDManager?
    private var penDevice: IOHIDDevice?
    private var stateMachine = PenStateMachine()
    private var lastAuxKeys: Set<Int> = []
    private var opened = false

    init(
        device: Device = Device(vendorID: 0x28BD, productID: 0x2904, usagePage: 0xFF0A, usage: 1),
        dumpRaw: Bool = false
    ) {
        self.device = device
        self.dumpRaw = dumpRaw
    }

    func start() {
        let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
        self.manager = manager

        let matching: [String: Any] = [
            kIOHIDVendorIDKey as String: device.vendorID,
            kIOHIDProductIDKey as String: device.productID,
            kIOHIDPrimaryUsagePageKey as String: device.usagePage,
            kIOHIDPrimaryUsageKey as String: device.usage
        ]
        IOHIDManagerSetDeviceMatching(manager, matching as CFDictionary)

        let context = Unmanaged.passUnretained(self).toOpaque()
        IOHIDManagerRegisterDeviceMatchingCallback(manager, Self.deviceAdded, context)
        IOHIDManagerRegisterDeviceRemovalCallback(manager, Self.deviceRemoved, context)
        IOHIDManagerRegisterInputReportCallback(manager, Self.reportReceived, context)
        IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetMain(), CFRunLoopMode.defaultMode.rawValue)

        let status = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        guard status == kIOReturnSuccess else {
            // kIOReturnNotPermitted 通常意味着缺「输入监控」授权
            onFailure?(status == kIOReturnNotPermitted ? "PEN_PERMISSION" : "PEN_ERROR")
            return
        }
        opened = true
    }

    /// 由 main 在启动 2 秒后调用：届时若没匹配到设备，判定为未连接。
    func checkReady() {
        guard penDevice == nil else { return }
        onFailure?("PEN_NOT_FOUND")
    }

    // MARK: - 回调

    private static let deviceAdded: IOHIDDeviceCallback = { context, _, _, device in
        guard let context else { return }
        let reader = Unmanaged<HIDReader>.fromOpaque(context).takeUnretainedValue()
        reader.attach(device)
    }

    private static let deviceRemoved: IOHIDDeviceCallback = { context, _, _, _ in
        guard let context else { return }
        let reader = Unmanaged<HIDReader>.fromOpaque(context).takeUnretainedValue()
        reader.detach()
    }

    private static let reportReceived: IOHIDReportCallback = {
        context, _, _, _, reportID, report, reportLength in
        guard let context else { return }
        let reader = Unmanaged<HIDReader>.fromOpaque(context).takeUnretainedValue()
        let bytes = Array(UnsafeBufferPointer(start: report, count: reportLength))
        reader.handle(reportID: reportID, bytes: bytes)
    }

    // MARK: - 设备挂载

    private func attach(_ device: IOHIDDevice) {
        penDevice = device

        let product = (IOHIDDeviceGetProperty(device, kIOHIDProductKey as CFString) as? String) ?? "Unknown"
        Emit.line([
            "t": "ready",
            "product": product,
            "maxX": Int(PenReport.maxX),
            "maxY": Int(PenReport.maxY)
        ])

        // 切到 vendor 通道：`02 B0 04` + 17×00。
        // IOHIDDeviceSetReport 的 report 参数不含 report ID，ID 单独传，
        // 所以要把 initReport 的首字节 0x02 去掉。
        var payload = Array(VendorProtocol.initReport.dropFirst())
        let status = payload.withUnsafeMutableBufferPointer { buffer -> IOReturn in
            guard let base = buffer.baseAddress else { return kIOReturnError }
            return IOHIDDeviceSetReport(
                device,
                kIOHIDReportTypeOutput,
                CFIndex(VendorProtocol.initReport[0]),
                base,
                buffer.count
            )
        }
        if status != kIOReturnSuccess {
            Emit.line(["t": "warn", "msg": "init report failed", "status": Int(status)])
        }
    }

    private func detach() {
        penDevice = nil
        stateMachine.reset()
        lastAuxKeys = []
        Emit.line(["t": "disconnected"])
    }

    // MARK: - 报文

    private func handle(reportID: UInt32, bytes: [UInt8]) {
        if dumpRaw {
            Emit.line(["t": "raw", "id": Int(reportID), "bytes": bytes.map { Int($0) }])
        }

        // 笔报告：Report ID 2，12 字节
        if bytes.count >= PenReportParser.penReportLength,
           let pen = PenReportParser.parse(bytes) {
            emitPen(pen)
            return
        }

        // 按键报告：Report ID 3
        if let aux = AuxReportParser.parse(bytes) {
            emitAux(aux)
            return
        }
    }

    private func emitPen(_ pen: PenReport) {
        let nx = Double(pen.x) / Double(PenReport.maxX)
        let ny = Double(pen.y) / Double(PenReport.maxY)
        let pressure = pen.normalizedPressure

        // 坐标交给状态机做三态判定，这里只关心事件类型
        let events = stateMachine.feed(
            point: CGPoint(x: nx, y: ny),
            pressure: pressure,
            tipDown: pen.tipDown,
            inRange: pen.inRange,
            time: ProcessInfo.processInfo.systemUptime
        )

        for event in events {
            switch event {
            case .hover:
                Emit.pen(nx: nx, ny: ny, pressure: pressure, phase: "hover", barrel1: pen.barrel1, barrel2: pen.barrel2, eraser: pen.eraser)
            case .began:
                Emit.pen(nx: nx, ny: ny, pressure: pressure, phase: "began", barrel1: pen.barrel1, barrel2: pen.barrel2, eraser: pen.eraser)
            case .changed:
                Emit.pen(nx: nx, ny: ny, pressure: pressure, phase: "changed", barrel1: pen.barrel1, barrel2: pen.barrel2, eraser: pen.eraser)
            case .ended:
                Emit.pen(nx: nx, ny: ny, pressure: 0, phase: "ended", barrel1: pen.barrel1, barrel2: pen.barrel2, eraser: pen.eraser)
            case .leave:
                Emit.line(["t": "pen", "ph": "leave"])
            }
        }

        // 只有侧键状态变化时才单独上报，避免高频重复
        let keys = Set(
            [pen.barrel1 ? 0 : nil, pen.barrel2 ? 1 : nil, pen.eraser ? 2 : nil].compactMap { $0 }
        )
        if keys != lastAuxKeys {
            lastAuxKeys = keys
            Emit.line(["t": "side", "keys": keys.sorted()])
        }
    }

    private func emitAux(_ aux: AuxReport) {
        Emit.line(["t": "aux", "keys": aux.pressedKeys.sorted()])
    }
}

import Foundation
import IOKit.hid
import TabletSketchCore

/// HID 采集器。
///
/// 这块板子会同时暴露三个 HID 接口：Generic Desktop（鼠标）、Digitizer（笔）、
/// 以及厂商自定义（0xFF0A）。系统光标是被前两个接口驱动的，只打开厂商接口
/// 根本拦不住光标 —— 所以这里按 VID/PID 匹配**全部接口**，一次性独占，
/// 再从里面挑出厂商接口来读笔数据。
///
/// `seize: true` 时用 `kIOHIDOptionsTypeSeizeDevice` 打开：系统收不到这块板子的任何输入，
/// 指针不会跟着笔跑，笔只在本应用里生效。进程退出或失焦即释放，不装驱动、不改系统设置。
/// 独占失败（例如官方驱动占着）会退回只读模式并明确上报，不会让设备变砖。
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
    /// Digitizer 接口（page 0x0D usage 2）：系统认笔靠它，笔一进感应区就上报，
    /// 悬停圆圈只能从这里拿数据；厂商通道只在笔接触后才有内容。
    private var digitizerDevice: IOHIDDevice?
    private var lastDigitizerAt: TimeInterval = 0
    private var loggedFirstDigitizer = false
    /// 笔抬离后有的固件就彻底不报了，没有这个看门狗，圆圈会一直挂在屏幕上。
    private var watchdog: DispatchSourceTimer?
    private var lastKeys: (barrel1: Bool, barrel2: Bool, eraser: Bool) = (false, false, false)
    private var allDevices: [IOHIDDevice] = []
    private var interfaces: [[String: Int]] = []
    private var stateMachine = PenStateMachine()
    private var lastAuxKeys: Set<Int> = []
    private var opened = false
    private let seize: Bool
    private(set) var seized = false
    /// 鼠标 / 数位板接口的独占句柄。只锁厂商接口是拦不住系统光标的。
    private var pointerManagers: [IOHIDManager] = []

    init(
        device: Device = Device(vendorID: 0x28BD, productID: 0x2904, usagePage: 0xFF0A, usage: 1),
        dumpRaw: Bool = false,
        seize: Bool = false
    ) {
        self.device = device
        self.dumpRaw = dumpRaw
        self.seize = seize
    }

    func start() {
        let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
        self.manager = manager

        // 只按 VID/PID 匹配，把所有接口都纳入管理，才有机会一起锁住
        let matching: [String: Any] = [
            kIOHIDVendorIDKey as String: device.vendorID,
            kIOHIDProductIDKey as String: device.productID
        ]
        IOHIDManagerSetDeviceMatching(manager, matching as CFDictionary)

        let context = Unmanaged.passUnretained(self).toOpaque()
        IOHIDManagerRegisterDeviceMatchingCallback(manager, Self.deviceAdded, context)
        IOHIDManagerRegisterDeviceRemovalCallback(manager, Self.deviceRemoved, context)
        IOHIDManagerRegisterInputReportCallback(manager, Self.reportReceived, context)
        IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetMain(), CFRunLoopMode.defaultMode.rawValue)

        // 关键：只 Open 一次。先以普通方式打开再补一次 seize 是无效的
        // —— 管理器一旦打开，第二次 Open 不会改变打开方式，会假装成功。
        var status = kIOReturnSuccess
        if seize {
            status = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeSeizeDevice))
            if status == kIOReturnSuccess {
                seized = true
            } else {
                Emit.line(["t": "grab", "ok": false, "status": Int(status)])
                // 退回只读，至少还能读笔，只是拦不住系统指针
                status = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
            }
        } else {
            status = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        }

        guard status == kIOReturnSuccess else {
            // kIOReturnNotPermitted 通常意味着缺「输入监控」授权
            onFailure?(status == kIOReturnNotPermitted ? "PEN_PERMISSION" : "PEN_ERROR")
            return
        }
        opened = true
        startWatchdog()
        if seized {
            Emit.line(["t": "grab", "ok": true])
            grabPointerInterfaces()
        }
    }

    /// 把板上其它接口一起锁住，否则系统光标仍会跟着笔跑。
    ///
    /// 这块板子除了厂商接口，还暴露 Generic Desktop（鼠标）和 Digitizer（笔）两类接口，
    /// 光标由它们驱动。同一个 IOHIDManager 用 VID/PID 匹配只会拿到主接口，
    /// 所以按 usage 逐个再开管理器，每个都带 seize。
    private func grabPointerInterfaces() {
        // Generic Desktop: Pointer(1) / Mouse(2)；Digitizer: Pen(1) / ...(2)
        let targets: [(Int, Int)] = [(1, 2), (1, 1), (0x0D, 2), (0x0D, 1)]
        for (page, usage) in targets {
            let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
            let matching: [String: Any] = [
                kIOHIDVendorIDKey as String: device.vendorID,
                kIOHIDProductIDKey as String: device.productID,
                kIOHIDPrimaryUsagePageKey as String: page,
                kIOHIDPrimaryUsageKey as String: usage
            ]
            IOHIDManagerSetDeviceMatching(manager, matching as CFDictionary)
            IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetMain(), CFRunLoopMode.defaultMode.rawValue)
            let status = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeSeizeDevice))
            let mounted = (IOHIDManagerCopyDevices(manager) as? NSSet)?.count ?? 0
            Emit.line([
                "t": "grabif",
                "page": page,
                "usage": usage,
                "ok": status == kIOReturnSuccess,
                "status": Int(status),
                "mounted": mounted
            ])
            if status == kIOReturnSuccess {
                pointerManagers.append(manager)
            }
        }
    }

    /// 250ms 没有新报文就当作笔已离开，让状态机走一次 leave。
    private func startWatchdog() {
        let timer = DispatchSource.makeTimerSource(queue: .main)
        timer.schedule(deadline: .now() + 0.4, repeating: 0.12)
        timer.setEventHandler { [weak self] in
            guard let self, self.lastDigitizerAt > 0 else { return }
            let idle = ProcessInfo.processInfo.systemUptime - self.lastDigitizerAt
            guard idle > 0.25 else { return }
            let events = self.stateMachine.feed(
                point: nil,
                pressure: 0,
                tipDown: false,
                inRange: false,
                time: ProcessInfo.processInfo.systemUptime
            )
            for event in events {
                if case .leave = event {
                    Emit.line(["t": "pen", "ph": "leave"])
                }
            }
        }
        timer.resume()
        watchdog = timer
    }

    /// 由 main 在启动 2 秒后调用：届时若没匹配到设备，判定为未连接。
    func checkReady() {
        guard penDevice == nil else { return }
        onFailure?("PEN_NOT_FOUND")
    }

    // MARK: - 回调

    private static let deviceAdded: IOHIDDeviceCallback = { context, _, _, hidDevice in
        guard let context else { return }
        let reader = Unmanaged<HIDReader>.fromOpaque(context).takeUnretainedValue()
        reader.consider(hidDevice)
    }

    private static let deviceRemoved: IOHIDDeviceCallback = { context, _, _, hidDevice in
        guard let context else { return }
        let reader = Unmanaged<HIDReader>.fromOpaque(context).takeUnretainedValue()
        reader.forget(hidDevice)
    }

    private static let reportReceived: IOHIDReportCallback = {
        context, _, sender, _, reportID, report, reportLength in
        guard let context, let sender else { return }
        let reader = Unmanaged<HIDReader>.fromOpaque(context).takeUnretainedValue()
        let hidDevice = Unmanaged<IOHIDDevice>.fromOpaque(sender).takeUnretainedValue()
        let bytes = Array(UnsafeBufferPointer(start: report, count: reportLength))
        if let pen = reader.penDevice, CFEqual(hidDevice, pen) {
            reader.handle(reportID: reportID, bytes: bytes)
        } else if let digitizer = reader.digitizerDevice, CFEqual(hidDevice, digitizer) {
            reader.handleDigitizer(reportID: reportID, bytes: bytes)
        }
    }

    // MARK: - 设备挂载

    private func consider(_ hidDevice: IOHIDDevice) {
        allDevices.append(hidDevice)

        let usagePage = (IOHIDDeviceGetProperty(hidDevice, kIOHIDPrimaryUsagePageKey as CFString) as? Int) ?? -1
        let usage = (IOHIDDeviceGetProperty(hidDevice, kIOHIDPrimaryUsageKey as CFString) as? Int) ?? -1
        interfaces.append(["page": usagePage, "usage": usage])

        Emit.line([
            "t": "interface",
            "page": usagePage,
            "usage": usage,
            "product": (IOHIDDeviceGetProperty(hidDevice, kIOHIDProductKey as CFString) as? String) ?? "?"
        ])

        if dumpRaw,
           let descriptor = IOHIDDeviceGetProperty(hidDevice, kIOHIDReportDescriptorKey as CFString) as? Data {
            Emit.line([
                "t": "descriptor",
                "page": usagePage,
                "usage": usage,
                "hex": descriptor.map { String(format: "%02x", $0) }.joined()
            ])
        }

        if usagePage == 0x0D, usage == 2 {
            digitizerDevice = hidDevice
        }

        guard usagePage == device.usagePage, usage == device.usage else {
            // 鼠标接口等：不读，但已经被 seize 一起锁住了
            return
        }

        penDevice = hidDevice

        Emit.line([
            "t": "ready",
            "product": (IOHIDDeviceGetProperty(hidDevice, kIOHIDProductKey as CFString) as? String) ?? "Unknown",
            "maxX": Int(PenReport.maxX),
            "maxY": Int(PenReport.maxY),
            "seized": seized,
            "interfaces": interfaces
        ])

        sendInitReport(to: hidDevice)
    }

    private func forget(_ hidDevice: IOHIDDevice) {
        allDevices.removeAll { $0 === hidDevice }
        if let pen = penDevice, CFEqual(hidDevice, pen) {
            penDevice = nil
            stateMachine.reset()
            lastAuxKeys = []
            Emit.line(["t": "disconnected"])
        }
    }

    /// 切到 vendor 通道：`02 B0 04` + 17×00。
    /// IOHIDDeviceSetReport 的 report 参数不含 report ID，ID 单独传，
    /// 所以要把 initReport 的首字节 0x02 去掉。
    private func sendInitReport(to hidDevice: IOHIDDevice) {
        var payload = Array(VendorProtocol.initReport.dropFirst())
        let status = payload.withUnsafeMutableBufferPointer { buffer -> IOReturn in
            guard let base = buffer.baseAddress else { return kIOReturnError }
            return IOHIDDeviceSetReport(
                hidDevice,
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

    // MARK: - 报文

    private func handle(reportID: UInt32, bytes: [UInt8]) {
        if dumpRaw {
            Emit.line(["t": "raw", "id": Int(reportID), "bytes": bytes.map { Int($0) }])
        }

        // 笔报告：Report ID 2，12 字节
        if bytes.count >= PenReportParser.penReportLength,
           let pen = PenReportParser.parse(bytes) {
            lastKeys = (pen.barrel1, pen.barrel2, pen.eraser)
            // Digitizer 还在持续上报时，位置和压力以它为准（它才有悬停），
            // 这里只吸收按键状态，避免两路数据互相打架。
            let digitizerLive = ProcessInfo.processInfo.systemUptime - lastDigitizerAt < 0.5
            if !digitizerLive {
                emitPen(pen)
            }
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
                // 刚接触时硬件压力常是 0 或个位数，交给页面会得到近乎透明的线。
                // 起笔这一步先垫一个可见下限，后续压力上来自然加粗。
                Emit.pen(nx: nx, ny: ny, pressure: max(pressure, 0.12), phase: "began", barrel1: pen.barrel1, barrel2: pen.barrel2, eraser: pen.eraser)
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

    /// Digitizer 接口报告（Report ID 7，9 字节，不含 ID）。
    ///
    /// descriptor：`Tip Pressure / Barrel Pressure / In Range / Invert` 四个 1bit 状态位，
    /// 之后依次是 X(16) Y(16) Pressure(16) TiltX(8) TiltY(8)。
    /// 坐标逻辑范围 0..15999 / 0..8999，是厂商通道（31998/17998）的一半。
    private func handleDigitizer(reportID: UInt32, bytes: [UInt8]) {
        guard bytes.count >= 9 else { return }
        if dumpRaw {
            Emit.line(["t": "raw", "src": "digitizer", "id": Int(reportID), "bytes": bytes.map { Int($0) }])
        }

        let flags = bytes[0]
        let x = UInt32(bytes[1]) | (UInt32(bytes[2]) << 8)
        let y = UInt32(bytes[3]) | (UInt32(bytes[4]) << 8)
        let rawPressure = UInt16(bytes[5]) | (UInt16(bytes[6]) << 8)

        // 位定义在实机上按 "Tip / Barrel / In Range / Invert" 排；
        // 只要有一位非零就认为笔在感应区内，宁可多报悬停也不要漏。
        let inRange = flags != 0 || rawPressure > 0
        let tipDown = (flags & 0x01) != 0 || rawPressure > 0
        let invert = (flags & 0x08) != 0

        lastDigitizerAt = ProcessInfo.processInfo.systemUptime
        if !loggedFirstDigitizer {
            loggedFirstDigitizer = true
            Emit.line(["t": "digitizer", "first": true, "flags": Int(flags), "x": Int(x), "y": Int(y), "p": Int(rawPressure)])
        }

        let pen = PenReport(
            inRange: inRange,
            tipDown: tipDown,
            barrel1: lastKeys.barrel1,
            barrel2: lastKeys.barrel2,
            eraser: invert || lastKeys.eraser,
            // 放大一倍对齐厂商通道的坐标系，下游不用改
            x: min(x * 2, PenReport.maxX),
            y: min(y * 2, PenReport.maxY),
            pressure: rawPressure,
            tiltX: Int8(bitPattern: bytes[7]),
            tiltY: Int8(bitPattern: bytes[8])
        )
        emitPen(pen)
    }

    private func emitAux(_ aux: AuxReport) {
        Emit.line(["t": "aux", "keys": aux.pressedKeys.sorted()])
    }
}

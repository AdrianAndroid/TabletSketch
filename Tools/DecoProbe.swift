// DecoProbe.swift — 只读诊断工具，不是产品功能。
//
// 验证 macOS 上能否在用户态直接读取 XP-Pen Deco 640 的 HID 原始报文。
// 编译：swiftc Tools/DecoProbe.swift -o /tmp/DecoProbe
// 运行：/tmp/DecoProbe [监听秒数，默认 6]
//
// 首次运行若读不到数据，需在「系统设置 → 隐私与安全性 → 输入监控」
// 授权执行该二进制的终端/程序，然后重新运行。
//
// 设备实测三条 HID 通道（VendorID 0x28bd / ProductID 0x2904）：
//   A. UsagePage 1  / Usage 2  (Mouse)      — 系统已接管，Report ID 9 = 绝对坐标+压感
//   B. UsagePage 13 / Usage 2  (Digitizer)  — 系统已接管，Report ID 7 = 笔尖/XY/压感/倾斜
//   C. UsagePage 0xFF0A / Usage 1 (厂商私有) — 系统未接管，Report ID 2 = 板载按键/滚轮
// 通道 C 是自定义映射唯一需要自己解析的入口，且不会与系统抢设备。

import Foundation
import IOKit.hid
import CoreFoundation

private let vendorID = 0x28bd
private let productID = 0x2904

private var labels: [UInt64: String] = [:]
private var counts: [UInt64: Int] = [:]
private var buffers: [UnsafeMutablePointer<UInt8>] = []

private func deviceKey(_ device: IOHIDDevice) -> UInt64 {
    UInt64(UInt(bitPattern: unsafeBitCast(device, to: UnsafeRawPointer.self)))
}

private let reportCallback: IOHIDReportCallback = { _, result, sender, _, reportID, report, length in
    guard result == kIOReturnSuccess, let sender else { return }
    let device: IOHIDDevice = unsafeBitCast(sender, to: IOHIDDevice.self)
    let registryID = deviceKey(device)
    let label = labels[registryID] ?? "unknown"
    let n = min(Int(length), 64)
    let hex = (0..<n).map { String(format: "%02x", report[$0]) }.joined(separator: " ")
    let seen = (counts[registryID] ?? 0) + 1
    counts[registryID] = seen
    if seen <= 12 {
        print("  [\(label)] reportID=\(reportID) len=\(length)  \(hex)")
    }
}

private func channelName(page: Int, usage: Int) -> String {
    switch (page, usage) {
    case (1, 2): return "A/mouse"
    case (13, 2): return "B/digitizer"
    case (65290, 1): return "C/vendor"
    default: return "page\(page)/usage\(usage)"
    }
}

let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
let matching: CFDictionary = [
    kIOHIDVendorIDKey: vendorID,
    kIOHIDProductIDKey: productID
] as CFDictionary
IOHIDManagerSetDeviceMatching(manager, matching)
IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetCurrent(), CFRunLoopMode.defaultMode.rawValue)

let openResult = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
print("IOHIDManagerOpen = \(openResult) (0 = 成功)")

guard let deviceSet = IOHIDManagerCopyDevices(manager) else {
    print("未找到 Deco 640，请确认 USB 已连接")
    exit(1)
}

let deviceCount = CFSetGetCount(deviceSet)
var rawValues = [UnsafeRawPointer?](repeating: nil, count: deviceCount)
CFSetGetValues(deviceSet, &rawValues)

print("发现 \(deviceCount) 个 HID 接口：")
var opened = 0

for raw in rawValues {
    guard let raw else { continue }
    let device: IOHIDDevice = unsafeBitCast(raw, to: IOHIDDevice.self)
    let page = IOHIDDeviceGetProperty(device, kIOHIDPrimaryUsagePageKey as CFString) as? Int ?? -1
    let usage = IOHIDDeviceGetProperty(device, kIOHIDPrimaryUsageKey as CFString) as? Int ?? -1
    let maxIn = IOHIDDeviceGetProperty(device, kIOHIDMaxInputReportSizeKey as CFString) as? Int ?? 0
    let name = channelName(page: page, usage: usage)
    let registryID = deviceKey(device)
    labels[registryID] = name

    let openDeviceResult = IOHIDDeviceOpen(device, IOOptionBits(kIOHIDOptionsTypeNone))
    let status = openDeviceResult == kIOReturnSuccess ? "可读" : "打开失败(\(openDeviceResult))"
    print("  \(name)  usagePage=\(page) usage=\(usage) maxInput=\(maxIn)B  registry=\(registryID)  \(status)")

    if openDeviceResult == kIOReturnSuccess {
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: 64)
        buffer.initialize(repeating: 0, count: 64)
        buffers.append(buffer)
        IOHIDDeviceRegisterInputReportCallback(device, buffer, 64, reportCallback, nil)
        opened += 1

        // 纯读探测：不需要动笔，用来确认权限与通道确实可用。
        var feature = [UInt8](repeating: 0, count: 8)
        var featureLength: CFIndex = feature.count
        let getResult = IOHIDDeviceGetReport(
            device, IOHIDReportType(rawValue: 2), 2, &feature, &featureLength
        )
        let featureHex = (0..<min(Int(featureLength), 8))
            .map { String(format: "%02x", feature[$0]) }.joined(separator: " ")
        let readable = getResult == kIOReturnSuccess ? "成功 \(featureHex)" : "不支持/无数据(\(getResult))"
        print("      featureReport(2) 读取：\(readable)")
    }
}

guard opened > 0 else {
    print("所有接口都打不开：通常是缺少「输入监控」权限。")
    print("授权后重新运行本工具即可，不需要重启、不需要关 SIP、不需要内核扩展。")
    exit(2)
}

let seconds = Double(CommandLine.arguments.dropFirst().first ?? "6") ?? 6
print("监听 \(seconds) 秒 —— 请动笔、按板子上的快捷键、转滚轮：")
RunLoop.current.run(until: Date().addingTimeInterval(seconds))

print("汇总：")
for (id, count) in counts.sorted(by: { $0.key < $1.key }) {
    print("  \(labels[id] ?? "unknown") 收到 \(count) 个报文")
}
if counts.isEmpty {
    print("  未收到任何报文。检查输入监控权限；通道 C 通常还需先发一段初始化 Output Report 才开始上报。")
}

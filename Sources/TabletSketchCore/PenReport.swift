import Foundation

/// Deco 640 笔报告（C 通道，Report ID 2，12 字节）。
///
/// 字节布局（来自 `Docs/research/2026-11-26-deco640-driver-research.md` 2.2）：
/// - `[0]`    报告类型，固定 0x02
/// - `[1]`    状态位：bit1 侧键 1，bit2 侧键 2，bit3 橡皮
/// - `[2..3]` X 低 16 位（小端）
/// - `[4..5]` Y 低 16 位（小端）
/// - `[6..7]` 压力 uint16（小端，0...16383）
/// - `[8]`    TiltX，sbyte
/// - `[9]`    TiltY，sbyte
/// - `[10]`   X 高 8 位
/// - `[11]`   Y 高 8 位
public struct PenReport: Equatable, Sendable {
    public var inRange: Bool
    public var tipDown: Bool
    public var barrel1: Bool
    public var barrel2: Bool
    public var eraser: Bool
    public var x: UInt32
    public var y: UInt32
    public var pressure: UInt16
    public var tiltX: Int8
    public var tiltY: Int8

    public static let maxX: UInt32 = 31998
    public static let maxY: UInt32 = 17998

    public init(inRange: Bool = false,
                tipDown: Bool = false,
                barrel1: Bool = false,
                barrel2: Bool = false,
                eraser: Bool = false,
                x: UInt32 = 0,
                y: UInt32 = 0,
                pressure: UInt16 = 0,
                tiltX: Int8 = 0,
                tiltY: Int8 = 0) {
        self.inRange = inRange
        self.tipDown = tipDown
        self.barrel1 = barrel1
        self.barrel2 = barrel2
        self.eraser = eraser
        self.x = x
        self.y = y
        self.pressure = pressure
        self.tiltX = tiltX
        self.tiltY = tiltY
    }

    /// 归一化压力 0...1
    public var normalizedPressure: Double {
        min(1, max(0, Double(pressure) / 16383.0))
    }
}

public enum PenReportParser {

    /// 笔报告固定长度 12 字节。
    public static let penReportLength = 12

    /// `[0]` 字节为 0x02 时是笔报告。
    public static let penReportType: UInt8 = 0x02

    /// 解析 12 字节笔报告。长度或类型不符返回 nil。
    public static func parse(_ bytes: [UInt8]) -> PenReport? {
        guard bytes.count >= penReportLength, bytes[0] == penReportType else { return nil }

        let status = bytes[1]
        let xLow = UInt32(bytes[2]) | (UInt32(bytes[3]) << 8)
        let yLow = UInt32(bytes[4]) | (UInt32(bytes[5]) << 8)
        let pressure = UInt16(bytes[6]) | (UInt16(bytes[7]) << 8)
        let xHigh = UInt32(bytes[10])
        let yHigh = UInt32(bytes[11])

        let x = xLow | (xHigh << 16)
        let y = yLow | (yHigh << 16)

        // bit0 = 笔在感应范围内；bit4 在实机上随 tip 同步置位，作为兜底。
        let inRange = (status & 0b0000_0001) != 0 || (status & 0b0001_0000) != 0
        let tipDown = (status & 0b0001_0000) != 0 || pressure > 0

        return PenReport(
            inRange: inRange,
            tipDown: tipDown,
            barrel1: (status & 0b0000_0010) != 0,
            barrel2: (status & 0b0000_0100) != 0,
            eraser: (status & 0b0000_1000) != 0,
            x: min(x, PenReport.maxX),
            y: min(y, PenReport.maxY),
            pressure: pressure,
            tiltX: Int8(bitPattern: bytes[8]),
            tiltY: Int8(bitPattern: bytes[9])
        )
    }
}

/// Aux 报告：8 个板载虚拟按键的位图。
public struct AuxReport: Equatable, Sendable {
    /// 置位的键索引集合，0-based（对应板载键 1–8）。
    public var pressedKeys: Set<Int>

    public init(pressedKeys: Set<Int> = []) {
        self.pressedKeys = pressedKeys
    }

    public var isEmpty: Bool { pressedKeys.isEmpty }
}

public enum AuxReportParser {
    /// `[0]` 为 0x03 时是 Aux 报告；`[2]` 是 8 键位图。
    public static let auxReportType: UInt8 = 0x03

    public static func parse(_ bytes: [UInt8]) -> AuxReport? {
        guard bytes.count >= 3, bytes[0] == auxReportType else { return nil }
        let bitmap = bytes[2]
        var keys = Set<Int>()
        for bit in 0..<8 where (bitmap & (1 << bit)) != 0 {
            keys.insert(bit)
        }
        return AuxReport(pressedKeys: keys)
    }
}

/// Output Report 构造与 ACK 判定。
public enum VendorProtocol {

    /// 初始化 Output Report：`02 B0 04` + 17 个 0x00，共 20 字节。
    public static let initReport: [UInt8] = {
        var report = [UInt8](repeating: 0x00, count: 20)
        report[0] = 0x02
        report[1] = 0xB0
        report[2] = 0x04
        for i in 3..<20 { report[i] = 0x00 }
        return report
    }()

    /// 可视为 ACK 的状态字。
    public static let ackCodes: Set<UInt8> = [0xB4, 0xF2, 0xF8]

    /// `0xC0` 是 OutOfRange，**不是** ACK。收到时只应把笔状态标记为离开感应区。
    public static let outOfRangeCode: UInt8 = 0xC0

    /// 判断一个状态字节是否为 ACK。
    public static func isAck(_ code: UInt8) -> Bool {
        ackCodes.contains(code)
    }

    /// 判断一个状态字节是否为 OutOfRange。
    public static func isOutOfRange(_ code: UInt8) -> Bool {
        code == outOfRangeCode
    }
}

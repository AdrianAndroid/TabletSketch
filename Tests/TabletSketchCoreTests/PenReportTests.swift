import XCTest
@testable import TabletSketchCore

/// 解析与映射的基础回归，改动协议相关代码时必须先过这一关。
final class PenReportTests: XCTestCase {

    /// 12 字节笔报告：X=0x7C00, Y=0x3A00, 压力=0x4000，笔尖落下
    func testParsePenReport() {
        var bytes = [UInt8](repeating: 0, count: 12)
        bytes[0] = 0x02
        bytes[1] = 0b0000_1011          // inRange + 高 4 位 Y（这里取 0）
        bytes[2] = 0x00                 // X 低 16 小端
        bytes[3] = 0x7C
        bytes[4] = 0x00                 // Y 低 16
        bytes[5] = 0x3A
        bytes[6] = 0x00                 // 压力
        bytes[7] = 0x40
        bytes[8] = 0
        bytes[9] = 0
        bytes[10] = 0
        bytes[11] = 0

        let report = PenReportParser.parse(bytes)
        XCTAssertNotNil(report)
        XCTAssertTrue(report!.inRange)
        XCTAssertEqual(report!.pressure, 0x4000)
    }

    /// 长度不足必须拒绝，不能越界读
    func testRejectShortReport() {
        XCTAssertNil(PenReportParser.parse([0x02, 0x01, 0x02]))
    }

    /// 压力归一化暴露在 0...1
    func testNormalizedPressure() {
        let report = PenReport(inRange: true, tipDown: true, x: 0, y: 0, pressure: 16383)
        XCTAssertEqual(report.normalizedPressure, 1.0, accuracy: 0.0001)
    }

    /// 越界坐标返回 nil，不做夹边处理
    func testMappingRejectsOutOfBounds() {
        var mapping = CanvasMapping(canvasRect: .zero)
        mapping.update(canvasRect: CGRect(x: 0, y: 0, width: 800, height: 450))
        XCTAssertNil(mapping.map(x: PenReport.maxX + 100, y: 100))
        XCTAssertNotNil(mapping.map(x: 100, y: 100))
    }

    /// 0xC0 是 OutOfRange，不是 ACK
    func testOutOfRangeIsNotAck() {
        XCTAssertFalse(VendorProtocol.isAck(VendorProtocol.outOfRangeCode))
        XCTAssertTrue(VendorProtocol.isOutOfRange(VendorProtocol.outOfRangeCode))
    }
}

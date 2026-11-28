import XCTest
@testable import TabletSketchCore

/// 状态机阈值以归一化坐标（0..1）为基准。
/// 旧实现把 jitterTolerance 误标为「画布 pt」并设成 0.35，
/// 相当于 35% 板宽，会把写小字的整笔采样吞成首尾一条直线。
final class PenStateMachineTests: XCTestCase {

    private func countChanged(_ events: [PenEvent]) -> Int {
        events.reduce(0) { acc, event in
            if case .changed = event { return acc + 1 }
            return acc
        }
    }

    private func countBegan(_ events: [PenEvent]) -> Int {
        events.reduce(0) { acc, event in
            if case .began = event { return acc + 1 }
            return acc
        }
    }

    private func countEnded(_ events: [PenEvent]) -> Int {
        events.reduce(0) { acc, event in
            if case .ended = event { return acc + 1 }
            return acc
        }
    }

    private func hasLeave(_ events: [PenEvent]) -> Bool {
        events.contains { if case .leave = $0 { return true }; return false }
    }

    /// 写「笔」这类小字：整笔归一化位移只有 0.15，单帧 0.005。
    /// 每个真实移动帧都必须产生 changed，不能只剩 began + ended 连成飞线。
    func testSmallStrokeKeepsEverySample() {
        var machine = PenStateMachine()
        var time = 0.0

        let start = machine.feed(
            point: CGPoint(x: 0.2, y: 0.3), pressure: 0.5,
            tipDown: true, inRange: true, time: time
        )
        XCTAssertEqual(countBegan(start), 1)

        var changed = 0
        for step in 1...30 {
            time += 0.005
            let events = machine.feed(
                point: CGPoint(x: 0.2 + 0.005 * Double(step), y: 0.3), pressure: 0.5,
                tipDown: true, inRange: true, time: time
            )
            changed += countChanged(events)
        }
        XCTAssertEqual(changed, 30, "小字笔画的中间采样点不应被抖动阈值吞掉")
    }

    /// 坐标量化到 1e-4 会产生重复帧，这类噪声仍须过滤。
    func testRepeatedFramesAreFiltered() {
        var machine = PenStateMachine()
        var time = 0.0
        _ = machine.feed(
            point: CGPoint(x: 0.2, y: 0.3), pressure: 0.5,
            tipDown: true, inRange: true, time: time
        )

        var repeated = 0
        for _ in 0..<5 {
            time += 0.005
            repeated += countChanged(machine.feed(
                point: CGPoint(x: 0.2, y: 0.3), pressure: 0.5,
                tipDown: true, inRange: true, time: time
            ))
        }
        XCTAssertEqual(repeated, 0, "相同坐标的重复帧不应产生新采样点")

        // 噪声过滤不能把后续真实移动一起吞掉
        time += 0.005
        let moved = machine.feed(
            point: CGPoint(x: 0.205, y: 0.3), pressure: 0.5,
            tipDown: true, inRange: true, time: time
        )
        XCTAssertEqual(countChanged(moved), 1, "重复帧之后仍须上报真实移动")
    }

    /// 离板收尾行为不因阈值调整而改变。
    func testLeaveStillEndsStroke() {
        var machine = PenStateMachine()
        var time = 0.0
        _ = machine.feed(
            point: CGPoint(x: 0.2, y: 0.3), pressure: 0.5,
            tipDown: true, inRange: true, time: time
        )
        time += 0.01
        _ = machine.feed(
            point: CGPoint(x: 0.21, y: 0.3), pressure: 0.5,
            tipDown: true, inRange: true, time: time
        )
        time += 0.01
        let out = machine.feed(
            point: nil, pressure: 0, tipDown: false, inRange: false, time: time
        )
        XCTAssertEqual(countEnded(out), 1)
        XCTAssertTrue(hasLeave(out))
    }
}

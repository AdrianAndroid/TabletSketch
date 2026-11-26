import Foundation
import CoreGraphics

/// 笔交互阶段。
public enum PenPhase: String, Sendable {
    case idle       // 笔不在感应区
    case hover      // 悬停，不落墨
    case drawing    // 落墨中
}

/// 状态机输出事件。上层负责把事件翻译成 PointerEvent 注入画布。
public enum PenEvent: Equatable, Sendable {
    case hover(CGPoint)
    case leave
    case began(CGPoint, pressure: Double)
    case changed(CGPoint, pressure: Double)
    case ended(CGPoint, isTap: Bool)
}

public struct PenStateMachine: Sendable {

    public struct Config: Sendable {
        /// 归一化压力起笔阈值（含滞回）。
        /// 真笔是"碰到就出墨"，所以门槛压到极低，压力只用来决定粗细。
        public var pressureOn: Double = 0.0015
        public var pressureOff: Double = 0.0008
        /// 点击判定：时长上限（秒）。
        public var tapMaxDuration: TimeInterval = 0.32
        /// 点击判定：位移上限（画布 pt）。
        public var tapMaxDistance: CGFloat = 3.5
        /// 起笔前允许的最小压力以下抖动过滤（画布 pt）。
        public var jitterTolerance: CGFloat = 0.35

        public init() {}
    }

    public private(set) var phase: PenPhase = .idle
    public var config: Config

    private var strokeStartTime: TimeInterval = 0
    private var strokeStartPoint: CGPoint = .zero
    private var lastPoint: CGPoint?
    private var travelled: CGFloat = 0

    public init(config: Config = Config()) {
        self.config = config
    }

    public mutating func reset() {
        phase = .idle
        lastPoint = nil
        travelled = 0
    }

    /// 输入一次采样。
    /// - Parameters:
    ///   - point: 已经过画布映射的点；`nil` 表示落点越界（应丢弃这一笔）。
    ///   - pressure: 归一化压力 0...1
    ///   - tipDown: 笔尖是否接触
    ///   - inRange: 笔是否在感应区
    ///   - time: 单调时间戳（秒）
    public mutating func feed(
        point: CGPoint?,
        pressure: Double,
        tipDown: Bool,
        inRange: Bool,
        time: TimeInterval
    ) -> [PenEvent] {
        var events: [PenEvent] = []

        guard inRange, let point else {
            if phase != .idle {
                // 笔离开感应区：正在画就把笔画收尾，否则只发 leave。
                if phase == .drawing, let last = lastPoint {
                    events.append(.ended(last, isTap: isTapCandidate(time: time, point: last)))
                }
                events.append(.leave)
                reset()
            }
            return events
        }

        switch phase {
        case .idle, .hover:
            let shouldStart = tipDown && pressure >= config.pressureOn
            if shouldStart {
                phase = .drawing
                strokeStartTime = time
                strokeStartPoint = point
                travelled = 0
                lastPoint = point
                events.append(.began(point, pressure: pressure))
            } else {
                phase = .hover
                lastPoint = point
                events.append(.hover(point))
            }

        case .drawing:
            let stillDrawing = tipDown && pressure > config.pressureOff
            guard stillDrawing else {
                let isTap = isTapCandidate(time: time, point: point)
                events.append(.ended(point, isTap: isTap))
                phase = .hover
                lastPoint = point
                travelled = 0
                return events
            }

            if let last = lastPoint {
                let step = hypot(point.x - last.x, point.y - last.y)
                travelled += step
                // 亚像素抖动不产生新采样点，避免制造大量重复事件。
                if step < config.jitterTolerance && travelled < config.jitterTolerance * 2 {
                    return events
                }
            }
            lastPoint = point
            events.append(.changed(point, pressure: pressure))
        }

        return events
    }

    private func isTapCandidate(time: TimeInterval, point: CGPoint) -> Bool {
        let duration = time - strokeStartTime
        let distance = hypot(point.x - strokeStartPoint.x, point.y - strokeStartPoint.y)
        return duration <= config.tapMaxDuration && distance <= config.tapMaxDistance
    }
}

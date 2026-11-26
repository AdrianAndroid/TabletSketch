import Foundation
import CoreGraphics

/// 平板坐标 → 画布坐标的等比映射。
///
/// 规则（见 `specs/canvas-mapping/spec.md`）：
/// - X / Y 使用同一个缩放因子，避免笔迹被拉伸。
/// - 落在画布矩形外的点直接丢弃，不夹到边缘。
public struct CanvasMapping: Sendable {

    /// 平板有效区（Deco 640 为 31999 × 17999 个计数单位）。
    public var plateWidth: UInt32
    public var plateHeight: UInt32

    /// 画布矩形，单位 pt，坐标系原点在窗口左上角（与 AppKit 翻转坐标系一致）。
    public var canvasRect: CGRect

    public private(set) var scale: CGFloat = 1
    private var originX: CGFloat = 0
    private var originY: CGFloat = 0

    public init(plateWidth: UInt32 = PenReport.maxX + 1,
                plateHeight: UInt32 = PenReport.maxY + 1,
                canvasRect: CGRect) {
        self.plateWidth = plateWidth
        self.plateHeight = plateHeight
        self.canvasRect = canvasRect
        recompute()
    }

    public mutating func update(canvasRect: CGRect) {
        self.canvasRect = canvasRect
        recompute()
    }

    private mutating func recompute() {
        guard plateWidth > 0, plateHeight > 0 else { return }
        let sx = canvasRect.width / CGFloat(plateWidth)
        let sy = canvasRect.height / CGFloat(plateHeight)
        scale = min(sx, sy)
        let drawnWidth = CGFloat(plateWidth) * scale
        let drawnHeight = CGFloat(plateHeight) * scale
        originX = canvasRect.minX + (canvasRect.width - drawnWidth) / 2
        originY = canvasRect.minY + (canvasRect.height - drawnHeight) / 2
    }

    /// 映射到画布坐标；越界返回 nil（丢弃，不夹边）。
    public func map(x: UInt32, y: UInt32) -> CGPoint? {
        let px = originX + CGFloat(x) * scale
        let py = originY + CGFloat(y) * scale
        guard canvasRect.contains(CGPoint(x: px, y: py)) else { return nil }
        return CGPoint(x: px, y: py)
    }

    /// 反向映射：画布点 → 平板计数（用于诊断与光标定位）。
    public func unmap(_ point: CGPoint) -> (x: UInt32, y: UInt32)? {
        guard scale > 0 else { return nil }
        let x = (point.x - originX) / scale
        let y = (point.y - originY) / scale
        guard x >= 0, y >= 0,
              x <= CGFloat(plateWidth), y <= CGFloat(plateHeight) else { return nil }
        return (UInt32(x), UInt32(y))
    }

    /// 压力曲线：`p' = pow(p, gamma)`，再按最小线宽抬底。
    public static func curve(pressure: Double, gamma: Double = 1.0, minimum: Double = 0.0) -> Double {
        let clamped = min(1, max(0, pressure))
        let shaped = pow(clamped, max(0.05, gamma))
        return max(minimum, shaped)
    }
}

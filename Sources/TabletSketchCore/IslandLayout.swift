import Foundation

/// 浮岛里可以放的东西。
///
/// 13 个绘图工具 + 3 个展开型格子。`more` 不参与配置，永远固定在末位。
public enum IslandTool: String, Codable, CaseIterable, Sendable {
    // 展开型格子
    case menu
    case canvas
    case library

    // 绘图工具
    case pen
    case eraser
    case hand
    case select
    case rectangle
    case ellipse
    case arrow
    case line
    case text
    case diamond
    case image
    case lock

    public var displayName: String {
        switch self {
        case .menu: return "菜单"
        case .canvas: return "画布"
        case .library: return "素材"
        case .pen: return "笔"
        case .eraser: return "擦"
        case .hand: return "手"
        case .select: return "选"
        case .rectangle: return "矩"
        case .ellipse: return "圆"
        case .arrow: return "箭"
        case .line: return "线"
        case .text: return "字"
        case .diamond: return "菱"
        case .image: return "图"
        case .lock: return "锁"
        }
    }

    /// 展开型格子点一下会弹出面板，而不是切换工具。
    public var isExpanding: Bool {
        self == .menu || self == .canvas || self == .library
    }

    /// 真正参与「自动溢出差集」的工具全集，按原生工具岛顺序。
    ///
    /// 展开型格子（菜单/画布/素材）不受溢出池管理：它们掉出浮岛只是收起，
    /// 不会跑到 `⋯` 里，否则会出现两个入口。
    public static let toolUniverse: [IslandTool] = [
        .lock, .hand, .select, .rectangle, .diamond, .ellipse,
        .arrow, .line, .pen, .text, .image, .eraser
    ]
}

public struct IslandSlot: Codable, Equatable, Sendable {
    public var tool: IslandTool?

    public init(tool: IslandTool? = nil) {
        self.tool = tool
    }

    public static let empty = IslandSlot(tool: nil)
    public var isEmpty: Bool { tool == nil }
}

public struct IslandLayout: Codable, Equatable, Sendable {

    /// 内容格（不含末位的「更多」）。
    public var slots: [IslandSlot]

    /// 用户手工调整过的 `⋯` 工具顺序；`nil` 表示按默认全集顺序。
    public var moreOrder: [IslandTool]?

    public static let maxSlots = 18
    public static let singleColumnLimit = 10
    public static let keyCount = 8

    public init(slots: [IslandSlot], moreOrder: [IslandTool]? = nil) {
        self.slots = Array(slots.prefix(Self.maxSlots))
        self.moreOrder = moreOrder
    }

    /// 默认 15 格：左列是三个入口 + 5 个高频工具，正好占满 8 个板载键。
    public static var `default`: IslandLayout {
        let order: [IslandTool] = [
            .menu, .canvas, .library, .pen, .eraser, .hand, .select, .rectangle,
            .ellipse, .arrow, .text, .diamond, .line, .image, .lock
        ]
        return IslandLayout(slots: order.map { IslandSlot(tool: $0) })
    }

    public var count: Int { slots.count }

    /// ≤10 格单排，>10 格双排，最多两排。
    public var columns: Int { slots.count <= Self.singleColumnLimit ? 1 : 2 }

    /// 左列高度（先填左列自上而下，再填右列）。
    public var leftColumnHeight: Int {
        columns == 1 ? slots.count : (slots.count + 1) / 2
    }

    public var rowCount: Int {
        columns == 1 ? max(slots.count, 1) : max((slots.count + 1) / 2, 1)
    }

    /// 按「先左列后右列」铺开成二维网格；缺口用空槽补齐。
    public func grid() -> [[IslandSlot?]] {
        guard !slots.isEmpty else { return [] }
        let left = leftColumnHeight
        var rows: [[IslandSlot?]] = []
        for r in 0..<rowCount {
            var row: [IslandSlot?] = []
            row.append(r < left ? slots[r] : nil)
            if columns == 2 {
                let rightIndex = left + r
                row.append(rightIndex < slots.count ? slots[rightIndex] : nil)
            }
            rows.append(row)
        }
        return rows
    }

    /// 板载键 1–8 绑定前 8 格；第 9 格起只能笔点。
    public func keyBinding(for keyIndex: Int) -> IslandTool? {
        guard keyIndex >= 0, keyIndex < Self.keyCount, keyIndex < slots.count else { return nil }
        return slots[keyIndex].tool
    }

    /// 自动溢出池：全部工具 − 已放进格子的工具。
    ///
    /// 展开型格子不参与（它们不是工具），`more` 也不参与。
    public func overflowTools() -> [IslandTool] {
        let placed = Set(slots.compactMap { $0.tool })
        let remaining = IslandTool.toolUniverse.filter { !placed.contains($0) }

        guard let custom = moreOrder, !custom.isEmpty else { return remaining }

        // 用户手调过的顺序优先，但只影响仍然溢出的部分；已被放回格子的自动消失。
        var ordered = custom.filter { remaining.contains($0) }
        for tool in remaining where !ordered.contains(tool) {
            ordered.append(tool)
        }
        return ordered
    }

    /// 常驻动作区，不参与重算。
    public static let actionItems: [String] = ["撤销", "重做", "适应", "100%"]

    public mutating func move(from: Int, to: Int) {
        guard slots.indices.contains(from), slots.indices.contains(to), from != to else { return }
        let item = slots.remove(at: from)
        slots.insert(item, at: to)
    }

    public mutating func setTool(_ tool: IslandTool?, at index: Int) {
        guard slots.indices.contains(index) else { return }
        slots[index].tool = tool
    }

    /// 夹取非法配置：去重、截断到上限。
    public mutating func sanitize() {
        if slots.count > Self.maxSlots {
            slots = Array(slots.prefix(Self.maxSlots))
        }
        var seen = Set<IslandTool>()
        for i in slots.indices {
            guard let tool = slots[i].tool else { continue }
            if !tool.isExpanding && seen.contains(tool) {
                slots[i].tool = nil
            } else {
                seen.insert(tool)
            }
        }
    }
}

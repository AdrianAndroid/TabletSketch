import Foundation
import CoreGraphics

public enum AppMode: String, Codable, Sendable {
    case mouse
    case tablet
}

public enum PenSideAction: String, Codable, CaseIterable, Sendable {
    case none
    case contextMenu
    case bubble
    case eraser
    case pan

    public var displayName: String {
        switch self {
        case .none: return "不设置"
        case .contextMenu: return "右键菜单"
        case .bubble: return "笔尖样式气泡"
        case .eraser: return "切换橡皮"
        case .pan: return "拖动画布"
        }
    }
}

public enum CanvasBackground: String, Codable, CaseIterable, Sendable {
    case plain
    case dots
    case grid
    case dark

    public var displayName: String {
        switch self {
        case .plain: return "纯白"
        case .dots: return "点阵"
        case .grid: return "网格"
        case .dark: return "深色"
        }
    }
}

public enum BubbleItem: String, Codable, CaseIterable, Sendable {
    case color
    case width
    case opacity
    case style

    public var displayName: String {
        switch self {
        case .color: return "颜色"
        case .width: return "线宽"
        case .opacity: return "透明"
        case .style: return "样式"
        }
    }
}

/// 一份完整配置。所有取值在解码后都会被 `sanitized()` 夹到合法区间。
public struct AppSettings: Codable, Equatable, Sendable {

    public static let currentSchemaVersion = 1
    public static let aspectWidth: CGFloat = 160
    public static let aspectHeight: CGFloat = 90

    public var schemaVersion: Int = AppSettings.currentSchemaVersion
    public var mode: AppMode = .mouse
    public var island: IslandLayout = .default

    /// 浮岛位置：以窗口内可用区域归一化（0...1），nil 表示默认「贴右、垂直居中」。
    public var islandAnchorX: Double?
    public var islandAnchorY: Double?

    public var bubbleItems: [BubbleItem] = [.color, .width, .opacity]
    public var longPressThreshold: Double = 0.35
    public var clickDebounce: Double = 0.12
    public var pressureGamma: Double = 1.0
    public var pressureMinimum: Double = 0.06
    public var background: CanvasBackground = .plain
    public var barrelButton1: PenSideAction = .contextMenu
    public var barrelButton2: PenSideAction = .bubble
    public var fadeWhileDrawing: Bool = true
    public var reduceMotion: Bool = false

    public init() {}

    /// 夹取所有越界值，保证下游不用再判边界。
    public func sanitized() -> AppSettings {
        var next = self
        next.schemaVersion = Self.currentSchemaVersion

        next.island.sanitize()
        if next.island.slots.isEmpty {
            next.island = .default
        }

        if let x = next.islandAnchorX { next.islandAnchorX = min(1, max(0, x)) }
        if let y = next.islandAnchorY { next.islandAnchorY = min(1, max(0, y)) }

        next.longPressThreshold = min(1.5, max(0.15, next.longPressThreshold))
        next.clickDebounce = min(0.5, max(0.0, next.clickDebounce))
        next.pressureGamma = min(4.0, max(0.2, next.pressureGamma))
        next.pressureMinimum = min(0.9, max(0.0, next.pressureMinimum))

        // 气泡项目去重并保底至少一项
        var seen = Set<BubbleItem>()
        next.bubbleItems = next.bubbleItems.filter { seen.insert($0).inserted }
        if next.bubbleItems.isEmpty { next.bubbleItems = [.color, .width] }

        return next
    }
}

/// `settings.json` 的读写。写入必须原子，损坏时回落默认值并保留备份。
public final class SettingsStore {

    public static let shared = SettingsStore()

    private let fm = FileManager.default
    public let directory: URL
    public let fileURL: URL

    public init(directory: URL? = nil) {
        let base = directory ?? AppPaths.applicationSupport
        self.directory = base
        self.fileURL = base.appendingPathComponent("settings.json")
    }

    public func load() -> AppSettings {
        guard let data = try? Data(contentsOf: fileURL) else {
            return AppSettings().sanitized()
        }
        do {
            let decoded = try JSONDecoder().decode(AppSettings.self, from: data)
            return decoded.sanitized()
        } catch {
            // 损坏：备份一份再回落，不静默丢用户配置。
            let backup = fileURL.deletingLastPathComponent()
                .appendingPathComponent("settings.corrupt-\(Int(Date().timeIntervalSince1970)).json")
            try? fm.moveItem(at: fileURL, to: backup)
            return AppSettings().sanitized()
        }
    }

    @discardableResult
    public func save(_ settings: AppSettings) -> Bool {
        let value = settings.sanitized()
        do {
            try fm.createDirectory(at: directory, withIntermediateDirectories: true)
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let data = try encoder.encode(value)
            try data.write(to: fileURL, options: .atomic)
            return true
        } catch {
            return false
        }
    }
}

public enum AppPaths {
    public static var applicationSupport: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("TabletSketch", isDirectory: true)
    }

    public static var sketches: URL {
        let pictures = FileManager.default.urls(for: .picturesDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Pictures")
        return pictures.appendingPathComponent("TabletSketch/Sketches", isDirectory: true)
    }

    public static var drafts: URL {
        applicationSupport.appendingPathComponent("Drafts", isDirectory: true)
    }
}

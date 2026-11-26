import AppKit
import Combine
import Foundation

/// UI 草图模块的独立偏好。只使用 sketch. 前缀，不读写 remote / capture 的设置。
@MainActor
final class SketchSettings: ObservableObject {
    static let shared = SketchSettings()

    enum ExportBackground: String, CaseIterable {
        case white
        case transparent

        var label: String {
            switch self {
            case .white: return "白色"
            case .transparent: return "透明"
            }
        }
    }

    private let defaults = UserDefaults.standard

    @Published var exportScale: Int {
        didSet { defaults.set(exportScale, forKey: "sketch.exportScale") }
    }
    @Published var exportBackground: ExportBackground {
        didSet { defaults.set(exportBackground.rawValue, forKey: "sketch.exportBackground") }
    }
    @Published var alwaysOnTop: Bool {
        didSet { defaults.set(alwaysOnTop, forKey: "sketch.alwaysOnTop") }
    }
    @Published var saveDirectoryPath: String {
        didSet { defaults.set(saveDirectoryPath, forKey: "sketch.saveDirectory") }
    }
    @Published var resident: Bool {
        didSet { defaults.set(resident, forKey: "sketch.resident") }
    }

    var saveDirectory: URL {
        URL(fileURLWithPath: (saveDirectoryPath as NSString).expandingTildeInPath, isDirectory: true)
    }

    var defaultSaveDirectory: URL {
        Self.defaultSaveDirectoryPath
    }

    private static var defaultSaveDirectoryPath: URL {
        let pictures = FileManager.default.urls(for: .picturesDirectory, in: .userDomainMask).first
            ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Pictures")
        return pictures
            .appendingPathComponent("MacAppControlDeck", isDirectory: true)
            .appendingPathComponent("Sketches", isDirectory: true)
    }

    private init() {
        let scale = defaults.integer(forKey: "sketch.exportScale")
        exportScale = [1, 2, 3].contains(scale) ? scale : 2
        let background = defaults.string(forKey: "sketch.exportBackground") ?? ""
        exportBackground = ExportBackground(rawValue: background) ?? .white
        alwaysOnTop = defaults.bool(forKey: "sketch.alwaysOnTop")
        saveDirectoryPath = defaults.string(forKey: "sketch.saveDirectory")
            ?? Self.defaultSaveDirectoryPath.path
        resident = defaults.object(forKey: "sketch.resident") as? Bool ?? false
    }

    func resetDirectory() {
        saveDirectoryPath = defaultSaveDirectory.path
    }

    var windowFrame: NSRect? {
        get {
            guard let string = defaults.string(forKey: "sketch.windowFrame") else { return nil }
            let rect = NSRectFromString(string)
            return rect.width > 400 && rect.height > 300 ? rect : nil
        }
        set {
            if let newValue {
                defaults.set(NSStringFromRect(newValue), forKey: "sketch.windowFrame")
            }
        }
    }

    var draftURL: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.homeDirectoryForCurrentUser
                .appendingPathComponent("Library/Application Support")
        return base
            .appendingPathComponent("MacAppControlDeck", isDirectory: true)
            .appendingPathComponent("Sketch", isDirectory: true)
            .appendingPathComponent("draft.excalidraw")
    }

    var boardsDirectory: URL {
        draftURL.deletingLastPathComponent()
            .appendingPathComponent("Boards", isDirectory: true)
    }

    var activeBoardID: String? {
        get { defaults.string(forKey: "sketch.activeBoardID") }
        set {
            if let newValue {
                defaults.set(newValue, forKey: "sketch.activeBoardID")
            } else {
                defaults.removeObject(forKey: "sketch.activeBoardID")
            }
        }
    }

    var lastSavedURL: URL? {
        guard let path = defaults.string(forKey: "sketch.lastSaved") else { return nil }
        return URL(fileURLWithPath: path)
    }

    func rememberLastSaved(_ url: URL) {
        defaults.set(url.path, forKey: "sketch.lastSaved")
    }
}

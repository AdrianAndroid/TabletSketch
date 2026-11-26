import AppKit
import Foundation

/// sketch 模块自己的文件存储：草稿、导出、最近列表。数据只写 Sketch 目录和用户选择的导出目录。
@MainActor
final class SketchStore {
    private let fileManager = FileManager.default
    private let settings = SketchSettings.shared
    private let timestampFormatter: DateFormatter

    init() {
        timestampFormatter = DateFormatter()
        timestampFormatter.locale = Locale(identifier: "en_US_POSIX")
        timestampFormatter.dateFormat = "yyyy-MM-dd-HHmmss"
    }

    // MARK: - 草稿

    func loadDraft() -> String? {
        guard let data = try? Data(contentsOf: settings.draftURL),
              let text = String(data: data, encoding: .utf8),
              !text.isEmpty else {
            return nil
        }
        return text
    }

    func saveDraft(_ json: String) {
        guard !json.isEmpty else { return }
        do {
            try fileManager.createDirectory(
                at: settings.draftURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try Data(json.utf8).write(to: settings.draftURL, options: .atomic)
        } catch {
            NSLog("[sketch] 保存草稿失败: \(error.localizedDescription)")
        }
    }

    func clearDraft() {
        try? fileManager.removeItem(at: settings.draftURL)
    }

    // MARK: - 导出

    struct SaveResult {
        let pngURL: URL
        let sourceURL: URL
    }

    func save(sceneJSON: String, pngData: Data) throws -> SaveResult {
        guard !sceneJSON.isEmpty else {
            throw SketchError.emptyBoard
        }
        guard let image = NSImage(data: pngData), image.isValid else {
            throw SketchError.invalidImage
        }

        let directory = settings.saveDirectory
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)

        let base = "UI-Sketch-\(timestampFormatter.string(from: Date()))"
        var suffix = 1
        var pngURL = directory.appendingPathComponent("\(base).png")
        while fileManager.fileExists(atPath: pngURL.path) {
            suffix += 1
            pngURL = directory.appendingPathComponent("\(base)-\(suffix).png")
        }
        let sourceURL = pngURL.deletingPathExtension().appendingPathExtension("excalidraw")

        try pngData.write(to: pngURL, options: .atomic)
        do {
            try Data(sceneJSON.utf8).write(to: sourceURL, options: .atomic)
        } catch {
            try? fileManager.removeItem(at: pngURL)
            throw error
        }

        settings.rememberLastSaved(pngURL)
        return SaveResult(pngURL: pngURL, sourceURL: sourceURL)
    }

    func writeClipboard(pngData: Data) -> Bool {
        guard let image = NSImage(data: pngData), image.isValid else { return false }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()

        let item = NSPasteboardItem()
        item.setData(pngData, forType: .png)
        if let tiff = image.tiffRepresentation {
            item.setData(tiff, forType: .tiff)
        }
        return pasteboard.writeObjects([item])
    }

    func writeClipboard(text: String) -> Bool {
        guard !text.isEmpty else { return false }
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        return pasteboard.setString(text, forType: .string)
    }

    // MARK: - 最近

    func recentSketches(limit: Int = 8) -> [URL] {
        let directory = settings.saveDirectory
        guard let files = try? fileManager.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else {
            return []
        }
        return files
            .filter { $0.pathExtension.lowercased() == "png" }
            .sorted {
                let left = (try? $0.resourceValues(forKeys: [.contentModificationDateKey])
                    .contentModificationDate) ?? .distantPast
                let right = (try? $1.resourceValues(forKeys: [.contentModificationDateKey])
                    .contentModificationDate) ?? .distantPast
                return left > right
            }
            .prefix(limit)
            .map { $0 }
    }

    func openInFinder(_ url: URL?) {
        guard let url else { return }
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    func revealLastSaved() {
        openInFinder(settings.lastSavedURL)
    }

    /// 菜单栏在 runtime 未加载时使用的轻量查询，不创建 SketchRuntime。
    static func recentSketches(limit: Int = 8) -> [URL] {
        SketchStore().recentSketches(limit: limit)
    }

    static func revealLastSaved() {
        guard let url = SketchSettings.shared.lastSavedURL else { return }
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }
}

enum SketchError: LocalizedError, Equatable {
    case emptyBoard
    case invalidImage
    case webUnavailable
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case .emptyBoard:
            return "画板还是空的，先画点内容"
        case .invalidImage:
            return "导出的图片无法读取"
        case .webUnavailable:
            return "画板还没有准备好，请稍候重试"
        case .exportFailed(let message):
            return message
        }
    }
}

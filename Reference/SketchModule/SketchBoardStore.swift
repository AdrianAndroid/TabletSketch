import Foundation

/// 一个画布的元信息。场景本体单独存为 `<id>.excalidraw`，索引只保留轻量字段。
struct SketchBoard: Codable, Identifiable, Equatable, Sendable {
    let id: String
    var title: String
    let createdAt: Date
    var modifiedAt: Date
    var elementCount: Int
}

enum SketchBoardError: LocalizedError, Equatable {
    case notFound
    case invalidTitle

    var errorDescription: String? {
        switch self {
        case .notFound: return "画布不存在"
        case .invalidTitle: return "画布名称不能为空"
        }
    }
}

/// sketch 模块的多画布仓库。索引 `Boards/index.json`，每个画布一个 `.excalidraw` 文件。
@MainActor
final class SketchBoardStore {
    static let emptyScene = ##"{"type":"excalidraw","version":2,"source":"deck-sketch://local","elements":[],"appState":{"viewBackgroundColor":"#ffffff"},"files":{}}"##

    private let directory: URL
    private let indexURL: URL
    private let fileManager = FileManager.default
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private(set) var boards: [SketchBoard] = []
    private(set) var activeID: String = ""

    init(directory: URL) {
        self.directory = directory
        self.indexURL = directory.appendingPathComponent("index.json")
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.withoutEscapingSlashes]
        self.encoder = encoder
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder
    }

    /// 首次使用时创建「画布 1」；旧版单画布草稿会迁移成第一张画布。
    @discardableResult
    func bootstrap(legacyScene: String?, preferredActiveID: String?) throws -> SketchBoard {
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        boards = loadIndex()
        if boards.isEmpty {
            let scene = validScene(legacyScene) ?? Self.emptyScene
            let board = try create(title: "画布 1", scene: scene)
            return board
        }
        if let preferredActiveID, boards.contains(where: { $0.id == preferredActiveID }) {
            activeID = preferredActiveID
        } else if !boards.contains(where: { $0.id == activeID }) {
            activeID = boards[0].id
        }
        for board in boards where !fileManager.fileExists(atPath: sceneURL(for: board.id).path) {
            try? Data(Self.emptyScene.utf8).write(to: sceneURL(for: board.id), options: .atomic)
        }
        return boards.first(where: { $0.id == activeID }) ?? boards[0]
    }

    func scene(for id: String) -> String? {
        guard boards.contains(where: { $0.id == id }) else { return nil }
        return try? String(contentsOf: sceneURL(for: id), encoding: .utf8)
    }

    @discardableResult
    func saveScene(_ json: String, for id: String) throws -> SketchBoard {
        guard let index = boards.firstIndex(where: { $0.id == id }) else {
            throw SketchBoardError.notFound
        }
        guard !json.isEmpty else { return boards[index] }
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data(json.utf8).write(to: sceneURL(for: id), options: .atomic)
        boards[index].modifiedAt = Date()
        boards[index].elementCount = Self.countElements(in: json)
        try persistIndex()
        return boards[index]
    }

    @discardableResult
    func create(title: String? = nil, scene: String? = nil) throws -> SketchBoard {
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        let base = normalTitle(title) ?? nextDefaultTitle()
        let unique = uniqueTitle(base)
        let now = Date()
        let board = SketchBoard(
            id: UUID().uuidString.lowercased(),
            title: unique,
            createdAt: now,
            modifiedAt: now,
            elementCount: 0
        )
        let json = validScene(scene) ?? Self.emptyScene
        try Data(json.utf8).write(to: sceneURL(for: board.id), options: .atomic)
        var stored = board
        stored.elementCount = Self.countElements(in: json)
        boards.append(stored)
        activeID = stored.id
        do {
            try persistIndex()
        } catch {
            boards.removeAll(where: { $0.id == stored.id })
            try? fileManager.removeItem(at: sceneURL(for: stored.id))
            throw error
        }
        return stored
    }

    @discardableResult
    func rename(id: String, title: String) throws -> SketchBoard {
        guard let index = boards.firstIndex(where: { $0.id == id }) else {
            throw SketchBoardError.notFound
        }
        guard let base = normalTitle(title) else {
            throw SketchBoardError.invalidTitle
        }
        boards[index].title = uniqueTitle(base, excluding: id)
        boards[index].modifiedAt = Date()
        try persistIndex()
        return boards[index]
    }

    /// 删除画布并返回新的当前画布；删到空时自动补一张空白画布。
    @discardableResult
    func delete(id: String) throws -> SketchBoard {
        guard let index = boards.firstIndex(where: { $0.id == id }) else {
            throw SketchBoardError.notFound
        }
        try? fileManager.removeItem(at: sceneURL(for: id))
        boards.remove(at: index)
        if boards.isEmpty {
            return try create(title: "画布 1")
        }
        if activeID == id {
            activeID = boards[min(index, boards.count - 1)].id
        }
        try persistIndex()
        return boards.first(where: { $0.id == activeID }) ?? boards[0]
    }

    func select(id: String) throws -> SketchBoard {
        guard let board = boards.first(where: { $0.id == id }) else {
            throw SketchBoardError.notFound
        }
        activeID = id
        return board
    }

    func activeBoard() -> SketchBoard? {
        boards.first(where: { $0.id == activeID })
    }

    func listJSON() -> String {
        guard let data = try? encoder.encode(boards) else { return "[]" }
        return String(data: data, encoding: .utf8) ?? "[]"
    }

    // MARK: - 索引与文件

    private func sceneURL(for id: String) -> URL {
        directory.appendingPathComponent("\(id).excalidraw")
    }

    private func loadIndex() -> [SketchBoard] {
        guard let data = try? Data(contentsOf: indexURL), !data.isEmpty else { return [] }
        if let boards = try? decoder.decode([SketchBoard].self, from: data) {
            return boards
        }
        // 索引损坏时保留现场，绝不静默覆盖。
        let backup = directory.appendingPathComponent("index.corrupt-\(Self.stamp()).json")
        try? fileManager.moveItem(at: indexURL, to: backup)
        NSLog("[sketch] 画布索引损坏，已备份到 \(backup.lastPathComponent)")
        return []
    }

    private func persistIndex() throws {
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try encoder.encode(boards)
        try data.write(to: indexURL, options: .atomic)
    }

    private func validScene(_ json: String?) -> String? {
        guard let json, !json.isEmpty,
              let data = json.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: data)) is [String: Any] else {
            return nil
        }
        return json
    }

    private static func countElements(in json: String) -> Int {
        guard let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let elements = object["elements"] as? [[String: Any]] else {
            return 0
        }
        return elements.filter { !(($0["isDeleted"] as? Bool) ?? false) }.count
    }

    private func normalTitle(_ raw: String?) -> String? {
        guard let raw else { return nil }
        let cleaned = raw
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return nil }
        return String(cleaned.prefix(40))
    }

    private func nextDefaultTitle() -> String {
        var maxNumber = 0
        for board in boards {
            guard board.title.hasPrefix("画布 ") else { continue }
            if let number = Int(board.title.dropFirst(3)) {
                maxNumber = max(maxNumber, number)
            }
        }
        return "画布 \(maxNumber + 1)"
    }

    private func uniqueTitle(_ base: String, excluding id: String? = nil) -> String {
        let existing = Set(boards.filter { $0.id != id }.map(\.title))
        guard existing.contains(base) else { return base }
        var suffix = 2
        while existing.contains("\(base) \(suffix)") {
            suffix += 1
        }
        return "\(base) \(suffix)"
    }

    private static func stamp() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return formatter.string(from: Date())
    }
}

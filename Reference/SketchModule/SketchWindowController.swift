import AppKit
import Foundation
import WebKit

/// sketch 模块唯一的窗口：懒加载 WKWebView，关闭时落草稿并释放网页进程。
@MainActor
final class SketchWindowController: NSObject, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate,
    SketchBridgeDelegate {
    private var window: NSWindow?
    private var webView: WKWebView?
    private var bridge: SketchBridge?
    private var schemeHandler: SketchSchemeHandler?
    private var isReady = false
    private var isLoadingBoard = false
    private var isClosing = false
    private var pendingAction: PendingAction?
    private var pendingOpenURL: URL?

    private let settings = SketchSettings.shared
    private let store: SketchStore
    private lazy var boards = SketchBoardStore(directory: settings.boardsDirectory)

    private enum PendingAction {
        case copy
        case copyJSON
        case save
        case new
    }

    init(store: SketchStore) {
        self.store = store
        super.init()
    }

    /// 用户关闭窗口、落盘完成后回调；SketchModule 根据 resident 决定是否释放 runtime。
    var onClose: (() -> Void)?

    var isOpen: Bool {
        window?.isVisible == true
    }

    var isBoardReady: Bool {
        isReady
    }

    var isWebViewLoaded: Bool {
        webView != nil
    }

    // MARK: - 打开 / 关闭

    func show() {
        if let window {
            applyAlwaysOnTop()
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        guard let root = SketchSchemeHandler.resourceRoot() else {
            showAlert(title: "UI 草图资源缺失", message: "安装包里没有找到 Excalidraw 静态资源，请重新构建安装。")
            return
        }

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.preferences.isElementFullscreenEnabled = false
        let bridge = SketchBridge()
        bridge.delegate = self
        configuration.userContentController.add(bridge, name: SketchBridge.name)

        let schemeHandler = SketchSchemeHandler(root: root)
        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: SketchSchemeHandler.scheme)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.setValue(false, forKey: "drawsBackground")

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1100, height: 760),
            styleMask: [.titled, .closable, .resizable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "UI 草图"
        window.subtitle = "鼠标画 UI 意图，复制后直接粘贴给 AI"
        window.contentView = webView
        window.delegate = self
        window.isReleasedWhenClosed = false
        window.tabbingMode = .disallowed
        window.minSize = NSSize(width: 820, height: 560)
        if let savedFrame = settings.windowFrame {
            window.setFrame(savedFrame, display: false)
        } else {
            window.center()
        }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        self.window = window
        self.webView = webView
        self.bridge = bridge
        self.schemeHandler = schemeHandler
        applyAlwaysOnTop()

        installNetworkBlock { [weak self] in
            guard let self, let webView = self.webView else { return }
            webView.load(URLRequest(url: URL(string: "deck-sketch://local/index.html")!))
        }
    }

    /// 模块被关闭时立即收起窗口并释放网页。
    func shutdown() {
        pendingAction = nil
        pendingOpenURL = nil
        guard let window else {
            destroyWebView()
            return
        }
        window.delegate = nil
        window.orderOut(nil)
        window.close()
        self.window = nil
        destroyWebView()
        isReady = false
        isLoadingBoard = false
    }

    func applyAlwaysOnTop() {
        window?.level = settings.alwaysOnTop ? .floating : .normal
    }

    private func installNetworkBlock(completion: @escaping @MainActor () -> Void) {
        let rules = """
        [
          {"trigger":{"url-filter":"^https?://"},"action":{"type":"block"}},
          {"trigger":{"url-filter":"^wss?://"},"action":{"type":"block"}},
          {"trigger":{"url-filter":"^ftp://"},"action":{"type":"block"}}
        ]
        """
        WKContentRuleListStore.default().compileContentRuleList(
            forIdentifier: "SketchBlockNetwork",
            encodedContentRuleList: rules
        ) { [weak self] list, error in
            Task { @MainActor in
                if let error {
                    NSLog("[sketch] 网络拦截规则编译失败: \(error.localizedDescription)")
                }
                if let list {
                    self?.webView?.configuration.userContentController.add(list)
                }
                completion()
            }
        }
    }

    private func destroyWebView() {
        webView?.stopLoading()
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: SketchBridge.name)
        webView?.navigationDelegate = nil
        webView?.uiDelegate = nil
        webView = nil
        bridge = nil
        schemeHandler = nil
    }

    // MARK: - 桥接事件

    func sketchBridge(_ bridge: SketchBridge, didReceive event: SketchBridgeEvent) {
        switch event {
        case .ready:
            handleReady()
        case .change(let scene):
            store.saveDraft(scene)
        case .copyRequested:
            copyCurrentSketch()
        case .copyJSONRequested:
            copyCurrentSketchJSON()
        case .saveRequested:
            saveCurrentSketch()
        case .newRequested:
            newBoard()
        case .boardSwitchRequested(let id, let scene):
            switchBoard(to: id, currentScene: scene)
        case .boardCreateRequested(let scene):
            createBoard(currentScene: scene)
        case .boardRenameRequested(let id, let title):
            renameBoard(id: id, title: title)
        case .boardDeleteRequested(let id, let scene):
            deleteBoard(id: id, currentScene: scene)
        }
    }

    private func handleReady() {
        guard !isLoadingBoard else { return }
        isLoadingBoard = true
        isReady = true

        Task {
            do {
                let legacy = store.loadDraft()
                var board = try boards.bootstrap(
                    legacyScene: legacy,
                    preferredActiveID: settings.activeBoardID
                )
                if legacy != nil {
                    store.clearDraft()
                }

                var openedURL: URL?
                if let pendingOpenURL {
                    self.pendingOpenURL = nil
                    do {
                        let json = try String(contentsOf: pendingOpenURL, encoding: .utf8)
                        board = try boards.create(
                            title: pendingOpenURL.deletingPathExtension().lastPathComponent,
                            scene: json
                        )
                        openedURL = pendingOpenURL
                    } catch {
                        toast("打开草图失败：\(error.localizedDescription)", kind: "error")
                    }
                }

                settings.activeBoardID = board.id
                applyBoardTitle(board.title)
                guard let scene = boards.scene(for: board.id) else {
                    throw SketchBoardError.notFound
                }
                _ = try await callJS(
                    "window.deckSketch.initBoards(activeId, boardsJson, scene); return true;",
                    arguments: [
                        "activeId": board.id,
                        "boardsJson": boards.listJSON(),
                        "scene": scene
                    ]
                )
                if let openedURL {
                    toast("已打开 \(openedURL.lastPathComponent)")
                }
            } catch {
                NSLog("[sketch] 加载画布失败: \(error.localizedDescription)")
                toast("画布读取失败，请重试", kind: "error")
            }
            isLoadingBoard = false
            runPendingActionIfNeeded()
        }
    }

    private func runPendingActionIfNeeded() {
        guard isReady, let pendingAction else { return }
        self.pendingAction = nil
        switch pendingAction {
        case .copy: copyCurrentSketch()
        case .copyJSON: copyCurrentSketchJSON()
        case .save: saveCurrentSketch()
        case .new: newBoard()
        }
    }

    // MARK: - 复制

    func copyCurrentSketch() {
        guard isReady else {
            pendingAction = .copy
            show()
            return
        }
        Task {
            do {
                guard try await hasContent() else { throw SketchError.emptyBoard }
                let export = try await exportPNG()
                debugLog("[sketch] exported \(export.width)x\(export.height), selected=\(export.selected)")
                guard store.writeClipboard(pngData: export.data) else {
                    throw SketchError.exportFailed("写入剪贴板失败")
                }
                debugLog("[sketch] clipboard written, bytes=\(export.data.count)")
                let message = export.selected
                    ? "已复制选中内容，可直接粘贴给 AI"
                    : "已复制整个画板，可直接粘贴给 AI"
                toast(message)
            } catch {
                debugLog("[sketch] copy failed: \(error)")
                toast(message(for: error), kind: "error")
            }
        }
    }

    // MARK: - 复制 JSON

    func copyCurrentSketchJSON() {
        guard isReady else {
            pendingAction = .copyJSON
            show()
            return
        }
        Task {
            do {
                guard try await hasContent() else { throw SketchError.emptyBoard }
                let value = try await evalJS("window.deckSketch.getAIJSON()")
                guard let value,
                      let json = value as? String,
                      !json.isEmpty,
                      let data = json.data(using: .utf8),
                      (try? JSONSerialization.jsonObject(with: data)) != nil else {
                    throw SketchError.exportFailed("生成 JSON 失败")
                }
                guard store.writeClipboard(text: json) else {
                    throw SketchError.exportFailed("写入剪贴板失败")
                }
                debugLog("[sketch] JSON copied, bytes=\(json.utf8.count)")
                toast("已复制 JSON（含图形说明），可直接粘贴给 AI")
            } catch {
                debugLog("[sketch] JSON copy failed: \(error)")
                toast(message(for: error), kind: "error")
            }
        }
    }

    // MARK: - 保存

    func saveCurrentSketch() {
        guard isReady else {
            pendingAction = .save
            show()
            return
        }
        Task {
            do {
                guard try await hasContent() else { throw SketchError.emptyBoard }
                let sceneValue = try await evalJS("window.deckSketch.getScene()")
                guard let scene = sceneValue as? String else {
                    throw SketchError.exportFailed("读取画板源文件失败")
                }
                let exported = try await exportPNG()
                let saved = try store.save(sceneJSON: scene, pngData: exported.data)
                toast("已保存 \(saved.pngURL.lastPathComponent)")
            } catch {
                toast(message(for: error), kind: "error")
            }
        }
    }

    // MARK: - 新建 / 打开

    func newBoard() {
        guard isReady else {
            pendingAction = .new
            show()
            return
        }
        Task {
            do {
                let current = try await currentSceneFromWeb()
                createBoard(currentScene: current)
            } catch {
                toast(message(for: error), kind: "error")
            }
        }
    }

    func openSketch(at url: URL) {
        if !isReady || !isOpen {
            pendingOpenURL = url
            show()
            return
        }
        Task {
            do {
                let current = try await currentSceneFromWeb()
                try saveActiveScene(current)
                let json = try String(contentsOf: url, encoding: .utf8)
                let board = try boards.create(
                    title: url.deletingPathExtension().lastPathComponent,
                    scene: json
                )
                settings.activeBoardID = board.id
                try await activateBoard(board)
                toast("已打开 \(url.lastPathComponent)")
            } catch {
                toast(message(for: error), kind: "error")
            }
        }
    }

    // MARK: - 多画布

    private func switchBoard(to id: String, currentScene: String) {
        guard isReady else { return }
        let previousID = boards.activeID
        Task {
            do {
                try saveActiveScene(currentScene)
                let board = try boards.select(id: id)
                guard let scene = boards.scene(for: board.id) else {
                    throw SketchBoardError.notFound
                }
                settings.activeBoardID = board.id
                try await activateBoard(board, scene: scene)
            } catch {
                NSLog("[sketch] 切换画布失败: \(error.localizedDescription)")
                if !previousID.isEmpty {
                    settings.activeBoardID = previousID
                    _ = try? boards.select(id: previousID)
                }
                finishSwitchInWeb()
                toast(message(for: error), kind: "error")
            }
        }
    }

    private func createBoard(currentScene: String) {
        guard isReady else { return }
        Task {
            do {
                try saveActiveScene(currentScene)
                let board = try boards.create()
                settings.activeBoardID = board.id
                try await activateBoard(board)
                toast("已新建 \(board.title)")
            } catch {
                finishSwitchInWeb()
                toast(message(for: error), kind: "error")
            }
        }
    }

    private func renameBoard(id: String, title: String) {
        guard isReady else { return }
        Task {
            do {
                let board = try boards.rename(id: id, title: title)
                if board.id == boards.activeID {
                    applyBoardTitle(board.title)
                }
                try await pushBoards()
            } catch {
                toast(message(for: error), kind: "error")
                try? await pushBoards()
            }
        }
    }

    private func deleteBoard(id: String, currentScene: String) {
        guard isReady else { return }
        let wasActive = boards.activeID == id
        Task {
            do {
                try saveActiveScene(currentScene)
                let board = try boards.delete(id: id)
                settings.activeBoardID = board.id
                if wasActive {
                    try await activateBoard(board)
                } else {
                    try await pushBoards()
                }
                toast("已删除画布")
            } catch {
                finishSwitchInWeb()
                toast(message(for: error), kind: "error")
            }
        }
    }

    private func activateBoard(_ board: SketchBoard, scene: String? = nil) async throws {
        let json = scene ?? boards.scene(for: board.id) ?? SketchBoardStore.emptyScene
        applyBoardTitle(board.title)
        _ = try await callJS(
            "window.deckSketch.activateBoard(activeId, boardsJson, scene); return true;",
            arguments: [
                "activeId": board.id,
                "boardsJson": boards.listJSON(),
                "scene": json
            ]
        )
    }

    private func pushBoards() async throws {
        _ = try await callJS(
            "window.deckSketch.updateBoards(activeId, boardsJson); return true;",
            arguments: [
                "activeId": boards.activeID,
                "boardsJson": boards.listJSON()
            ]
        )
    }

    private func saveActiveScene(_ scene: String) throws {
        guard !boards.activeID.isEmpty else { return }
        try boards.saveScene(scene, for: boards.activeID)
    }

    private func currentSceneFromWeb() async throws -> String {
        let value = try await evalJS("window.deckSketch.getScene()")
        return (value as? String) ?? ""
    }

    private func applyBoardTitle(_ title: String) {
        window?.subtitle = "\(title) · 鼠标画 UI 意图，复制后直接粘贴给 AI"
    }

    private func finishSwitchInWeb() {
        Task {
            _ = try? await callJS("window.deckSketch.endSwitch(); return true;")
        }
    }

    // MARK: - JS 调用

    private func callJS(_ body: String, arguments: [String: Any] = [:]) async throws -> Any? {
        guard let webView, isReady else { throw SketchError.webUnavailable }
        return try await webView.callAsyncJavaScript(
            body,
            arguments: arguments,
            in: nil,
            in: .page
        )
    }

    private func evalJS(_ script: String) async throws -> Any? {
        guard let webView, isReady else { throw SketchError.webUnavailable }
        return try await webView.evaluateJavaScript(script)
    }

    private func hasContent() async throws -> Bool {
        let value = try await evalJS("window.deckSketch.getScene()")
        guard let value else {
            debugLog("[sketch] hasContent: JS returned nil")
            return false
        }
        guard let scene = value as? String,
              let data = scene.data(using: .utf8),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let elements = json["elements"] as? [Any] else {
            debugLog("[sketch] hasContent: scene is not expected JSON")
            return false
        }
        return !elements.isEmpty
    }

    private struct ExportResult {
        let data: Data
        let selected: Bool
        let width: Int
        let height: Int
    }

    private func exportPNG() async throws -> ExportResult {
        let scale = settings.exportScale
        let background = settings.exportBackground.rawValue
        _ = try await evalJS(
            """
            window.__deckExport = null;
            window.deckSketch.exportPNG(\(scale), 24, "\(background)")
              .then(function (result) { window.__deckExport = result; })
              .catch(function (error) { window.__deckExport = { error: String(error) }; });
            true;
            """
        )

        for _ in 0..<100 {
            try await Task.sleep(nanoseconds: 100_000_000)
            let raw = try await evalJS("window.__deckExport ? JSON.stringify(window.__deckExport) : ''")
            guard let text = raw as? String, !text.isEmpty else { continue }
            _ = try? await evalJS("window.__deckExport = null")
            guard let data = text.data(using: .utf8),
                  let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw SketchError.exportFailed("导出结果格式异常")
            }
            if let error = dict["error"] as? String {
                throw SketchError.exportFailed(error)
            }
            guard let base64 = dict["base64"] as? String,
                  let png = Data(base64Encoded: base64) else {
                throw SketchError.exportFailed("导出结果格式异常")
            }
            let width = (dict["width"] as? NSNumber)?.intValue ?? 0
            let height = (dict["height"] as? NSNumber)?.intValue ?? 0
            let selected = (dict["selected"] as? Bool)
                ?? (dict["selected"] as? NSNumber)?.boolValue
                ?? false
            return ExportResult(data: png, selected: selected, width: width, height: height)
        }
        throw SketchError.exportFailed("导出超时，请缩小画板内容后重试")
    }

    private func toast(_ text: String, kind: String = "ok") {
        Task {
            _ = try? await callJS(
                "window.deckSketch.showToast(text, kind); return true;",
                arguments: ["text": text, "kind": kind]
            )
        }
    }

    private func message(for error: Error) -> String {
        if let sketchError = error as? SketchError {
            return sketchError.localizedDescription
        }
        let text = error.localizedDescription
        if text.contains("画板还是空的") { return "画板还是空的，先画点内容" }
        return text
    }

    /// 非模态提示：`runModal()` 会让菜单栏、全局快捷键（含 F1 截图）全部失效。
    private func showAlert(title: String, message: String) {
        NonModalAlert.shared.show(title: title, message: message)
    }

    // MARK: - 窗口代理

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        guard !isClosing else { return true }
        isClosing = true
        sender.orderOut(nil)
        Task {
            await flushDraft()
            self.teardownAfterClose()
            self.onClose?()
        }
        return false
    }

    private func flushDraft() async {
        guard isReady else { return }
        if let scene = try? await currentSceneFromWeb(), !scene.isEmpty {
            try? saveActiveScene(scene)
        }
    }

    private func teardownAfterClose() {
        if let window {
            window.delegate = nil
            window.close()
        }
        window = nil
        destroyWebView()
        isReady = false
        isLoadingBoard = false
        pendingAction = nil
        isClosing = false
    }

    func windowDidMove(_ notification: Notification) {
        saveFrame()
    }

    func windowDidResize(_ notification: Notification) {
        saveFrame()
    }

    private func saveFrame() {
        guard let window, window.isVisible else { return }
        settings.windowFrame = window.frame
    }

    // MARK: - 导航限制

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == SketchSchemeHandler.scheme {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        if ["http", "https", "mailto"].contains(url.scheme ?? "") {
            NSWorkspace.shared.open(url)
        }
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url,
           ["http", "https", "mailto"].contains(url.scheme ?? "") {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        NSLog("[sketch] 页面加载失败: \(error.localizedDescription)")
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        NSLog("[sketch] 页面初始加载失败: \(error.localizedDescription)")
    }
}

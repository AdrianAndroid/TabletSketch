import AppKit
import SwiftUI

/// UI 草图模块的轻量代理。窗口、WebView、Store 都由 runtime 持有。
@MainActor
final class SketchModule: FeatureModule {
    static let id = "sketch"
    static let shared = SketchModule()
    static let runtimeDidChange = Notification.Name("SketchModule.runtimeDidChange")

    private var runtime: SketchRuntime?

    var id: String { Self.id }
    var title: String { "UI 草图" }
    var summary: String { "多画布手绘 UI 意图，复制图片或 JSON 直接粘贴给 AI；完全离线，打开画板才加载。" }
    var systemImage: String { "pencil.and.outline" }
    var defaultEnabled: Bool { true }

    var supportsResidency: Bool { true }
    var isResident: Bool { SketchSettings.shared.resident }
    var isRuntimeLoaded: Bool { runtime != nil }

    func start() {
        if isResident {
            _ = ensureRuntime()
        }
    }

    func stop() {
        releaseRuntime()
    }

    func setResident(_ resident: Bool) {
        SketchSettings.shared.resident = resident
        if resident {
            _ = ensureRuntime()
        } else if let runtime, !runtime.controller.isOpen {
            releaseRuntime()
        }
    }

    func menuItems() -> [NSMenuItem] {
        let parent = NSMenuItem(title: "UI 草图", action: nil, keyEquivalent: "")
        parent.image = NSImage(systemSymbolName: systemImage, accessibilityDescription: nil)
        parent.identifier = NSUserInterfaceItemIdentifier("sketch.root")

        let submenu = NSMenu(title: "UI 草图")
        parent.submenu = submenu

        let sketchHotKey = GlobalHotKeys.shared.menuShortcut(for: "sketch.open")
        submenu.addItem(menuItem(
            "打开画板",
            #selector(openBoard),
            "pencil.and.outline",
            id: "sketch.open",
            key: sketchHotKey?.keyEquivalent ?? "",
            modifiers: sketchHotKey?.modifiers ?? []
        ))
        submenu.addItem(menuItem(
            "新建画布",
            #selector(newBoard),
            "doc.badge.plus",
            id: "sketch.new",
            key: "n",
            modifiers: [.command]
        ))
        submenu.addItem(.separator())
        submenu.addItem(menuItem(
            "复制当前草图",
            #selector(copyCurrent),
            "doc.on.clipboard",
            id: "sketch.copy",
            key: "c",
            modifiers: [.command, .shift]
        ))
        submenu.addItem(menuItem(
            "保存 PNG 与源文件",
            #selector(saveCurrent),
            "square.and.arrow.down",
            id: "sketch.save",
            key: "s",
            modifiers: [.command]
        ))
        submenu.addItem(.separator())

        let recent = NSMenuItem(title: "最近草图", action: nil, keyEquivalent: "")
        recent.image = NSImage(systemSymbolName: "clock.arrow.circlepath", accessibilityDescription: nil)
        recent.identifier = NSUserInterfaceItemIdentifier("sketch.recent")
        let recentMenu = NSMenu(title: "最近草图")
        let items = SketchStore.recentSketches()
        if items.isEmpty {
            let empty = NSMenuItem(title: "暂无草图", action: nil, keyEquivalent: "")
            empty.isEnabled = false
            recentMenu.addItem(empty)
        } else {
            for url in items {
                let child = NSMenuItem(
                    title: url.lastPathComponent,
                    action: #selector(openRecentSketch(_:)),
                    keyEquivalent: ""
                )
                child.target = self
                child.representedObject = url
                child.image = NSImage(systemSymbolName: "photo", accessibilityDescription: nil)
                recentMenu.addItem(child)
            }
        }
        recent.submenu = recentMenu
        submenu.addItem(recent)

        submenu.addItem(menuItem(
            "在 Finder 中显示上次保存",
            #selector(revealLastSaved),
            "folder",
            id: "sketch.reveal"
        ))
        submenu.addItem(.separator())
        submenu.addItem(menuItem(
            "UI 草图设置…",
            #selector(openSettings),
            "gearshape",
            id: "sketch.settings"
        ))

        return [parent]
    }

    func settingsView() -> AnyView {
        AnyView(SketchSettingsView())
    }

    private func menuItem(
        _ title: String,
        _ selector: Selector,
        _ symbol: String,
        id: String,
        key: String = "",
        modifiers: NSEvent.ModifierFlags = []
    ) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: selector, keyEquivalent: key)
        item.target = self
        item.identifier = NSUserInterfaceItemIdentifier(id)
        item.image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)
        if !key.isEmpty {
            item.keyEquivalentModifierMask = modifiers
        }
        return item
    }

    @objc func openBoard() {
        ensureRuntime().controller.show()
    }

    @objc func newBoard() {
        ensureRuntime().controller.newBoard()
    }

    @objc func copyCurrent() {
        ensureRuntime().controller.copyCurrentSketch()
    }

    @objc func saveCurrent() {
        ensureRuntime().controller.saveCurrentSketch()
    }

    @objc func openRecentSketch(_ sender: NSMenuItem) {
        guard let url = sender.representedObject as? URL else { return }
        ensureRuntime().controller.openSketch(at: url)
    }

    @objc func revealLastSaved() {
        SketchStore.revealLastSaved()
    }

    func applyAlwaysOnTop() {
        runtime?.controller.applyAlwaysOnTop()
    }

    @objc func openSettings() {
        MenuBarController.shared.openSettings(tab: .sketch)
    }

    private func ensureRuntime() -> SketchRuntime {
        if let runtime {
            return runtime
        }
        let runtime = SketchRuntime()
        runtime.controller.onClose = { [weak self] in
            guard let self, !self.isResident else { return }
            // 等 teardown 回调退出后再释放 controller 自身。
            DispatchQueue.main.async {
                self.releaseRuntime()
            }
        }
        self.runtime = runtime
        NotificationCenter.default.post(name: Self.runtimeDidChange, object: nil)
        return runtime
    }

    private func releaseRuntime() {
        runtime?.controller.shutdown()
        runtime = nil
        NotificationCenter.default.post(name: Self.runtimeDidChange, object: nil)
    }
}

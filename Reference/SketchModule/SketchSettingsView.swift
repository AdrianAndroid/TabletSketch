import AppKit
import SwiftUI

struct SketchSettingsView: View {
    @ObservedObject private var settings = SketchSettings.shared
    @ObservedObject private var registry = ModuleRegistry.shared
    @State private var runtimeLoaded = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                statusCard
                storageCard
                exportCard
                windowCard
                privacyCard
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .onAppear { runtimeLoaded = SketchModule.shared.isRuntimeLoaded }
        .onReceive(NotificationCenter.default.publisher(for: SketchModule.runtimeDidChange)) { _ in
            runtimeLoaded = SketchModule.shared.isRuntimeLoaded
        }
    }

    private var statusCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 10) {
                    Circle()
                        .fill(registry.isEnabled(SketchModule.id) ? Color.green : Color.orange)
                        .frame(width: 9, height: 9)
                    Text(registry.isEnabled(SketchModule.id) ? "UI 草图已启用" : "UI 草图已关闭")
                        .font(.headline)
                    Spacer()
                    Button("打开画板") {
                        SketchModule.shared.openBoard()
                    }
                    .buttonStyle(.borderedProminent)
                }
                Text("多画布切换；鼠标手绘、矩形、箭头、文字、便签；有选中时复制选中，否则复制整个画布。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("全局快捷键：⌃⌥D")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
            .padding(6)
        } label: {
            Label("画板", systemImage: "pencil.and.outline")
        }
    }

    private var storageCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(settings.saveDirectory.path)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .textSelection(.enabled)
                    Spacer(minLength: 8)
                    Button("选择…") { chooseDirectory() }
                    Button("打开") {
                        NSWorkspace.shared.open(settings.saveDirectory)
                    }
                }
                HStack {
                    Button("恢复默认目录") {
                        settings.resetDirectory()
                    }
                    Button("在 Finder 中显示上次保存") {
                        SketchStore.revealLastSaved()
                    }
                    Spacer()
                    Button("新建画布…") {
                        SketchModule.shared.newBoard()
                    }
                }
                .font(.caption)
                Text("保存时同时生成 PNG 和同名 .excalidraw 源文件；每张画布自动保存在 Application Support。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(6)
        } label: {
            Label("保存位置", systemImage: "folder")
        }
    }

    private var exportCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("导出倍率")
                    Spacer()
                    Picker("", selection: $settings.exportScale) {
                        Text("1×").tag(1)
                        Text("2×（推荐）").tag(2)
                        Text("3×").tag(3)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 260)
                }
                HStack {
                    Text("背景")
                    Spacer()
                    Picker("", selection: $settings.exportBackground) {
                        ForEach(SketchSettings.ExportBackground.allCases, id: \.self) { background in
                            Text(background.label).tag(background)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 260)
                }
                Text("最长边限制 3000 px、四周留 24 px；白底更适合粘贴到聊天窗口。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(6)
        } label: {
            Label("导出", systemImage: "photo")
        }
    }

    private var windowCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 8) {
                Toggle("窗口置顶", isOn: $settings.alwaysOnTop)
                    .onChange(of: settings.alwaysOnTop) { _, _ in
                        SketchModule.shared.applyAlwaysOnTop()
                    }
                Toggle("常驻内存", isOn: Binding(
                    get: { settings.resident },
                    set: { SketchModule.shared.setResident($0) }
                ))
                .toggleStyle(.switch)

                HStack(spacing: 8) {
                    Circle()
                        .fill(runtimeLoaded ? Color.green : Color.secondary.opacity(0.35))
                        .frame(width: 8, height: 8)
                    Text(runtimeLoaded ? "当前画板 runtime 已加载" : "当前画板 runtime 未加载")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }

                Text(settings.resident
                     ? "关闭窗口后保留轻量控制器与画布索引；网页进程仍然销毁。"
                     : "关闭窗口后释放窗口、网页进程、画布索引与 Store；再次打开重新加载。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("画布窗口默认 1100×760；再次打开自动恢复上次画布。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(6)
        } label: {
            Label("窗口与内存", systemImage: "macwindow")
        }
    }

    private var privacyCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 6) {
                Text("画板完全在本机离线运行：不加载 CDN、不连接 Excalidraw 云服务，页面内 http/https 请求会被拦截。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("数据目录：~/Library/Application Support/MacAppControlDeck/Sketch/")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
            .padding(6)
        } label: {
            Label("离线与隐私", systemImage: "lock.shield")
        }
    }

    private func chooseDirectory() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.canCreateDirectories = true
        panel.directoryURL = settings.saveDirectory
        panel.prompt = "选择"
        if panel.runModal() == .OK, let url = panel.url {
            settings.saveDirectoryPath = url.path
        }
    }
}

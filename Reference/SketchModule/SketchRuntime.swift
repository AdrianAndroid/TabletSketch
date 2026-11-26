import AppKit

/// 打开画板时创建、关闭窗口时释放的 UI 草图运行时。
@MainActor
final class SketchRuntime {
    let store: SketchStore
    let controller: SketchWindowController

    init() {
        let store = SketchStore()
        self.store = store
        controller = SketchWindowController(store: store)
    }
}

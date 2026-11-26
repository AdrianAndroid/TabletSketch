# Reference/SketchModule

从 `MacAppControlDeck` 迁移的 UI 草图 Swift 源码，仅作实现参考。

- 依赖主项目的 `FeatureModule`、`ModuleRegistry`、`debugLog`、`SketchSettings` 等类型，**不能直接加入 TabletSketch 编译目标**。
- 参考重点：
  - `SketchWindowController.swift`：窗口、WKWebView、JS 调用、导出/保存流程
  - `SketchBridge.swift`：JS → Native 事件
  - `SketchSchemeHandler.swift`：自定义 scheme 资源加载
  - `SketchBoardStore.swift`：多画布索引与文件
  - `SketchStore.swift`：草稿、PNG、剪贴板
- 新项目应重写输入层与 UI 外壳，不要直接复制这些文件。

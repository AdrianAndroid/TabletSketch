# TabletSketch 开发启动说明

日期：2026-11-26
状态：仓库/资源/OpenSpec 已准备；应用代码未开始。

## 1. 先读什么

1. `AGENTS.md` — 硬约束（独立仓库、HID 只读、不接管系统指针、OpenSpec 强制）。
2. `openspec/changes/bootstrap-tablet-sketch/proposal.md` — 做什么、不做什么。
3. `openspec/changes/bootstrap-tablet-sketch/design.md` — 输入层、画布层、UI、存储的边界。
4. `openspec/changes/bootstrap-tablet-sketch/tasks.md` — 按顺序执行。
5. `Docs/research/2026-11-26-deco640-driver-research.md` — HID 协议与实测事实。
6. `Docs/architecture/SKETCH-RESOURCE-MAP.md` — 迁移了哪些资源。

## 2. 建议的工程结构

```text
Sources/
  TabletSketch/
    App/
      TabletSketchApp.swift
      AppDelegate.swift
    Input/
      HIDReader.swift
      PenReportParser.swift
      PenStateMachine.swift
      PressureCurve.swift
      ExpressKeyMap.swift
    Canvas/
      CanvasMapper.swift
      CanvasGeometry.swift
    Bridge/
      TabletSketchBridge.swift
      SketchSchemeHandler.swift
    Document/
      SketchBoardStore.swift
      SketchStore.swift
      SketchSettings.swift
    UI/
      SketchWindowController.swift
      SketchShellView.swift
      RadialMenu.swift
      KeymapSettingsView.swift
Resources/
  Sketch/            # 已迁移，可直接作为 SwiftPM resource 或 App resource
Web/
  sketch/            # 源码；需要时重新构建
Tools/
  DecoProbe.swift    # 参考探针
```

建议先做 **SwiftPM executable**，需要 Xcode 调试时再生成工程；不要一上来做大而全的 Xcode 工程。

## 3. 三个 PoC，按顺序

### PoC 1：只读 HID

目标：确认 C 通道、初始化、12 字节报告、ACK 过滤。

- 用 `Tools/DecoProbe.swift` 对照。
- 打印 `X/Y/Pressure/Tilt/Status`。
- 不动 UI，不动画布。
- 通过标准：移动笔时坐标连续，压力 0..16383，不跳左上角。

### PoC 2：压感进 Excalidraw

目标：确认 freehand 是否接受 pressure。

- 先通过 `evaluateJavaScript` 注入一个最小笔迹。
- 如果 Excalidraw 不接受，做自定义 brush。
- 不做完整 UI，只验证「线宽随压力变化」。
- 通过标准：轻画细、重画粗，抬起结束，无断笔。

### PoC 3：16:9 画布映射

目标：确认坐标变换与越界丢弃。

- 画一个 16:9 边框，四角/中心画点。
- 笔移出画布不产生笔迹。
- 通过标准：四角对齐、无拉伸、无边缘拖尾。

三个 PoC 都通过后，再做 UI 外壳。

## 4. 首个可运行版本的范围

只做 P0：

- 独立窗口 + WKWebView + `Resources/Sketch`
- 只读 HID + 三态识别 + 压感/倾斜
- 16:9 画布 + 越界丢弃
- 笔侧键 + 8 键默认映射
- `.excalidraw` 保存/恢复
- 鼠标模式回退

不要在 P0 做：

- 系统级指针接管
- 画布锁定 + 径向菜单全套（可先做最小版）
- 多设备 profile
- 云同步/协作
- 专业笔刷引擎

## 5. 关键技术选择

| 问题 | 建议 |
|---|---|
| WebView | WKWebView，自定义 scheme，不用 file:// |
| 桥接 | 沿用 `deckSketch` 模式，独立命名 `tabletSketch` |
| 压感注入 | 优先 PointerEvent pressure；不行再自定义 brush |
| 画布 | Excalidraw 0.18.1，固定 16:9 外框 |
| 输入 | 只读 C 通道，虚拟笔光标 |
| 数据 | `.excalidraw` + `index.json`，独立目录 |
| UI | AppKit 窗口 + SwiftUI 外壳，或纯 AppKit；先选一种并记录 |
| 构建 | SwiftPM 起步，需要时再生成 Xcode 工程 |

## 6. 构建与运行（建议）

```bash
cd /Users/zhaojian/code/TabletSketch
swift build
swift run TabletSketch
```

如果使用 Xcode：

```bash
open Package.swift
```

Web 资源重新构建：

```bash
cd Web/sketch
npm install
npm run build
```

## 7. 验收清单

- [ ] 接上 Deco 640，能识别设备
- [ ] 悬停不出墨
- [ ] 轻触起笔，重压变粗
- [ ] 抬笔结束，无断笔
- [ ] 16:9 四角/中心准确
- [ ] 画布外不出墨
- [ ] 笔侧键 1 橡皮、侧键 2 径向菜单
- [ ] 8 个板载键默认映射可用
- [ ] 拔掉设备回退鼠标模式
- [ ] 画布保存/重启恢复
- [ ] 素材库离线可用
- [ ] MacAppControlDeck 不受影响

## 8. 未决问题

1. 用 SwiftPM executable 还是 Xcode app target？
2. 压感注入走 PointerEvent 还是自定义 brush？
3. 首版是否启用倾斜？还是先只做压感？
4. 画布锁定是否进 P0，还是 P1？
5. 是否需要在 P0 就支持 4:3，还是先只做 16:9？
6. 菜单栏常驻还是普通 Dock App？
7. 签名身份用新的 `TabletSketch Self-Signed`，还是复用主项目证书但新 Bundle ID？

这些问题在开始实现前补进 `design.md` 或新建变更，不要边写边改而不记录。

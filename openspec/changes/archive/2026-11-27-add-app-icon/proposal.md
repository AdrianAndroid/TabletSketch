# proposal · add-app-icon

## Why

`Build/TabletSketch.app` 目前用 Electron 默认图标，在 Dock、Finder、⌘Tab 里和一堆 Electron 应用长得一样。这是唯一一个用户每天都会看到、却还没有自己身份的地方。

## What Changes

- 新增 `Resources/AppIcon.icns`：自绘的 1024 主图派生 16–512 全尺寸 iconset，深色底 + 白色压感笔迹 + 一支触控笔。
- 新增 `Tools/make-icon.swift`：用 CoreGraphics 参数化绘制图标，可重复生成，不依赖外部设计文件。
- `Scripts/make-app.sh` 把 `.icns` 拷进 `Contents/Resources` 并设置 `CFBundleIconFile`。
- README 与 `Docs/images` 补图标预览。

## Capabilities

- 新增 `app-icon`：应用图标的存在性、尺寸完整性、在 Dock / Finder 的显示。

## Impact

- 只改打包脚本与新增资源；不影响输入、画布、数据路径。
- 图标为项目内自绘，不引入第三方素材，无需更新 `THIRD_PARTY_NOTICES.md`。
- 不修改 `MacAppControlDeck`。

## 非目标

- 不做菜单栏状态图标（当前应用不常驻菜单栏）。
- 不做 DMG 背景、About 面板插画、启动图。
- 不做深浅色两套图标（v1 单一深色图标在两种外观下都可读）。

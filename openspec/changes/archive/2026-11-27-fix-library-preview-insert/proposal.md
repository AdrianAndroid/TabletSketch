# proposal · fix-library-preview-insert

## Why

素材面板只有文字，没有缩略图；点素材也贴不到画布。

离屏回归复现了三处问题：

1. **详情面板被遮罩盖住**：`.ts-lib-detail` 没有 `z-index`，被 `.ts-scrim`（60）压住，点击落到遮罩。
2. **插入依赖 Excalidraw 的 library 状态**：`insertLibraryItem` 只查 `getAppState().libraryItems`，一旦种子没合并成功就静默返回 `false`。
3. **没有预览**：`LibraryPanel` 只渲染 `item.name`，从未使用 `item.elements` 生成缩略图。

## What Changes

- `panels.jsx`：新增 `LibraryThumb`，用 `exportToSvg` 把 `item.elements` 渲染成 SVG；素材项改为「缩略图 + 名称」。
- `tablet-sketch.js`：`insertLibraryItem` 先查打包进前端的 `window.__tsLibraries`，不再依赖 Excalidraw library 是否合并；新增 `clearSelection()`。
- `chrome.css`：`.ts-lib-detail` 提到 `z-index: 64`，与面板同层；重写素材项尺寸与缩略图样式。
- `Tools/ui-test/main.js`：补素材缩略图、点击插入、插入后选中态、无选中置灰的断言。

## Capabilities

- `sketch-document`：素材库补「预览」与「点击插入」。

## Impact

- 只改前端素材面板与插入路径，不改变素材数据与文件格式。
- 无新增依赖，不修改 `MacAppControlDeck`。

## 非目标

- 不做素材搜索、分类筛选、收藏。
- 不做拖拽插入（点击即贴到画布中心）。

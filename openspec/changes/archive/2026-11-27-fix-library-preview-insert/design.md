# design · fix-library-preview-insert

## 1. 缩略图

素材 item 自带完整 `elements`，用 Excalidraw 公开的 `exportToSvg` 现渲染：

```js
exportToSvg({
  elements: item.elements,
  appState: { exportBackground: false, viewBackgroundColor: "#ffffff" },
  files: null,
  exportPadding: 6
})
```

- 去掉 `width/height` 属性，改用 `max-width/max-height`，让 SVG 自适应 66px 高的缩略图框。
- 每个素材项一个 `LibraryThumb`，卸载时清空宿主，避免 69 个 SVG 常驻。
- 渲染失败显示「预览失败」，不留空白。

## 2. 插入路径

原路径只查 Excalidraw 的 libraryItems。种子合并是异步且可能被 `localStorage` 标记跳过，一旦缺失就静默失败。

新路径：

```
bundledLibraryItem(id)          // window.__tsLibraries（打包 JSON，永远存在）
        │ 命中
        ▼
   placeLibraryItem(item)
        │ 未命中
        ▼
resolveLibraryItems() → placeLibraryItem(item)
```

`placeLibraryItem` 负责：恢复元素、算包围盒、平移到画布中心、换新 id、写入场景并选中。两条路径共用同一段放置逻辑。

## 3. 层级

素材详情与普通面板同级：

| 元素 | z-index |
|---|---|
| 遮罩 | 60 |
| 浮岛 | 62 |
| 面板 / 素材详情 | 64 |
| 小圆点 | 66 |

## 4. 回归

`Tools/ui-test/main.js` 新增：

- 打开素材 → 点第一个库 → 轮询缩略图出现（69/69）
- 素材项 `elementFromPoint` 必须命中自身
- 点击后场景元素数增加（0 → 3）且进入选中态
- 插入后清空选中，「更多」里的样式环恢复置灰

# tasks · fix-library-preview-insert

## 复现

- [x] 素材详情被 `.ts-scrim` 遮挡
- [x] 点击素材不插入（libraryItems 查不到）
- [x] 素材项无缩略图

## 修复

- [x] 新增 `LibraryThumb`，用 `exportToSvg` 渲染缩略图
- [x] 素材项改为缩略图 + 名称，高度与排版调整
- [x] `insertLibraryItem` 优先读 `window.__tsLibraries`
- [x] 插入后提示「已插入素材」并进入选中态
- [x] `.ts-lib-detail` 层级 64
- [x] 新增 `clearSelection()` 桥方法

## 验证

- [x] 回归 49/49 通过（含缩略图、插入、选中、置灰）
- [ ] 重新打包，手动点一遍素材
- [x] `openspec validate --all` 通过

## 归档

- [x] 同步 `openspec/specs/sketch-document/spec.md`
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-fix-library-preview-insert/`
- [ ] 提交说明引用 `fix-library-preview-insert`

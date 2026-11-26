# Web/sketch

Excalidraw 0.18.1 的离线 Web 包装层源码，从 `MacAppControlDeck` 迁移。

## 构建

```bash
cd Web/sketch
npm install
npm run build
```

构建产物应同步到仓库根目录的 `Resources/Sketch/`。不要手改 `Resources/Sketch/assets` 里的哈希文件。

## 目录

- `src/main.jsx`：Excalidraw 包装、多画布、导出、素材库、快捷键
- `src/sketch.css`：画布外壳、按钮、画布下拉、素材库面板
- `src/libraries.generated.json`：16 组素材库的构建数据
- `src/mermaid-stub.js`：禁用 Mermaid
- `scripts/prepare-libraries.mjs`：`.excalidrawlib` → `libraryItems`
- `scripts/copy-fonts.mjs`：字体复制，跳过 Xiaolai
- `libraries/*.excalidrawlib`：原始素材库

## 注意

- 不提交 `node_modules`、`dist`、Vite 缓存。
- 素材库来自 Excalidraw 官方仓库，MIT License；见根目录 `THIRD_PARTY_NOTICES.md`。
- 现有 `window.deckSketch` 是主项目的桥接命名；TabletSketch 开发时建议改为 `window.tabletSketch` 或保留兼容别名。

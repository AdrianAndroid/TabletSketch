# 资源地图与迁移记录

日期：2026-11-26
来源：`/Users/zhaojian/code/MacAppControlDeck`
目标：`/Users/zhaojian/code/TabletSketch`

## 1. 迁移原则

- 只迁移 TabletSketch 需要的 UI 草图资源、Excalidraw 包装层源码、手写板预研与参考代码。
- 不迁移主项目的遥控、截图、桌宠、日历、PureMac、发布脚本等无关代码。
- 不迁移 `node_modules`、构建缓存、发布包、用户数据、TCC 配置。
- 所有迁移内容保留原始目录结构与许可证信息。

## 2. 目录清单

| 目标路径 | 来源路径 | 文件数 | 大小 | 用途 |
|---|---|---:|---:|---|
| `Resources/Sketch` | `Sources/MacAppControlDeck/Modules/Sketch/Resources/Sketch` | 102 | 5.7 MB | Excalidraw 0.18.1 离线构建产物、25 个字体、16 组素材库 |
| `Web/sketch` | `Web/sketch`（排除 `node_modules`） | 28 | 2.5 MB | Vite/React 包装层源码、原始 `.excalidrawlib`、构建脚本 |
| `Reference/SketchModule` | `Sources/MacAppControlDeck/Modules/Sketch`（排除 `Resources`） | 9 | 84 KB | Swift 实现参考，不参与编译 |
| `Docs/legacy/2026-11-20-sketch-module` | `Docs/archive/2026-11-20-sketch-module` | 9 | 516 KB | UI 草图模块历史说明、JSON 示例、截图 |
| `Docs/research/2026-11-26-deco640-driver-research.md` | `Docs/research/2026-11-26-deco640-driver-research.md` | 1 | 30 KB | Deco 640 HID/协议/画布/按键预研 |
| `Tools/DecoProbe.swift` | `Tools/DecoProbe.swift` | 1 | 5.6 KB | 只读 HID 探针 |
| `LICENSE` | `LICENSE` | 1 | 35 KB | GPL-3.0，沿用主项目 |
| `THIRD_PARTY_NOTICES.md` | 主项目对应章节整理 | 1 | 新写 | Excalidraw/字体/素材库许可 |

## 3. 关键文件指纹

```text
1f2caf36bd8b474b607d5b2fe5637812813d3a6a6a17d71ba365dca771bfc8f6  Resources/Sketch/index.html
e619826edd9c747ee5ae670d203404fad8d231543f379634f9ff4df17704ec71  Web/sketch/src/main.jsx
be671e029af3b6c338277673d927c193577c1013fd5509f8fe5098e9d1643da0  Web/sketch/src/libraries.generated.json
f9a5d2118c74b9c08ede45d91c24df9d10efc5f7687486bfb0127659c89c676b  Tools/DecoProbe.swift
09ee2f02e4cc831da852740c1094ca4fa19ba8370ed26ae4430c526fbb6f0bd3  Docs/research/2026-11-26-deco640-driver-research.md
```

## 4. 资源细节

### 4.1 Resources/Sketch

- `index.html`
- `assets/`：Excalidraw、React、Vite 构建后的 JS/CSS、字体子集、worker
- `fonts/`：Assistant、Excalifont、Virgil、Cascadia Code、Comic Shanns、Nunito、Lilita One、Liberation Sans
- 内置 16 组 Excalidraw 官方素材库，打包在 `assets/index-*.js` 中
- 离线加载，不请求 CDN / Excalidraw 云服务

### 4.2 Web/sketch

- `src/main.jsx`：Excalidraw 包装、多画布、选区导出、剪贴板、素材库、快捷键
- `src/sketch.css`：画布外壳、按钮、画布下拉、素材库面板
- `src/libraries.generated.json`：16 组素材库的构建数据
- `src/mermaid-stub.js`：禁用 Mermaid
- `scripts/prepare-libraries.mjs`：`.excalidrawlib` → `libraryItems`
- `scripts/copy-fonts.mjs`：字体复制，跳过 Xiaolai
- `libraries/*.excalidrawlib`：原始素材库源文件
- `vite.config.js`、`package.json`、`package-lock.json`：构建配置

**未迁移**：`node_modules`（277 MB，可由 `npm install` 重建）。

### 4.3 Reference/SketchModule

9 个 Swift 文件：

- `SketchWindowController.swift`：窗口、WebView、Bridge、导出/保存
- `SketchBridge.swift`：JS → Native 事件
- `SketchSchemeHandler.swift`：`deck-sketch` 资源加载
- `SketchStore.swift`：草稿、PNG、剪贴板
- `SketchBoardStore.swift`：多画布索引与文件
- `SketchSettings.swift`：偏好
- `SketchSettingsView.swift`：设置页
- `SketchModule.swift`：模块契约/入口/生命周期
- `SketchRuntime.swift`：运行时

**注意**：这些文件依赖主项目的 `FeatureModule`、`ModuleRegistry`、`debugLog` 等类型，不能直接编译；只作参考。迁移时已排除 `Resources`，避免重复。

### 4.4 Docs/legacy

包含：

- `SUMMARY.md`：UI 草图模块目标、实现、踩坑、验证
- `EXCALIDRAW_LIBRARIES.md`：素材库格式与来源
- `JSON_CLIPBOARD.md`：复制 JSON 给 AI 的格式
- `MULTI_BOARD.md`：多画布设计与切换
- `ai-json-example.json`：JSON 示例
- `export-sample.png`、`libraries-panel.png`、`libraries-sidebar.png`、`sketch-board.png`：验收截图

## 5. 未迁移与原因

| 内容 | 原因 |
|---|---|
| `Web/sketch/node_modules` | 277 MB，可由 lockfile 重建 |
| `Web/sketch/dist`（若存在） | 构建产物，已在 `Resources/Sketch` |
| 主项目 `Sources/.../Sketch/Resources` 的重复副本 | 已在 `Resources/Sketch` |
| 主项目遥控/截图/桌宠/日历/PureMac | 与 TabletSketch 无关 |
| 主项目 `Build/`、发布脚本、签名材料 | 新项目需要独立构建与签名 |
| 主项目 `~/Library`、`~/Pictures` 用户数据 | 不迁移用户数据；如需可手动导入 `.excalidraw` |
| 主项目 `buttons.json`、`devices.json` | 与手写板无关 |

## 6. 重新构建 Web 资源

```bash
cd Web/sketch
npm install
npm run build
```

构建后把产物同步到 `Resources/Sketch`，并更新 `index.html` / `assets`。不要手改哈希资源。

## 7. 许可

- Excalidraw / React / Vite：MIT
- 字体：SIL Open Font License 1.1
- 素材库：MIT，作者见 `THIRD_PARTY_NOTICES.md`
- 本项目代码：GPL-3.0，见 `LICENSE`

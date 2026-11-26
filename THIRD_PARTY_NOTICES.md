# 第三方声明 · TabletSketch

本仓库包含从 `MacAppControlDeck` 迁移的 UI 草图资源与 Excalidraw 离线构建产物。以下资源按各自许可证分发。

## Excalidraw 离线画板

- **Excalidraw** `0.18.1` — MIT License — https://github.com/excalidraw/excalidraw
  - 以 npm 依赖方式构建为离线静态资源，位于 `Resources/Sketch/`。
  - 通过本地 WebView 资源加载，不访问 Excalidraw 云服务、CDN 或协作后端。
- **React** `18.3.1` / **React DOM** `18.3.1` — MIT License — https://react.dev/
- **Vite** `8.3.8` / **@vitejs/plugin-react** `6.3.0` — MIT License — https://vitejs.dev/
- **@excalidraw/mermaid-to-excalidraw** — 构建期依赖；本项目通过 `mermaid-stub` 禁用 Mermaid，最终包不包含 Mermaid / KaTeX 运行代码。

## 随 Excalidraw 分发的字体

`Resources/Sketch/fonts` 共 25 个字体文件 / 约 429 KB，来自 Excalidraw npm 包：

| 字体 | 文件数 | 许可证 |
|---|---|---|
| Assistant | 4 | SIL Open Font License 1.1 |
| Excalifont | 7 | SIL Open Font License 1.1 |
| Virgil | 1 | SIL Open Font License 1.1 |
| Cascadia Code | 1 | SIL Open Font License 1.1 |
| Comic Shanns | 4 | SIL Open Font License 1.1 |
| Nunito | 5 | SIL Open Font License 1.1 |
| Lilita One | 2 | SIL Open Font License 1.1 |
| Liberation Sans | 1 | SIL Open Font License 1.1 |

- 未打包 Xiaolai（小赖中文手写体）；中文回退系统「苹方」。
- 字体完整许可证以各 npm 包内 `LICENSE` / `OFL.txt` 为准。

## 内置素材库

以下 16 组素材库来自 Excalidraw 官方素材库仓库：

https://github.com/excalidraw/excalidraw-libraries

均标注 **MIT License**。原始 `.excalidrawlib` 位于 `Web/sketch/libraries/`，构建时转换为 Excalidraw 0.18 的 `libraryItems` 结构并打包进 `Resources/Sketch`。

| 素材库 | 作者 / 来源 | 组件数 |
|---|---|---:|
| Basic UX/wireframing elements | gabrielamacakova | 69 |
| Lo-Fi Wireframing Kit | spfr | 23 |
| Web Kit | excacomp | 9 |
| Mobile Kit | excacomp | 3 |
| Forms | g-script | 26 |
| HTML input elements | marwinburesch | 8 |
| Universal UI kit | manuelernestog | 22 |
| Dropdowns | h7y | 3 |
| Apple Devices Frames | franky47 | 13 |
| Awesome Icons | ferminrp | 24 |
| Basic shapes | pgilfernandez | 32 |
| Sticky Notes | ferminrp | 13 |
| Bubbles | ocapraro | 4 |
| Gadgets | morgemoensch | 5 |
| Software Architecture | youritjang | 7 |
| System Design Components | rohanp | 24 |

- 素材仅保存在本地，不请求 `libraries.excalidraw.com` 或 Excalidraw 云服务。
- 分发时保留原作者版权与许可声明；完整仓库级许可见上游 `LICENSE`。

## 本项目代码

本项目代码沿用 `MacAppControlDeck` 的 **GPL-3.0**，见 `LICENSE`。分发二进制时需同时提供对应源码。

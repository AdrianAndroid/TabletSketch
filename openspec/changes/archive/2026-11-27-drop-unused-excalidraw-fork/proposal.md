# Proposal · drop-unused-excalidraw-fork

## Why

`Web/vendor/excalidraw` 这个 git submodule 是另一个项目开发时的产物，提示词串到了本项目，实际没有任何用途：

1. **构建不经过它**：`Web/sketch/package.json` 依赖 npm 包 `@excalidraw/excalidraw@0.18.1`，vite 直接打包 npm 包，submodule 不参与编译。
2. **源码没改过**：全仓库 `grep TS-FORK` 命中 0 处；submodule 钉在的 `a2ec288` 是官方维护者的提交（`fix: backport mermaid xss fix to 0.18.1`），即上游代码。
3. **只是登记了 fork 地址**：`.gitmodules` 指向 `github.com/AdrianAndroid/excalidraw.git`，但 fork 里也只有上游 `main` 加一个 tag，没有任何自有提交。
4. **有实际成本**：多出 53 MB 工作区 + 33 MB `.git/modules`，clone 要额外拉一遍；文档里到处写「fork Excalidraw」，容易让人以为本项目维护了 Excalidraw 分支。

## What Changes

- 删除 submodule `Web/vendor/excalidraw`，同时删除 `.gitmodules`（只有这一个条目）。
- 删除 `.git/modules/Web/vendor/excalidraw` 本地模块缓存。
- `.gitignore` 去掉 submodule 相关注释。
- `README.md` 的架构说明与目录树改为「npm 包 `@excalidraw/excalidraw@0.18.1`，未改源码」，不再出现 submodule。
- `Docs/fork-changes.md` 标记为**已废弃**，但保留「已知的上游坑」一节（`simulatePressure` 钳 0.5、`setPointerCapture` 报错等），这些是真实踩过的坑，与是否改源码无关。
- 在 `openspec/specs/README.md` 归档记录里补一行。

## Capabilities

无能力行为变化。构建方式、运行行为、`.excalidraw` 文件格式、UI 全部不变。

## Impact

- 仓库体积减少约 86 MB。
- 新 clone 不再需要 `--recurse-submodules`。
- 已归档的 `switch-to-forked-excalidraw` 变更原文不改，作为历史记录保留；本次变更在其之上收口。

## 非目标

- 不删除 GitHub 上的 `AdrianAndroid/excalidraw` 仓库。那是远端永久操作，需单独确认后手工或另行执行。
- 不改前端实现，不把依赖切回 submodule，不做 `TS-FORK` 类型改造。
- 不重写已归档变更文档。

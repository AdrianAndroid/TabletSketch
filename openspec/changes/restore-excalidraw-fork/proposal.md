# Proposal · restore-excalidraw-fork

## Why

上一轮按「这个项目用不到、是另一个项目的提示词串了」的判断，把 `Web/vendor/excalidraw` submodule 和 fork 地址删掉了（变更 `drop-unused-excalidraw-fork`）。

用户随后澄清：**TabletSketch 确实需要这份 fork 源码**——`Docs/fork-changes.md` 里列出的六项改造（拆原生 UI 层、径向菜单入口、`pushPenSample` 直连绘制、文字编辑器样式、toast/hint 替换）都要落到 Excalidraw 源码上，没有可写的源码树就无从下手。删除的决定作废。

## What Changes

- 恢复 `.gitmodules`，submodule 路径 `Web/vendor/excalidraw`，url 指向 `https://github.com/AdrianAndroid/excalidraw.git`（shallow），钉在原基线 `a2ec288`。
- 恢复 `gitlink` 与工作区 checkout。
- `README.md` 架构段与目录树恢复 submodule 描述，同时把「打包产物未签名」改为当前已实现的签名流程。
- `.gitignore` 恢复 submodule 注释。
- `Docs/HANDOFF.md`、`openspec/specs/README.md` 恢复删除前的表述。

## Capabilities

无能力行为变化。构建仍走 npm 包 `@excalidraw/excalidraw@0.18.1`；submodule 只作将来改源码的基线。

## Impact

- 新 clone 需要 `git submodule update --init`，多约 53 MB 工作区。
- 删除动作在 git 历史里可追溯（`b3dcfb1` 与其 revert），不算静默改动。

## 非目标

- 不改 Excalidraw 源码，不建 `tablet-sketch/0.18.1` 分支上的提交（等第一个真的需要改源码的需求）。
- 不把前端依赖从 npm 包切到 submodule。
- 不重写 `drop-unused-excalidraw-fork` 的历史记录。

# Proposal · switch-to-forked-excalidraw

## Why

`Web/vendor/excalidraw` submodule 一直指向官方仓库（`https://github.com/excalidraw/excalidraw.git`），只能读、不能写。按 `Docs/fork-changes.md` 的计划，后续 `pen-first-ui` / `pen-input` 深度改动（拆原生 UI、笔采样直连绘制链路等 6 项）都要改 Excalidraw 源码，必须先有自己的可提交仓库。

用户已在 GitHub fork（`AdrianAndroid/excalidraw`，勾选了仅 main 分支），官方 tag 不在其中，需要把基线 tag 和专用分支补进 fork。

## What Changes

- `.gitmodules` 中 `Web/vendor/excalidraw` 的 url 从官方仓库改为 `git@github.com:AdrianAndroid/excalidraw.git`（可写）。
- submodule 内新增 `upstream` remote 指回官方仓库，用于同步上游。
- 从官方拉取 tag `v0.18.1`（`a2ec288`），推送到 fork；基于该 commit 建专用分支 `tablet-sketch/0.18.1` 并推送到 fork，作为所有 `TS-FORK` 改动的基线。
- submodule 指针 commit 不变（仍为 `a2ec288`），**无行为变化**：构建仍走 npm 包 `@excalidraw/excalidraw@0.18.1`，依赖切源码留到首个真要改源码的需求。

## Capabilities

无能力行为变化。本变更只改资源来源（submodule 指向），不触碰任何能力规格；按 R1「资源范围变化须留记录」建立。

## Impact

- 修改：`.gitmodules`（url 换为 fork）
- 修改：`Docs/fork-changes.md`（状态更新：已切 fork，分支基线就绪）
- fork 仓库新增：分支 `tablet-sketch/0.18.1`、tag `v0.18.1`

## 非目标

- 不把 `package.json` 依赖切到 submodule 源码（等第一个改源码的需求一起做）
- 不在分支上做任何 `TS-FORK` 源码改动
- 不跟随官方 main 升级版本（基线锁 0.18.1）

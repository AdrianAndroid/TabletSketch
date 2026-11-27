# tasks · switch-to-forked-excalidraw

## fork 准备

- [x] 在 GitHub fork `AdrianAndroid/excalidraw`（仅 main 分支）
- [x] 从官方拉取 tag `v0.18.1`（`a2ec288`）
- [x] 把 tag 推送到 fork
- [x] 基于 `a2ec288` 建 `tablet-sketch/0.18.1` 并推送到 fork
- [x] submodule 内新增 `upstream` remote 指向官方仓库

## 仓库接线

- [x] `.gitmodules` 的 submodule url 从官方改为 fork
- [x] 本地 submodule `origin` 设为 fork 的 ssh 地址
- [x] 确认 submodule 指针仍为 `a2ec288`，无版本变化
- [x] 验证 fork 上分支与 tag 都存在

## 文档

- [x] 更新 `Docs/fork-changes.md`：已切 fork、基线分支就绪
- [x] design 记录 https / ssh 并存的取舍
- [x] 说明构建仍走 npm 包，无色行为变化

## 非目标（不在本变更）

- [ ] 把 `package.json` 依赖切到 submodule 源码
- [ ] 在 `tablet-sketch/0.18.1` 上做任何 `TS-FORK` 源码改动

## 归档

- [x] `openspec validate --all` 通过
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-switch-to-forked-excalidraw/`

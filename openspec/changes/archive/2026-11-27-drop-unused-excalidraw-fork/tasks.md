# tasks · drop-unused-excalidraw-fork

## 1. 删除 submodule

- [x] `git submodule deinit -f Web/vendor/excalidraw`
- [x] `git rm -f Web/vendor/excalidraw`
- [x] 删除 `.git/modules/Web/vendor/excalidraw`
- [x] 删除 `.gitmodules`（无其他条目）
- [x] 确认工作区里不再有 `Web/vendor` 目录

## 2. 文档收口

- [x] `.gitignore` 移除 submodule 注释
- [x] `README.md` 架构段与目录树改为 npm 包描述
- [x] `Docs/fork-changes.md` 顶部标记已废弃，保留上游坑记录
- [x] `openspec/specs/README.md` 归档记录补一行

## 3. 验证

- [x] `grep -rn "vendor/excalidraw"` 在代码与配置层无命中（仅历史归档文档保留）
- [x] `git submodule status` 为空
- [x] `Web/sketch` 重新 `npm run build` 正常，产物入口哈希不变
- [x] `Scripts/make-app.sh` 正常产出 `Build/TabletSketch.app`
- [x] 启动应用，画板正常渲染（无行为变化）

## 4. 收尾

- [x] 提交说明引用 `drop-unused-excalidraw-fork`
- [x] 归档到 `openspec/changes/archive/2026-11-27-drop-unused-excalidraw-fork/`
- [ ] 推送到 `origin/main`

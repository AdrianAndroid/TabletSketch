# 任务 · fix-island-tool-persistence

- [x] 调整 `applyHidEvent`：把 `ensureDrawTool()` 移到 UI 落点判断之后，仅画布分支调用
- [x] 启动 400ms 默认画笔定时器避让用户已主动选择的工具
- [x] 在 `Tools/ui-test/main.js` 增加「笔点浮岛工具格后工具保持」离屏回归
- [x] 重新构建前端产物并运行离屏回归，确认全部通过
- [x] 归档变更并同步 `openspec/specs/pen-first-ui/spec.md`

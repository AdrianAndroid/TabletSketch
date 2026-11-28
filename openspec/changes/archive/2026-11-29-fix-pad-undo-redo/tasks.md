# 任务清单

- [x] 用 `hid.log` 确认第 8 键事件已到渲染层，排除输入链路
- [x] 定位 `api.history.undo` 在 Excalidraw 0.18.1 不存在（`history` 只剩 `clear`）
- [x] 离屏探针验证：派发到 `document` 无效、派发到 `.excalidraw` 容器有效
- [x] `tablet-sketch.js` 新增 `fireHistoryShortcut()`，`undo/redo` 改走合成快捷键
- [x] 修 `toggleToolLock` 的 setState 回读问题，返回期望值
- [x] `Shell.jsx` 板载键按 index 220ms 去抖
- [x] 离屏审计：画 3 笔 → 按第 8 键 3→2→1；直调 undo→0、redo→1；工具锁 true/false 正确
- [x] 离屏回归 165/165 通过
- [x] 构建前端、打包、固定身份签名覆盖安装并启动
- [x] `lsappinfo` 确认运行实例，采集器 `seized:true`，保留真机体验窗口
- [x] 用户真机确认「可以了」
- [x] 归档变更并同步规格与 README 计数

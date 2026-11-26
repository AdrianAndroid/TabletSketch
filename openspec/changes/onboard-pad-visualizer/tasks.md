# 任务

- [x] 新增 `PadMap.jsx`：按键带 + 手写区 + 笔点 + 按键按下动画
- [x] `chrome.css` 补 `.ts-pad-*` 样式
- [x] `Shell.jsx` 挂载 PadMap，接 `tablet:penpos` 与 `tablet:keys(aux)`
- [x] `tablet-sketch.js` 的 `tablet:penpos` 增加 `nx/ny`
- [x] 按键热区点击 = 触发同一动作
- [x] 采集器：aux 报告首帧打原始字节（`auxraw`），待真机校准
- [x] 截图验证：笔点位置、按键高亮、16:9 比例（TS_FAKE 自动注入）
- [x] 更新 `Docs/HANDOFF.md`

## 待真机确认

- 板载键的 HID 字节偏移与位序：`AuxReportParser` 目前假设 `bytes[2]` 是 8 位位图，未经真机验证。按下任一键后看日志里的 `{"t":"auxraw"}`。

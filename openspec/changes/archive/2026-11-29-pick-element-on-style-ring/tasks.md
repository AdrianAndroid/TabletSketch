# 任务清单

- [x] 建立 OpenSpec 变更与 spec delta
- [x] `tablet-sketch.js` bridge 新增按屏幕坐标拾取并选中图元的方法（临时 selection + canvas 合成点击 + 恢复工具）
- [x] `Shell.jsx` 维护笔是否在板上的状态；`openRadial` 无选中时先拾取，命中后取新 context 打开环
- [x] 未命中 / 离板 / 笔尖在 UI 上时保持原 toast「先选中图形」
- [x] 离屏回归：命中笔迹自动选中并开环、空白保持 toast、UI 覆盖层不误选
- [x] 构建前端、打包、固定身份签名覆盖安装并启动
- [x] 保留真机体验窗口，请用户用笔确认
- [x] 归档变更并同步规格与 README 计数

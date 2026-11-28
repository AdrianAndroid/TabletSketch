# 任务清单

- [x] 建立变更文档与 spec delta
- [x] 新增 `layout-config.js`：默认布局、动作库、校验回落、旧设置迁移、配置档存取
- [x] 重写 `SettingsWindow.jsx`：删除死设置，五处布局页 + 配置档页 + 样式取值编辑
- [x] 样式环 / 左岛 / 工具环构建函数改为接受配置，保留默认参数兼容
- [x] `Shell.jsx` 订阅布局事件并派生五处 UI；板载键动作走统一 activate
- [x] Swift 补 seize 键盘接口（按 VID/PID 精确匹配）
- [x] 新增配置纯函数回归与离屏断言，运行全部回归并确认稳定
- [x] 构建前端、打包、固定身份签名覆盖安装并启动
- [x] 用 `lsappinfo` 确认运行实例，保留真机体验窗口
- [x] 归档变更并同步规格与 README 计数
- [x] 提交并推送 origin/main

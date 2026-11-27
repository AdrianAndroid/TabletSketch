# 任务：左侧样式浮动岛

- [x] 新增 `LeftStyleIsland.jsx`：复用 style-wheel 造类别与取值槽位，显示当前值预览
- [x] 实现悬停 100ms 高亮（订阅 tablet:penpos + rAF + elementFromPoint）
- [x] 实现点击展开取值条、离开 200ms 收起、点击应用样式
- [x] Shell 挂载左岛：400ms 轮询顺带刷新样式上下文，有选中才显示
- [x] 右侧工具岛禁左：snapIsland / clampIsland 收紧到右半区，side 恒 right
- [x] 读数板固定右上
- [x] chrome.css 新增左岛与取值条样式（不透明、data-ts-ui）
- [x] 修正稳定规格第 575 行内圈透明度描述
- [x] 离屏回归新增用例：无选中隐藏 / 有选中显示 / 悬停高亮 / 点击展开应用 / 右岛禁左 / 读数板固定右上
- [x] 重建前端、跑回归、签名覆盖安装
- [x] 归档变更并同步规格与索引、README 计数

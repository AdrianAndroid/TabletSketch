# 左侧样式岛取值项补笔悬停高亮

## Why

左侧样式岛展开取值条后，笔尖停在某个取值项（如「细」）上时该项没有高亮，只有真实鼠标悬停时才亮。根因：类别按钮的高亮由 JS 根据 `tablet:penpos` 计算 `is-hover`，而取值项只写了 CSS `:hover`——笔是虚拟位置，系统鼠标不在那里，`:hover` 永远不触发。按 R11，笔是一等输入，鼠标只是应用内模拟，因此笔的悬停反馈不能依赖 CSS `:hover`。

## What Changes

- 取值项按钮加 `data-ts-style-value`，由 `tablet:penpos` 的命中结果驱动 `is-hover` 高亮，与鼠标 `:hover` 视觉一致。
- 高亮在 rAF 合帧内只在命中值变化时 setState，不增加笔移动时的渲染频率。
- 笔离开取值条时高亮清除；收起取值条时一并清除。

## Capabilities

pen-first-ui

## Impact

- 修改：`LeftStyleIsland.jsx`（取值项命中检测 + is-hover）、`chrome.css`（`.ts-left-style-value.is-hover`）、`Tools/ui-test/main.js`（笔悬停取值项断言）、稳定规格与索引、README 计数。
- 不改变：类别按钮的高亮/展开逻辑、样式应用与撤销、输入路由、签名与打包链路。
- 验证：前端构建 + 离屏回归；真机笔体验由用户确认。

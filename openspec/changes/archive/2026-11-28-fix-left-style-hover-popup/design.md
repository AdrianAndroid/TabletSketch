# 设计：左侧样式岛悬停即弹出取值条

## 触发语义

复用现有订阅与 rAF 合帧，不改变事件源：

- `updateFromPoint` 每帧根据 `document.elementFromPoint` 取 `data-ts-style-key`。
- 命中类别按钮（`key` 非空）时启动 100ms `hoverTimer`；定时器到点后同时：
  1. `setHoverKey(key)` 高亮按钮；
  2. `setExpandedKey(key)` 展开该类别取值条（若当前展开的不是该 key）。
- 快速掠过（停留不足 100ms）不触发高亮也不展开，避免笔经过一排按钮时连续闪出取值条。

## 幂等点击

`openCategory(key)` 改为「确保展开该 key」，去掉原来的 toggle 收起。因为悬停已经负责展开，点击再 toggle 会造成「悬停展开 → 点击收起」的反直觉结果。鼠标点击走同一路径，行为一致。

## 收起与切换

- 笔从类别按钮移到右侧取值条：命中元素不再带 `data-ts-style-key`，`key` 变 null，仅清高亮；由于落点仍在 `[data-ts-left-style]` 内，`collapseTimer` 被取消，取值条不收起。
- 笔完全离开左岛（含取值条）200ms 后收起，逻辑不变。
- 从一个类别移到另一个类别：新 key 的 `hoverTimer` 到点后 `expandedKey` 直接切换到新 key，取值条内容随之更新。
- 点击取值项：`applyValue` 应用并清空 `expandedKey`，逻辑不变。

## 性能

不新增订阅，不增加 setState 次数上界：每个 100ms 停留最多一次 `setHoverKey` + 一次 `setExpandedKey`（key 变化才触发），rAF 保证每帧最多一次位置判定。

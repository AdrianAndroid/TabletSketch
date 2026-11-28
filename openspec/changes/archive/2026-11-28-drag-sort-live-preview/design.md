# 拖拽排序实时预览设计

## 核心思路

把「持久化顺序」与「显示顺序」拆开：

- `ids`：来自 `layout.surfaces[surfaceId].ids`，是持久化的真相，拖动过程中始终不变。
- `previewIds`：`LayoutPage` 的本地 state，仅在拖拽期间存在，代表「如果现在松手会得到的顺序」。
- 显示时用 `displayIds = previewIds ?? ids`：`SlotChip` 列表与 `Preview` 都以它渲染，因此拖动中两处同步实时更新。

## 事件时序

1. `onDragStart(index)`：记录 `dragIndex.current = index`，令 `previewIds = ids.slice()`，加拖动态样式。
2. `onDragOver(index)`（目标 chip）：`event.preventDefault()` 允许 drop；计算把来源项移到目标索引后的新数组，仅当顺序真的变化才 `setPreviewIds`，避免无谓渲染。
3. `onDrop(index)`：`event.preventDefault()`；以当前 `previewIds`（或兜底用 `index` 重算）调用 `onPatch({ ids: next })` 落盘并广播；清空本地拖拽态。
4. `onDragEnd`：无论是否 drop 都清空 `previewIds` 与 `dragIndex`。若已 drop，此时显示源已切换为新的 `ids`，视觉连续；若取消，则回落到原始 `ids`，顺序不变。

## 让位效果

- `SlotChip` 的 key 用稳定的 `id` 而非 `index`，React 才能在数组重排时移动真实 DOM 节点，形成让位动画。
- 拖动源项加 `is-dragging`（降低不透明度、虚线边），提示「这项正在被移动」。
- 当前悬停目标位加 `is-drop-target`（左侧插入标记/高亮），配合列表的真实重排强化落点感知。
- `Preview` 的条目加 `is-preview` 标记，让「预览中的变化」与已保存状态可区分。

## 边界

- 目标索引等于来源索引时不写 state，避免抖动。
- 拖到列表外松手不触发任何 chip 的 `drop`，`dragend` 清空本地态即可回退。
- 上移/下移按钮仍直接 `onPatch`，不走预览态；与拖拽写入同一份 `ids`。
- 候选池添加/移除、恢复默认等操作会改变 `ids`；拖拽期间这些按钮仍可用，但落盘以 `displayIds` 为准，不会丢失本次拖动结果。

## 验证

- 离屏回归：拖动过程中读取列表顺序与预览条目，断言两者已实时变化且配置未写入；派发 drop 后断言配置写入且与预览一致；取消拖动后断言顺序回退且配置不变。
- 保留既有 119 条离屏断言与纯函数回归全绿。

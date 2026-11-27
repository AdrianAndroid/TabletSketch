# 设计：取值项笔悬停高亮

## 命中检测

复用 `LeftStyleIsland` 已有的 `tablet:penpos` / `tablet:mousepos` 订阅与 rAF 合帧。在 `updateFromPoint` 里，除现有的 `[data-ts-style-key]`（类别按钮）外，再取 `el.closest("[data-ts-style-value]")`，读出值 key：

- 命中取值项 → 记入 `hoverValueKey` state，渲染时给对应取值按钮加 `is-hover`。
- 未命中（笔在画布或类别按钮上）→ `hoverValueKey` 置 null，高亮清除。

## 键值唯一性

取值项的 `slot.key` 在同一类别内唯一（不同类别间会重复，如多个类别都有 key `1`、`2`）。因此高亮比较时带上当前展开类别：`hoverValueKey` 存 `类别 key + 取值 key` 的组合字符串，避免切换类别后旧高亮残留到新类别的同名取值项。

## 性能

不新增订阅。每次 rAF 回调内，仅当命中值变化时才 `setHoverValueKey`，与现有 `setHoverKey` 同一量级；笔快速移动经过多个取值项时最多每帧一次更新。

## 鼠标路径

鼠标悬停仍走 CSS `:hover`（真实鼠标位置），同时 `tablet:mousepos` 也会走到同一命中逻辑，两条路径视觉一致。

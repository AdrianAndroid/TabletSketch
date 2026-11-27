# 设计：左侧样式浮动岛

## 数据与复用

不新建样式模型。`style-wheel.js` 已导出需要的一切：

- `categoriesFor(types, context)` —— 多选按类型取类别交集。
- `formatCurrent(key, context)` —— 当前值文本，含「多值」处理。
- `buildLevel2(category, context)` —— 生成取值槽位（含 `current` 高亮、`patch`、色块 `color`）。
- `CATEGORIES[key]` 的 `label` / `icon` —— 类别按钮的标签与图标。

上下文来源：`window.tabletSketch.getContext()`，与侧键样式环一致。左侧岛自身**不轮询**选中态：由 Shell 现有的 400ms 工具轮询顺带取 `getContext()`，仅在「有选中且类别签名变化」时更新左岛 props（比较 `selectedCount + selectedTypes.join()` + 关键样式值，避免高频 setState）。

## 显示条件

`context.selectedCount > 0` 且 `categoriesFor(...)` 非空时渲染整岛；否则返回 `null`（整岛隐藏）。多选交集为空（如同时选中图片与矩形）时同样隐藏，与侧键样式环「没有可调样式」一致。

## 悬停高亮（笔为一等输入）

笔的 `hover` 阶段在 `tablet-sketch.js` 只更新 `tablet:penpos`、不派发 pointer 事件。因此左岛组件：

- 仅在挂载时订阅 `tablet:penpos`（无选中时组件不挂载 → 零订阅开销）。
- 用 rAF 把每个报告合并到每帧一次，记录笔尖屏幕坐标到 ref。
- 用 `document.elementFromPoint(x, y)?.closest("[data-ts-style-key]")` 判断悬停的类别按钮。
- 命中后启动 100ms 定时器，到点才把该 key 写入高亮 state；离开则清除定时器（避免笔快速掠过误高亮）。
- 高亮只影响一个按钮的 CSS class，不触发布局。

## 展开 / 收起

- 点击类别按钮（`onClick`，笔的 `began/ended` 经 UI 分支合成 click，鼠标同样触发）：用 `buildLevel2(key, context)` 造取值槽位，在按钮右侧渲染取值条。
- 取值条与类别按钮包在同一个 `[data-ts-ui]` 容器内；笔在两者间移动时 `elementFromPoint` 仍命中该容器，不触发收起。
- 离开整个左岛容器（pointerleave / 悬停检测判定不在容器内）后 200ms 收起；移回则取消定时器。
- 点击取值项：`bridge().setStyle(slot.patch)`，随后立即收起并 toast 类别+取值（与径向菜单一致）。锁定元素沿用 `getContext()` 的 `allLocked`，LOCK 时点击类别只提示、不展开（与侧键环一致）。

## 布局与避让

- 左岛 `position:absolute; left:12px; top:50%; transform:translateY(-50%)`，纵向单列按钮，与右侧工具岛镜像。
- 取值条 `position:absolute; left:100%;` 贴按钮右侧展开，不透明背景，避免透出画布（延续 `fix-radial-opacity` 约定）。
- 右侧工具岛：`snapIsland` 去掉左侧吸附候选；水平下限改为窗口宽度的 55%（右半区），保证不再与左岛碰撞。`clampIsland` 同步收紧下限。`side` 恒为 `right`。
- 读数板：`PenTelemetry` / `PenTelemetryChip` 固定 `side="right"`，不再随工具岛。

## 不做的取舍

- 不新增自定义取色器、字号输入、滑杆（笔难精确命中）。
- 不改动侧键样式环；两套入口共用定义。
- 不引入新的持久化（左岛位置固定，不拖动）。

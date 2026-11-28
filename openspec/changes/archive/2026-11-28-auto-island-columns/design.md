# 浮岛列数自动化设计

## 列数判定

- 渲染层现有 `visible` = 右浮岛可见内容格（`buildSurfaceSlots` 按 `limit` 截取）。
- 实际渲染格子总数 `cellCount = visible.length + 1`（末尾固定一个「更多」按钮）。
- `columns = cellCount > 10 ? 2 : 1`。
- 例：默认 15 内容格 + 更多 = 16 → 双列；用户减到 9 内容格 + 更多 = 10 → 单列；减到 10 内容格 + 更多 = 11 → 双列。

## 按列填充

- CSS Grid 用 `grid-auto-flow: column` 让 DOM 顺序先纵向填满第一列再进入第二列。
- 双列时显式 `grid-template-rows: repeat(10, cell)`：第一列固定 10 格，第二列装剩余（含「更多」）。
- 单列时 `grid-template-columns: cell`、`grid-auto-flow: row`，「更多」自然在最后。
- 格子尺寸仍为 `calc(44px * var(--ts-ui-scale))`，gap 随 scale；缩放不改变列数判定。

## 渲染接线

- 在 Shell 中给 grid 容器加 `data-columns={columns}`（或等价 class），CSS 用属性选择器切换排布；不引入新的 React state，列数从 `visible.length` 派生，随配置广播即时更新。
- 「更多」按钮仍在 `visible` 之后渲染，`data-columns` 变化不改变 DOM 顺序，保证它始终是最后一格。

## 删除手动选项

- `SettingsWindow.jsx` 移除 `rules.geometry === "grid"` 时的「排布 → 列数」 `Segments` 块。
- `layout-config.js` 保留 `columns` 字段的默认与校验（兼容旧配置与配置档导入），但渲染层不再读取它；规格明确该字段为兼容保留、不影响布局。

## 边界

- 内容格为 0：`cellCount = 1`（仅「更多」），单列。
- 达到上限 18 内容格：`cellCount = 19`，双列 10+9。
- 拖动浮岛时 `offsetHeight` 随列数变化；现有 resize/clamp 逻辑照常工作，浮岛仍被约束在窗口内。
- 输入分层不变：列数只改 DOM 排布，工具格点击、笔点击、板载键执行链路全部不变。

## 验证

- 离屏回归：断言默认 15 格为双列、grid `autoFlow=column`、第一列 10 格；通过配置减到 ≤9 格后变单列；「更多」始终为最后一格；设置里不再有手动列数选项。
- 保留既有全部离屏与纯函数回归全绿。

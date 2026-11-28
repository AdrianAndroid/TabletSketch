# 键位统一与板载键卡片化设计

## 一、设置页合并

- 导航 `NAV_GROUPS` 删除 `layout` 组下的 `layout-onboard` 项；`SURFACE_PAGE` 删除对应映射。
- 「输入 → 键位」页（`page === "keys"`）不再只读：读取 `layout.surfaces.onboardKeys.ids`，固定渲染 8 行。
  - 每行一个 `<select>`：选项来自 `ACTION_GROUPS` 中 `tool`/`panel`/`action` 三组（排除 `style`），用 `<optgroup>` 分组，选项文案带功能名。
  - 变更时按索引替换 `ids[i]`，调用 `patchSurface("onboardKeys", { ids: next })` 写 `layout.v2` 并广播。
  - 保留「恢复板载键默认」按钮，走 `restoreSurface("onboardKeys")`。
  - 页面 note 从"动作可在布局→板载键定制"改为"每行下拉选功能，改动即时生效"。
- 下拉选项集合与右浮岛候选池一致（都排除样式类别），但无需容量/顺序概念——8 键固定编号，每键独立选一个功能，允许重复（两个键绑同一功能合法）。

## 二、顶部按键带卡片化

`PadBand` 增加 `bindings` prop（8 个动作 id），由 `Shell` 传入 `layout.surfaces.onboardKeys.ids`。

- 渲染结构：每个键是一个按钮卡片，内含左侧圆形 `<span>编号</span>` 与右侧 `<Icons[...]>` 功能图标。图标按 `ACTION_LIBRARY[id].icon` 从 `Icons` 取，未知 id 回落到 `more`。
- 分布：键中心从原 `KEY_CENTER = [0.129, 0.236, …, 0.872]`（真机物理位置）改为等距 `(i + 0.5) / 8`，即 6.25%、18.75%…93.75%，8 键平分整条宽度。
- 卡片尺寸随 `--ts-ui-scale`：宽度/高度/圆角/字号/图标尺寸全部用 `calc(... * var(--ts-ui-scale))`，按键带容器高度保持 `calc(42px * scale)` 不变，画布顶部留白仍为 `calc(64px * scale)`。
- 常态：卡片淡底淡边、编号与图标淡灰（沿用现有 `.ts-band-key` 常态色）；按下/flash：`is-lit` 时整卡变蓝、编号圆与图标转白（沿用现有高亮逻辑，180ms 后熄灭）。
- `title` 从"板载键 N"改为"板载键 N · 功能名"，鼠标悬停可看功能。
- 交互不变：`onPointerDown` 立即触发 `onKey(index)`，热区与实体键走同一执行分支。

## 三、边界

- 未设置/非法 id：图标回落 `more`，不崩溃。
- 配置缺失：`normalizeLayout` 仍回落默认 `onboardKeys.ids`（笔/擦/手/选/矩/椭/箭/撤销），顶部图标与下拉同步显示该默认。
- 下拉改功能后，Shell 订阅布局事件即时重建，顶部图标下一次渲染即更新，无需重启。

## 四、验证

- 离屏回归：删旧「板载键」页相关断言（含 8 位 chip）；新增——「输入→键位」页无板载键入口残留、8 行下拉、下拉改值写入 `onboardKeys.ids`、顶部 8 键等距（中心间距一致）、每键含编号+图标、图标随绑定变化、按下高亮。
- 保留被删除页面之外的全部既有断言，回归全绿。

# 设计：样式环扇区不透明化

## 颜色

在 `:root` 新增两个只给样式环使用的变量：

- `--ts-radial-hover`：浅色主题 `#d9ebff`（与 `--ts-accent` 同色系的实色）
- `--ts-radial-dim`：浅色主题 `#f2f4f7`（二级样式环内圈的弱化底色）

深色主题覆盖为 `#24405e` 与 `#303136`。

不复用 `--ts-accent-soft`，因为它是 rgba，被其它控件用于轻量强调；直接改全局值会影响浮岛、面板、按钮等非样式环元素。

## 样式

- `.ts-radial-path`：浅色 `fill: #ffffff`，深色 `fill: #2c2d32`（去掉 alpha）。
- `.ts-radial-path:hover / .is-hover`：`fill: var(--ts-radial-hover)`。
- `.ts-radial-inner.is-dim`：不再设置整体 `opacity: 0.4`；改为内部路径 `fill: var(--ts-radial-dim)`，并把图标/色块 `opacity: 0.5` 表达弱化。中心圆仍是实色。

## 验证

离屏测试通过侧键事件打开样式环，读取一个扇区的 `getComputedStyle(...).fill`，断言不含 `rgba(` / alpha；再模拟悬停，断言高亮填充同样为实色。

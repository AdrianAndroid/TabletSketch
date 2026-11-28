# 设计：UI 随窗口等比放大、关闭按钮与逐图元样式显隐

## 1. UI 随窗口整体等比放大

### 用户语义

应用窗口就是手写板的屏幕映射。窗口变大 = 整块板面等比放大，**整个界面**（按键带、手写区边距、浮岛、按钮、面板、读数板、设置窗口、样式环）全部按同一比例放大，布局比例不变。物理手写板本身不变，笔的归一化坐标经画布 rect 映射到屏幕，随窗口等比适配。

### 基准与计算

- 首次挂载记录 `window.innerWidth/innerHeight` 作为 100% 基准（不写盘，重启按新窗口尺寸重新取基准）。
- `resize` 时计算 `scale = clamp(min(width / baseW, height / baseH), 0.8, 2.0)`：等比、取短边、上下限，避免极端比例把控件挤爆或撑满屏。
- 基准固定：用户改变窗口后不再重新校准，只有重新打开应用才以当时窗口为准。

### CSS 机制（关键取舍）

离屏实测：CSS `zoom` 会连绝对定位坐标和 `transform` 位移一起放大（`left:100px` → 屏幕 200px），导致浮岛锚点漂移、拖动错位、笔尖光标与落点分离。**不用 `zoom`**，改为：

- 在 `.ts-layer` 上设 CSS 变量 `--ts-ui-scale`；
- 所有界面尺寸改为 `calc(基础值 * var(--ts-ui-scale))`：按键带高度、按键直径与分布、浮岛格子/间隙/内边距、左岛按钮、面板宽度与内边距、字号、图标尺寸、读数板、设置窗口、toast；
- 手写区 `.ts-stage` 的 padding/margin 也按 scale 计算，保持整块板面的比例；Excalidraw 画布本身由 flex 撑满手写区，无需单独缩放。
- **笔尖坐标映射不动**：`tablet-sketch.js` 的 `stageRect()` 仍取画布 rect，`payload.x/y` 归一化乘 rect；UI 缩放只改 CSS 尺寸，不改映射公式。笔光标位置是真实屏幕坐标，直写 DOM，不参与缩放。

### 样式环

`RadialMenu` 的半径是 JS 计算写进 SVG 的，用 CSS 变量不生效。方案：Shell 把 `scale` 作为 prop 传入，`RadialMenu` 将 `INNER_RADIUS`、`CENTER_RADIUS`、`GAP`、`BAND` 与算出的 `r1` 统一乘 `scale` 后再算路径/位置/提示气泡；悬停命中 `locateSlot` 用同一套缩放后半径，扇区与笔尖一致。

### 离屏回归

离屏测试窗口固定 1200×760，基准取同尺寸 → scale=1，已有断言不变。新增用例：改变窗口尺寸后断言 `--ts-ui-scale` 变化、按键带高度与格子像素变化、笔落点仍按画布 rect 映射。

## 2. 设置面板关闭按钮

`.ts-settings-head` 是 `-webkit-app-region: drag`，按钮继承拖拽区导致点击被 Electron 吞掉。给 `.ts-settings-head button` 加 `-webkit-app-region: no-drag`，标题栏其余区域保留 drag。笔点击沿用既有 `isChrome` → 合成 `click` 路径，无需改动。

## 3. 逐图元样式显隐

### 配置模型

`layout.v2` 新增 `shapeStyles`，键为 Excalidraw 图元类型，值为样式类别 key 数组：

```
shapeStyles: {
  rectangle: ["stroke", "background", ...],
  ellipse:   ["stroke", "background", ...],   // 无 roundness
  ...
}
```

默认值直接取现有 `style-wheel.js` 的 `TYPE_CATEGORIES`，用户当前体验不变。

### 校验

`normalizeLayout` 校验：只接受已知图元类型、已知样式类别；允许空数组（表示该图元不显示任何样式类别）；未知/损坏项回落默认值。

### 生效链路

- `style-wheel.js` 的 `categoriesFor(types, context, layout, surfaceId)`：
  1. 按 `layout.shapeStyles` 取每种类型的候选类别，对所有选中类型取交集（保持多选兼容语义）；
  2. 再与 `layout.surfaces[surfaceId].ids` 取交集（已有逻辑）——两处共用 `shapeStyles`，各自 `ids` 决定显示顺序与是否包含；
  3. 配置缺失时回落内置 `TYPE_CATEGORIES`。
- `buildLevel1`（键 1）与 `buildCategoryButtons`（左岛）都走同一个 `categoriesFor`，因此两处自动共用同一份显隐配置。
- 设置面板新增「绘图 → 图形样式」页：列出每种图元，每种一组样式类别勾选框；改动即时 `saveLayout` 广播。

### 与样式取值的区别

`shapeStyles` 控制"该图元显示哪些类别"，`values` 控制"每个类别有哪些取值"，两者正交，不互相覆盖。

## 回退与风险

- 缩放：把 `--ts-ui-scale` 固定为 1 即回到旧行为；样式环的 `scale` prop 传 1 同样回落。
- 关闭按钮：不影响其它 `-webkit-app-region: drag` 区域；按钮变为可点，标题栏仍可拖。
- 逐图元显隐：配置损坏或旧版本时回落默认映射，不会让样式环消失。

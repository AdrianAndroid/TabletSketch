# 布局设置页真实 UI 预览设计

## 核心思路

把旧的 `Preview`（文字标签列表）整体替换为 `LayoutPreview`，它按 `SURFACE_RULES[surfaceId].geometry` 分派四种仿真形态。预览组件是纯展示 + 拖动操作的 DOM/SVG，**不 import** `RadialMenu` / `LeftStyleIsland` / `PadBand` 等真实输入组件，避免挂载笔位置订阅、动作派发和浮层状态。

## 四种几何

| surface | geometry | 预览形态 | 复用 |
|---|---|---|---|
| leftIsland | column | 竖排样式按钮条，图标 + 当前值文本 | `Icons`、`ts-left-style-*` 观感（预览专用类名） |
| rightIsland | grid | 图标网格 + 尾部「更多」，列数 `ids.length + 1 > 10 ? 2 : 1` | `ts-cell` 观感，真实列数规则 |
| penKey1 | ring | SVG 扇区环，内圈 +「更多」+ 外圈，样式类别图标 | `RadialMenu` 的扇区几何（在预览内重写一份纯函数） |
| penKey2 | ring | 同上，工具图标 | 同上 |

- 环预览按 `surface.inner` / `surface.outer` 切分：内圈取 `ids.slice(0, inner - 1)`，随后固定一个「更多」扇区，外圈取 `ids.slice(inner - 1, inner - 1 + outer)`。与 `buildToolWheel` / `buildLevel1` 的分段一致。
- 每个扇区用一个「槽位对象」表示：`{ id, index, ring, current, color }`。`index` 是该 id 在 `displayIds` 中的真实下标，供拖动重排使用。「更多」不是配置 id，无 index，不可拖动。
- 预览只读 `displayIds` 渲染，因此拖动中列表与预览天然同步；保存仍由 `LayoutPage` 的 `drop()` 统一写入。

## 拖动接线

- `LayoutPage` 把 `startDrag(index)` / `overChip(index)` / `endDrag()` / `drop()` 作为 `drag` 对象传给 `LayoutPreview`。
- 预览的每个可拖槽位：`draggable`、`onDragStart → startDrag(index)`、`onDragOver → preventDefault + overChip(index)`、`onDragEnd → endDrag`。
- 预览容器（网格 / 环 SVG / 竖排条）统一 `onDragOver={preventDefault}` + `onDrop={drop}`，保证槽位间隙松手也能落坑。
- `dragId` / `preview.at` 分别驱动预览项的 `is-dragging` / `is-drop-target`，与列表一致。
- 拖动期间候选池的增删仍以 `ids`（持久化顺序）为准，落坑以 `dragRef.current.ids` 为准，与既有行为一致。

## 输入边界（R11）

预览位于设置窗口内，只是配置的可视化操作面。它不接管手写笔输入、不派发真实动作、不订阅 `tablet:penpos`，也不改变「左键＝笔点击、右键＝键 1」的应用内模拟约定。真机上设置窗口内的拖动仍按 HTML5 drag（鼠标拖动）工作，与画布上的笔输入互不干扰。

## 尺寸与布局

- 预览放在「形态预览」卡片里，卡片位于四页最顶部。
- 环预览用固定 viewBox 的 SVG，半径按 inner/outer 数计算后整体缩放到一个安全宽度（约 240px），不随 `--ts-ui-scale` 变化，避免设置面板内溢出。
- 网格预览沿用 `.ts-island-grid` 的列数规则但用预览专用类，格子尺寸固定小号，避免 18 项双列撑爆卡片。

## 验证

- 离屏回归：四页均能渲染预览、预览槽位数与 ids 一致、环预览含「更多」扇区、预览上拖动后配置写入且顺序与预览一致、取消拖动不写入；保留既有全部断言全绿。
- 真机：设置里四页顶部预览与真机观感一致，拖动顺手；真机笔在画布上的输入不受影响。

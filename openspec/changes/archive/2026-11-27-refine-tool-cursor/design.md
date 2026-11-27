# design · refine-tool-cursor

## 1. 规则

| 工具 | 鼠标 | 手写笔 |
|---|---|---|
| 选择 / 平移 | 系统箭头 + 6pt 蓝点 | 14pt 空心环 → 落笔 8pt 实心 |
| 橡皮 | 系统箭头 + 圆点（沿用） | 圆环（擦除范围更直观） |
| 自由笔 / 矩形 / 菱形 / 椭圆 / 箭头 / 直线 / 文字 / 图片 | 系统箭头带动 `+` | `+` → 落笔加粗 |

## 2. 为什么保留系统箭头

用户要求「鼠标箭头不刻意隐藏」。浏览器里 `cursor: none` 会同时抹掉箭头，无法只留箭头再叠标记；因此选「箭头 + 叠加指示器」。

`+` 与指针热点同心：箭头尖端覆盖 `+` 的左上角，右下两段仍清晰，视觉上像箭头「带着」准星。虚拟笔坐标仍取 `clientX/Y`，不因指示器偏移改变落点。

## 3. 实现

```jsx
const CROSSHAIR_TOOLS = new Set(["freedraw","rectangle","diamond","ellipse","arrow","line","text","image"]);
const crosshair = CROSSHAIR_TOOLS.has(tool);
```

- `.ts-mouse-dot.is-cross`：14×14，去掉圆点背景，用两条 linear-gradient 画 1.5px 十字，白色描边保证浅色画布可见。
- `.ts-pen-cursor.is-cross`：同样用双 linear-gradient，主色 `#4b3ff0`；`is-down` 时线宽加到 2px。
- 落笔状态仍由 `is-down` 控制，十字不改变尺寸。

## 4. 回归

`Tools/ui-test/main.js` 增加：

- 切到矩形工具 → `.ts-mouse-dot` 带 `is-cross`，注入笔 hover 后 `.ts-pen-cursor` 也带 `is-cross`
- 切回选择 → 两个指示器都恢复圆环 / 圆点
- 全程 `cursor` 计算值不得为 `none`

# design · fix-island-interactions

## 1. 工具切换失败

原实现：

```js
const TOOL_MAP = { pen: "freedraw", select: "selection", ... };
setTool(name) {
  const type = TOOL_MAP[name];   // name 是 "freedraw" / "selection"
  if (!type) return false;       // 查不到，静默失败
  api.setActiveTool({ type });
}
```

浮岛传的是最终工具名（`freedraw`、`selection`），不是槽位 id（`pen`、`select`），所以 `freedraw` 与 `selection` 两个键永远查不到。前者靠初始状态掩盖，后者直接失效。

改法：不再维护映射表，直接校验合法工具集：

```js
const TOOL_TYPES = new Set(["freedraw","eraser","hand","selection","rectangle","ellipse","arrow","line","text","diamond","image"]);
setTool(name) {
  if (!TOOL_TYPES.has(name)) return false;
  api.setActiveTool({ type: name });
  return true;
}
```

## 2. 面板被遮罩盖住

`.ts-layer` 建立 `z-index: 60` 的层叠上下文，内部：

| 元素 | 原 z-index | 结果 |
|---|---|---|
| `.ts-scrim` | 60 | 覆盖浮岛与面板 |
| `.ts-island` | auto | 被遮罩压住 |
| `.ts-panel` | auto | 被遮罩压住 |

遮罩只应负责「点空白关闭」，不应挡住自身要服务的目标。

新层级：scrim 60 < 浮岛 62 < 面板 64 < 小圆点 66 < 样式环 70 < 提示 75 < 设置 80。

## 3. 读数板盖住拖动手柄

浮岛垂直居中，窗口 760 时顶部约 159；读数板 `top: 72`、高约 110，底部 182，正好压住 12pt 手柄。

不改浮岛位置（小窗口会溢出），改为**读数板去浮岛对侧**：浮岛在右，读数板与 chip 在左上；浮岛换到左，读数板回右上。两者永不重叠，也不依赖窗口高度。

## 4. 回归方式

`Tools/ui-test/main.js` 用隐藏窗口跑真实 DOM：

```bash
Web/app/node_modules/.bin/electron Tools/ui-test/main.js
```

- `show: false`、`app.dock.hide()`、独立 `userData`，不启动 HID，不抢焦点。
- 通过 `PointerEvent` / `MouseEvent` 走 React 合成事件，和真人点击同一条路径。
- 断言包含：手柄是否可命中、拖动是否换边、面板中心 `elementFromPoint`、面板打开时浮岛是否仍可点、11 个工具格逐一切换、更多面板动作与置灰状态。

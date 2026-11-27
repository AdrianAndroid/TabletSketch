# add-mouse-input · 鼠标作为虚拟笔

## Why

目前没有手写板时，鼠标不能走笔的绘制链路，右键也不能触发侧键 1。用户要求鼠标和手写板**共用同一套虚拟笔**，不做两套独立模式。

关键约束：鼠标本身不受限，只有笔触受限。

## What Changes

- 鼠标接入与手写板相同的 `hover / began / changed / ended` 笔事件链路，不新增鼠标模式。
- 输入仲裁：一笔进行中由发起源独占；空闲时最后活动的源生效；鼠标点击 UI 始终可用。
- 鼠标移动：
  - 在应用内显示小圆点跟随，系统箭头保留；
  - 移出应用后隐藏圆点，鼠标不被锁定、不被夹取。
- 鼠标左键 = 笔尖接触；右键 / `\` = 侧键 1。
- 笔触限制：
  - 鼠标可以自由移动；
  - 只有落在 `.ts-stage` 内才出墨；
  - 拖出 `.ts-stage` 时坐标夹到边界，笔触停在边界。
- 手写板：笔触圆圈仍只出现在 `.ts-stage` 内。
- 样式环入口：
  - 鼠标：右键 / `\` / 浮岛「更多 → 样式环」/ 菜单栏「视图 → 样式环」；
  - 手写板：侧键 1 不变。
- 右键抑制原生菜单；图层与链接走浮岛「更多 → 原生右键菜单」。
- 移除鼠标/手写板模式切换；顶部条只显示手写板连接状态。
- 不限制鼠标：禁止 pointer lock、坐标 clamp、光标替换、额外 `setPointerCapture`。
- `TS_MOUSE=1` 仅作为测试钩子：忽略 HID，强制鼠标作为输入源，不作为用户模式。
- 更新 README 与 HANDOFF，写清鼠标输入与笔触边界规则。

## Capabilities

- `pen-input`：统一虚拟笔、输入仲裁、鼠标坐标与笔触边界。
- `pen-first-ui`：鼠标小圆点、样式环入口、连接状态。
- `app-lifecycle`：无设备启动、设备断开、重新连接时的鼠标可用性。

## Impact

- `Web/sketch/src/tablet/mouse-input.js`（新增）：鼠标事件 → 虚拟笔事件、右键 / `\`、小圆点、边界夹取。
- `Web/sketch/src/tablet-sketch.js`：统一笔事件入口；画布原生鼠标事件拦截；HID 与鼠标共用同一链路。
- `Web/sketch/src/tablet/Shell.jsx`：小圆点渲染、按鼠标位置打开样式环、连接状态。
- `Web/app/main.js`：菜单栏「视图 → 样式环」；「重新连接手写板」沿用现有入口。
- `Web/app/preload.js`：转发 `ts:open-style-ring`。
- `Web/sketch/src/tablet/chrome.css`：`.ts-mouse-dot` 样式与层级。
- 不改 `Sources/TabletSketchHID`；不安装全局 event tap；不替换系统鼠标。

## 非目标

- 不做鼠标/手写板模式切换。
- 不做 pointer lock、全局 event tap、系统光标替换。
- 不隐藏系统箭头；鼠标圆点是额外指示。
- 不模拟压感；鼠标使用固定压力 0.5。
- 不把鼠标坐标映射进 16:9 之外的绘制区。
- 不改手写板模式的侧键行为。
- 不为其他手写板做适配。

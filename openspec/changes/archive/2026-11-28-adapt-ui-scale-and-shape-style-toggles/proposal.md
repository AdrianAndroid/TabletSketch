# UI 随窗口等比放大、设置面板关闭按钮与逐图元样式显隐

## 问题

用户在真机体验中提出三条：

1. **UI 放大不按比例**：调整应用窗口大小时，浮岛、按钮、面板等 chrome 控件仍是固定像素尺寸，窗口变大后控件相对变小；而手写板到画布的归一化坐标映射必须保持不变。
2. **设置面板右上角 X 点不动**：`.ts-settings-head` 被标记为 `-webkit-app-region: drag`，关闭按钮继承该拖拽区，Electron 吞掉鼠标点击。
3. **每种图元的样式项固定不可改**：`style-wheel.js` 的 `TYPE_CATEGORIES` 硬编码，用户希望设置面板里每种图元一个设置项，用勾选控制该图元显示哪些样式类别；左浮动岛与笔键 1 样式环共用这份配置。

## 目标

- 以**应用启动时的窗口尺寸**为 100% 基准，窗口变大时**整个界面（按键带、手写区边距、浮岛、按钮、面板、读数板、设置窗口、样式环）全部按同一比例放大**，界面布局比例保持不变。
- 物理手写板不变；它在屏幕上的映射区就是画布 rect，随窗口等比变化，笔的归一化坐标映射仍按画布 rect 计算，落点准确。
- 设置面板 X 按钮对鼠标和笔都可点击关闭，同时保留标题栏拖动窗口。
- `layout.v2` 新增 `shapeStyles`：逐图元勾选样式类别；左岛与键 1 样式环共用；默认值与当前固定映射一致。

## 非目标

- 不改 Excalidraw 的画布 zoom、场景坐标或元素序列化格式。
- 不改手写板归一化坐标到画布 rect 的映射（`tablet-sketch.js` 的 `stageRect()` 链路）。
- 不锁死窗口宽高比（窗口仍可任意调整），缩放按短边等比计算。
- 不改 `values` 样式取值编辑、配置档导入导出、板载键动作等既有能力。
- 不引入账号同步或其它设备适配。

## 影响

- `Web/sketch/src/tablet/Shell.jsx`：计算并广播 UI 缩放比例，传给样式环。
- `Web/sketch/src/tablet/chrome.css`：尺寸改由 `--ts-ui-scale` 参与计算；关闭按钮排除拖拽区。
- `Web/sketch/src/tablet/RadialMenu.jsx`：样式环半径随缩放变更，命中检测同步反算。
- `Web/sketch/src/tablet/layout-config.js`、`style-wheel.js`、`settings/SettingsWindow.jsx`：逐图元样式显隐配置。
- 规格：`pen-first-ui`、`app-settings` 同步修订。

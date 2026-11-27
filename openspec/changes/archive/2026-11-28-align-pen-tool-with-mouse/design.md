# 设计 · align-pen-tool-with-mouse

## 1. 核查结论

### Excalidraw 0.18.1 原生工具语义（`Web/vendor/excalidraw/packages/excalidraw/`）

- `freedraw`、`hand`、`selection`：用完后保持。
- `rectangle` / `ellipse` / `diamond` / `arrow` / `line`：画完一个自动回 `selection`（`actions/actionFinalize.tsx:161-177`）。
- `eraser`：用完回退到 `lastActiveTool`，本项目通过 bridge 选中时未记录上一个工具，所以回 `selection`。
- `text`：点下画布开始输入时就回 `selection`（`App.tsx:7406-7411`）。
- `image`：插入后回 `selection`。

以上由 `locked=false` 决定；本项目所有 `setActiveTool` 调用均未传 `locked`。这是上游设计，不是本项目能靠删代码改变的。

### 两条输入路径的差异

| 路径 | 选工具后在画布操作 | 证据 |
|---|---|---|
| 鼠标（`mouse-input.js`） | 不切工具，`needsVirtualPen()` 只决定是否拦截鼠标转虚拟笔 | `mouse-input.js:49-53` |
| 笔（`tablet-sketch.js`） | 每次 `began` 都 `ensureDrawTool()`，强制切回 freedraw | 当前 `tablet-sketch.js:287-290` |

## 2. 修改

删掉笔 `began` 落在画布时的 `ensureDrawTool()` 及其日志。其余不动：

- UI 命中分支仍先 return，不改工具（`tablet-sketch.js:273-284`）。
- 启动 400ms 默认画笔仍由 `userPickedTool` 守门（`tablet-sketch.js:423-425`）。
- 鼠标路径不改。

改完后：用户选了矩形 → 笔画下第一笔时工具仍是矩形 → Excalidraw 画完矩形后按原生语义回选择。这与鼠标完全一致。

## 3. 取舍

- **不加 `locked`**：locked 会让用户无法退出形状工具，且改变上游语义；如果用户之后明确要求「连续画矩形」再单独建变更。
- **不做工具记忆**：不在笔抬起后恢复之前工具；工具状态以 Excalidraw 的 `activeTool` 为唯一真相。

## 4. 验证

离屏回归 `Tools/ui-test/main.js`：

1. 把上一轮的「笔落画布仍切回画笔」改为「笔落画布保持当前工具」。
2. 新增一致性用例：选矩形 → 笔在画布落笔 → 在 Excalidraw finalize 前工具仍为 `rectangle`；再用鼠标走同样流程，断言两者一致。
3. 保留「笔点浮岛按钮后工具保持」用例。

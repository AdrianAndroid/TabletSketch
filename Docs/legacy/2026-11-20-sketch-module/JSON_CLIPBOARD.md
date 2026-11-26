# UI 草图「复制 JSON」

顶栏按钮：`复制图片` → `复制 JSON` → `保存`。

点击「复制 JSON」后，剪贴板写入纯文本（`NSPasteboardTypeString`），可直接粘贴到任意 AI 对话。内容是格式化 JSON，顶层与 `ai` 对象都显式声明“这是一张图”，避免 AI 把坐标和尺寸当成普通正文。

## 顶层字段

| 字段 | 值 | 作用 |
| --- | --- | --- |
| `format` | `"macapp-controldeck/ui-sketch"` | 固定格式标识 |
| `schemaVersion` | `1` | 结构版本 |
| `contentType` | `"application/vnd.macappcontroldeck.ui-sketch+json"` | 内容类型 |
| `isDiagram` | `true` | 机器可读的“这是图” |
| `diagramType` | `"ui-sketch"` | 图形类别 |
| `ai` | object | 给 AI 的自然语言说明 |
| `summary` | object | 元素数量、类型、文字、边界等摘要 |
| `notes` | string[] | 含图片时的限制提示；无图片为 `[]` |
| `scene` | object | 完整 Excalidraw 场景 |

## `ai` 字段

```json
{
  "kind": "diagram",
  "isDiagram": true,
  "title": "UI 草图",
  "message": "这是一个图形/示意图（UI 草图），不是普通文本。请把 scene.elements 当作画布上的图形元素来理解，而不是把坐标、颜色、尺寸当作文本内容。",
  "howToRead": [
    "scene.elements 是 Excalidraw 图形元素数组；type 表示 rectangle / ellipse / diamond / arrow / line / freedraw / text / image 等。",
    "x、y 是元素左上角坐标，width、height 是尺寸；arrow、line、freedraw 的 points 是相对路径点。",
    "text 元素的 text 字段是画面上的文字；containerId 表示文字绑定在某个形状内。",
    "backgroundColor 为 transparent 表示无填充；strokeColor 是描边颜色。",
    "groupIds 相同的元素属于同一组；boundElements 表示箭头或文字与该元素的绑定关系。"
  ],
  "selectedOnly": false
}
```

## `summary` 字段

- `elementCount`：本次导出元素总数。
- `typeCounts`：按 `rectangle` / `arrow` / `text` 等类型计数。
- `textCount`：文字元素总数（不受 `texts` 截断影响）。
- `texts`：提取出的文字内容，去空白后最多 100 条。
- `bounds`：`x`、`y`、`width`、`height`，本次元素的包围盒。
- `hasImages`：是否含 `image` 元素。

## 选中语义

与「复制图片」一致：

- 有选中：只导出选中元素，以及通过 `containerId` / `boundElements` 关联的文字、箭头；`ai.selectedOnly = true`。
- 无选中：导出整板；`ai.selectedOnly = false`。

## 图片处理

JSON 不内嵌 PNG base64，`scene.files` 为空对象；`image` 元素只保留 `fileId`。如果 AI 需要看到真实位图，使用「复制图片」按钮粘贴 PNG。含图片时 `notes` 会明确提示这一点。

## 示例

完整实机输出见同目录 `ai-json-example.json`（5 个矩形，5,402 字节）。

# 设计：笔侧键 2 工具环

## 1. 复用边界

截图中 13 个功能与右侧浮岛槽位一一对应：

| 截图 | 浮岛槽位 id |
|---|---|
| 自由笔 / 橡皮 / 选择 / 抓手 | `pen` / `eraser` / `select` / `hand` |
| 矩形 / 菱形 / 椭圆 | `rectangle` / `diamond` / `ellipse` |
| 箭头 / 直线 / 文字 / 图片 | `arrow` / `line` / `text` / `image` |
| 锁 / 素材库 | `lock` / `library` |

把 `DEFAULT_SLOTS` 与 `TOOL_LABEL` 从 `Shell.jsx` 提到共享模块 `tool-slots.js`。浮岛和工具环都从这份定义取槽位，避免两套表漂移。

## 2. 环 layout

- 内圈 9 槽：`pen / eraser / select / hand / rectangle / ellipse / arrow / text / more`。
- 点 `more` 展开外圈：`diamond / line / image / library / lock`。
- 中心：外圈未展开为「取消」，外圈展开为「返回」，与键 1 样式环一致。
- 当前工具对应的槽位显示 `current` 圆点；`lock` 用 `context.allLocked` 作为当前态。
- 内圈 9 槽与外圈 5 槽都超过 6 个，按现有规格只显示图标，完整名称由悬停提示承担。

为什么不按语义分「形状组 / 线条组 / 其它组」：那样笔、擦、选这些高频工具也要两次点击。笔优先场景下，高频工具必须一笔到位，低频项才放进外圈。

## 3. 接线

- 新增纯函数模块 `tool-wheel.js`：`buildToolWheel(tool, context)` 返回 `{ slots, outerSlots, centerLabel, level: 1, initialSingle: false, mode: "tool" }`。
- `Shell.jsx` 新增 `openToolRadial(source)`：在笔尖/鼠标位置打开工具环；关闭面板与样式气泡；不要求选中元素。
- `handleWheelAction` 按 `slot.kind` 分派：`tool` → 调用现有 `activate(slot)` 后关闭环；`more` → 展开外圈；样式环的 `category` / `value` 路径保持不变。
- `handleWheelCenter` 继续复用：外圈展开时先收外圈，否则关闭。
- `keys.includes(1)` 从 `openBubble()` 改为 `openToolRadial(source)`；`openBubble` 保留给已有 demo 入口，不再挂到侧键。

## 4. 规格冲突处理

- `pen-input` 的侧键表、`express-keys` 的默认表、`pen-first-ui` 的「笔尖样式气泡」都要改，避免文档仍说键 2 弹气泡。
- 样式气泡组件暂不删除，只失去侧键入口；后续若确认彻底不要，另立变更清理。

## 5. 验证

- 离屏回归：用 demo 事件打开工具环，断言内圈 9 槽、外圈 5 槽、侧键 2 不再弹气泡、点工具后工具切换且环关闭。
- 复用既有样式映射回归与全量离屏回归，确认键 1 样式环未受影响。
- 按 R10/R12 固定身份签名覆盖安装并启动，真机用笔侧键 2 验证弹出与切换。

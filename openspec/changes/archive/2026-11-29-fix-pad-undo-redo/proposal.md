# 修复板载键「撤销 / 重做」与工具锁不生效

## 问题

用户实测板载键 1–7 正常，第 8 键（默认绑定「撤销」）卡片会点亮但画布没有回退。`~/Library/Logs/TabletSketch/hid.log` 显示 `{"keys":[7],"t":"aux"}` 每次都到达采集器并转发到渲染层，说明输入链路完好，动作层没有执行。

排查后确认两个缺陷，都在 Web 侧动作实现：

1. **撤销 / 重做调用不存在的 API**。`bridge.undo()/redo()` 写的是 `api.history.undo()`，但 Excalidraw 0.18.1 的 `ExcalidrawImperativeAPI.history` 只剩 `{ clear }`（先声明里可见），运行时直接抛 `gY.history.undo is not a function`。异常在事件回调里被吞掉，表现为「按了没反应」。受影响的不止第 8 键：浮岛「更多」面板的撤销 / 重做、任何绑定到 `undo`/`redo` 的槽位全部失效。
2. **工具锁恒返回 false**。`toggleToolLock()` 在 `api.setActiveTool()` 之后立刻 `api.getAppState().activeTool.locked` 回读，React 的 setState 是批处理的，这一刻读到的仍是旧值，函数永远返回 false。表现是锁图标与「已锁定 / 已解锁」提示语相反，且 `toolLockedRef` 被写错。

## 目标

- 撤销 / 重做必须真正执行，覆盖板载键、笔侧键、浮岛与工具环的所有入口。
- 工具锁切换的返回值必须反映本次操作意图，界面当前态随后由状态轮询校准。
- 板载键同一次按压被固件报成多帧时，撤销不得连撤多步。
- 补离屏回归：按第 8 键端到端可撤销。

## 非目标

- 不自行维护场景快照栈做撤销（会与上游历史双轨，元素 id、选中态、绑定文字都会不一致）。
- 不改板载键出厂映射表（`HIDReader.padKeyMap`：键 7 = Ctrl+Z、键 8 = Ctrl+Shift+Z，与官方 PenTablet 一致），也不改应用内默认布局的槽位顺序。
- 不改采集器的按键上报时机与 HID 层去重逻辑。

## 影响

- `Web/sketch/src/tablet-sketch.js`：新增 `fireHistoryShortcut()`；`undo/redo` 改走合成快捷键；`toggleToolLock` 返回期望值。
- `Web/sketch/src/tablet/Shell.jsx`：板载键按 index 做 220ms 去抖。
- `openspec/specs/express-keys/spec.md`：新增「动作执行落到真实 API」，去抖阈值改为 220ms。
- `openspec/specs/pen-first-ui/spec.md`：统一动作执行补「结果必须真实」场景。

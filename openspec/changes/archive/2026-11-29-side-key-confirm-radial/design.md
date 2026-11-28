# 设计：侧键确认当前悬停扇区

## 复用组件内部的悬停结果

`RadialMenu` 已经用 `tablet:penpos`（笔）或 SVG `pointermove`（鼠标）维护 `pointer`，再经 `locateSlot()` 算出 `hover` 与 `hoveredSlot`，并据此画 `is-hover`。不要在 Shell 里按笔尖坐标重算一遍——那会重复一套环半径、clamp、内外环几何，还会踩到 rAF 合并的时序。

改为给 `RadialMenu` 传一个 `confirmRef`：组件用 effect 把「当前该执行什么」写成一个函数交给 Shell。函数体内：

- `hoveredSlot` 存在 → `onAction(hoveredSlot, hover.ring)`
- `hover` 为 null（中心圆内或环外空白）→ `onCenter()`

这样侧键确认和笔尖点击走的是同一个 `handleWheelAction` / `handleWheelCenter`，二级取值写入、工具切换、中心返回全部自然复用。

## 各管各的环

环状态加 `wheel: "style" | "tool"`，由 `openRadial` / `openToolRadial` 分别写入。侧键处理：

- 环未打开：键 1 开样式环、键 2 开工具环（原行为）
- 环已打开：仅当 `wheel` 与按键匹配时调用 `confirmRef.current?.()`；交叉键直接忽略
- 键 3（橡皮）与板载键的既有处理不变

## 离板判断

侧键事件来自笔时（`source === "pen"`），若 `penPresentRef.current` 为否（收到过 `penpos` detail null），不确认。环由鼠标打开时仍可被笔键确认——此时 `hoveredSlot` 来自鼠标位置，符合「笔优先，笔键是确认动作」。

## 不会连发

采集器对侧键是按下 `keys:[0]`、松开 `keys:[]` 成对上报（日志实测 68 条 side 事件，无同键连续多帧），不像板载键需要 220ms 去抖。侧键处理只看 `keys.includes(n)`，松开帧自然不触发。

## 时序

`confirmRef` 用 `useEffect` 写入，环打开后至少经过一帧才可能有下一次侧键按下，不会出现引用尚未就绪。环关闭时组件卸载，Shell 侧先检查 `radialRef.current` 再调用，不会用到过期函数。

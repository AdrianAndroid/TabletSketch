# 设计：板载键当前态怎么取

## 复用同一份判定

浮岛的当前态由 `buildSurfaceSlots(surfaceId, layout, state)` 统一给出，`current` 的规则是：

- `slot.tool` → `state.tool === slot.tool`
- `slot.action === "lock"` → `!!state.toolLocked`
- `slot.panel` → `state.panel === slot.panel`

板载键条本身就是 `layout.surfaces.onboardKeys.ids` 的一份渲染，所以直接调 `buildSurfaceSlots("onboardKeys", layout, {tool, toolLocked, panel: openPanel})`，再用 `slot.index` 回填到 8 个固定位置，避免再写一遍判定逻辑导致两处漂移。

## 为什么按 index 回填

`band` 形态的 `ids` 会补空字符串（`""`）占位，`buildSurfaceSlots` 会 `filter(Boolean)` 掉这些空槽。如果直接按下标取，空槽之后的格子会错位。因此保留 `slot.index`（原始下标）作为回填键。

## 视觉语义映射

| 槽位 | 浮岛 | 板载键 |
|---|---|---|
| 工具 / 锁，当前生效 | `.is-on`：实色 accent + 白字 | `.is-on`：同一条规则 |
| 面板，展开中 | `.is-open`：`--ts-accent-soft` + accent 字 | `.is-open`：同一条规则 |
| 按下瞬间 | 无 | `.is-lit`：实色 + 外发光（180ms） |

`is-lit` 与 `is-on` 视觉接近是有意的：当前态本来就应该看起来「亮着」。区别在 `is-lit` 带外发光，用来表达「刚刚按下」。

## 性能

`padStates` 用 `useMemo` 挂在 `[layout, tool, toolLocked, openPanel]` 上。Shell 里 `tool` 已经由 400ms 轮询 + 工具轮事件更新，板载键带最多每 400ms 重算一次，代价可忽略。

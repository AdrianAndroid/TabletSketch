# 板载键卡片常亮当前状态，与浮岛同功能同步

## 问题

板载键条上的 8 个卡片只有「按下那一刻闪一下」（`is-lit`，180ms），之后回到淡色。右侧浮岛对同一功能的槽位则会**常亮**：当前工具是实色（`is-on`），展开中的面板是浅色（`is-open`）。

于是同一个功能在两处状态不一致：用户把画笔切到画笔工具，浮岛画笔格是实色常亮，板载键 1（绑定画笔）却仍是灰的，看不出「这个键现在就在生效」。

## 目标

- 板载键卡片的当前态与浮岛完全同语义：
  - 工具槽当 `activeTool.type` 等于该槽工具 → 实色常亮（同 `is-on`）
  - 「锁」槽当工具锁开启 → 实色常亮（同 `is-on`）
  - 面板槽当该面板展开 → 浅色常亮（同 `is-open`）
- 按下时的瞬时闪烁保留，作为「这次按键被接收到了」的反馈。
- 键位绑定变化、工具切换、锁开关、面板开关都要立刻反映到按键带上。

## 非目标

- 不改板载键的默认映射与键位顺序。
- 不改设置面板里的按键带形态预览（那是配置预览，不跟随实时工具状态）。
- 不新增第二套当前态判定逻辑：复用 `buildSurfaceSlots` 给出的 `current`。

## 影响

- `Web/sketch/src/tablet/Shell.jsx`：按 `buildSurfaceSlots("onboardKeys", …)` 计算每格状态并传给 `PadBand`。
- `Web/sketch/src/tablet/PadBand.jsx`：接收 `states`，输出 `is-on` / `is-open` class 与「当前」提示。
- `Web/sketch/src/tablet/chrome.css`：板载键补 `is-on`（实色）与 `is-open`（浅色）样式。
- `openspec/specs/express-keys/spec.md`：新增「板载键卡片显示当前状态」。

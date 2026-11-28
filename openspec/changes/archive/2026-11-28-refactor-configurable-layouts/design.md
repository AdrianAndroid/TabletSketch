# 设计：五处布局可定制

## 1. 配置模型 `layout.v2`

单一 JSON，存于 `localStorage["tablet.layout.v2"]`，主进程不参与：

```js
{
  version: 2,
  surfaces: {
    leftIsland:  { ids: ["stroke", "background", ...], limit: 8 },
    rightIsland: { ids: ["menu", "canvas", ..., "lock"], columns: 2, limit: 15 },
    penKey1:     { ids: ["stroke", "background", ...], inner: 9, outer: 8 },
    penKey2:     { ids: ["pen", "eraser", ..., "lock"], inner: 9, outer: 8 },
    onboardKeys: { ids: ["pen", "eraser", "hand", "select", "rectangle", "ellipse", "arrow", "undo"] }
  },
  values: {
    stroke: [{ key, label, color?, patch }],
    background: [...],
    // ...每个类别的取值项，含自定义颜色
  },
  activeProfile: "default"
}
```

### 动作库（全局统一 id）

| 类别 | id | 说明 |
|---|---|---|
| 工具 | `pen` `eraser` `hand` `select` `rectangle` `diamond` `ellipse` `arrow` `line` `text` `image` | 切换 Excalidraw 工具 |
| 面板 | `menu` `canvas` `library` | 打开对应浮层 |
| 动作 | `lock` `undo` `redo` `zoomFit` `zoom100` `delete` `duplicate` `selectAll` | 工具锁 / 撤销重做 / 缩放 / 删除复制全选 |
| 样式类别 | `stroke` `background` `strokeWidth` `strokeStyle` `roughness` `roundness` `arrowType` `startArrow` `endArrow` `fontFamily` `fontSize` `textAlign` `opacity` | 仅 `leftIsland` / `penKey1` 可用 |

**语义统一**：同一 id 在任何 surface 都走同一个 `activate(slot)` 分支；当前态（高亮圆点）由同一个状态读取函数给出（`tool`、`toolLocked`、`panelOpen`、`styleValue`）。

### 每处允许项与容量

| surface | 允许类别 | 容量 / 排布 |
|---|---|---|
| `leftIsland` | 样式类别 | ≤8，竖排，悬停展开 |
| `rightIsland` | 工具 / 面板 / 动作 | ≤18，1 或 2 列，超出进「更多」 |
| `penKey1` | 样式类别 | 内圈 ≤9（含更多），外圈 ≤8 |
| `penKey2` | 工具 / 面板 / 动作 | 内圈 ≤9（含更多），外圈 ≤8 |
| `onboardKeys` | 工具 / 面板 / 动作 / 空 | 固定 8 位，可留空 |

### 校验与回落

- 未知 id、重复 id、越界数量：丢弃非法项、去重、截断到上限；全空则回落该 surface 默认值。
- 损坏 JSON：备份后回落整套默认；不崩溃、不丢草图。
- 旧 `tablet.settings.v1` 的 `slotCount` / `doubleColumn` / `moreDirection` 迁移到 `rightIsland`，迁移后删除旧键。

## 2. 生效链路

```
SettingsWindow → saveLayout() → localStorage + CustomEvent("tablet:layout")
                                      ↓
Shell 订阅 → setLayout → 派生 visible/overflow/leftButtons/radial/onboard 动作
                                      ↓
RightIsland / LeftStyleIsland / RadialMenu / PadBand 重建
```

- 配置变更即时生效，不重启、无「应用」按钮。
- 所有构建的纯函数接受 `layout` 参数，默认参数保持现有行为，便于回归。
- 当前态统一从桥接层读取：`getTool()`、`getToolLocked()`、`getContext()`、`getOpenPanel()`。

## 3. 设置面板重构

删除现有 `GROUPS` 中失效的「浮岛 / 更多 / 气泡 / 样式环」死控件页，保留通用、笔、画布页；新增「布局」分组置于「输入」与「数据」之间，六个页面：

- `layout-left` / `layout-right` / `layout-key1` / `layout-key2` / `layout-onboard` / `layout-profiles`

每个布局页统一结构：

1. **形态预览**：按该面真实几何展示当前按钮（网格 / 竖排 / 内外环 / 8 位按键带）。
2. **顺序列表**：每项带 ↑↓ 按钮（笔精确调整）与 `draggable` 拖拽（鼠标快捷），支持移除。
3. **候选池**：按类别分组，只列本面允许的项，点选加入。
4. **排布参数**：列数、容量、内外圈槽数。
5. **页脚**：恢复本页默认；样式页额外提供取值编辑器（增删取值、自定义颜色、标签）。

配置档页：保存当前配置为具名档，支持切换、复制、重命名、删除、导出 JSON、导入 JSON。配置档存 `localStorage["tablet.profiles.v1"]`。

## 4. 板载键拦截

Swift 侧：

- `grabPointerInterfaces()` 的 `targets` 增加键盘 usage `(7, 1)` Generic Desktop Keyboard，按 VID/PID 精确匹配，不全局 seize。
- 现有 `handlePointer` 已能解析 Report ID 6 的键盘报告并发出 `{"t":"aux","keys":[index]}`，保持不变。

应用侧：

- `Shell.jsx` 的 `onKeys` 中 `kind === "aux"` 分支不再只点亮，改为按 `layout.surfaces.onboardKeys.ids[index]` 查动作并调用 `activate(slot)`。
- `PadBand` 的笔点热区走同一个 `activate` 路径，真机硬键与模拟点击行为一致。
- 默认映射对齐原固件：键 1–8 = 笔 / 擦 / 手 / 选 / 矩 / 椭 / 箭 / 撤销。

## 5. 风险与边界

- 拦截是接口级：一旦 seize 成功，这块板 8 键的原生快捷键全部失效，由应用完整接住；应用未启动或权限被拒时原生快捷键恢复。
- 样式取值完全开放后，自定义颜色需与当前值高亮规则兼容：按 `patch` 对象的键值比较，而不是仅按预设 key。
- 拖拽排序用 HTML5 `draggable`，笔靠 ↑↓ 按钮；这与用户确认的「两种都要」一致，且避免笔拖误触。

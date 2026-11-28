# 稳定能力规格

本目录是从已完成变更归档生成的稳定规格，代表当前实现的真实行为。

| 能力 | 说明 | 合并来源 |
|---|---|---|
| [`pen-input`](pen-input/spec.md) | 设备识别、三通道职责、三态判定、压力整形、板载 8 键（键盘接口抓取、应用接管）、映射范围、独占现状、统一虚拟笔、输入仲裁、鼠标边界 | bootstrap / seize / onboard-pad-visualizer / window-as-pad / map-onboard-keys / add-mouse-input / refactor-configurable-layouts |
| [`canvas-mapping`](canvas-mapping/spec.md) | 画布比例、等比映射、越界丢弃、画布锁定 | bootstrap-tablet-sketch |
| [`pen-first-ui`](pen-first-ui/spec.md) | 窗口即板面、按键带、右侧浮岛、下拉、两级样式环、鼠标入口、工具选择持久化、输入分层与冲突裁决、输入呈现性能、笔直接拖动把手、样式环不透明、左侧样式岛、工具岛禁左、读数板固定右上、悬停即弹出取值条、取值项笔高亮、图元样式类别按 Excalidraw 截图校准、笔侧键 2 工具环、锁槽改为工具锁、五处布局可定制、统一动作执行、窗口缩放 UI 等比放大、设置面板关闭按钮可点、逐图元样式显隐、板载键卡片化显示、浮岛列数按格数全自动、设置内预览不接管输入、独占失败自动重试、动作结果必须真实 | bootstrap-tablet-sketch / window-as-pad / add-mouse-input / turn-radial-menu-into-style-wheel / fix-island-tool-persistence / align-pen-tool-with-mouse / clarify-pen-first-input-priority / optimize-input-render-performance / fix-island-drag-with-pen / fix-radial-opacity / add-left-style-island / fix-left-style-hover-popup / fix-value-item-pen-hover / align-style-categories-with-excalidraw / add-pen-side-key2-tool-ring / fix-tool-lock-action / refactor-configurable-layouts / adapt-ui-scale-and-shape-style-toggles / unify-onboard-keybindings / auto-island-columns / add-layout-ui-previews / grab-retry-selfheal / fix-pad-undo-redo |
| [`sketch-document`](sketch-document/spec.md) | 多画布、`.excalidraw`、自动保存、导入导出、素材库 | bootstrap-tablet-sketch |
| [`app-settings`](app-settings/spec.md) | 设置入口、设置小窗、五处布局与样式取值可定制、逐图元样式显隐勾选、配置档导入导出、拖拽排序实时预览与落坑保存、板载键统一入口下拉选功能、持久化、四页真实 UI 界面预览与预览上直接拖动重排 | bootstrap-tablet-sketch / turn-radial-menu-into-style-wheel / refactor-configurable-layouts / adapt-ui-scale-and-shape-style-toggles / drag-sort-live-preview / unify-onboard-keybindings / auto-island-columns / add-layout-ui-previews |
| [`express-keys`](express-keys/spec.md) | 8 板载键 + 2 笔侧键、默认映射、侧键 2 工具环、板载键应用接管、持久化、动作落到真实 API、撤销/重做走键盘动作、固件连发 220ms 去抖、板载键卡片常亮当前工具/面板状态 | bootstrap-tablet-sketch / map-onboard-keys / turn-radial-menu-into-style-wheel / add-pen-side-key2-tool-ring / refactor-configurable-layouts / fix-pad-undo-redo / add-pad-key-current-state |
| [`app-lifecycle`](app-lifecycle/spec.md) | 独立 App、入口、权限、无设备回退、单实例 | bootstrap-tablet-sketch / add-mouse-input |
| [`app-icon`](app-icon/spec.md) | 自有图标、全尺寸、可重复生成 | add-app-icon |

## 归档记录

| 日期 | 变更 | 结果 |
|---|---|---|
| 2026-11-27 | `bootstrap-tablet-sketch` | 已归档：架构转 Electron + fork Excalidraw，HID 打通，自绘界面 |
| 2026-11-27 | `seize-pen-input` | 已归档：独占尝试、轻触起笔、压力整形、虚拟笔光标 |
| 2026-11-27 | `onboard-pad-visualizer` | 已归档，**方案已被 window-as-pad 取代**（缩略卡片 → 窗口即板面） |
| 2026-11-27 | `window-as-pad` | 已归档：窗口上下两段版式，笔只在手写区内 |
| 2026-11-27 | `map-onboard-keys` | 已归档：板载键改走 page 1 键盘报告，8 键映射逐键实测 |
| 2026-11-27 | `wire-pen-side-keys` | 已归档：侧键改从 Digitizer flags 取位，径向菜单/样式气泡接通 |
| 2026-11-27 | `pen-telemetry-panel` | 已归档：右上角压感与倾斜读数板，进度条改感知映射 |
| 2026-11-27 | `add-mouse-input` | 已归档：鼠标接入统一虚拟笔，右键 / `\` 开样式环，小圆点与笔触边界 |
| 2026-11-27 | `turn-radial-menu-into-style-wheel` | 已归档：侧键 1 改为两级样式环，旧动作迁到浮岛「更多」 |
| 2026-11-27 | `add-app-icon` | 已归档：自绘应用图标，CoreGraphics 生成全尺寸 `.icns` |
| 2026-11-27 | `restore-excalidraw-fork` | 已归档：恢复 Excalidraw fork submodule（撤销 drop-unused-excalidraw-fork，无行为变化） |
| 2026-11-27 | `add-stable-code-signing` | 已归档：固定自签身份、签名校验、覆盖安装到 `/Applications` |
| 2026-11-28 | `fix-island-tool-persistence` | 已归档：笔点浮岛按钮不再把工具重置成画笔 |
| 2026-11-28 | `align-pen-tool-with-mouse` | 已归档：笔落画布不再改写工具，笔与鼠标行为一致 |
| 2026-11-28 | `clarify-pen-first-input-priority` | 已归档：笔为准、鼠标是应用内模拟层的输入规则写入硬约束与规格 |
| 2026-11-28 | `optimize-input-render-performance` | 已归档：光标/读数直写 DOM、拖动浮岛不重渲染整树、松手才落盘 |
| 2026-11-28 | `fix-island-drag-with-pen` | 已归档：笔在把手内移动也跟手，拖动不再依赖「选」工具 |
| 2026-11-28 | `fix-radial-opacity` | 已归档：样式环扇区改实色填充，不再透出画布 |
| 2026-11-28 | `add-left-style-island` | 已归档：左侧常驻样式岛（悬停高亮、点击展开应用），右侧工具岛禁左，读数板固定右上 |
| 2026-11-28 | `fix-left-style-hover-popup` | 已归档：左岛悬停 100ms 即弹出取值条，点击类别幂等保持展开 |
| 2026-11-28 | `keep-app-window-for-review` | 已归档：R12 每轮开发完成保留可真机体验的运行窗口（无行为变化） |
| 2026-11-28 | `fix-value-item-pen-hover` | 已归档：取值项改由笔位置驱动 is-hover，笔悬停即高亮 |
| 2026-11-28 | `align-style-categories-with-excalidraw` | 已归档：按截图校准椭圆/直线/箭头/自由笔的样式类别映射 |
| 2026-11-28 | `add-pen-side-key2-tool-ring` | 已归档：笔侧键 2 改为浮岛同源工具环，样式气泡撤下侧键 |
| 2026-11-28 | `fix-tool-lock-action` | 已归档：锁槽从锁定选中元素改为 Excalidraw 工具锁，当前态跟随 activeTool.locked |
| 2026-11-28 | `refactor-configurable-layouts` | 已归档：设置面板重构为五处布局可定制、样式取值完全开放、板载键应用接管、配置档导入导出 |
| 2026-11-28 | `adapt-ui-scale-and-shape-style-toggles` | 已归档：窗口缩放时整个界面等比放大（手写板映射不变）、设置面板 X 按钮可点、逐图元样式类别勾选显隐 |
| 2026-11-28 | `drag-sort-live-preview` | 已归档：布局拖拽排序时列表与形态预览实时重排，松手落坑才写入配置，取消拖动回退 |
| 2026-11-28 | `unify-onboard-keybindings` | 已归档：删除重复板载键页、键位页改 8 行下拉选全部动作、顶部键卡片化显示编号+功能图标并等距平分 |
| 2026-11-28 | `auto-island-columns` | 已归档：浮岛列数按格数全自动（≤10 单列、>10 双列）、双列按列填充、删除失效的手动列数选项 |
| 2026-11-28 | `add-layout-ui-previews` | 已归档：四页布局顶部真实 UI 界面预览、预览上直接拖动重排（松手落坑保存）、预览不接管笔输入 |
| 2026-11-28 | `grab-retry-selfheal` | 已归档：独占失败不再永久躺平，按 1.5s→8s 退避持续重试，抢回后重锁全部接口并上报“已恢复独占”；重试期间不报 disconnected |
| 2026-11-29 | `fix-pad-undo-redo` | 已归档：撤销/重做改用 Excalidraw 键盘动作（0.18 已无 `history.undo`），工具锁不再因 setState 回读恒返回 false，板载键加 220ms 固件连发去抖 |
| 2026-11-29 | `add-pad-key-current-state` | 已归档：板载键卡片复用浮岛 `buildSurfaceSlots` 的 current 判定，工具/锁实色常亮、面板展开浅色常亮，按下瞬时闪烁保留 |

## 已知未解决

见 `Docs/HANDOFF.md` 末尾「仍未解决」：`page 1` / `page 13` 独占失败导致的按键外泄与笔驱动系统光标。

# 稳定能力规格

本目录是从已完成变更归档生成的稳定规格，代表当前实现的真实行为。

| 能力 | 说明 | 合并来源 |
|---|---|---|
| [`pen-input`](pen-input/spec.md) | 设备识别、三通道职责、三态判定、压力整形、板载 8 键、映射范围、独占现状 | bootstrap / seize / onboard-pad-visualizer / window-as-pad / map-onboard-keys |
| [`canvas-mapping`](canvas-mapping/spec.md) | 画布比例、等比映射、越界丢弃、画布锁定 | bootstrap-tablet-sketch |
| [`pen-first-ui`](pen-first-ui/spec.md) | 窗口即板面、按键带、右侧浮岛、下拉、径向菜单 | bootstrap-tablet-sketch / window-as-pad |
| [`sketch-document`](sketch-document/spec.md) | 多画布、`.excalidraw`、自动保存、导入导出、素材库 | bootstrap-tablet-sketch |
| [`app-settings`](app-settings/spec.md) | 设置入口、设置小窗、可定制范围、持久化 | bootstrap-tablet-sketch |
| [`express-keys`](express-keys/spec.md) | 8 板载键 + 2 笔侧键、默认映射、持久化 | bootstrap-tablet-sketch / map-onboard-keys |
| [`app-lifecycle`](app-lifecycle/spec.md) | 独立 App、入口、权限、无设备回退、单实例 | bootstrap-tablet-sketch |

## 归档记录

| 日期 | 变更 | 结果 |
|---|---|---|
| 2026-11-27 | `bootstrap-tablet-sketch` | 已归档：架构转 Electron + fork Excalidraw，HID 打通，自绘界面 |
| 2026-11-27 | `seize-pen-input` | 已归档：独占尝试、轻触起笔、压力整形、虚拟笔光标 |
| 2026-11-27 | `onboard-pad-visualizer` | 已归档，**方案已被 window-as-pad 取代**（缩略卡片 → 窗口即板面） |
| 2026-11-27 | `window-as-pad` | 已归档：窗口上下两段版式，笔只在手写区内 |
| 2026-11-27 | `map-onboard-keys` | 已归档：板载键改走 page 1 键盘报告，8 键映射逐键实测 |

## 已知未解决

见 `Docs/HANDOFF.md` 末尾「仍未解决」：`page 1` / `page 13` 独占失败导致的按键外泄与笔驱动系统光标。

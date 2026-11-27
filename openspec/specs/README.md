# 稳定能力规格

本目录是从已完成变更归档生成的稳定规格，代表当前实现的真实行为。

| 能力 | 说明 | 合并来源 |
|---|---|---|
| [`pen-input`](pen-input/spec.md) | 设备识别、三通道职责、三态判定、压力整形、板载 8 键、映射范围、独占现状、统一虚拟笔、输入仲裁、鼠标边界 | bootstrap / seize / onboard-pad-visualizer / window-as-pad / map-onboard-keys / add-mouse-input |
| [`canvas-mapping`](canvas-mapping/spec.md) | 画布比例、等比映射、越界丢弃、画布锁定 | bootstrap-tablet-sketch |
| [`pen-first-ui`](pen-first-ui/spec.md) | 窗口即板面、按键带、右侧浮岛、下拉、两级样式环、鼠标入口、工具选择持久化、输入分层与冲突裁决 | bootstrap-tablet-sketch / window-as-pad / add-mouse-input / turn-radial-menu-into-style-wheel / fix-island-tool-persistence / align-pen-tool-with-mouse / clarify-pen-first-input-priority |
| [`sketch-document`](sketch-document/spec.md) | 多画布、`.excalidraw`、自动保存、导入导出、素材库 | bootstrap-tablet-sketch |
| [`app-settings`](app-settings/spec.md) | 设置入口、设置小窗、可定制范围、持久化 | bootstrap-tablet-sketch / turn-radial-menu-into-style-wheel |
| [`express-keys`](express-keys/spec.md) | 8 板载键 + 2 笔侧键、默认映射、持久化 | bootstrap-tablet-sketch / map-onboard-keys / turn-radial-menu-into-style-wheel |
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

## 已知未解决

见 `Docs/HANDOFF.md` 末尾「仍未解决」：`page 1` / `page 13` 独占失败导致的按键外泄与笔驱动系统光标。

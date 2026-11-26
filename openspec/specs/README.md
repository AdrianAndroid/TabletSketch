# 稳定能力规格

当前仓库处于 bootstrap 阶段，稳定规格还没有从变更归档生成。

首个变更 `bootstrap-tablet-sketch` 完成后，以下能力会同步到这里：

| 能力 | 说明 | 首个变更中的 delta |
|---|---|---|
| `pen-input` | 手写板 HID 读取、三态识别、压感/倾斜、输入仲裁 | `changes/bootstrap-tablet-sketch/specs/pen-input/spec.md` |
| `canvas-mapping` | 16:9 画布、等比映射、越界丢弃、画布锁定 | `changes/bootstrap-tablet-sketch/specs/canvas-mapping/spec.md` |
| `pen-first-ui` | 窗口即板面、顶部拖动条、右侧浮岛（可配格数/双排）、自动溢出、菜单/画布/素材下拉、笔尖气泡 | `changes/bootstrap-tablet-sketch/specs/pen-first-ui/spec.md` |
| `sketch-document` | 多画布、`.excalidraw`、自动保存、导入导出、素材库 | `changes/bootstrap-tablet-sketch/specs/sketch-document/spec.md` |
| `app-settings` | 设置入口、独立设置小窗（560×640、七页签）、可定制范围、配置持久化 | `changes/bootstrap-tablet-sketch/specs/app-settings/spec.md` |
| `express-keys` | 8 板载键 + 2 笔侧键、默认映射、持久化 | `changes/bootstrap-tablet-sketch/specs/express-keys/spec.md` |
| `app-lifecycle` | 独立 App、入口、权限、无设备回退、单实例 | `changes/bootstrap-tablet-sketch/specs/app-lifecycle/spec.md` |

**归档规则**：变更完成并验证后，把对应 delta 同步为 `openspec/specs/<capability>/spec.md`，并在本文件把状态改为「已归档」。

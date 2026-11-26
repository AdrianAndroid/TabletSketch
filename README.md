# TabletSketch

面向 **XP-Pen Deco 640** 的独立 macOS 压感草图应用，基于 Excalidraw 离线画板，目标是把手写板从「鼠标替代品」变成真正可用的绘图工具。

> **当前状态：仓库已初始化、OpenSpec 已建立、资源已迁移；尚未创建可运行 App。**
> 下一步开发请先读 `AGENTS.md`、`openspec/changes/bootstrap-tablet-sketch/proposal.md` 与 `design.md`。

## 为什么单独建仓库

- 不影响现有 `MacAppControlDeck` 的 UI 草图功能。
- 手写板输入、压感、画布锁定、板载键都是高耦合改动，放在独立仓库里迭代更安全。
- 资源、素材库和 `.excalidraw` 文件格式与主项目保持兼容，未来可择机合并，也可独立发布。
- 独立仓库可以先做 PoC，不必为了实验性功能改主项目的生命周期、设置和打包流程。

## 目标设备

- 型号：XP-Pen Deco 640
- VID / PID：`0x28bd` / `0x2904`
- 有效区：`160 × 90 mm`，原生 **16:9**
- 压感：16384 级（`0..16383`）
- 板载虚拟快捷键：**8 个**
- 笔侧键：**2 个 P01 按键**，均可自定义
- 倾斜：支持
- 连接：USB HID；不需要 KEXT、DriverKit、关闭 SIP

完整协议与实测记录见 `Docs/research/2026-11-26-deco640-driver-research.md`。

## 产品定位

第一版只做「本机 Sketch」，不做系统级手写板驱动：

- 画布优先的压感画板
- 笔压控制线宽/透明度
- 倾斜控制笔锋
- 笔侧键切橡皮/呼出径向菜单
- 8 个板载键映射常用动作
- 16:9 等比例画布，笔迹限制在画布矩形内
- 鼠标与手写板可切换，同一时刻只有一个输入源写画布

**不做**：系统全局指针接管、KEXT、DriverKit、OCR 手写识别、云同步、多人协作、首版支持其他型号手写板。

## 仓库结构

```text
TabletSketch/
├── AGENTS.md                       # 开发规则
├── README.md
├── LICENSE                         # GPL-3.0，沿用主项目
├── THIRD_PARTY_NOTICES.md          # Excalidraw / 字体 / 素材库许可
├── openspec/
│   ├── config.yaml                 # OpenSpec 项目上下文与规则
│   ├── specs/                      # 归档后的稳定能力规格（当前为空）
│   └── changes/
│       └── bootstrap-tablet-sketch/
│           ├── proposal.md         # 立项提案
│           ├── design.md           # 架构与关键取舍
│           ├── tasks.md            # 可执行任务清单
│           └── specs/              # 首次实现的能力 delta
├── Docs/
│   ├── research/                   # Deco 640 预研
│   ├── architecture/               # 资源地图与工程结构建议
│   ├── plans/                      # 开发启动说明
│   └── legacy/                     # 主项目 UI 草图历史资料
├── Resources/
│   └── Sketch/                     # 离线 Excalidraw 构建产物 + 素材库
├── Web/
│   └── sketch/                     # Excalidraw Web 包装层源码（不含 node_modules）
├── Reference/
│   └── SketchModule/               # 主项目 Sketch Swift 源码，仅参考，不参与编译
└── Tools/
    └── DecoProbe.swift             # 只读 HID 探针
```

## 已迁移资源

| 资源 | 来源 | 说明 |
|---|---|---|
| `Resources/Sketch` | 主项目 `Modules/Sketch/Resources/Sketch` | 102 个文件，约 5.7 MB；Excalidraw 0.18.1 离线包、25 个字体、16 组素材库 |
| `Web/sketch` | 主项目 `Web/sketch` | 28 个文件，约 2.5 MB；Vite/React 包装层源码，已排除 `node_modules` |
| `Reference/SketchModule` | 主项目 `Modules/Sketch` | 9 个 Swift 文件；仅作实现参考，依赖主项目类型，不能直接编译 |
| `Docs/legacy/2026-11-20-sketch-module` | 主项目归档 | UI 草图模块的 SUMMARY、JSON、素材库说明与验收截图 |
| `Docs/research/2026-11-26-deco640-driver-research.md` | 主项目预研 | HID 通道、协议、按键、画布冲突的完整调研 |
| `Tools/DecoProbe.swift` | 主项目 `Tools` | 只读 HID 探针，可作为输入层 PoC 起点 |

素材库为 Excalidraw 官方素材库，MIT License；字体为 SIL Open Font License 1.1；详见 `THIRD_PARTY_NOTICES.md`。

## OpenSpec 工作流

本项目所有需求都必须先建立变更，再开始实现：

```text
openspec/changes/<change-id>/
  proposal.md
  design.md        # 涉及架构/数据/权限时
  tasks.md         # 多步实现时
  specs/<capability>/spec.md
```

完成后归档到：

```text
openspec/changes/archive/YYYY-MM-DD-<change-id>/
```

并同步更新 `openspec/specs/<capability>/spec.md`。

首个变更：`bootstrap-tablet-sketch`。开发前先读它的 `proposal.md`、`design.md` 和 `tasks.md`。

## 开发准备

1. 读 `AGENTS.md`，确认独立仓库、HID 只读、虚拟笔光标、不接管系统指针等约束。
2. 读 `openspec/changes/bootstrap-tablet-sketch/design.md`，确认输入层、画布层、UI 层、存储层的边界。
3. 用 `Tools/DecoProbe.swift` 做设备探针，确认本机仍能读到 C 通道。
4. 先做 PoC：只读 HID + 压感线宽；通过后再铺 UI。
5. `Web/sketch` 需要重新构建时，先 `npm install`，再按原项目 Vite 流程构建到 `Resources/Sketch`。

## 路线图

- **P0**：独立窗口、只读 HID、压感/倾斜、橡皮、16:9 画布、笔侧键、8 键基础映射
- **P1**：画布优先布局、落笔隐藏 chrome、径向菜单、左手模式、画布锁定
- **P2**：压感曲线预设、掌压过滤、平滑/预测、更多画布比例、模板
- **P3**：可选合并回 MacAppControlDeck，或独立发布

## 许可

本项目沿用主项目的 GPL-3.0（见 `LICENSE`）。Excalidraw、React、Vite、字体与素材库的许可见 `THIRD_PARTY_NOTICES.md`。

# 预研文档说明

## 2026-11-26-deco640-driver-research.md

这份文档原写于 `MacAppControlDeck` 仓库，当时的交付意向是「集成进主项目」。现在交付形态已改为 **独立 TabletSketch App**，因此：

- HID 通道、初始化序列、12 字节报告、按键数量、画布冲突等**技术事实仍然有效**。
- 文末「与 MacAppControlDeck 集成点」「精确文件/行号」「主项目 R0–R4」等章节只作历史参考，不再适用。
- 当前范围以 `openspec/changes/bootstrap-tablet-sketch/proposal.md` 与 `design.md` 为准。

不要直接改原文；后续修正写到新的研究文档或 OpenSpec 变更里。

## pentablet-feature-inventory.md

XP-Pen PenTablet 官方驱动 4.0.8 的**完整功能清单存档**（2026-11-28 卸载官方驱动前记录）：
基于官方 UI 截图、`config.xml`、`language.ini` 三方信息，含板载键默认绑定、热键四类动作、
压感曲线参数、映射/旋转底层参数、以及「官方功能 → TabletSketch」去向对照表与分期移植计划。
配套备份：`~/Desktop/PenTablet-backup-20261128/`。卸载动机与设备争抢诊断见
`.workbuddy/memory/2026-11-28.md`。

## MODIFIED Requirements

### Requirement: 鼠标样式环入口

应用 SHALL 为鼠标提供样式环入口，且不得改变手写板侧键 1 的原有用入口。

#### Scenario: 入口

- **WHEN** 用户使用鼠标
- **THEN** 右键 MUST 打开样式环
- **AND** 按 `\` MUST 打开样式环
- **AND** 浮岛「更多」MUST 提供「样式环」
- **AND** 菜单栏「视图」MUST 提供「样式环」
- **AND** 手写板侧键 1 MUST 保持原有行为

#### Scenario: 位置与范围

- **WHEN** 样式环打开
- **THEN** 鼠标入口的圆心 MUST 取最后一次鼠标位置
- **AND** 手写板入口的圆心 MUST 取笔尖位置
- **AND** 没有鼠标位置记录时 MUST 使用窗口中心
- **AND** 只对环做窗口内 clamp，MUST NOT 对鼠标做 clamp
- **AND** 鼠标 MUST 可自由移动到任意扇区

#### Scenario: 打开状态

- **WHEN** 样式环已打开
- **THEN** 右键 / `\` / 手写板侧键 1 MUST NOT 重复打开或关闭
- **AND** 无选中时 MUST 先尝试拾取笔尖下的图元，仍未命中才提示「先选中图形」，不打开

## ADDED Requirements

### Requirement: 样式环无选中时拾取笔下图元

应用 SHALL 在笔侧键 1 呼出样式环且画布无选中时，先尝试按笔尖位置选中图元，再决定是否打开样式环。

#### Scenario: 笔尖下有图元

- **WHEN** 画布没有选中图元
- **AND** 笔在板上，笔尖位置落在一个图元上
- **THEN** 应用 MUST 自动选中该图元
- **AND** 样式环 MUST 立即打开，样式取值 MUST 来自新选中的图元
- **AND** 当前工具 MUST 在打开后恢复为拾取前的工具

#### Scenario: 笔尖下无图元

- **WHEN** 画布没有选中图元
- **AND** 笔尖位置没有命中任何图元
- **THEN** 应用 MUST 保持原行为：提示「先选中图形」，样式环 MUST NOT 打开

#### Scenario: 笔已离板

- **WHEN** 笔已离开感应区（收到 `leave` 报告）
- **AND** 用户按下侧键 1
- **THEN** 应用 MUST NOT 按最后落点自动选中
- **AND** MUST 提示「先选中图形」

#### Scenario: 笔尖压在自绘 UI 上

- **WHEN** 笔尖位置落在浮岛、面板、板载键条或设置窗等自绘 UI 上
- **AND** 画布没有选中图元
- **THEN** 应用 MUST NOT 拾取 UI 下方的图元
- **AND** MUST 提示「先选中图形」

#### Scenario: 已有选中

- **WHEN** 画布已有选中图元
- **THEN** 应用 MUST NOT 做拾取，样式环 MUST 直接作用于现有选区

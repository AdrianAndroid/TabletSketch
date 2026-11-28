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
- **THEN** 右键 / `\` MUST NOT 重复打开或关闭
- **AND** 手写板侧键 1 MUST 作为确认键执行当前悬停扇区（见「侧键确认环悬停扇区」），MUST NOT 重复开环
- **AND** 无选中时 MUST 先尝试拾取笔尖下的图元，仍未命中才提示「先选中图形」，不打开

## ADDED Requirements

### Requirement: 侧键确认环悬停扇区

应用 SHALL 让笔侧键在样式环 / 工具环已打开时作为确认键，执行当前悬停高亮的扇区，效果与笔尖点击该扇区一致。

#### Scenario: 样式环确认

- **WHEN** 样式环已打开
- **AND** 笔尖悬停在某个扇区上
- **THEN** 按下侧键 1 MUST 执行该扇区，走与扇区点击相同的动作路径
- **AND** 一级类别 MUST 进入二级取值
- **AND** 二级取值 MUST 写入样式并关闭环
- **AND** 「更多」外环项 MUST 按外环扇区执行

#### Scenario: 工具环确认

- **WHEN** 笔侧键 2 工具环已打开
- **AND** 笔尖悬停在某个工具扇区上
- **THEN** 按下侧键 2 MUST 执行该工具并关闭环
- **AND** 执行 MUST 继续走与右浮岛相同的 `activate(slot)` 路径

#### Scenario: 悬停在中心或环外

- **WHEN** 环已打开
- **AND** 笔尖停在中心圆内或环外空白，没有命中任何扇区
- **THEN** 按下对应确认键 MUST 等同于点击中心
- **AND** 一级样式环 MUST 关闭，二级样式环 MUST 返回一级，「更多」外环 MUST 返回内环，工具环 MUST 关闭

#### Scenario: 笔已离板

- **WHEN** 笔已离开感应区（收到 `leave` 报告）
- **THEN** 按下侧键 MUST NOT 确认任何扇区

#### Scenario: 鼠标入口打开的环

- **WHEN** 环由鼠标右键 / `\` / 更多 / 菜单打开
- **THEN** 笔侧键 MUST 仍可确认当前高亮扇区
- **AND** 高亮来源 MUST 保持原样（笔位置或鼠标位置）

#### Scenario: 交叉按键无动作

- **WHEN** 样式环打开时按下侧键 2，或工具环打开时按下侧键 1
- **THEN** MUST NOT 确认扇区，MUST NOT 切换到另一个环

#### Scenario: 与笔尖点击共存

- **WHEN** 用户用笔尖直接点击扇区
- **THEN** 原有执行路径 MUST 保持不变
- **AND** 侧键确认 MUST NOT 取代或改写笔尖点击的语义

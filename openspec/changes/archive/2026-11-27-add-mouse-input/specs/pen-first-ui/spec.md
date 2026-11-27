# pen-first-ui · delta（add-mouse-input）

## MODIFIED Requirements

### Requirement: 顶部拖动条

应用 SHALL 用一条极薄的顶部条承担窗口拖动与基本信息。

#### Scenario: 拖动窗口

- **WHEN** 用户在顶部条上按下并拖动
- **THEN** 窗口 MUST 跟随移动
- **AND** 该按下 MUST NOT 产生笔迹、MUST NOT 改变选中状态

#### Scenario: 内容

- **WHEN** 顶部条渲染
- **THEN** 高度 MUST 不超过 28pt（推荐 24pt）
- **AND** MUST 显示画布名、当前工具与手写板连接状态
- **AND** MUST 提供 `⋯` 菜单，至少含：设置、导出、新建/打开、样式环
- **AND** MUST NOT 出现「鼠标模式 / 手写板模式」切换

## REMOVED Requirements

### Requirement: 模式切换入口

删除鼠标/手写板模式切换。两者共用同一套虚拟笔，鼠标输入始终可用，不再要求用户先选择输入方式。

## ADDED Requirements

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
- **AND** 无选中时 MUST 提示「先选中图形」，不打开

### Requirement: 连接状态

应用 SHALL 显示手写板连接状态，但不引入鼠标/手写板模式切换。

#### Scenario: 状态显示

- **WHEN** 手写板已连接
- **THEN** 顶部条 MUST 显示「手写板已连接」
- **WHEN** 没有手写板
- **THEN** 顶部条 MUST 显示「未检测到手写板」
- **WHEN** 缺少输入监控权限
- **THEN** 顶部条 MUST 显示「缺少输入监控权限」

#### Scenario: 不提供模式切换

- **WHEN** 用户打开视图菜单
- **THEN** MUST NOT 出现「鼠标模式 / 手写板模式」切换
- **AND** 鼠标输入 MUST 在任何时候都可用

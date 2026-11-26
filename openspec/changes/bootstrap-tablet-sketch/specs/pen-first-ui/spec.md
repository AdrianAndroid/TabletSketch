# pen-first-ui 变更（bootstrap-tablet-sketch）

## ADDED Requirements

### Requirement: 画布优先布局

TabletSketch SHALL 在手写板模式下使用画布优先布局，而不是鼠标式小工具栏。

#### Scenario: 默认手写板布局

- **WHEN** 检测到手写板并进入手写板模式
- **THEN** 画布 MUST 占据窗口主要区域
- **AND** 顶部状态条 SHOULD 不超过 32pt
- **AND** 左侧工具轨 SHOULD 为 56pt 左右
- **AND** 右侧属性面板 MUST 可折叠，不得永久占据画布

#### Scenario: 鼠标模式布局

- **WHEN** 用户切回鼠标模式
- **THEN** 布局 MUST 恢复现有鼠标草图风格
- **AND** 手写板模式的 chrome 不得残留在鼠标模式

### Requirement: 大号可点区域

应用 SHALL 为笔尖提供足够大的命中区域。

#### Scenario: 工具按钮

- **WHEN** 用户用笔点击工具
- **THEN** 主工具按钮 MUST 至少 44×44pt
- **AND** 次要按钮 MUST 至少 40×40pt
- **AND** 所有按钮 MUST 有额外 hit slop，允许 2–4pt 误差

#### Scenario: 滑杆与下拉

- **WHEN** 用户调整线宽/透明度
- **THEN** 滑杆轨道 MUST 至少 6pt 高
- **AND** 滑块 MUST 至少 28pt
- **AND** 不以 1px 细线或微小下拉作为主要交互

### Requirement: 落笔隐藏 chrome

应用 SHALL 在落笔时隐藏非必要界面，抬笔后恢复。

#### Scenario: 落笔

- **WHEN** `Tip=1` 开始笔迹
- **THEN** 顶部/底部/侧栏 SHOULD 自动淡出或收起
- **AND** 画布 MUST 不因 chrome 消失而改变坐标
- **AND** 不得闪烁或触发布局重排

#### Scenario: 恢复

- **WHEN** 笔抬起，或笔靠近窗口边缘 20pt 内
- **THEN** chrome MUST 恢复显示
- **AND** 用户 MUST 能继续点工具

### Requirement: 工具轨与属性抽屉

应用 SHALL 提供有限、稳定的主工具和可折叠属性面板。

#### Scenario: 主工具

- **WHEN** 用户打开手写板模式
- **THEN** 工具轨 MUST 只显示 6–8 个主工具
- **AND** 其余工具 MUST 收进「更多」
- **AND** 当前工具 MUST 有明显选中态

#### Scenario: 属性

- **WHEN** 用户选择画笔/橡皮
- **THEN** 属性抽屉 MUST 显示颜色、线宽、透明度、压感曲线
- **AND** 所有控件 MUST 可用笔操作
- **AND** 抽屉折叠后不得遮挡画布

### Requirement: 径向菜单

应用 SHALL 支持笔侧键呼出的径向菜单。

#### Scenario: 呼出

- **WHEN** 用户按下映射为「径向菜单」的笔侧键
- **THEN** 菜单 MUST 以笔尖当前位置为中心弹出
- **AND** 菜单 MUST 提供 4–8 个扇区
- **AND** 打开期间 MUST 暂停笔迹

#### Scenario: 选择

- **WHEN** 用户用笔移动并选择扇区
- **THEN** 对应工具/动作 MUST 生效
- **AND** 菜单 MUST 关闭
- **AND** 不要求笔回到工具栏

#### Scenario: 取消

- **WHEN** 用户松开侧键或点击菜单外
- **THEN** 菜单 MUST 关闭且不触发动作

### Requirement: 左手模式

应用 SHALL 提供左手模式。

#### Scenario: 镜像

- **WHEN** 用户开启左手模式
- **THEN** 工具轨 MUST 镜像到右侧
- **AND** 属性抽屉 MUST 镜像到左侧
- **AND** 画布坐标 MUST 不变
- **AND** 径向菜单方向 SHOULD 适配左手

### Requirement: 模式切换入口

应用 SHALL 提供可见的模式切换入口。

#### Scenario: 菜单入口

- **WHEN** 用户打开应用菜单
- **THEN** MUST 能看到「鼠标模式 / 手写板舒适模式 / 手写板沉浸模式」
- **AND** 当前模式 MUST 有勾选态

#### Scenario: 画布内入口

- **WHEN** 用户在手写板模式
- **THEN** 顶部状态条或「更多」菜单 MUST 提供模式切换
- **AND** 不要求用户记快捷键

### Requirement: 无障碍与动效

应用 SHOULD 尊重系统减少动态效果设置。

#### Scenario: 减少动态

- **WHEN** 系统开启「减少动态效果」
- **THEN** chrome 淡出/径向菜单动画 MUST 降级为无动画或短动画
- **AND** 功能不得受影响

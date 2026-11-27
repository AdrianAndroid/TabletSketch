# pen-first-ui 规格增量：左侧样式浮动岛

## ADDED Requirements

### Requirement: 左侧样式浮动岛

界面左侧 SHALL 提供一块常驻样式岛，在有选中图元时显示，让笔无需经侧键径向菜单即可浏览并修改当前选中图形的样式。左侧样式岛 MUST 与侧键样式环共用 `style-wheel.js` 的同一份样式定义，MUST NOT 新增样式能力或改变 Excalidraw 原生写入与撤销行为。

#### Scenario: 无选中时隐藏

- **WHEN** 当前没有选中图元，或选中集的样式类别交集为空
- **THEN** 左侧样式岛 MUST NOT 显示（整岛隐藏）
- **AND** 不得订阅笔位置事件，保持零常驻开销

#### Scenario: 有选中时显示类别

- **WHEN** 用户选中一个或多个图元
- **THEN** 左侧样式岛 MUST 显示，类别与顺序 MUST 与侧键样式环的 `categoriesFor` 一致
- **AND** 每个类别按钮 MUST 显示当前值预览：颜色类显示色块，其它显示 `formatCurrent` 文本

#### Scenario: 笔悬停高亮

- **WHEN** 笔尖悬停某个类别按钮并停留达到 100ms
- **THEN** 该按钮 MUST 高亮
- **AND** 取值条 MUST NOT 因悬停而展开
- **AND** 笔快速掠过（停留不足 100ms）MUST NOT 触发高亮

#### Scenario: 点击展开取值条

- **WHEN** 笔或鼠标点击某个类别按钮
- **THEN** 该类别的取值条 MUST 在该按钮右侧展开
- **AND** 取值项 MUST 来自 `buildLevel2` 的现有预设，当前值 MUST 高亮

#### Scenario: 移入取值条不收起

- **WHEN** 笔从类别按钮移动到右侧取值条
- **THEN** 取值条 MUST NOT 收起
- **AND** 离开类别按钮与取值条两者后 200ms 才收起

#### Scenario: 点击取值应用

- **WHEN** 用户点击某个取值项
- **THEN** MUST 经 `setStyle` 立即应用该样式并收起取值条
- **AND** 应用结果 MUST 与普通样式环一致地进入 Excalidraw 撤销栈

#### Scenario: 取值条不透明

- **WHEN** 取值条展开
- **THEN** 其背景 MUST 为实色，MUST NOT 透出下方画布图案、选中框或笔迹
- **AND** 所有控件 MUST 位于 `[data-ts-ui]` 容器内，笔落点 MUST NOT 穿透到画布

### Requirement: 右侧工具岛禁左

右侧工具岛 SHALL 始终停留在屏幕右半区，MUST NOT 吸附或拖动到左侧，以避免与左侧样式岛碰撞。

#### Scenario: 拖动下限

- **WHEN** 用户向右或向左拖动右侧工具岛
- **THEN** 其水平位置下限 MUST 被限制在窗口宽度的 55%
- **AND** 松手吸附 MUST NOT 产生左侧吸附结果

### Requirement: 读数板固定右上

压感/倾斜读数板 SHALL 固定显示在屏幕右上角，MUST NOT 随右侧工具岛换边。

#### Scenario: 工具岛位置变化

- **WHEN** 右侧工具岛位置改变
- **THEN** 读数板位置 MUST 保持在右上角不变

## MODIFIED Requirements

### Requirement: 样式环（笔侧键 1）

（沿用一个 Requirement，仅修改下面这条 Scenario，其余 Scenario 保持不变。）

#### Scenario: 展开动画与命中

- **WHEN** 外环展开
- **THEN** 内圈 MUST 保持实色底色、仅在 90ms 内淡化其图标，MUST NOT 使用整体 `opacity` 造成透视
- **AND** 外环 MUST 从内向外依次淡入

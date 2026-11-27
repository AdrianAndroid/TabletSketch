## ADDED Requirements

### Requirement: 左侧样式岛悬停即弹出取值条

左侧样式岛的类别按钮 SHALL 在笔悬停停留达到阈值后自动展开对应取值条，无需点击类别按钮。

#### Scenario: 悬停展开

- **WHEN** 笔尖悬停某个类别按钮并停留达到 100ms
- **THEN** 该按钮 MUST 高亮
- **AND** 该类别的取值条 MUST 自动在该按钮右侧展开
- **AND** 取值项 MUST 来自 `buildLevel2` 的现有预设，当前值 MUST 高亮

#### Scenario: 快速掠过不展开

- **WHEN** 笔尖掠过类别按钮但停留不足 100ms
- **THEN** 该按钮 MUST NOT 高亮
- **AND** 取值条 MUST NOT 展开

#### Scenario: 点击类别幂等

- **WHEN** 用户在已展开的类别按钮上点击
- **THEN** 取值条 MUST 保持展开，MUST NOT 因点击而收起

## MODIFIED Requirements

### Requirement: 左侧样式浮动岛

（原「笔悬停高亮」场景中的「取值条 MUST NOT 因悬停而展开」删除，改为上面「悬停即弹出取值条」Requirement；其余场景不变。）

#### Scenario: 点击取值应用

- **WHEN** 用户点击某个取值项
- **THEN** MUST 经 `setStyle` 立即应用该样式并收起取值条

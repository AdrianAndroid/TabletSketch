## ADDED Requirements

### Requirement: 样式环必须不透明

样式环的所有扇区 SHALL 使用不透明填充，MUST NOT 透出下方画布的图案、选中框或笔迹。

#### Scenario: 普通与高亮扇区

- **WHEN** 样式环打开并悬停某个扇区
- **THEN** 该扇区的 `fill` MUST 为不含 alpha 的实色
- **AND** 未悬停扇区在浅色与深色主题下 MUST 同样为实色

#### Scenario: 二级样式环内圈

- **WHEN** 二级样式环打开，内圈被弱化显示
- **THEN** 内圈 MUST NOT 使用整体 `opacity` 造成透视
- **AND** 弱化效果 MUST 通过实色底色与图标淡化表达

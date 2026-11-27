## ADDED Requirements

### Requirement: 取值项笔悬停高亮

左侧样式岛展开的取值项 SHALL 在笔尖悬停其上时显示高亮，反馈 MUST 与鼠标 `:hover` 一致。取值项高亮 MUST NOT 依赖 CSS `:hover`，因为笔位置是虚拟的，不代表系统鼠标位置。

#### Scenario: 笔悬停取值项高亮

- **WHEN** 笔尖悬停某个取值项（由 `tablet:penpos` 命中 `[data-ts-style-value]`）
- **THEN** 该取值项 MUST 立即显示高亮
- **AND** 高亮视觉 MUST 与鼠标悬停一致

#### Scenario: 笔移开清除高亮

- **WHEN** 笔尖离开取值项移到画布或类别按钮上
- **THEN** 该取值项高亮 MUST 清除

## MODIFIED Requirements

### Requirement: 左侧样式浮动岛

（在「点击取值应用」场景中补充：应用后取值条收起，取值项高亮一并清除。）

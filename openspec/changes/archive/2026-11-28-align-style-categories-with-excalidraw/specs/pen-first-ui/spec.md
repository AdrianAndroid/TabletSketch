## MODIFIED Requirements

### Requirement: 图元样式维度清单

应用 SHALL 按图元类型提供对应的样式维度；完整矩阵见本变更 `design.md` §1。图元与样式的对应关系 MUST 与 Excalidraw 原生样式面板一致，MUST NOT 把某图元不支持的样式显示为可调控件。

#### Scenario: 基础图形

- **WHEN** 选中矩形或菱形
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、边角、透明度
- **WHEN** 选中椭圆
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、透明度
- **AND** 椭圆 MUST NOT 出现边角

#### Scenario: 直线与箭头

- **WHEN** 选中直线
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、边角、透明度
- **AND** 直线 MUST NOT 出现起点箭头、终点箭头或 Arrow type
- **WHEN** 选中箭头
- **THEN** 可调维度 MUST 覆盖：描边、描边宽度、边框样式、线条风格、Arrow type、起点箭头、终点箭头、透明度
- **AND** 箭头 MUST NOT 出现背景
- **AND** 直线与箭头 MUST 按元素类型分别取类，不得按截图位置硬编码

#### Scenario: 自由笔与文字

- **WHEN** 选中自由笔
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、透明度
- **WHEN** 选中文字
- **THEN** 可调维度 MUST 覆盖：描边、字体、字体大小、文本对齐、透明度

#### Scenario: 画框与嵌入

- **WHEN** 选中画框
- **THEN** 可调维度 MUST 覆盖：透明度
- **WHEN** 选中嵌入网页
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、边角、透明度

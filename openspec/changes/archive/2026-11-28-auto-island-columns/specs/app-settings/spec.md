## ADDED Requirements

### Requirement: 右浮岛列数不提供手动配置

设置面板 SHALL NOT 向用户提供右浮岛的列数手动选项；列数由渲染层按格数自动判定。

#### Scenario: 排布设置中无列数项

- **WHEN** 用户打开「布局 → 右浮动岛」
- **THEN** 「排布」区 MUST NOT 出现「列数」单列/双列选项

#### Scenario: 旧配置的兼容

- **WHEN** 导入的配置档或旧配置含 `columns` 字段
- **THEN** 校验 MUST 接受该字段而不报错
- **AND** 该字段 MUST NOT 影响实际渲染列数

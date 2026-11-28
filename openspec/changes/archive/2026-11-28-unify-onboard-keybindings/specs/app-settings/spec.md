## MODIFIED Requirements

### Requirement: 可定制范围

#### Scenario: 板载键统一入口

- **WHEN** 用户打开设置中的「输入 → 键位」
- **THEN** MUST 以固定 8 行展示板载键 1–8，每行提供一个下拉菜单选择功能
- **AND** 下拉选项 MUST 覆盖全部非样式动作（工具、面板、动作），与右浮岛候选池一致
- **AND** 每个键 MUST 可独立选择功能，允许两个键绑定同一功能
- **AND** 改动 MUST 写入 `layout.v2` 的 `onboardKeys.ids` 并即时广播
- **AND** MUST 提供恢复板载键默认，且 MUST NOT 再保留「布局 → 板载键」这一重复入口

### Requirement: 板载键可视化

#### Scenario: 顶部按键带显示绑定功能

- **WHEN** 应用窗口显示顶部按键带
- **THEN** 8 个键 MUST 等距平分整条按键带宽度
- **AND** 每个键 MUST 显示为卡片：内左侧圆形编号、右侧当前绑定功能图标（与右浮岛同款）
- **AND** 常态编号与图标 MUST 淡色显示，按下时整卡 MUST 高亮且编号与图标一起变色
- **AND** 卡片尺寸 MUST 随 UI 缩放比例等比变化，按键带高度与画布留白 MUST 保持不变

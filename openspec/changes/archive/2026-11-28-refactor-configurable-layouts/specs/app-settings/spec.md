## MODIFIED Requirements

### Requirement: 可定制范围

设置 SHALL 覆盖以下项目；每项改动 MUST 即时生效，不要求重启。

#### Scenario: 五处布局

- **WHEN** 用户打开设置中的「布局」分组
- **THEN** MUST 提供左浮岛、右浮岛、笔键 1、笔键 2、板载键五个独立页面
- **AND** 每页 MUST 可改：显示哪些按钮、按钮顺序、每处容量与排布参数
- **AND** 右浮岛与板载键的顺序 MUST 各自独立保存，互不影响
- **AND** 同一按钮 id 的动作语义 MUST 全局统一，当前态显示 MUST 同步
- **AND** 改动 MUST 广播布局事件，五处界面 MUST 即时重建，无需重启

#### Scenario: 样式完全开放

- **WHEN** 用户在笔键 1 或左浮岛页编辑样式
- **THEN** MUST 可改：显示哪些样式类别、类别顺序、每个类别的取值项
- **AND** 取值项 MUST 支持自定义颜色、自定义标签、增删与排序
- **AND** 自定义取值写入 MUST 通过既有 `setStyle` 桥接路径，作用语义与预设取值一致

#### Scenario: 排序方式

- **WHEN** 用户调整任意页面的按钮顺序
- **THEN** MUST 同时提供上移/下移按钮与拖拽排序两种方式
- **AND** 两种方式 MUST 写入同一份顺序数据，结果一致

### Requirement: 持久化

设置 SHALL 保存到本机，不跟随账号同步。

#### Scenario: 布局持久化

- **WHEN** 用户改动任意布局或配置档
- **THEN** 布局 MUST 写入 `tablet.layout.v2`，配置档 MUST 写入 `tablet.profiles.v1`
- **AND** 重启后 MUST 恢复，且旧 `tablet.settings.v1` 的格数/双排/更多方向 MUST 迁移到新布局后不再读取

#### Scenario: 配置档

- **WHEN** 用户需要多套配置
- **THEN** MUST 支持把五处布局与样式取值存成具名配置档
- **AND** MUST 支持切换、复制、重命名、删除、导出 JSON、导入 JSON
- **AND** 导入非法配置 MUST 校验后回落，不丢当前草图

## ADDED Requirements

### Requirement: 布局编辑界面

设置面板 SHALL 为五处布局提供统一的可视化编辑界面。

#### Scenario: 页面结构

- **WHEN** 打开任一布局页
- **THEN** MUST 依次显示：形态预览、带上下移与移除的顺序列表、按类别分组的候选池、排布参数
- **AND** 形态预览 MUST 按该面真实几何展示按钮（网格 / 竖排 / 内外环 / 8 位按键带）
- **AND** 候选池 MUST 只列该面允许类别的项

#### Scenario: 恢复默认

- **WHEN** 用户点「恢复本页默认」
- **THEN** 当前页面 MUST 回落出厂值，其他页面 MUST NOT 受影响

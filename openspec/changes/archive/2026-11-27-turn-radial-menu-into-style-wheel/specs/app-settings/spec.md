# app-settings · delta（turn-radial-menu-into-style-wheel）

## MODIFIED Requirements

### Requirement: 可定制范围

设置 SHALL 覆盖以下项目；每项改动 MUST 即时生效，不要求重启。

#### Scenario: 浮岛

- **WHEN** 用户修改浮岛
- **THEN** MUST 可改：浮岛格数（0–18）、每格内容（工具 / 组 / 动作 / 展开型格子 / 空）、顺序、图标、标签
- **AND** MUST 可改：单排或双排的排布方式
- **AND** MUST 可改：`⋯` 二级面板的内容与顺序
- **AND** 改动 MUST 同步更新板载键 1–8 的映射（两者是同一份数据）

#### Scenario: 交互节奏

- **WHEN** 用户修改交互参数
- **THEN** MUST 可改：单击与长按的阈值、「更多」的展开方向、浮岛与画布重叠时的淡出透明度
- **AND** MUST 可改：浮岛默认位置、吸附距离

#### Scenario: 笔尖气泡

- **WHEN** 用户修改气泡
- **THEN** MUST 可改：气泡内三组项目（颜色 / 线宽 / 橡皮）各自显示哪些选项
- **AND** MUST 可改：气泡尺寸档位与偏移距离

#### Scenario: 样式环

- **WHEN** 用户打开设置中的「样式环」页
- **THEN** MUST 只展示只读说明（固定 6 色、透明度 8 档、字号 4 档）
- **AND** MUST NOT 提供槽位数量、动作绑定、悬浮预览等会改变样式环结构或取值的可编辑控件
- **AND** v1 调色板固定，不做设置面板、不做持久化

#### Scenario: 压感与画布

- **WHEN** 用户修改压感或画布
- **THEN** MUST 可改：压感曲线（至少 5 个可拖动控制点，且提供预设）
- **AND** MUST 可改：最小线宽、背景（纯白 / 点阵 / 网格 / 深色）、网格间距

#### Scenario: 配置档

- **WHEN** 用户需要多套配置
- **THEN** MUST 支持把「浮岛 + ⋯ + 气泡 + 压感 + 背景」存成一个具名配置档
- **AND** MUST 支持切换、复制、重命名、删除
- **AND** MUST 支持导入导出单个配置文件

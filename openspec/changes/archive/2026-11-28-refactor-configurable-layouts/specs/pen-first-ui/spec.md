## MODIFIED Requirements

### Requirement: 样式环（笔侧键 1）

应用 SHALL 在笔侧键 1 按下时于笔尖位置弹出样式环。

#### Scenario: 内容来自配置

- **WHEN** 样式环打开
- **THEN** 一级类别与顺序 MUST 由 `layout.v2` 的 `penKey1.ids` 决定
- **AND** 二级取值 MUST 由 `layout.v2.values[类别]` 决定，含用户自定义取值与自定义颜色
- **AND** 未配置该类别时 MUST 回落默认类别表与默认取值
- **AND** 自定义取值的当前态高亮 MUST 按 patch 内容匹配，不只按预设 key

#### Scenario: 弹出壳不变

- **WHEN** 样式环打开
- **THEN** 弹出位置、跟随笔、rAF 悬停高亮、实色扇区、中心返回、外环展开 MUST 保持既有行为

### Requirement: 左侧样式浮动岛

应用 SHALL 在选中图元时常驻显示左侧样式岛。

#### Scenario: 内容来自配置

- **WHEN** 左侧样式岛渲染
- **THEN** 类别按钮与顺序 MUST 由 `layout.v2` 的 `leftIsland.ids` 决定
- **AND** 取值项 MUST 与笔键 1 共用 `layout.v2.values`，自定义取值同步可见
- **AND** 悬停 100ms 高亮并展开、笔位置驱动取值项高亮 MUST 保持既有行为

### Requirement: 笔侧键 2 工具环

#### Scenario: 槽位排列来自配置

- **WHEN** 工具环打开
- **THEN** 内圈与外圈按钮 MUST 由 `layout.v2` 的 `penKey2.ids` 与 `inner` 容量切分
- **AND** 未配置时 MUST 回落默认内圈 8 工具 + 更多、外圈 5 低频项
- **AND** 执行 MUST 继续走与右浮岛相同的 `activate(slot)` 路径

## ADDED Requirements

### Requirement: 统一动作执行

应用 SHALL 让右浮岛、左岛、两个工具环与板载键共用同一个动作执行路径。

#### Scenario: 同一 id 同语义

- **WHEN** 任一界面点中按钮 id `X`
- **THEN** MUST 调用同一个 `activate` 分支，产生与 id 对应的唯一动作
- **AND** 工具 id MUST 切换工具，面板 id MUST 打开对应浮层，动作 id MUST 执行对应命令
- **AND** 当前态 MUST 由统一状态读取函数给出，不允许各界面各自计算导致不一致

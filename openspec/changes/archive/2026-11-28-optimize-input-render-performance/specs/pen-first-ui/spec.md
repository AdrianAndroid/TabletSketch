## ADDED Requirements

### Requirement: 输入呈现不阻塞输入链路

界面呈现层（虚拟笔光标、压感读数、浮岛拖动反馈）SHALL 与笔迹事件链路解耦，不得因呈现更新而丢失或延迟合成到画布的笔事件。

#### Scenario: 高频笔报告

- **WHEN** 手写板连续上报笔位置
- **THEN** 每个报告 MUST 仍产生一个合成指针事件交给画布
- **AND** 虚拟笔光标位置 MUST 直接更新 DOM，MUST NOT 触发整棵界面树重渲染
- **AND** 压感读数 MUST 以每帧至多一次的频率合并更新

#### Scenario: 光标语义不变

- **WHEN** 笔或鼠标移动
- **THEN** 唯一指示器的位置 MUST 仍与最后一次活动输入源一致
- **AND** 菜单弹出位置 MUST 仍从最后落点读取，不受呈现层优化影响

### Requirement: 浮岛拖动跟手

浮岛拖动 SHALL 跟手且不产生可感知掉帧。

#### Scenario: 拖动过程

- **WHEN** 用户按住浮岛把手拖动
- **THEN** 浮岛位置 MUST 直接以合成层变换更新，MUST NOT 在每次指针移动时重渲染整棵界面树
- **AND** 拖动期间 MUST NOT 写入本地存储
- **AND** 拖动期间 MUST NOT 触发高开销背景滤镜重采样

#### Scenario: 松手落定

- **WHEN** 用户松手
- **THEN** 最终位置 MUST 写入本地存储一次
- **AND** 吸附、面板朝向与双击复位行为 MUST 与优化前一致

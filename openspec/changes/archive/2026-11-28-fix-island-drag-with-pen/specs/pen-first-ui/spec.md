## ADDED Requirements

### Requirement: 浮岛把手是独立拖动入口

浮岛顶部的拖动把手 SHALL 在任意工具下都可被手写笔直接拖动，MUST NOT 要求先切换到「选择」工具。

#### Scenario: 笔在把手内按下并移动

- **WHEN** 用户用笔在把手上按下，并继续在浮岛范围内移动
- **THEN** 每个 `changed` 报告 MUST 合成为 `pointermove` 派发给命中元素
- **AND** 浮岛 MUST 随笔实时跟手
- **AND** 当前工具 MUST NOT 被改写

#### Scenario: 笔移出浮岛继续拖动

- **WHEN** 拖动过程中笔离开浮岛落到画布区域
- **THEN** 拖动 MUST 连续不中断
- **AND** 画布 MUST NOT 因这次拖动产生笔迹

#### Scenario: 鼠标路径一致

- **WHEN** 用户用鼠标拖动同一个把手
- **THEN** 行为 MUST 与优化前一致
- **AND** MUST 与笔路径得到相同的吸附与持久化结果

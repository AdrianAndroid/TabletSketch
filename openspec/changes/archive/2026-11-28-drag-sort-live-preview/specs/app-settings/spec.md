## MODIFIED Requirements

### Requirement: 可定制范围

#### Scenario: 排序方式

- **WHEN** 用户调整任意页面的按钮顺序
- **THEN** MUST 同时提供上移/下移按钮与拖拽排序两种方式
- **AND** 两种方式 MUST 写入同一份顺序数据，结果一致
- **AND** 拖拽过程中「当前按钮」列表与「形态预览」区 MUST 实时显示按顺序重排后的结果
- **AND** 排序结果 MUST 仅在松手落坑时写入配置，取消拖动 MUST 回退到拖动前顺序且不写入配置

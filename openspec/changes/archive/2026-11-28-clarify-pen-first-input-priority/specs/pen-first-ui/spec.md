## ADDED Requirements

### Requirement: 输入分层与冲突裁决

输入 SHALL 分为两层：第一层为手写笔与板载键的真实 HID 输入，是产品语义基准；第二层为鼠标，仅作为本应用范围内对手写笔的模拟。

#### Scenario: 鼠标模拟映射

- **WHEN** 用户在本应用窗口内使用鼠标
- **THEN** 鼠标左键 MUST 模拟手写笔点击
- **AND** 鼠标右键 MUST 模拟板载键 1
- **AND** 该模拟 MUST NOT 泛化到系统级输入或其它应用

#### Scenario: 笔与鼠标不一致

- **WHEN** 同一交互上手写笔与鼠标行为不一致
- **THEN** MUST 以手写笔行为为准
- **AND** MUST 调整鼠标模拟去对齐手写笔
- **AND** MUST NOT 把笔的行为改成鼠标行为

#### Scenario: 开发优先级

- **WHEN** 设计与评审涉及输入交互
- **THEN** 必须先以手写笔在该场景下的操作体验为判断依据
- **AND** 离屏/鼠标测试 MUST NOT 取代真机上笔的体验验证

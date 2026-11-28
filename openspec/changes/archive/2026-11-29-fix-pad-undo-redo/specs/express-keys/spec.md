## ADDED Requirements

### Requirement: 动作执行必须落到真实 API

每个可映射动作 SHALL 由当前 Excalidraw 版本真实提供的能力执行，不得依赖已移除的接口。

#### Scenario: 撤销与重做

- **WHEN** 任一入口触发 `undo` 或 `redo`（板载键、笔侧键、右浮岛、工具环、「更多」面板）
- **THEN** 应用 MUST 通过 Excalidraw 自身的键盘动作执行（向其 `.excalidraw` 容器派发 `Cmd/Ctrl+Z`、`Shift+Cmd/Ctrl+Z`）
- **AND** MUST NOT 调用 `api.history.undo()` / `api.history.redo()`（0.18 起 `history` 只剩 `clear`）
- **AND** MUST NOT 自建第二套历史栈
- **AND** 撤销 MUST 回退到上游历史的前一步，包括群组整体、绑定文字与选中态

#### Scenario: 动作结果

- **WHEN** 动作函数返回
- **THEN** 返回值 MUST 反映本次操作的实际意图，不得依赖 `setState` 后立即回读的状态
- **AND** 界面当前态 MAY 由后续状态轮询校准

## MODIFIED Requirements

### Requirement: 去抖与重复触发

应用 SHALL 对按键做去抖，避免一次按下触发多次。

#### Scenario: 单次按下

- **WHEN** 用户按下一个键并保持
- **THEN** 对应动作 MUST 只触发一次
- **AND** 重复报告 MUST 被过滤

#### Scenario: 固件连发

- **WHEN** 同一个板载键在 220ms 内被连续上报多帧
- **THEN** 应用 MUST 只执行第一次的动作
- **AND** 后续帧 MAY 继续点亮按键卡片，但 MUST NOT 重复执行撤销/重做

#### Scenario: 长按

- **WHEN** 用户按住一个板载键超过阈值（默认 350ms）
- **THEN** 如果该键对应的浮岛格是一个「组」
- **AND** 屏幕 MUST 在该格旁展开组内选项，供笔点选
- **AND** 不得在展开前先触发组内首选动作
- **WHEN** 该格是单一工具或单一动作
- **THEN** 长按 MUST 等同于单击，MUST NOT 连续重复触发

#### Scenario: 长按未生效

- **WHEN** 设备只在状态变化时上报按下、无法产生持续时间
- **THEN** 应用 MUST 退化为「单击即展开组」
- **AND** MUST 在诊断信息中标记该限制

#### Scenario: 快速连按

- **WHEN** 用户在 10–20ms 内收到多次按下
- **THEN** 应用 MUST 视为一次
- **AND** 不得触发两次撤销/重做

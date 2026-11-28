## MODIFIED Requirements

### Requirement: 统一动作执行

应用 SHALL 让右浮岛、左岛、两个工具环与板载键共用同一个动作执行路径。

#### Scenario: 同一 id 同语义

- **WHEN** 任一界面点中按钮 id `X`
- **THEN** MUST 调用同一个 `activate` 分支，产生与 id 对应的唯一动作
- **AND** 工具 id MUST 切换工具，面板 id MUST 打开对应浮层，动作 id MUST 执行对应命令
- **AND** 当前态 MUST 由统一状态读取函数给出，不允许各界面各自计算导致不一致

#### Scenario: 动作结果必须真实

- **WHEN** 任一动作执行完毕
- **THEN** 结果 MUST 在画布或工具状态上可观察，不得因调用已移除的接口而静默失败
- **AND** 撤销 / 重做 MUST 走 Excalidraw 自身的键盘动作（见 `express-keys`「动作执行必须落到真实 API」）
- **AND** 工具锁切换 MUST 返回本次操作意图（锁定 / 解锁），不得因 `setState` 未 flush 而恒返回同一值

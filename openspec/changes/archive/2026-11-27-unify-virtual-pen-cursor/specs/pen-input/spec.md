# pen-input · delta（unify-virtual-pen-cursor）

## MODIFIED Requirements

### Requirement: 统一虚拟笔输入

鼠标与手写板 SHALL 共用同一套虚拟笔事件与同一个笔尖指示器，不得维护两套独立绘制链路或两套光标。

#### Scenario: 手写板来源

- **WHEN** 手写板上报笔数据
- **THEN** 应用 MUST 将 HID 坐标归一化并映射进 `.ts-stage`
- **AND** MUST 产生 `hover / began / changed / ended` 笔事件
- **AND** 压力 MUST 使用真实压感

#### Scenario: 鼠标来源

- **WHEN** 鼠标在 `.ts-stage` 内移动或按下左键
- **THEN** 应用 MUST 将 `clientX/Y` 相对 `.ts-stage` 归一化
- **AND** MUST 产生与手写板相同格式的笔事件
- **AND** 压力 MUST 固定为 0.5

#### Scenario: 同一事件格式

- **WHEN** 任一来源产生笔事件
- **THEN** 事件格式 MUST 为 `{t:"pen", ph, x, y, p}`
- **AND** MUST 走同一个画布事件入口
- **AND** 鼠标路径 MUST NOT 调用 `CanvasMapping`

#### Scenario: 共用指示器

- **WHEN** 鼠标移动
- **THEN** 手写笔的圆环 / 十字指示器 MUST 跟随鼠标位置
- **AND** MUST NOT 为鼠标显示另一套专属光标
- **AND** 指示器形态 MUST 只由当前工具决定
- **WHEN** 手写板移动
- **THEN** 同一个指示器 MUST 跟随笔的映射位置
- **AND** 最后活动的来源 MUST 决定指示器位置

### Requirement: 鼠标不得被限制

鼠标 SHALL 保留系统鼠标的完整行为。

#### Scenario: 禁止的限制

- **WHEN** 使用鼠标输入
- **THEN** MUST NOT 使用 `requestPointerLock`
- **AND** MUST NOT 裁剪或归一化系统光标坐标
- **AND** MUST NOT 设置 `cursor: none`
- **AND** MUST NOT 替换系统光标
- **AND** MUST NOT 额外调用 `setPointerCapture`

#### Scenario: 自由移动

- **WHEN** 鼠标在窗口中移动
- **THEN** MUST 可在画布、按键带、浮岛、菜单之间自由移动
- **AND** MUST 可移出窗口、切到其他应用
- **AND** MUST NOT 被夹到画布边界或窗口边界

#### Scenario: 指示器

- **WHEN** 鼠标在应用内移动
- **THEN** 系统箭头 MUST 保留
- **AND** 共用的虚拟笔指示器 MUST 跟随鼠标热点
- **AND** 指示器 MUST `pointer-events: none`
- **WHEN** 鼠标移出应用
- **THEN** 指示器 MUST 隐藏
- **AND** 系统光标 MUST 保持正常
- **WHEN** 样式环打开
- **THEN** 指示器 MUST 保持显示，作为瞄准点
- **AND** 指示器 MUST NOT 拦截扇区点击

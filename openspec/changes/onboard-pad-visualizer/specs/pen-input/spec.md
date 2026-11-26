# pen-input delta

## ADDED Requirements

### Requirement: 板面示意图

系统 SHALL 在界面右下角提供一个可收起的板面示意图，包含按键带与手写区。

#### Scenario: 展开与收起
- **WHEN** 用户点击收起态芯片
- **THEN** 卡片展开为 360×246.5，上方 44pt 按键带，下方 360×202.5 手写区

#### Scenario: 手写区比例
- **WHEN** 卡片渲染
- **THEN** 手写区宽高比 SHALL 为 16:9，与 Digitizer 有效区一致

### Requirement: 笔位置可视化

系统 SHALL 把笔的归一化坐标映射进手写区矩形，且不越界。

#### Scenario: 笔移动到板子边缘
- **WHEN** 笔位于有效区最外侧
- **THEN** 笔点贴在手写区内框上，不进入按键带、不溢出卡片

### Requirement: 板载键反馈

系统 SHALL 在板载键按下的瞬间，于示意图对应位置显示按键状态。

#### Scenario: 按下板载键
- **WHEN** 收到 `aux` 事件且包含键索引
- **THEN** 对应位置亮起 22pt 主色圆与数字，180ms 后消失

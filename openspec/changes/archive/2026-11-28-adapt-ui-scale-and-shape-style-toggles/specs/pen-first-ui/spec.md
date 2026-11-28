## ADDED Requirements

### Requirement: 窗口缩放时界面整体等比放大

应用 SHALL 以启动时的窗口尺寸作为 100% 基准，窗口尺寸变化时按短边比例对整个界面进行等比缩放，且缩放比例限制在 0.8–2.0。

#### Scenario: 窗口放大
- WHEN 用户把应用窗口从启动尺寸放大
- THEN 按键带、手写区边距、浮岛、按钮、面板、读数板、设置窗口与样式环 SHALL 按同一比例放大
- AND 界面各元素的相对布局比例 SHALL 保持不变

#### Scenario: 手写板映射不受 UI 缩放影响
- WHEN UI 缩放比例发生变化
- THEN 笔尖归一化坐标到画布 rect 的映射公式 SHALL 保持不变
- AND 虚拟笔光标位置 SHALL 始终等于真实屏幕落点

### Requirement: 设置面板关闭按钮可点击

设置标题栏的关闭按钮 SHALL 在鼠标与手写笔下均可点击关闭，同时标题栏其余区域保持窗口拖动能力。

#### Scenario: 点击 X 关闭
- WHEN 用户用鼠标或笔点击设置面板右上角 X
- THEN 设置面板 SHALL 关闭

## MODIFIED Requirements

### Requirement: 图元样式类别按图元类型显示
左岛与笔键 1 样式环 SHALL 依据布局配置中逐图元的样式类别显隐设置与各自 surface 的槽位顺序共同决定显示哪些样式类别，未配置时回落到内置默认映射。

#### Scenario: 逐图元显隐
- WHEN 用户在设置中取消某图元的一个样式类别
- THEN 左岛与笔键 1 样式环在选中该图元时 SHALL 不再显示该类别
- AND 其它图元与其它样式类别 SHALL 不受影响

#### Scenario: 两处共用配置
- WHEN 修改某图元的样式类别显隐
- THEN 左岛与笔键 1 样式环 SHALL 同时生效，无需分别设置

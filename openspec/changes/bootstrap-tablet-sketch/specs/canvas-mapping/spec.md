# canvas-mapping 变更（bootstrap-tablet-sketch）

## ADDED Requirements

### Requirement: 默认 16:9 等比画布

TabletSketch SHALL 默认使用 16:9 画布，并把 Deco 640 的有效区等比映射到画布矩形。

#### Scenario: 默认比例

- **WHEN** 应用首次打开画布
- **THEN** 画布宽高比 MUST 为 16:9
- **AND** 平板 `160×90 mm` 有效区 MUST 映射到整个画布
- **AND** X/Y 必须使用同一缩放因子，不得各自拉满

#### Scenario: 窗口缩放

- **WHEN** 用户调整窗口大小或进入全屏
- **THEN** 画布 MUST 保持 16:9
- **AND** 已有笔迹坐标 MUST NOT 变形或漂移
- **AND** 映射 MUST 按当前画布矩形重新计算

#### Scenario: HiDPI

- **WHEN** 窗口位于 Retina 屏或缩放比例变化
- **THEN** 平板坐标 MUST 先归一化，再映射到逻辑画布坐标
- **AND** 不得直接使用物理像素导致偏移

### Requirement: 越界丢弃，不夹边

应用 SHALL 丢弃画布外的笔事件，不得把越界坐标夹到画布边缘。

#### Scenario: 笔移出画布

- **WHEN** 手写板坐标落在画布矩形外
- **THEN** 应用 MUST 结束/丢弃当前笔迹
- **AND** MUST NOT 在画布边缘产生拖尾或连续直线

#### Scenario: 从画布外进入

- **WHEN** 笔从画布外进入画布
- **THEN** 应用 MUST 在进入点开始新笔迹
- **AND** MUST NOT 把画布外路径连接进来

### Requirement: 全窗口映射与画布锁定

应用 SHALL 提供两种映射模式。

#### Scenario: 全窗口映射

- **WHEN** 用户使用默认「全窗口映射」
- **THEN** 笔 MUST 可以移动到顶部/左侧工具
- **AND** 只有画布矩形内的笔迹 MUST 被提交
- **AND** 画布外的笔事件 MUST 只用于 UI 命中，不产生笔迹

#### Scenario: 画布锁定

- **WHEN** 用户开启「画布锁定」
- **THEN** 笔 MUST 只映射到画布矩形
- **AND** 画布外事件 MUST 被丢弃
- **AND** 工具 MUST 通过径向菜单或板载键操作
- **AND** 窗口失焦时 MUST 自动解除锁定

#### Scenario: 切换模式

- **WHEN** 用户从全窗口映射切到画布锁定
- **THEN** 当前笔迹 MUST 结束
- **AND** 不得把切换前的坐标带入新模式
- **AND** 界面 MUST 显示锁定状态

### Requirement: 非 16:9 画布

应用 SHOULD 支持 4:3、1:1 等画布比例，并按最大居中子矩形裁切平板有效区。

#### Scenario: 4:3 画布

- **WHEN** 目标比例为 4:3
- **THEN** 应用 MUST 取平板有效区中最大的居中 4:3 子矩形
- **AND** 子矩形外的事件 MUST 丢弃
- **AND** 画布 MUST 显示有效区边界

#### Scenario: 1:1 画布

- **WHEN** 目标比例为 1:1
- **THEN** 应用 MUST 取最大居中正方形
- **AND** 不得为了填满画布而拉伸 X/Y

### Requirement: 画布视觉边界

应用 SHALL 用可辨识的边界标出可画区域。

#### Scenario: 默认边界

- **WHEN** 画布显示
- **THEN** 画布周围 MUST 有深色留白或边框
- **AND** 可画区域与不可画区域 MUST 视觉可区分
- **AND** 边界不得遮挡画布内容

#### Scenario: 比例提示

- **WHEN** 用户切换比例
- **THEN** 顶部状态条 MUST 显示当前比例
- **AND** 画布尺寸变化后 MUST 保持内容居中

# app-settings 变更（bootstrap-tablet-sketch）

> 说明：本能力记录「必须可设置」、可定制范围，以及已定稿的设置窗口形态（独立小窗 660×700、左侧分组导航、右侧分节卡片）。

## Purpose

定义设置能力的入口与可定制范围、设置项的持久化方式，以及设置窗口的布局结构、控件形态、越界值和非法值的界面处理规则。

## Requirements

### Requirement: 必须存在设置能力

TabletSketch SHALL 提供设置能力，让用户无需手改配置文件即可改变手写板模式的界面与行为。

#### Scenario: 入口

- **WHEN** 用户需要修改设置
- **THEN** 菜单栏 MUST 提供「TabletSketch → 设置…」（⌘,）
- **AND** 顶部条 `⋯` MUST 提供「设置」
- **AND** 浮岛 `⋯` 二级面板 MUST 提供「键位」直达对应页
- **AND** 三处入口缺一不可

#### Scenario: 首次启动

- **WHEN** 用户首次启动
- **THEN** 不打开设置也必须可用（默认配置即完整可用）
- **AND** 设置入口 MUST 可见，不得只藏在文档或快捷键里

### Requirement: 可定制范围

设置 SHALL 覆盖以下项目；每项改动 MUST 即时生效，不要求重启。

#### Scenario: 五处布局

- **WHEN** 用户打开设置中的「布局」分组
- **THEN** MUST 提供左浮岛、右浮岛、笔键 1、笔键 2、板载键五个独立页面
- **AND** 每页 MUST 可改：显示哪些按钮、按钮顺序、每处容量与排布参数
- **AND** 右浮岛与板载键的顺序 MUST 各自独立保存，互不影响
- **AND** 同一按钮 id 的动作语义 MUST 全局统一，当前态显示 MUST 同步
- **AND** 改动 MUST 广播布局事件，五处界面 MUST 即时重建，无需重启

#### Scenario: 样式完全开放

- **WHEN** 用户在笔键 1 或左浮岛页编辑样式
- **THEN** MUST 可改：显示哪些样式类别、类别顺序、每个类别的取值项
- **AND** 取值项 MUST 支持自定义颜色、自定义标签、增删与排序
- **AND** 自定义取值写入 MUST 通过既有 `setStyle` 桥接路径，作用语义与预设取值一致

#### Scenario: 排序方式

- **WHEN** 用户调整任意页面的按钮顺序
- **THEN** MUST 同时提供上移/下移按钮与拖拽排序两种方式
- **AND** 两种方式 MUST 写入同一份顺序数据，结果一致

### Requirement: 持久化

设置 SHALL 保存到本机，不跟随账号同步。

#### Scenario: 布局持久化

- **WHEN** 用户改动任意布局或配置档
- **THEN** 布局 MUST 写入 `tablet.layout.v2`，配置档 MUST 写入 `tablet.profiles.v1`
- **AND** 重启后 MUST 恢复，且旧 `tablet.settings.v1` 的格数/双排/更多方向 MUST 迁移到新布局后不再读取

#### Scenario: 配置档

- **WHEN** 用户需要多套配置
- **THEN** MUST 支持把五处布局与样式取值存成具名配置档
- **AND** MUST 支持切换、复制、重命名、删除、导出 JSON、导入 JSON
- **AND** 导入非法配置 MUST 校验后回落，不丢当前草图

### Requirement: 不得定制的部分

以下内容 SHALL 写死在代码里，不开放配置。

#### Scenario: 锁定项

- **WHEN** 用户在设置中查找
- **THEN** MUST NOT 提供以下开关：画布渲染内核、`.excalidraw` 序列化格式、元素类型集合、HID 只读边界、浮岛拖出窗口、全局热键注册

### Requirement: 窗口

设置窗口 SHALL 为独立的非模态小窗，可缩放并记住位置与尺寸。

#### Scenario: 尺寸与结构

- **WHEN** 设置窗口打开
- **THEN** 默认尺寸 MUST 为 660×700pt
- **AND** MUST 为可缩放小窗，最小 600×580pt
- **AND** 左侧 MUST 是固定宽 200pt 的分组导航栏，右侧 MUST 是可滚动的分节表单区
- **AND** 顶部 MUST 是系统标准标题栏，标题为「设置」
- **AND** 窗口位置与尺寸 MUST 被记住，下次打开恢复

#### Scenario: 非模态

- **WHEN** 设置窗口打开
- **THEN** 主窗口 MUST 仍可操作，MUST NOT 阻塞画布
- **AND** 打开设置时 MUST 先关闭画布上的所有浮层
- **AND** 改动 MUST 立即写回并即时生效，MUST NOT 有「应用 / 确定」按钮
- **AND** 主窗浮岛 MUST 实时反映改动，无需重开窗口

#### Scenario: 关闭

- **WHEN** 用户关闭设置窗口
- **THEN** 已改内容 MUST 已持久化
- **AND** MUST NOT 回滚到打开时的状态

### Requirement: 左侧分组导航

设置窗口 SHALL 提供左侧分组导航。

#### Scenario: 结构

- **WHEN** 导航栏渲染
- **THEN** MUST 采用「分组标题 + 组内项」两级结构，项 MUST 带图标
- **AND** 选中项 MUST 用系统强调色（蓝）填充高亮
- **AND** 分组标题 MUST 为灰色小字，不可点击
- **AND** 分组与项过多时导航栏 MUST 可滚动，且滚动条默认隐藏

#### Scenario: 初始分组

- **WHEN** 首次打开设置
- **THEN** 分组与项 MUST 为：

| 分组 | 项 |
|---|---|
| 应用 | 通用 |
| 绘图 | 浮岛 · 更多 · 气泡 · 径向 · 笔 · 画布 |
| 输入 | 键位 |
| 数据 | 数据与日志 |

- **AND** 默认选中「通用」

#### Scenario: 可扩展

- **WHEN** 后续新增设置页
- **THEN** 新项 MUST 追加到所属分组末尾，MUST NOT 打乱已有顺序
- **AND** 新分组 MUST 追加在「数据」之前，数据类分组永远排在最后
- **AND** 每项 MUST 有一枚 16×16pt 图标，缺失时用通用齿轮占位

### Requirement: 右侧分节表单

设置窗口 SHALL 使用右侧分节表单承载设置项。

#### Scenario: 分节组织

- **WHEN** 表单区渲染
- **THEN** 内容 MUST 按「分节」组织：每节为一个小标题（带图标）+ 一张圆角卡片
- **AND** 卡片 MUST 有浅灰背景与圆角，内部行之间用细分割线隔开
- **AND** 每一项 SHOULD 控制在 3–5 节，超出时在页内滚动而不是新增层级

#### Scenario: 行的形态

- **WHEN** 渲染一行设置
- **THEN** 行 MUST 为「左标签 + 右控件」两栏，行高 MUST 不小于 44pt
- **AND** 需要解释时，说明文字 MUST 以灰色小字放在标签下方，不另开弹窗
- **AND** 开关、下拉、步进器、按钮 MUST 右对齐，且可被笔单独点中
- **AND** 只读信息（如路径）MUST 右侧配一个「打开 / 显示」按钮

#### Scenario: 页脚说明

- **WHEN** 某页存在跨行的总体说明
- **THEN** MUST 以灰色小字放在卡片之外的页面底部
- **AND** MUST NOT 塞进卡片内部

### Requirement: 越界与非法值

设置控件 SHALL 在界面层阻止越界与非法值。

#### Scenario: 界面上就挡住

- **WHEN** 用户输入数字或拖动滑杆
- **THEN** 控件 MUST 自身限制在合法区间，不给用户输入非法值的机会
- **AND** 恢复默认 MUST 只恢复当前页的出厂值，不影响其他页

## 本次变更新增需求（refactor-configurable-layouts）

### Requirement: 布局编辑界面

设置面板 SHALL 为五处布局提供统一的可视化编辑界面。

#### Scenario: 页面结构

- **WHEN** 打开任一布局页
- **THEN** MUST 依次显示：形态预览、带上下移与移除的顺序列表、按类别分组的候选池、排布参数
- **AND** 形态预览 MUST 按该面真实几何展示按钮（网格 / 竖排 / 内外环 / 8 位按键带）
- **AND** 候选池 MUST 只列该面允许类别的项

#### Scenario: 恢复默认

- **WHEN** 用户点「恢复本页默认」
- **THEN** 当前页面 MUST 回落出厂值，其他页面 MUST NOT 受影响

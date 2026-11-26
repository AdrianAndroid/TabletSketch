# app-settings 变更（bootstrap-tablet-sketch）

> 说明：本能力记录「必须可设置」、可定制范围，以及已定稿的设置窗口形态（独立小窗 660×700、左侧分组导航、右侧分节卡片）。

## ADDED Requirements

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

#### Scenario: 浮岛

- **WHEN** 用户修改浮岛
- **THEN** MUST 可改：浮岛格数（0–18）、每格内容（工具 / 组 / 动作 / 展开型格子 / 空）、顺序、图标、标签
- **AND** MUST 可改：单排或双排的排布方式
- **AND** MUST 可改：`⋯` 二级面板的内容与顺序
- **AND** 改动 MUST 同步更新板载键 1–8 的映射（两者是同一份数据）

#### Scenario: 交互节奏

- **WHEN** 用户修改交互参数
- **THEN** MUST 可改：单击与长按的阈值、「更多」的展开方向、浮岛与画布重叠时的淡出透明度
- **AND** MUST 可改：浮岛默认位置、吸附距离

#### Scenario: 笔尖气泡

- **WHEN** 用户修改气泡
- **THEN** MUST 可改：气泡内三组项目（颜色 / 线宽 / 橡皮）各自显示哪些选项
- **AND** MUST 可改：气泡尺寸档位与偏移距离

#### Scenario: 径向菜单

- **WHEN** 用户修改径向菜单
- **THEN** MUST 可改：槽位数量（4–8，默认 4）
- **AND** MUST 可改：每个槽位绑定的动作，或置空
- **AND** MUST 可改：有选中与空白两套槽位表分别配置
- **AND** MUST 可改：是否启用「悬浮高亮即预览」
- **AND** 槽位数改动时 MUST 按默认顺序自动保留前 n 个已有槽，MUST NOT 清空用户已改过的槽

#### Scenario: 压感与画布

- **WHEN** 用户修改压感或画布
- **THEN** MUST 可改：压感曲线（至少 5 个可拖动控制点，且提供预设）
- **AND** MUST 可改：最小线宽、背景（纯白 / 点阵 / 网格 / 深色）、网格间距

#### Scenario: 配置档

- **WHEN** 用户需要多套配置
- **THEN** MUST 支持把「浮岛 + ⋯ + 气泡 + 压感 + 背景」存成一个具名配置档
- **AND** MUST 支持切换、复制、重命名、删除
- **AND** MUST 支持导入导出单个配置文件

### Requirement: 持久化

设置 SHALL 保存到本机，不跟随账号同步。

#### Scenario: 保存

- **WHEN** 用户改动任意设置项
- **THEN** MUST 原子写入 `~/Library/Application Support/TabletSketch/settings.json`
- **AND** 配置档 MUST 写入同目录 `profiles/`
- **AND** 重启后 MUST 恢复

#### Scenario: 损坏

- **WHEN** 设置文件损坏或含未知字段
- **THEN** 应用 MUST 回落到默认配置
- **AND** MUST 备份损坏文件
- **AND** MUST NOT 崩溃、MUST NOT 丢失草图数据

#### Scenario: 非法值

- **WHEN** 某项取值越界（如格高小于 40pt）
- **THEN** 应用 MUST 夹到合法区间并在界面上提示
- **AND** MUST NOT 静默写入非法值

### Requirement: 不得定制的部分

以下内容 SHALL 写死在代码里，不开放配置。

#### Scenario: 锁定项

- **WHEN** 用户在设置中查找
- **THEN** MUST NOT 提供以下开关：画布渲染内核、`.excalidraw` 序列化格式、元素类型集合、HID 只读边界、浮岛拖出窗口、全局热键注册

## 设置窗口形态

设置 SHALL 是一个独立的非模态小窗，左侧分组导航、右侧分节表单，不占据画布。

### Requirement: 窗口

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

#### Scenario: 界面上就挡住

- **WHEN** 用户输入数字或拖动滑杆
- **THEN** 控件 MUST 自身限制在合法区间，不给用户输入非法值的机会
- **AND** 恢复默认 MUST 只恢复当前页的出厂值，不影响其他页

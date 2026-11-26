# app-settings 变更（bootstrap-tablet-sketch）

> 说明：本能力记录「必须可设置」、可定制范围，以及已定稿的设置窗口形态（独立小窗 560×640、七页签）。

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

设置 SHALL 是一个独立的非模态小窗，不占据画布。

### Requirement: 窗口

#### Scenario: 尺寸与结构

- **WHEN** 设置窗口打开
- **THEN** 默认尺寸 MUST 为 560×640pt
- **AND** MUST 为可缩放小窗，最小 480×520pt
- **AND** 左侧 MUST 是固定宽 132pt 的竖向页签栏，右侧 MUST 是可滚动的表单区
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

### Requirement: 页签划分

设置 SHALL 分七个页签，顺序固定。

#### Scenario: 页签与内容

- **WHEN** 设置窗口渲染
- **THEN** 页签 MUST 依次为：

| 页签 | 内容 |
|---|---|
| 浮岛 | 格数 0–18、每格内容、格子顺序、单/双排、初始位置、恢复默认布局 |
| 更多 | `⋯` 内溢出工具的顺序、动作区是否显示 |
| 气泡 | 显示哪些项目、项目顺序 |
| 笔 | 压感曲线（gamma）、最小线宽、橡皮尺寸、倾斜开关（P1） |
| 画布 | 背景样式（纯白/点阵/网格/深色）、画布比例、默认画布 |
| 键位 | 8 个板载键 ↔ 浮岛前 8 格的对应、2 个笔侧键动作、单击/长按阈值、恢复默认 |
| 通用 | 鼠标/手写板模式、落笔淡出开关、减少动态、数据目录入口 |

- **AND** 每个页签 MUST 只有一列表单，不出现左右分栏
- **AND** 恢复默认类按钮 MUST 二次确认

#### Scenario: 键位页的绑定规则

- **WHEN** 用户在「键位」页调整
- **THEN** 板载键 MUST 只能绑定浮岛前 8 格，MUST NOT 自由指向任意格
- **AND** 在浮岛页拖动格子换位后，键位页 MUST 同步显示新对应关系

### Requirement: 越界与非法值

#### Scenario: 界面上就挡住

- **WHEN** 用户输入数字或拖动滑杆
- **THEN** 控件 MUST 自身限制在合法区间，不给用户输入非法值的机会
- **AND** 恢复默认 MUST 恢复为该页签的出厂值，不影响其他页签

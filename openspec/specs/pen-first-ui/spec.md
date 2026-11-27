# pen-first-ui · 稳定规格

> 合并自 `bootstrap-tablet-sketch`（窗口即板面、浮岛、径向菜单）与 `pen-telemetry-panel`（压感/倾斜读数板）。

## Purpose

定义窗口即板面的整体版式、右侧浮岛与更多面板、笔尖样式气泡、两级样式环等自绘界面的布局、交互与动画行为。

## Requirements

### Requirement: 窗口即板面

TabletSketch SHALL 在手写板模式下把窗口做成「一块板子」，而不是在画布上叠一层桌面软件 chrome。

#### Scenario: 窗口形态

- **WHEN** 进入手写板模式
- **THEN** 窗口 MUST 为无标题栏单窗口
- **AND** 窗口宽高比 MUST 锁定为 Deco 640 有效区比例（160:90，约 1.778:1）
- **AND** 窗口 MUST 可缩放，但比例 MUST 不变
- **AND** 窗口内 MUST 只存在三类 UI：顶部拖动条、右侧浮岛、笔尖样式气泡
- **AND** 其余区域 MUST 全部交给画布

#### Scenario: 禁止出现的布局

- **WHEN** 手写板模式已激活
- **THEN** MUST NOT 出现左侧工具轨
- **AND** MUST NOT 出现右侧常驻属性抽屉
- **AND** MUST NOT 出现底部固定工具条
- **AND** MUST NOT 出现汉堡菜单、缩放条、右下帮助按钮等原生 Excalidraw chrome

#### Scenario: 首次启动

- **WHEN** 用户首次启动应用
- **THEN** 窗口 MUST 直接可用，不要求先打开设置
- **AND** 菜单栏 MUST 提供「打开 TabletSketch」入口

### Requirement: 顶部拖动条

应用 SHALL 用一条极薄的顶部条承担窗口拖动与基本信息。

#### Scenario: 拖动窗口

- **WHEN** 用户在顶部条上按下并拖动
- **THEN** 窗口 MUST 跟随移动
- **AND** 该按下 MUST NOT 产生笔迹、MUST NOT 改变选中状态

#### Scenario: 内容

- **WHEN** 顶部条渲染
- **THEN** 高度 MUST 不超过 28pt（推荐 24pt）
- **AND** MUST 显示画布名、当前工具与手写板连接状态
- **AND** MUST 提供 `⋯` 菜单，至少含：设置、导出、新建/打开、样式环
- **AND** MUST NOT 出现「鼠标模式 / 手写板模式」切换

### Requirement: 右侧浮岛

应用 SHALL 提供一条单列浮岛竖栏，作为手写板模式下唯一的常驻工具入口。

#### Scenario: 结构

- **WHEN** 浮岛渲染
- **THEN** 浮岛 MUST 由「拖动把手 + 若干内容格 + 末尾 `⋯`」组成
- **AND** 内容格数量 MUST 可配置，范围 0–18 格
- **AND** 排布 MUST 支持单排与双排，但 MUST NOT 超过双排
- **AND** 把手 MUST 横跨整行，双击 MUST 复位位置
- **AND** 「更多」MUST 固定在最后一位
- **AND** 每格 MUST 不小于 40×40pt（44pt 为首选值）
- **AND** 当前生效的工具或组 MUST 有明确选中态

#### Scenario: 排列顺序

- **WHEN** 双排渲染
- **THEN** 内容 MUST 优先填充左列自上而下，再填右列自上而下
- **AND** 用户 MUST 能拖动格子改变顺序
- **AND** 改变顺序 MUST 同时改变板载键绑定（见 `express-keys`）

#### Scenario: 容量与自适应

- **WHEN** 格数 ≤ 10
- **THEN** 浮岛 SHOULD 自动使用单排
- **WHEN** 格数 > 10
- **THEN** 浮岛 SHOULD 自动切换为双排
- **AND** 格数变化 MUST 只改变浮岛自身高度，MUST NOT 改变窗口尺寸或画布坐标
- **AND** 超出可容纳数量的格子 MUST 落到 `⋯`，由自动溢出池处理

#### Scenario: 拖动

- **WHEN** 用户按住把手拖动
- **THEN** 浮岛 MUST 跟随移动到窗口内任意位置
- **AND** 按在工具格上 MUST 视为选择工具，不得触发位移
- **AND** 拖动期间 MUST 暂停画布输入，不得边拖边画
- **AND** 浮岛 MUST NOT 被拖出窗口边界

#### Scenario: 吸附

- **WHEN** 用户松手
- **THEN** 距窗口任一边 24pt 以内 MUST 吸附到该边
- **AND** 若落在手写区中心区域，MUST 自动吸附到最近的边
- **AND** 吸附后位置 MUST 写入本机配置，重启后恢复
- **AND** 双击把手 MUST 复位到「右侧、垂直居中」

### Requirement: 更多与自动溢出

应用 SHALL 用「更多」承载放不进浮岛格子的工具和常驻动作，且内容由系统自动计算。

#### Scenario: 自动溢出池

- **WHEN** 浮岛格子数量或内容发生变化
- **THEN** `⋯` 中的工具列表 MUST 自动等于「全部可用工具 − 已放入格子的工具」
- **AND** 被退出格子的工具 MUST 自动出现在 `⋯`
- **AND** 被放回格子的工具 MUST 自动从 `⋯` 消失
- **AND** MUST NOT 出现「工具既不在格子也不在 `⋯`」或「两处重复」的状态

#### Scenario: 动作区

- **WHEN** `⋯` 渲染
- **THEN** `⋯` MUST 常驻一段动作区：撤销、重做、适应窗口、100%
- **AND** 动作区 MUST NOT 参与自动溢出重算
- **AND** 工具区与动作区 MUST 在同一面板内用分隔线区分

#### Scenario: 顺序

- **WHEN** 溢出工具列表生成
- **THEN** 默认 MUST 按工具全集顺序排列
- **AND** 若用户手工调整过 `⋯` 内顺序，该顺序 MUST 被记住且不被重算覆盖

#### Scenario: 展开与关闭

- **WHEN** 用户点开「更多」
- **THEN** MUST 展开二级面板，优先向窗口内侧展开，空间不足时翻转
- **AND** 层级 MUST 最多两级，不得再开第三级
- **AND** 展开期间 MUST 暂停画布输入
- **AND** 点中面板外 MUST 关闭面板且 MUST NOT 产生笔迹

#### Scenario: 选择

- **WHEN** 用户点中二级面板中的一项
- **THEN** 对应动作 MUST 执行，面板 MUST 关闭
- **AND** 不要求笔回到浮岛

### Requirement: 菜单格

应用 SHALL 把一个浮岛格做成应用菜单，单击展开下拉。

#### Scenario: 内容

- **WHEN** 用户点开菜单格
- **THEN** 面板 MUST 为三列，分别承载：
  - 文件：打开、保存、另存为副本、导出 PNG、导出 SVG、复制图片、复制 JSON
  - 画布：切换画布、新建画布、背景、清空画布
  - 系统：重新连接、诊断、设置、键位、退出
- **AND** 面板 MUST NOT 再嵌套第三层
- **AND** 尺寸 SHOULD 约为 520×320pt

#### Scenario: 背景项

- **WHEN** 用户点「背景」
- **THEN** MUST 直接给出 4 个色块（纯白 / 点阵 / 网格 / 深色）横排
- **AND** 点击色块 MUST 立即生效，MUST NOT 再开二级

#### Scenario: 危险项

- **WHEN** 用户点「清空画布」
- **THEN** MUST 弹出一个模态确认框，含「取消 / 清空」两个按钮
- **AND** 两个按钮 MUST 不小于 44×44pt，可被笔单独点中
- **AND** 默认焦点 MUST 在「取消」上
- **AND** 点框外或按 Esc MUST 等同取消，且 MUST NOT 产生笔迹
- **AND** 清空 MUST 作为一次可撤销操作进入撤销栈

### Requirement: 画布下拉

应用 SHALL 提供一个可切换多画布的下拉。

#### Scenario: 打开

- **WHEN** 用户单击浮岛中的「画布」格
- **THEN** MUST 展开画布列表
- **AND** 顶部条的画布名 MUST 也能打开同一个列表

#### Scenario: 列表项

- **WHEN** 列表渲染
- **THEN** 每项 MUST 显示名称、元素数、修改时间
- **AND** 当前画布 MUST 有勾选态
- **AND** 列表底部 MUST 有「+ 新建画布」

#### Scenario: 长按加速

- **WHEN** 用户长按「画布」格
- **THEN** MUST 直接新建画布，跳过列表

### Requirement: 素材面板

应用 SHALL 提供一个两态的素材面板，替代原来的「精选素材」按钮。

#### Scenario: 两个状态

- **WHEN** 用户单击「素材」格
- **THEN** 面板 MUST 先列出素材分组
- **WHEN** 用户点中某个分组
- **THEN** 同一面板 MUST 原地切换为该组的缩略图网格
- **AND** MUST 提供返回、搜索、分页
- **AND** MUST NOT 再弹出第三个浮层

#### Scenario: 插入

- **WHEN** 用户点中一个缩略图
- **THEN** 素材 MUST 插入到视口中心并自动选中
- **AND** 面板 MUST 保持打开，允许连续插入

#### Scenario: 尺寸与位置

- **WHEN** 面板展开
- **THEN** 尺寸 SHOULD 约为 320×380pt
- **AND** MUST 贴浮岛内侧展开，不得遮挡浮岛格子
- **AND** 长按「素材」格 MUST 直接打开上次用过的分组

### Requirement: 同时只开一个浮层

应用 SHALL 保证任意时刻最多只有一个展开型浮层。

#### Scenario: 互斥

- **WHEN** 已经打开了菜单、画布、素材、更多、笔尖气泡中的任意一个
- **THEN** 打开其余任意一个 MUST 自动关闭先前那个
- **AND** 屏幕 MUST NOT 出现两个及以上展开型面板叠加
- **AND** 模态确认框（清空画布等）不算浮层，它压在所有浮层之上，打开时先关闭全部浮层
- **AND** 打开期间 MUST 暂停画布输入；点画布空白 MUST 关闭且不落笔

### Requirement: 笔尖样式气泡

应用 SHALL 用笔侧键 2 在笔尖位置呼出样式气泡，替代被隐藏的原生属性面板。

#### Scenario: 呼出

- **WHEN** 用户按下映射为「样式气泡」的笔侧键
- **THEN** 气泡 MUST 在笔尖位置弹出，不得常驻
- **AND** 气泡 MUST 为 320×140pt（固定尺寸，内容随工具变化，不翻页不滚动）
- **AND** 气泡 MUST 相对笔尖偏移 24pt，越界时 MUST 翻转方向
- **AND** 打开期间 MUST 暂停笔迹

#### Scenario: 内容跟随当前工具

- **WHEN** 气泡展开
- **THEN** 显示的内容 MUST 由「当前选中元素类型」决定；无选中时由「当前工具」决定
- **AND** MUST 恒为 3 行，每行一个样式维度：

| 上下文 | 第 1 行 | 第 2 行 | 第 3 行 |
|---|---|---|---|
| 笔 / 橡皮 | 颜色 | 线宽 | 透明度 |
| 矩形 / 椭圆 / 菱形 | 描边色 | 填充色 | 线宽 |
| 箭头 / 线 | 描边色 | 线宽 | 线型 |
| 文字 | 文字色 | 字号 | 对齐 |
| 选中多个不同类型 | 描边色 | 填充色 | 线宽 |
| 图片 | 不弹出 | — | — |

- **AND** 切换工具或选中对象后，气泡内容 MUST 立即换成对应的一行三项
- **AND** 气泡 MUST NOT 提供"翻页 / 更多"入口，也 MUST NOT 出现第 4 行

#### Scenario: 控件形态

- **WHEN** 渲染某一行
- **THEN** 左侧 MUST 是 40pt 宽的文字标签，右侧 MUST 是等宽档位按钮
- **AND** 颜色行 MUST 为 6 个 28pt 圆形色块横排：黑 `#1e1e1e`、红 `#e03131`、绿 `#2f9e44`、蓝 `#1971c2`、橙 `#f08c00`、灰 `#868e96`
- **AND** 填充行 MUST 在 6 色块前多一个「无填充」斜线块
- **AND** 线宽 MUST 为 4 档：细 1pt / 中 2pt / 粗 4pt / 特粗 8pt
- **AND** 透明度 MUST 为 4 档：100 / 75 / 50 / 25
- **AND** 线型 MUST 为 3 档：实线 / 虚线 / 点线
- **AND** 边角 MUST 为 3 档：直角 / 圆角 / 大圆角
- **AND** 字号 MUST 为 4 档：S 16 / M 20 / L 28 / XL 36
- **AND** 对齐 MUST 为 3 档：左 / 中 / 右
- **AND** MUST NOT 使用滑杆作为主要交互；所有档位按钮 MUST 不小于 28×28pt

#### Scenario: 作用语义

- **WHEN** 当前已选中元素
- **THEN** 气泡内的改动 MUST 应用到所有选中元素
- **AND** 当前没有选中元素时，改动 MUST 写入下一笔的默认样式
- **AND** 关闭气泡 MUST NOT 切换当前工具
- **AND** 每次改档 MUST 作为一次可撤销操作进入撤销栈

#### Scenario: 取消

- **WHEN** 用户松开侧键，或点到气泡外
- **THEN** 气泡 MUST 关闭且不得产生笔迹

### Requirement: 落笔淡出

应用 SHALL 在落笔时压低常驻 chrome，避免遮挡书写。

#### Scenario: 落笔

- **WHEN** `Tip=1` 开始笔迹
- **THEN** 浮岛与顶部条 MUST 降到不高于 20% 不透明度
- **AND** MUST 同时禁用它们的指针事件
- **AND** 画布坐标 MUST 不因淡出而改变
- **AND** MUST NOT 触发窗口布局重排

#### Scenario: 恢复

- **WHEN** 笔抬起 400ms 后，或笔移动到浮岛/顶部条上方
- **THEN** chrome MUST 恢复显示
- **AND** 用户 MUST 能立即点工具

### Requirement: 大号可点区域

应用 SHALL 为笔尖提供足够大的命中区域。

#### Scenario: 网格尺寸

- **WHEN** 浮岛或二级面板渲染
- **THEN** 主格 MUST 不小于 44×44pt
- **AND** 窗口高度受限时允许降到 40×40pt，但 MUST NOT 更小
- **AND** 所有格 MUST 有额外 hit slop，允许 2–4pt 误差

#### Scenario: 滑杆与控件

- **WHEN** 用户调整线宽/透明度
- **THEN** 滑杆轨道 MUST 至少 6pt 高
- **AND** 滑块 MUST 至少 28pt
- **AND** MUST NOT 以 1px 细线或微小下拉作为主要交互

### Requirement: 左手使用

应用 SHALL 让惯用手差异不需要单独的模式开关。

#### Scenario: 左手

- **WHEN** 用户把浮岛拖到窗口左侧
- **THEN** 布局 MUST 视为左手布局，无需额外开关
- **AND** 笔尖样式气泡 MUST 向反方向展开
- **AND** 画布坐标 MUST 不变

### Requirement: 延后到 P1

以下能力首个可运行版本 SHALL NOT 实现，但 MUST 在后续变更中单独定义。

#### Scenario: 倾斜笔锋

- **WHEN** 首版交付
- **THEN** 倾斜控制笔锋 MUST 不启用

### Requirement: 无障碍与动效

应用 SHOULD 尊重系统减少动态效果设置。开启减少动态时 SHALL 保留全部功能。

#### Scenario: 减少动态

- **WHEN** 系统开启「减少动态效果」
- **THEN** 浮岛淡出、气泡展开、二级面板动画 MUST 降级为无动画或短动画
- **AND** 功能不得受影响

### Requirement: 压感 / 倾斜读数板

界面 SHALL 在右上角、按键带之下提供一个调试读数板。

> 位置约束：`top: 72px`。按键带高 64pt，任何高于此的浮层都会挡住 8 号键。

#### Scenario: 笔在感应区内

- **WHEN** 收到任意 `pen` 事件
- **THEN** MUST 显示原始压力 `0..16383`、归一值、整形后的出墨值、力度档位
- **AND** MUST 显示倾斜 X / Y 与合成笔杆倾角
- **AND** 进度条 MUST 使用感知映射 `sqrt(p)`，不得用线性映射

> 感知映射的原因：本板压力响应前重后轻，正常书写的 4000–6000 只占满量程 25–37%，线性条看着像没反应。

#### Scenario: 笔离开

- **WHEN** 收到 `ph = "leave"`
- **THEN** 读数板 MUST 置灰、数值显示为 `—`
- **AND** MUST NOT 用旧读数冒充实时值

#### Scenario: 收起与重开

- **WHEN** 用户点击关闭
- **THEN** 面板收起，右上角 MUST 保留「压感」胶囊，点击可重新展开（R0）

#### Scenario: 与浮岛不重叠

- **WHEN** 读数板展开
- **THEN** 其下边缘 MUST 不与右侧浮岛顶部重叠

### Requirement: 鼠标样式环入口

应用 SHALL 为鼠标提供样式环入口，且不得改变手写板侧键 1 的原有用入口。

#### Scenario: 入口

- **WHEN** 用户使用鼠标
- **THEN** 右键 MUST 打开样式环
- **AND** 按 `\` MUST 打开样式环
- **AND** 浮岛「更多」MUST 提供「样式环」
- **AND** 菜单栏「视图」MUST 提供「样式环」
- **AND** 手写板侧键 1 MUST 保持原有行为

#### Scenario: 位置与范围

- **WHEN** 样式环打开
- **THEN** 鼠标入口的圆心 MUST 取最后一次鼠标位置
- **AND** 手写板入口的圆心 MUST 取笔尖位置
- **AND** 没有鼠标位置记录时 MUST 使用窗口中心
- **AND** 只对环做窗口内 clamp，MUST NOT 对鼠标做 clamp
- **AND** 鼠标 MUST 可自由移动到任意扇区

#### Scenario: 打开状态

- **WHEN** 样式环已打开
- **THEN** 右键 / `\` / 手写板侧键 1 MUST NOT 重复打开或关闭
- **AND** 无选中时 MUST 提示「先选中图形」，不打开

### Requirement: 连接状态

应用 SHALL 显示手写板连接状态，但不引入鼠标/手写板模式切换。

#### Scenario: 状态显示

- **WHEN** 手写板已连接
- **THEN** 顶部条 MUST 显示「手写板已连接」
- **WHEN** 没有手写板
- **THEN** 顶部条 MUST 显示「未检测到手写板」
- **WHEN** 缺少输入监控权限
- **THEN** 顶部条 MUST 显示「缺少输入监控权限」

#### Scenario: 不提供模式切换

- **WHEN** 用户打开视图菜单
- **THEN** MUST NOT 出现「鼠标模式 / 手写板模式」切换
- **AND** 鼠标输入 MUST 在任何时候都可用

### Requirement: 样式环（笔侧键 1）

应用 SHALL 用笔侧键 1 在笔光标位置弹出两级样式环，而不是动作菜单。环最多两层同心圆环，每层扇区数 1–10。

#### Scenario: 弹出条件

- **WHEN** 用户按下映射为「样式环」的笔侧键
- **THEN** 若存在选中图元，菜单 MUST 以笔光标当前位置为圆心弹出
- **AND** 若无选中图元，MUST NOT 弹出，MUST 显示「先选中图形」提示
- **AND** 若笔尖处于接触状态（tip down），MUST 忽略本次按键
- **AND** 弹出 MUST NOT 改变当前选中集、MUST NOT 移动画布视口

#### Scenario: 槽位数量与「更多样式」

- **WHEN** 当前层项目数 ≤ 10
- **THEN** 有几项就显示几个扇区，从 12 点起顺时针等分
- **WHEN** 当前层项目数 > 10
- **THEN** 前 9 项 MUST 占内环扇区，第 10 槽 MUST 为「更多样式」
- **AND** 点「更多样式」MUST 在内环外侧展开外环，MUST NOT 翻页
- **AND** 外环展开时内环 MUST 降为半透明且不可点，只有中心「返回」可点
- **AND** 外环 MUST 显示剩余项目，最多 10 个
- **AND** 点中外环项目 MUST 收起外环并进入对应二级取值
- **AND** 最多两层环，合计最多 19 项；超过 19 项时 MUST 落到浮岛「更多」面板并记录警告
- **AND** 当前图元类型最多 9 个类别，外环不会在真实数据下自然触发；实现 MUST 用 mock 数据覆盖并验证

#### Scenario: 一级类别

- **WHEN** 一级环渲染
- **THEN** 类别 MUST 由当前选中元素的类型决定，不得固定为动作项
- **AND** 矩形 / 菱形 / 椭圆 MUST 提供：描边、背景、描边宽度、边框样式、线条风格、边角、透明度
- **AND** 直线 MUST 提供：描边、背景、描边宽度、边框样式、线条风格、起点箭头、终点箭头、透明度
- **AND** 直线 MUST NOT 提供 Arrow type
- **AND** 箭头 MUST 提供：描边、背景、描边宽度、边框样式、线条风格、Arrow type、起点箭头、终点箭头、透明度
- **AND** 自由笔 MUST 提供：描边、背景、描边宽度、透明度
- **AND** 文字 MUST 提供：描边、字体、字体大小、文本对齐、透明度
- **AND** 画框 MUST 只提供透明度
- **AND** 嵌入网页 MUST 提供与基础图形相同的类别，前提是该属性可写
- **AND** 图片 MUST NOT 进入样式环
- **AND** 混合选中 MUST 取各类型可用类别的交集
- **AND** 当前层只有 1 项时 MUST 跳过一级，直接打开取值环，中心为「取消」
- **AND** 交集只有 2 项时 MUST 渲染为上下半环
- **AND** 直线不支持箭头时 MUST 隐藏起点 / 终点箭头
- **AND** 自由笔没有背景属性时 MUST 隐藏背景
- **AND** 画框 / 嵌入的样式实测无可见效果时 MUST 隐藏对应类别，不得显示假控件

#### Scenario: 二级取值

- **WHEN** 用户点中一个一级类别
- **THEN** 菜单 MUST 在同一圆心切换到该类别下的取值环
- **AND** 当前生效值 MUST 有高亮态
- **AND** 笔悬停到某取值上时 MUST 提前高亮该扇区
- **AND** 悬停提示 MUST 显示「名称 + 当前值」
- **AND** 点中取值 MUST 立即应用并关闭菜单

#### Scenario: 当前值与非预设值

- **WHEN** 当前值精确等于某个预设项
- **THEN** 该项 MUST 高亮
- **WHEN** 当前值不在预设项中（例如自定义颜色、非预设字号、73% 透明度）
- **THEN** MUST NOT 高亮任何预设项
- **AND** 悬停提示 MUST 显示真实当前值
- **AND** 点选预设项后 MUST 写入该预设的精确值

#### Scenario: 颜色与字号取值

- **WHEN** 二级环显示描边或背景颜色
- **THEN** MUST 使用 6 个固定预设色
- **AND** 背景 MUST 额外提供「无填充」，共 7 项
- **AND** MUST NOT 提供自定义取色器或任意十六进制输入
- **WHEN** 二级环显示字号
- **THEN** MUST 只提供 S / M / L / XL
- **AND** MUST NOT 提供自定义字号输入

#### Scenario: 透明度与端点取值

- **WHEN** 二级环显示透明度
- **THEN** MUST 提供 8 档：100 / 90 / 80 / 70 / 50 / 30 / 20 / 10
- **AND** MUST NOT 提供 0
- **WHEN** 二级环显示起点或终点箭头
- **THEN** MUST 提供实际可写枚举：无 / 箭头 / 三角 / 竖线 / 圆点
- **AND** 起点与终点 MUST 分别设置

#### Scenario: 扇区显示与提示

- **WHEN** 当前层有 3–6 个项目
- **THEN** 每个扇区 MUST 显示图标 + 不超过 2 个字的标签
- **WHEN** 当前层有 7–10 个项目
- **THEN** 每个扇区 MUST 只显示图标，完整名称由悬停提示承担
- **AND** 悬停提示 MUST 位于最外层环之外，靠近悬停扇区的角平分线
- **AND** 悬停提示 MUST NOT 拦截笔点击或鼠标点击
- **AND** 贴窗口边缘时提示 MUST 翻转方向，不得裁切
- **AND** 笔离开扇区或环关闭时提示 MUST 立即隐藏

#### Scenario: 返回与关闭

- **WHEN** 用户点中二级环中心
- **THEN** 菜单 MUST 返回一级，MUST NOT 应用任何样式
- **WHEN** 用户点中一级环中心或空白处
- **THEN** 菜单 MUST 关闭，MUST NOT 应用任何样式
- **WHEN** 外环已展开且用户点中外环中心
- **THEN** 菜单 MUST 只收起外环，MUST NOT 关闭内环
- **WHEN** 用户按下 Esc、窗口失焦、窗口缩放或 HID 断开
- **THEN** 菜单 MUST 关闭
- **WHEN** 菜单已打开且用户按下侧键 1 或侧键 2
- **THEN** 菜单 MUST NOT 关闭、MUST NOT 执行动作

#### Scenario: 作用范围

- **WHEN** 用户在二级环点中一个取值
- **THEN** 改动 MUST 应用到所有当前选中元素
- **AND** MUST 同时更新下一笔的默认样式
- **AND** 每次改档 MUST 作为一次可撤销操作进入撤销栈，不合并多次点选
- **AND** 写入失败时菜单 MUST 保留，并显示失败提示

#### Scenario: 特殊元素

- **WHEN** 选中元素全部锁定
- **THEN** MUST NOT 打开样式环，MUST 提示「元素已锁定」
- **WHEN** 选中元素部分锁定
- **THEN** MUST 只修改未锁定元素
- **WHEN** 选中分组
- **THEN** MUST 修改整组
- **WHEN** 形状带有绑定文字
- **THEN** 改形状颜色或透明度 MUST NOT 自动修改绑定文字
- **WHEN** 混合选中包含图片
- **THEN** MUST 先过滤图片，对剩余元素取交集；全部被过滤时 MUST 提示无可改元素

#### Scenario: 层级与空隙

- **WHEN** 样式环打开
- **THEN** 遮罩 MUST 在菜单之下，内环与外环的扇区 MUST 可被笔尖或鼠标点中
- **AND** 遮罩只负责「点空白关闭」，MUST NOT 拦截扇区点击
- **AND** 内外环之间的空隙 MUST 由透明命中盘承接，点击空隙 MUST NOT 关闭菜单

#### Scenario: 动画

- **WHEN** 一级环打开
- **THEN** 扇区 MUST 从 12 点起顺时针依次淡入，间隔 14ms，单槽 64ms，同时向外扩 4pt
- **AND** 中心 MUST 在 0ms 直接出现
- **AND** 总时长 MUST NOT 超过 200ms
- **WHEN** 一级切换到二级
- **THEN** MUST 使用 90ms 交叉淡入，不依次
- **WHEN** 外环展开
- **THEN** 内环 MUST 在 90ms 内降到 0.4，外环 MUST 从内向外依次淡入
- **WHEN** 关闭或应用样式
- **THEN** MUST 立即关闭，不做退场动画
- **AND** 命中测试 MUST 从第 0 帧开始，不等动画完成

#### Scenario: 减少动态

- **WHEN** 系统开启「减少动态效果」
- **THEN** MUST 取消依次显示，整环 60ms 淡入或直接出现
- **AND** 功能不得受影响

### Requirement: 更多面板编辑动作

「更多」面板 SHALL 承载从径向菜单迁出的编辑动作。

#### Scenario: 编辑动作区

- **WHEN** 「更多」展开
- **THEN** 动作区 MUST 额外包含：副本、删除、全选
- **AND** 这三项 MUST 在有选中图元时可用，无选中时 MUST 置灰
- **AND** MUST NOT 只依赖键盘快捷键
- **AND** MUST 提供「原生右键菜单」入口，承载图层与链接等未进入样式环的动作
- **AND** 原生右键菜单入口 MUST 在笔光标或鼠标位置合成一次 `contextmenu`

### Requirement: 样式名称定义

样式环使用的名称 SHALL 对应以下语义，不得同名异义。

- 边框样式：描边线型，实线 / 虚线 / 点线
- 线条风格：手绘粗糙度，三档
- 背景：填充色，允许透明
- 边角：尖角 / 圆角
- 起点箭头 / 终点箭头：箭头起止样式
- Arrow type：直角 / 圆角 / 弧形

#### Scenario: 名称一致性

- **WHEN** 样式环或悬停提示显示上述名称
- **THEN** 其含义 MUST 与本节一致
- **AND** 图层与操作 MUST NOT 作为样式项出现在环中

### Requirement: 图元样式维度清单

应用 SHALL 按图元类型提供对应的样式维度；完整矩阵见本变更 `design.md` §3。

#### Scenario: 基础图形

- **WHEN** 选中矩形 / 菱形 / 椭圆
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、边角、透明度

#### Scenario: 直线与箭头

- **WHEN** 选中直线
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、起点箭头、终点箭头、透明度
- **AND** MUST NOT 出现 Arrow type
- **WHEN** 选中箭头
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、边框样式、线条风格、Arrow type、起点箭头、终点箭头、透明度
- **AND** 直线与箭头 MUST 按元素类型分别取类，不得按截图位置硬编码

#### Scenario: 自由笔与文字

- **WHEN** 选中自由笔
- **THEN** 可调维度 MUST 覆盖：描边、背景、描边宽度、透明度
- **WHEN** 选中文字
- **THEN** 可调维度 MUST 覆盖：描边、字体、字体大小、文本对齐、透明度

#### Scenario: 画框与嵌入

- **WHEN** 选中画框
- **THEN** 可调维度 MUST 覆盖：透明度
- **WHEN** 选中嵌入网页
- **THEN** 可调维度 MUST 先按实际可写范围确认
- **AND** 只有确认能写入且有可见效果的属性才 MUST 显示

### Requirement: 样式控件必须可写

样式环中出现的每个控件 SHALL 真实改变目标属性，不得是只改变界面状态的假按钮。

#### Scenario: 控件生效

- **WHEN** 用户点中一个取值
- **THEN** 选中元素或下一笔默认样式 MUST 实际改变
- **AND** MUST NOT 出现只更新菜单状态、不写入元素的控件

#### Scenario: 公开 API 无法写入

- **WHEN** 公开 API 无法写入某属性
- **THEN** 实现 MAY 修改 Excalidraw 源码补齐
- **AND** 源码改动 MUST 按 `Docs/fork-changes.md` 的 `TS-FORK` 规则登记
- **AND** 若仍无法实现，MUST NOT 在样式环中显示该控件

### Requirement: 浮岛交互可用性

浮岛 SHALL 在真实鼠标与笔下可拖动、可点击，且不被同层浮层遮挡。

#### Scenario: 拖动换边

- **WHEN** 用户按住浮岛顶部把手并向窗口另一侧拖动
- **THEN** 浮岛 MUST 吸附到该侧
- **AND** 双击把手 MUST 复位到右侧
- **AND** 把手的命中区域 MUST NOT 被读数板、面板或遮罩覆盖

#### Scenario: 格子点击

- **WHEN** 用户点击浮岛工具格
- **THEN** 画布当前工具 MUST 切换为该格声明的工具
- **AND** 「笔」「选」两格 MUST 与其余工具格一致生效
- **AND** 点击失败 MUST NOT 静默无反应

#### Scenario: 面板层级

- **WHEN** 浮岛面板或样式气泡打开
- **THEN** 面板 MUST 位于遮罩之上，面板内按钮 MUST 可点
- **AND** 浮岛 MUST 仍可点击，用于切换或关闭面板
- **AND** 遮罩 MUST 只响应「点空白关闭」

#### Scenario: 与读数板不重叠

- **WHEN** 读数板展开或收起为 chip
- **THEN** 读数板 MUST 位于浮岛对侧
- **AND** MUST NOT 覆盖浮岛的把手或任一工具格

### Requirement: 工具光标

光标指示器 SHALL 随当前工具切换形态，鼠标与手写板共用同一指示器，且不隐藏系统鼠标箭头。

#### Scenario: 绘制工具

- **WHEN** 当前工具为自由笔、矩形、菱形、椭圆、箭头、直线、文字或图片
- **THEN** 指示器 MUST 显示十字准星 `+`
- **AND** 鼠标与手写笔 MUST 显示同一个 `+`
- **AND** 落笔时 `+` MUST 加粗，不得改为实心圆

#### Scenario: 选择与平移

- **WHEN** 当前工具为选择或平移
- **THEN** 指示器 MUST 显示 14pt 空心环，落笔收成 8pt 实心
- **AND** 鼠标 MUST 显示同一个圆环，不得显示专属小圆点
- **AND** 系统箭头 MUST 始终保留

#### Scenario: 橡皮

- **WHEN** 当前工具为橡皮
- **THEN** 指示器 MUST 保持圆圈形态，用于表示擦除范围

#### Scenario: 落点一致

- **WHEN** 指示器显示 `+` 或圆环
- **THEN** 其中心 MUST 与虚拟笔落点一致
- **AND** MUST NOT 设置 `cursor: none`
- **AND** MUST NOT 替换系统光标

### Requirement: 浮岛工具选择持久化

工具 SHALL 在用户通过触控笔点击浮岛按钮后保持生效，且笔在画布上的操作 MUST NOT 额外改写工具。

#### Scenario: 笔点工具格

- **WHEN** 用户用触控笔点击浮岛中声明了工具的格子
- **THEN** 当前工具 MUST 切换为该格声明的工具
- **AND** 该工具 MUST 在点击结束后继续保持，MUST NOT 被本项目额外逻辑切回 `freedraw`

#### Scenario: 笔点画布

- **WHEN** 用户用触控笔在画布区域按下且落点不在任何 `[data-ts-ui]` 元素上
- **THEN** 当前工具 MUST 保持为按下前生效的工具
- **AND** 笔迹 MUST 按该工具的语义产生

#### Scenario: 与鼠标一致

- **WHEN** 用户分别用笔和鼠标在画布上使用同一个已选工具
- **THEN** 两者对当前工具的影响 MUST 一致
- **AND** 工具后续是否回到选择态 MUST 只由 Excalidraw 原生语义决定

#### Scenario: 启动默认工具

- **WHEN** 应用启动后用户已主动选择过工具
- **THEN** 启动阶段设置默认画笔的逻辑 MUST NOT 覆盖用户的选择

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

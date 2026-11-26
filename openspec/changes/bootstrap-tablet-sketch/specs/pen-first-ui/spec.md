# pen-first-ui 变更（bootstrap-tablet-sketch）

## ADDED Requirements

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
- **AND** MUST 显示画布名与保存状态
- **AND** MUST 提供 `⋯` 菜单，至少含：设置、导出、新建/打开、模式切换

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

应用 SHALL 用笔侧键在笔尖位置呼出样式气泡，替代常驻的属性面板。

#### Scenario: 呼出

- **WHEN** 用户按下映射为「样式气泡」的笔侧键
- **THEN** 气泡 MUST 在笔尖位置弹出，不得常驻
- **AND** 气泡 MUST 不大于 320×140pt
- **AND** 气泡 MUST 相对笔尖偏移 24pt，越界时 MUST 翻转方向
- **AND** 打开期间 MUST 暂停笔迹

#### Scenario: 作用语义

- **WHEN** 当前已选中元素
- **THEN** 气泡内的改动 MUST 应用到这个选中元素
- **AND** 当前没有选中元素时，改动 MUST 写入下一笔的默认样式
- **AND** 关闭气泡 MUST NOT 切换当前工具

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

### Requirement: 模式切换入口

应用 SHALL 提供可见的模式切换入口。

#### Scenario: 菜单入口

- **WHEN** 用户打开应用菜单
- **THEN** MUST 能看到「鼠标模式 / 手写板模式」
- **AND** 当前模式 MUST 有勾选态

#### Scenario: 窗口内入口

- **WHEN** 用户在手写板模式
- **THEN** 顶部条 `⋯` MUST 提供模式切换
- **AND** MUST NOT 要求用户记快捷键

#### Scenario: 鼠标模式

- **WHEN** 用户切回鼠标模式
- **THEN** 布局 MUST 恢复原鼠标草图样式
- **AND** 手写板模式的浮岛、顶部条、气泡 MUST NOT 残留

### Requirement: 延后到 P1

以下能力首个可运行版本 SHALL NOT 实现，但 MUST 在后续变更中单独定义。

#### Scenario: 径向菜单

- **WHEN** 首版交付
- **THEN** 径向菜单 MUST 不出现
- **AND** 笔侧键 MUST 改接单一动作（样式气泡或橡皮切换）

#### Scenario: 倾斜笔锋

- **WHEN** 首版交付
- **THEN** 倾斜控制笔锋 MUST 不启用

### Requirement: 无障碍与动效

应用 SHOULD 尊重系统减少动态效果设置。

#### Scenario: 减少动态

- **WHEN** 系统开启「减少动态效果」
- **THEN** 浮岛淡出、气泡展开、二级面板动画 MUST 降级为无动画或短动画
- **AND** 功能不得受影响

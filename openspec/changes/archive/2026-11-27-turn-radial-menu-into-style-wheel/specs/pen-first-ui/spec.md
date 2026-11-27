# pen-first-ui · delta（turn-radial-menu-into-style-wheel）

## REMOVED Requirements

### Requirement: 径向菜单（笔侧键 1）

侧键 1 由动作径向菜单改为两级样式环，旧槽位与动作定义不再适用。迁移：副本 / 删除 / 全选移到浮岛「更多」；样式调整走样式环。

## ADDED Requirements

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

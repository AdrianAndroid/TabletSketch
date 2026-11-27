# tasks · turn-radial-menu-into-style-wheel

## 文档与确认

- [x] 记录 9 类图元的样式矩阵（`design.md` §3）
- [x] 记录两级 / 双环交互定稿（`design.md` §2）
- [x] 确认扇区上限 10，第 10 槽为「更多样式」
- [x] 确认直线与箭头分开，端点拆成起点 / 终点
- [x] 确认颜色只做 6 个固定预设，不做设置面板
- [x] 确认字号只做 S / M / L / XL
- [x] 确认透明度 8 档，去掉 0
- [x] 确认单类别类型跳过一级
- [x] 确认外环实现，并用 mock 数据验证
- [x] 确认一次交付，不分阶段
- [x] 确认调色板先固定 6 色，不做设置与持久化
- [x] 确认允许 npm install，公司网络可访问 GitHub

## 构建环境

- [x] 用 Node 24 安装 `Web/sketch` 依赖：
  `PATH=/Users/zhaojian/.nvm/versions/node/v24.22.2/bin:$PATH npm install`
- [x] 用 Node 24 安装 `Web/app` 依赖
- [x] 确认 Electron 二进制下载成功
- [x] 确认 `Resources/Sketch` 可以重新构建

## 纯函数

- [x] 新增 `Web/sketch/src/tablet/style-wheel.js`
- [x] `categoriesFor(types)`：按类型返回可用类别，混合选中取交集
- [x] `optionsFor(types, category)`：返回取值与当前值
- [x] `patchFor(category, key)`：生成 `setStyle` 可用的 patch
- [x] `splitOverflow(items)`：≤10 原样返回，>10 时前 9 项 + `more`
- [x] 单类别时跳过一级的判断
- [ ] 单测覆盖 0–10 项、交集为空、溢出、1 项跳过一级

## 调色板

- [x] 在 `style-wheel.js` 内置 6 个固定色：黑 / 红 / 绿 / 蓝 / 橙 / 灰
- [x] 不新增 `palette.js`
- [x] 不做设置面板
- [x] 不做 localStorage 持久化
- [ ] 单测覆盖 6 色常量与「非预设值不高亮」

## 组件

- [x] `RadialMenu.jsx` 改为接收 `slots` / `outerSlots` / `centerLabel` / `currentValue` / `hoverPoint`
- [x] 支持 1 项整环、2 项半环、3–10 项等分
- [x] 3–6 项显示图标 + 2 字标签；7–10 项只显示图标
- [x] 当前值高亮（2px 主色描边 + 小圆点）；非预设值不高亮
- [x] 笔悬停高亮落点扇区
- [x] 环外悬停提示：名称 + 当前值，`pointer-events: none`，贴边翻转
- [x] 外环渲染：间隙 8pt、带宽 44pt、`R2 = R1 + 52`
- [x] 外环展开时内环降为半透明且不可点，中心「返回」可点
- [x] 内外环之间的空隙铺透明命中盘，点击不做事
- [x] 移除 `.ts-radial` 现有 `ts-radial-in` 整体缩放

## 动画

- [x] 一级：14ms/槽、单槽 64ms、外扩 4pt、中心 0ms、总时长 ≤200ms
- [x] 一级→二级：90ms 交叉淡入，不依次
- [x] 外环：内环 90ms 降为 0.4；外环 14ms/项依次展开
- [x] 关闭立即，不做退场
- [x] 悬停提示 80ms 淡入
- [x] 命中从第 0 帧开始，不等动画
- [x] 用 CSS `--i` + `animation-delay`，不用 JS 定时器链
- [x] `prefers-reduced-motion` 时取消 stagger
- [x] `TS_NO_ANIM=1` 关闭动画，供截图与测试

## 接线

- [x] `Shell.jsx` 的 `radial` 状态扩为 `{level, category, x, y, context, outer}`
- [x] 打开时快照 `getContext()` 与调色板
- [x] 无选中时提示「先选中图形」，不弹环
- [x] 笔尖 tip down 时按侧键 1 忽略
- [x] 环打开时忽略侧键 1 与侧键 2
- [x] 二级点取值后 `setStyle(patch)` + 关闭 + 300ms 浮条
- [x] 应用失败时保留环 + 浮条提示
- [x] 二级点中心返回一级；一级点中心 / 点空白关闭
- [x] Esc / 失焦 / 缩放 / HID 断开关闭
- [x] 外环点类别 → 收起外环并进入二级；外环中心「返回」只收起外环
- [x] 打开样式环时关闭浮岛面板、样式气泡、设置窗、读数板
- [x] 联调 `add-mouse-input`：右键 / `\` / 浮岛「更多 → 样式环」按鼠标位置打开样式环

## 特殊元素

- [x] 全部锁定：不弹环，提示「元素已锁定」
- [x] 部分锁定：只改未锁定元素
- [x] 分组：改整组
- [x] 绑定文字：不跟随形状颜色 / 透明度
- [x] 混合选中含图片：过滤图片后取交集；全被过滤时提示
- [x] 每次点选 = 一次撤销，不合并

## 旧动作迁移

- [x] 浮岛「更多」面板补「副本 / 删除 / 全选」
- [x] 三项在有选中时才可用，无选中置灰
- [x] 更多面板补「原生右键菜单」入口，承载图层与链接
- [x] 确认 ⌘D / Delete / ⌘A 仍可用，但不作为唯一入口

## 修复

- [x] `.ts-scrim` 设 `z-index: 60`
- [x] `.ts-radial` 设 `z-index: 70`
- [x] 悬停提示 `z-index: 75`，`pointer-events: none`
- [x] 回归验证：点扇区生效，而不是被 scrim 关闭

## API 可写性核对

- [ ] 矩形 / 菱形 / 椭圆：描边、背景、描边宽度、边框样式、线条风格、边角、透明度
- [ ] 直线：上述 + 起点 / 终点箭头；不支持时隐藏
- [ ] 箭头：上述 + Arrow type
- [ ] 自由笔：描边、背景、描边宽度、透明度
- [ ] 文字：描边、字体、字体大小、文本对齐、透明度
- [ ] 画框：透明度；无可见效果时隐藏整个样式环
- [ ] 嵌入：描边、背景、描边宽度、边框样式、线条风格、边角、透明度；无效项隐藏
- [ ] 不能写入的属性不得显示为可用控件

## 源码兜底

- [ ] API 写不进去时，确认 `Web/vendor/excalidraw` submodule 的构建路径
- [ ] 每处源码改动加 `// TS-FORK:` 注释
- [ ] 在 `Docs/fork-changes.md` 登记文件、改动、原因、需求
- [ ] `git format-patch` 导出到 `Docs/patches/`
- [ ] 不手改 `Resources/Sketch` 构建产物

## 自测（无真机）

- [x] `swift test` 保持通过（本变更不改 Swift）
- [ ] 纯函数单测通过
- [ ] 几何单测：1–10 项、外环 `R2`、空隙命中盘、窗口 clamp
- [ ] 离屏 Electron 截图：一级环、二级环、外环、当前值、悬停提示
- [ ] 注入 `pen began/ended` 到扇区坐标，验证笔尖点击链路
- [ ] 动画期间点扇区有反应；`TS_NO_ANIM=1` 截图稳定
- [ ] 减少动态模式无 stagger
- [ ] 全程 `show: false`，不抢焦点、不置顶

## 验收与归档

- [ ] 真机验收（有设备后）：侧键 1 → 一级 → 二级 → 应用
- [x] 重构稳定规格：`## Purpose` + `## Requirements`，`pen-input` 编号章节改为 Requirement
- [x] `openspec validate --all` 通过
- [x] 同步 `openspec/specs/pen-first-ui/spec.md`
- [x] 归档到 `openspec/changes/archive/YYYY-MM-DD-turn-radial-menu-into-style-wheel/`
- [ ] 提交说明引用 `turn-radial-menu-into-style-wheel`

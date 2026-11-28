## MODIFIED Requirements

### Requirement: 笔侧键 2 工具环

应用 SHALL 用笔侧键 2 在笔光标位置弹出工具环，复用右侧浮岛的工具槽位与执行路径。

#### Scenario: 呼出与弹出壳

- **WHEN** 用户按下笔侧键 2 且当前没有笔画进行中
- **THEN** 工具环 MUST 在笔尖位置弹出并跟随笔移动
- **AND** 弹出壳 MUST 与键 1 样式环一致：rAF 合帧悬停、实色扇区、中心取消、外环展开后中心返回
- **AND** Esc、窗口失焦、窗口缩放、HID 断开 MUST 关闭工具环
- **AND** 工具环 MUST NOT 要求已选中图元

#### Scenario: 槽位排列

- **WHEN** 工具环打开
- **THEN** 内圈 MUST 为笔、擦、选、手、矩、椭、箭、字与「更多」共 9 槽
- **AND** 展开「更多」后外圈 MUST 为菱、线、图、素材、锁共 5 槽
- **AND** 当前工具 MUST 在内圈对应槽位显示当前态圆点
- **AND** 锁槽的当前态 MUST 跟随工具锁 `activeTool.locked`，MUST NOT 使用「选中元素是否全部锁定」
- **AND** 「菜单」「画布」MUST NOT 出现在工具环中

#### Scenario: 点选执行

- **WHEN** 笔尖或鼠标点中工具环的一个槽位
- **THEN** 应用 MUST 调用与右侧浮岛相同的 `activate(slot)` 路径
- **AND** 工具槽 MUST 切换工具并保持到下一次落笔，素材槽 MUST 打开素材面板
- **AND** 锁槽 MUST 调用 Excalidraw `toggleLock("ui")` 切换工具锁，与原生工具栏锁按钮同语义：开启后绘制完成不跳回选择工具，关闭后回到选择工具
- **AND** 锁槽 MUST NOT 修改选中元素的 `locked` 字段
- **AND** 执行后工具环 MUST 立即关闭

#### Scenario: 与键 1 共存

- **WHEN** 工具环已打开
- **THEN** 键 1 样式环 MUST 可替换它打开，屏幕上 MUST NOT 同时存在两个环
- **AND** 鼠标右键 MUST 继续只模拟键 1，MUST NOT 为键 2 新增鼠标入口

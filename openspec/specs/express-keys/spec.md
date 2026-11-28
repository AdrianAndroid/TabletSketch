# express-keys 变更（bootstrap-tablet-sketch）

## Purpose

定义板载键的可映射输入集合、默认键位映射、映射持久化、按键去抖与重复触发规则，以及动作只在前台生效的作用域限制。

## Requirements

### Requirement: 可映射输入集合

TabletSketch SHALL 支持 Deco 640 的 8 个板载虚拟快捷键和 2 个笔侧键，共 10 个可独立映射的离散输入。

#### Scenario: 识别按键

- **WHEN** 设备已连接且按下板载键或笔侧键
- **THEN** 应用 MUST 识别具体按键编号
- **AND** MUST 区分板载键 1–8 与笔侧键 1–2
- **AND** 未知位图/未知键 MUST 被忽略

#### Scenario: 无设备

- **WHEN** 设备未连接
- **THEN** 按键映射界面 MUST 显示「未连接」
- **AND** MUST NOT 触发任何按键动作

### Requirement: 默认映射

#### Scenario: 板载键默认表

- **WHEN** 首次运行
- **THEN** 板载键 1–8 MUST 默认映射为：笔、擦、手、选、矩、椭、箭、撤销
- **AND** 实体键与屏幕按键带热区 MUST 走同一个 `activate(slot)` 路径

#### Scenario: 应用接管

- **WHEN** 采集器成功 seize 该板键盘接口
- **THEN** 8 个键的固件原生快捷键 MUST 失效，动作 MUST 由应用按 `layout.v2.onboardKeys.ids` 执行
- **AND**  seize MUST 只按本板 VID/PID 匹配，MUST NOT 全局监听或拦截系统键盘
- **AND** 应用未启动或权限被拒时原生快捷键恢复，属已知边界

### Requirement: 映射持久化

#### Scenario: 独立存储

- **WHEN** 用户修改板载键映射
- **THEN** 顺序 MUST 存到 `layout.v2.onboardKeys`，与右浮岛前 8 格 MUST NOT 共用数据
- **AND** 重启后 MUST 恢复

#### Scenario: 映射界面

- **WHEN** 用户打开设置「布局 → 板载键」
- **THEN** MUST 可把任意允许的按钮 id 放到 8 个位置中的任意一位，也可留空
- **AND** MUST 显示形态预览、顺序列表与候选池

### Requirement: 去抖与重复触发

应用 SHALL 对按键做去抖，避免一次按下触发多次。

#### Scenario: 单次按下

- **WHEN** 用户按下一个键并保持
- **THEN** 对应动作 MUST 只触发一次
- **AND** 重复报告 MUST 被过滤

#### Scenario: 固件连发

- **WHEN** 同一个板载键在 220ms 内被连续上报多帧
- **THEN** 应用 MUST 只执行第一次的动作
- **AND** 后续帧 MAY 继续点亮按键卡片，但 MUST NOT 重复执行撤销/重做

#### Scenario: 长按

- **WHEN** 用户按住一个板载键超过阈值（默认 350ms）
- **THEN** 如果该键对应的浮岛格是一个「组」
- **AND** 屏幕 MUST 在该格旁展开组内选项，供笔点选
- **AND** 不得在展开前先触发组内首选动作
- **WHEN** 该格是单一工具或单一动作
- **THEN** 长按 MUST 等同于单击，MUST NOT 连续重复触发

#### Scenario: 长按未生效

- **WHEN** 设备只在状态变化时上报按下、无法产生持续时间
- **THEN** 应用 MUST 退化为「单击即展开组」
- **AND** MUST 在诊断信息中标记该限制

#### Scenario: 快速连按

- **WHEN** 用户在 10–20ms 内收到多次按下
- **THEN** 应用 MUST 视为一次
- **AND** 不得触发两次撤销/重做

### Requirement: 动作执行必须落到真实 API

每个可映射动作 SHALL 由当前 Excalidraw 版本真实提供的能力执行，不得依赖已移除的接口。

#### Scenario: 撤销与重做

- **WHEN** 任一入口触发 `undo` 或 `redo`（板载键、笔侧键、右浮岛、工具环、「更多」面板）
- **THEN** 应用 MUST 通过 Excalidraw 自身的键盘动作执行（向其 `.excalidraw` 容器派发 `Cmd/Ctrl+Z`、`Shift+Cmd/Ctrl+Z`）
- **AND** MUST NOT 调用 `api.history.undo()` / `api.history.redo()`（0.18 起 `history` 只剩 `clear`）
- **AND** MUST NOT 自建第二套历史栈
- **AND** 撤销 MUST 回退到上游历史的前一步，包括群组整体、绑定文字与选中态

#### Scenario: 动作结果

- **WHEN** 动作函数返回
- **THEN** 返回值 MUST 反映本次操作的实际意图，不得依赖 `setState` 后立即回读的状态
- **AND** 界面当前态 MAY 由后续状态轮询校准

### Requirement: 前台作用域

按键动作 SHALL 只在 TabletSketch 前台生效，不注册全局热键。

#### Scenario: 应用在前台

- **WHEN** TabletSketch 是 frontmost app
- **THEN** 板载键/侧键 MUST 触发映射动作

#### Scenario: 应用不在前台

- **WHEN** 用户切换到其他 App
- **THEN** 板载键/侧键 MUST NOT 触发 TabletSketch 动作
- **AND** MUST NOT 注册全局快捷键抢占其他应用

### Requirement: 映射界面

应用 SHALL 提供可见、可操作的映射界面，且与浮岛共用同一份槽定义。

#### Scenario: 查看

- **WHEN** 用户打开设置 → 浮岛格子 / 板载键
- **THEN** MUST 以「候选态」展示板载键 1–8 与浮岛前 8 格的对应关系
- **AND** MUST 列出 2 个笔侧键及当前动作
- **AND** MUST 显示设备连接状态

#### Scenario: 修改

- **WHEN** 用户点击某个格
- **THEN** MUST 提供可选动作列表（工具 / 组 / 动作 / 空）
- **AND** MUST 支持拖动改变顺序
- **AND** 保存后 MUST 立即生效，板载键同步

#### Scenario: 不可用动作

- **WHEN** 当前画布没有选中内容
- **THEN** 依赖选中的动作（如删除）MUST 禁用或提示
- **AND** 不得静默失败

### Requirement: 板载键卡片显示当前状态

板载键条上的每个卡片 SHALL 显示其所绑定功能在当前画布状态下的「是否生效」，与右侧浮岛同功能槽位的当前态保持一致。

#### Scenario: 工具槽

- **WHEN** 板载键第 N 位绑定的是工具 `T`
- **AND** 当前工具 `activeTool.type` 等于 `T`
- **THEN** 该卡片 MUST 以实色强调色常亮（与浮岛 `.is-on` 同色）
- **AND** 工具切走后 MUST 立即恢复常态

#### Scenario: 工具锁槽

- **WHEN** 板载键某位绑定的是「锁」
- **AND** 工具锁 `activeTool.locked` 为真
- **THEN** 该卡片 MUST 以实色强调色常亮
- **AND** 解锁后 MUST 恢复常态

#### Scenario: 面板槽

- **WHEN** 板载键某位绑定的是面板 `P`（菜单 / 画布 / 素材）
- **AND** 面板 `P` 处于展开状态
- **THEN** 该卡片 MUST 以浅色强调色常亮（与浮岛 `.is-open` 同色）
- **AND** 面板关闭后 MUST 恢复常态

#### Scenario: 与按下反馈共存

- **WHEN** 用户按下板载键
- **THEN** 该卡片 MUST 仍有瞬时高亮反馈（约 180ms），用于确认按键被接收
- **AND** 瞬时反馈 MUST NOT 改变常亮判定所依据的状态

#### Scenario: 槽位为空

- **WHEN** 板载键某位没有绑定任何功能
- **THEN** 该卡片 MUST 保持常态，MUST NOT 常亮

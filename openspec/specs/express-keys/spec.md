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

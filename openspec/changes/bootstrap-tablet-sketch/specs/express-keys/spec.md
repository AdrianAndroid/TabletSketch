# express-keys 变更（bootstrap-tablet-sketch）

## ADDED Requirements

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

应用 SHALL 提供一套可直接使用的默认映射。

#### Scenario: 板载键默认表

- **WHEN** 首次运行
- **THEN** 板载键 1–8 MUST 绑定浮岛的**前 8 格**（双排时按左列自上而下、再右列），默认映射为：
  - 1 菜单
  - 2 画布
  - 3 素材
  - 4 笔（自由手写）
  - 5 擦（橡皮）
  - 6 手（平移）
  - 7 选（选择）
  - 8 矩（矩形）

#### Scenario: 与浮岛同源

- **WHEN** 用户在设置中增删格子、改动内容或拖动换位
- **THEN** 板载键 1–8 MUST 绑定新的前 8 格
- **AND** MUST NOT 存在两套独立的映射表
- **AND** 第 9 格及之后的格子 MUST 只可用笔点，不占用板载键

#### Scenario: 笔侧键默认表

- **WHEN** 首次运行
- **THEN** 笔侧键 1 MUST 切换橡皮
- **AND** 笔侧键 2 MUST 呼出笔尖样式气泡

#### Scenario: 恢复默认

- **WHEN** 用户选择恢复默认
- **THEN** 所有映射 MUST 回到默认表
- **AND** 必须二次确认

### Requirement: 映射持久化

应用 SHALL 将按键映射保存到本地，不跟随账号同步。

#### Scenario: 保存

- **WHEN** 用户修改映射，或增删/调整浮岛格子
- **THEN** MUST 原子写入 `~/Library/Application Support/TabletSketch/settings.json` 的槽定义
- **AND** 重启后 MUST 恢复

#### Scenario: 配置损坏

- **WHEN** 设置文件损坏或含未知动作
- **THEN** 应用 MUST 使用默认映射
- **AND** MUST 备份损坏文件
- **AND** MUST NOT 崩溃

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

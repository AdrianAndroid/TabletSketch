## MODIFIED Requirements

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

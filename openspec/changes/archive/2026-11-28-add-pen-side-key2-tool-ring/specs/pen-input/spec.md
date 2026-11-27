## MODIFIED Requirements

### Requirement: 笔侧键与橡皮

侧键状态 MUST 从 Digitizer 报告的 flags 字节（body[0]）直接取位，不得依赖厂商通道的 `Report ID 2`——该通道零报文，任何取自它的状态恒为 `false`。

| 位 | 掩码 | 含义 | 映射 |
|---|---|---|---|
| `bit0` | `0x01` | Tip Switch | 落笔 |
| `bit1` | `0x02` | Barrel Switch | 侧键 1 → 两级样式环 |
| `bit2` | `0x04` | Eraser 位 | 侧键 2 → 工具环（Deco 640 无笔尾橡皮，固件把第二侧键接在此位，真机已确认） |
| `bit3` | `0x08` | Invert | 橡皮 |

实测 flags 只有三种取值：`0xA0` 悬停、`0xA1` 接触、`0xC0` 离开。

#### Scenario: 侧键

- **WHEN** 笔侧键按下（flags 对应位由 0 变 1）
- **THEN** 采集器 MUST 发出 `{"t":"side","keys":[<索引>]}`；索引 1 MUST 对应笔侧键 2
- **AND** 应用 MUST 触发映射动作一次
- **AND** 重复报告 MUST NOT 连续触发
- **AND** 动作 MUST 只在 TabletSketch 前台生效

# pen-input（delta）

## ADDED

### 独占采集

系统 SHALL 支持以独占方式打开手写板，使该设备的输入不再送达系统指针。

- 启动参数 `--grab` 时使用 `kIOHIDOptionsTypeSeizeDevice` 打开管理器。
- 独占成功 SHALL 输出 `{"t":"grab","ok":true}`；失败输出 `{"t":"grab","ok":false,"status":<IOReturn>}` 并退回只读模式。
- 独占失败 MUST NOT 阻止启动，也 MUST NOT 使设备对系统不可用。

### 自动释放

独占状态 MUST 在下列情况立即释放，避免板子被长期占用：

- 采集器进程收到 SIGTERM / SIGINT；
- 宿主窗口失去焦点超过 260ms；
- 应用退出。

窗口重新获得焦点时 SHALL 重新尝试独占；重试失败退回只读，不弹错。

### 轻触起笔

压力阈值调整：`pressureOn = 0.0015`、`pressureOff = 0.0008`。

笔尖接触（`tipDown`）且压力超过 `pressureOn` 时 SHALL 立即产生 `began`，不要求用户先施加明显压力。

### 压力整形

注入画布的压力 SHALL 经过整形再交给渲染层：

- `p = 0` → `0`（抬笔）
- `0 < p < 0.04` → 线性升到 `0.32`
- `p ≥ 0.04` → `0.32 + 0.68 × ((p - 0.04) / 0.96) ^ 0.7`

目的：轻触也有可见线宽，重压仍有明显粗细差。

### 虚拟笔光标

独占生效时界面 SHALL 绘制自己的笔光标：

- 悬停：14pt 空心圆，描边系统蓝；
- 落笔：缩到 8pt 并填充；
- 位置 MUST 跟随 `tablet:penpos` 的 CSS 坐标。

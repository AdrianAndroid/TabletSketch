# 独占手写板，把笔锁在应用内

## Why

原来只是只读 HID：能收到笔数据，但系统指针照样跟着笔跑。用户写两笔光标就飘到别的窗口，笔迹和手感都散——这不是"手写板应用"，只是"一个能读压感的窗口"。用户的原话是「就把手写笔局限在这个应用内，按比例才能写着舒服」。

同时落笔门槛过高：状态机要求压力 ≥ 0.012 才起笔，轻触的前几毫秒被当成悬停丢掉，用户必须先压一下才有墨。

## What Changes

1. 采集器新增 `--grab`：用 `kIOHIDOptionsTypeSeizeDevice` 独占打开，系统收不到这块板子的输入，指针不再跟随笔。失败自动退回只读并上报，不会把板子弄成砖。
2. Electron 默认带 `--grab` 启动；窗口失焦 260ms 后释放（切到别的应用时板子立刻还给系统），回焦重新接管。
3. 起笔阈值 `pressureOn` 0.012 → 0.0015，`pressureOff` 0.005 → 0.0008：碰到就出墨，压力只决定粗细。
4. 页面侧压力整形：`0 → 0`，`0.04 → 0.32`，`1 → 1`，低区线性拉起 + 0.7 次幂压缩，保证轻触可见、重压仍变粗。
5. 独占生效时界面自绘虚拟笔光标（14pt 圆环，落笔缩到 8pt），因为系统指针已经不在了。

## Capabilities

- `pen-input`：从"只读采集"变为"可独占采集"。

## Impact

- `Sources/TabletSketchHID`：`--grab` 参数、seize 打开与回退、`{t:"grab"}` 状态行
- `Sources/TabletSketchCore`：`PenStateMachine.Config` 阈值
- `Web/app`：`hid-bridge` 传参并转发 grab 状态、`main.js` 失焦释放、`preload` 缓存 grab
- `Web/sketch`：`shapePressure`、`tablet:penpos` / `tablet:grab` 事件、虚拟光标
- `AGENTS.md` R3：允许标准 IOKit 独占，仍禁止 KEXT / DriverKit / 全局 event tap / 系统扩展 / 关 SIP

## 非目标

- 不做厂商私有模式的写入（不改板子固件行为，只改谁收到这份输入）。
- 不做全局输入拦截，不影响鼠标、键盘、其他板子。
- 不追求笔迹延迟优化；先解决"能不能安心写"。

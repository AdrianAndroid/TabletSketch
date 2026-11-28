# 独占失败自愈设计

## 为什么必须 close 再 open

`IOHIDManager` 的打开方式是**一次性**的：一旦以只读方式打开，再调 `IOHIDManagerOpen(seize)` 不会改变打开选项，只会返回成功（旧代码注释里已经踩过这个坑）。所以重试流程只能是：

```
IOHIDManagerClose(manager)
→ IOHIDManagerOpen(manager, kIOHIDOptionsTypeSeizeDevice)
   ├─ 成功：seized = true，重新枚举 + 重建接口锁，停止重试
   └─ 失败：退回只读（IOHIDManagerOpen(None)），退避后下一轮
```

## 四个必须处理的细节

| 细节 | 处理 |
|---|---|
| close 会触发设备移除回调 | 用 `reseizing` 标志跳过这一轮的 `disconnected` 上报，只清引用，避免界面闪烁 |
| close 后设备对象失效 | 重开后必须 `IOHIDManagerCopyDevices` 重新枚举并逐个 `consider`，否则拿不到新的 `penDevice` |
| `consider` 可能重复调用 | 入口按 `CFEqual` 比对已挂载设备去重，避免重复上报 `ready` |
| 接口锁要重建 | 成功后先 close 旧的 `pointerManagers`，再重新 `grabPointerInterfaces()`；否则键盘接口仍是只读状态，板载键还是收不到 |

## 退避节奏

1.5s → 3s → 6s → 8s 封顶，一直重试。不用固定间隔（失败时容易空转），也不彻底放弃（那正是当前 bug）。成功后退避值复位。

## 状态上报

| 时机 | 事件 |
|---|---|
| 首次失败，进入重试 | `{"t":"grab","ok":false,"retry":1,"status":...}` |
| 每轮重试失败 | 同上，`retry` 递增 |
| 重试成功 | `{"t":"grab","ok":true,"recovered":true}` |

`hid-bridge.js` 把这三种情况映射成：

- `grab-retrying`：`正在重试独占（第 N 次）`
- `grabbed`：`已恢复独占`（带 `recovered` 时）/ `已独占手写板`

界面已有 HID 状态字段，直接显示这些文案，无需新增 UI。

## 边界

- 重试仍失败时保持只读：笔可用，板载键不可用，状态持续显示“正在重试”，不会伪装成正常。
- 设备被拔出时不做特殊处理：主管理器本身会收到移除回调，插回后 `deviceAdded` 重新匹配；若此时未独占，下一次重试会尝试接管。

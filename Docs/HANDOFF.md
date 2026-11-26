# TabletSketch 交接文档

最后更新：2026-11-27 00:10

给下一个接手的人（人或 AI）。这份文档只写**当前真实状态**，不写愿望。

---

## 一分钟跑起来

```bash
cd /Users/zhaojian/code/TabletSketch

# 1. 前端产物（改了 Web/sketch 下任何东西都要重跑）
cd Web/sketch && npm run build && cd ../..

# 2. 开发态直接开窗口（带日志）
cd Web/app && npm start

# 3. 打包成可双击的 .app
swift build -c release
Scripts/make-app.sh          # 产物在 Build/TabletSketch.app

# 自测：注入压力曲线 + 逐个打开界面并截图
cd Web/app && TS_SELFTEST=1 npm start   # 截一张 /tmp/ts_shot.png
cd Web/app && TS_DEMO=1 npm start       # 截八张 /tmp/ts_demo_*.png
```

关掉残留进程：`pkill -f "code/TabletSketch/Web/app"` 或 `pkill -f "TabletSketch.app/Contents/MacOS"`。
**不要**用 `pkill Electron`，会误杀别的 Electron 应用。

---

## 进度表

| 里程碑 | 内容 | 状态 |
| --- | --- | --- |
| M1 | Swift HID 采集器 | ✅ `--once` 开出 `0xFF0A` 通道 |
| M2 | Electron 接 HID 子进程 | ✅ `[hid] ready 已连接 Deco 640` |
| M3 | 笔采样映射 + 压感注入 | ✅ 注入 80 帧压力信封，线两端细中间粗 |
| M4 | 顶部条 / 浮岛 / 四个下拉 | ✅ 截图核对过 |
| M5 | 素材面板三态 | ✅ 列表 + 二级详情已截图验证，插入未实测 |
| M6 | 径向菜单 | ✅ 选中/空白两套槽位，圆心贴笔尖 |
| M7 | 样式气泡 | ✅ 颜色 / 线宽 / 透明三行 |
| M8 | 设置窗 | ✅ 浮层版，左导航 + 右卡片 |
| M9 | 板载键映射 | 🔶 侧键通，板载虚拟键未解析 |
| M10 | 保存 / 打开 | ✅ 存到 ~/Pictures/TabletSketch/Sketches，⌘S / ⌘O 走原生对话框。多画板切换仍是壳 |
| — | 打包 .app | ✅ `Scripts/make-app.sh`，未签名 |
| — | 独占接管（seize） | ✅ `[hid] grabbed 已独占手写板`，系统指针不再跟随笔 |
| — | 轻触即出墨 | ✅ 阈值降到 0.0015 + 压力整形，0.02 压力的一笔清晰可见 |
| — | 真笔验收 | ⬜ 等用户上手 |

---

## 代码地图

```
Sources/TabletSketchCore/         纯逻辑，可测
  PenReport.swift                 12 字节报告解析 + 压力归一化
  CanvasMapping.swift             板坐标 → 画布坐标
  VendorProtocol.swift            初始化报文与 ACK 判定
Sources/TabletSketchHID/          可执行 swift 程序，输出 NDJSON
  main.swift                      参数解析、--once、生命周期
  HIDReader.swift                 IOHIDManager + 输入回调 + 侧键边沿检测
  Emit.swift                      行式 JSON 输出
Tests/TabletSketchCoreTests/
  PenReportTests.swift            5 个用例，全过

Web/sketch/src/                   前端（React）
  main.jsx                        Excalidraw 宿主，挂 <TabletShell />
  tablet-sketch.js                桥：工具/场景/样式 API + 笔事件路由 + 自测
  tablet/
    Shell.jsx                     顶部条、浮岛、面板编排、键盘/侧键分发
    panels.jsx                    菜单 / 画布 / 素材 / 更多 四个下拉
    RadialMenu.jsx                径向菜单（SVG 扇区）
    StyleBubble.jsx               样式气泡（320×140，恒三行）
    icons.jsx                     20 个线性图标
    chrome.css                    全部自绘样式，含深色模式
    settings/SettingsWindow.jsx   设置窗（左导航 + 右卡片）
    scene-files.js                画板读写（原生通道 + 浏览器回退）
Web/app/                          Electron 外壳
  main.js                         窗口 + 菜单栏 + 自测/演示序列 + 截图
  preload.js                      主世界与页面的唯一通道（CustomEvent）
  hid-bridge.js                   spawn HID 子进程，按行解析，断线重试
  （文件存取走 ipcMain.handle：ts:save-scene / ts:open-scene / ts:reveal-sketches）
Web/vendor/excalidraw/            submodule，v0.18.1 (a2ec288)
Resources/Sketch/                 前端构建产物（别手改）
Scripts/make-app.sh               组装 .app
Build/TabletSketch.app            打包产物
```

---

## 五个必须知道的机制

**1. preload 和页面是两个世界。**
`contextIsolation: true` 下 preload 读不到 `window.tabletSketch`，所以全部通信走 `document` 上的 CustomEvent：
页面→preload 用 `ts:ready` / `ts:log`，preload→页面用 `ts:pen` / `ts:hid` / `ts:hid-status` / `ts:chrome` / `ts:selftest` / `ts:open-settings`。
`tablet-sketch.js` 把这些再转成 `window` 上的 `tablet:*` 给 React 用。**加新事件必须在这两处都登记**，漏一处就是静默失效。

**2. 笔事件不合成 PointerEvent，先做落点判决。**
`applyHidEvent` 把归一化坐标换成 CSS 像素，用 `document.elementFromPoint` 判断落点：
命中 `[data-ts-ui]` 就转成一次 click（不碰画布），否则才合成 PointerEvent 交给 Excalidraw。
因为 `setPointerCapture` 对非真实 pointerId 会抛 `InvalidPointerId`，`patchPointerCapture` 里做了 no-op。

**3. 压力 0.5 是个陷阱。**
`App.tsx` 用 `event.pressure === 0.5` 判断"设备没有压感"，命中就整条丢弃压力。
`clampPressure` 把 0.5 钳成 0.5001。

**4. 界面可能比状态晚挂载。**
HID 状态通常先到。`preload` 缓存最后一帧，在 `ts:ready` 时补发；`tablet-sketch.js` 同时存 `window.__tsHidStatus`，`Shell` 用 lazy initializer 读它。

**5. React 里 useEffect 的位置会要命。**
把引用 `const openRadial = useCallback(...)` 的 effect 写在它**上面**，会踩 TDZ 让整个组件白屏。
新增 effect 一律放在它依赖的 callback 之后。

---

## 这一轮做了什么（按时间）

1. **HID 采集器**：`Package.swift` 从 app 改成 library + 可执行 target，产品名 `tablet-sketch-hid`。`--once` 输出 `{"maxX":31998,"maxY":17998,"product":"Deco 640","t":"ready"}`，证明开启了 `0xFF0A` 通道并发出 `02 B0 04` + 17×00 初始化报文。
2. **Electron 接线**：`hid-bridge.js` spawn 子进程、按行切 NDJSON、退出码分流、最多重试 3 次、`before-quit` 杀子进程。
3. **笔路由**：落到画布就合成 PointerEvent，落到自绘 UI 就转 click。
4. **自绘界面**：`icons.jsx` / `Shell.jsx` / `panels.jsx` / `RadialMenu.jsx` / `StyleBubble.jsx` / `SettingsWindow.jsx` 六个组件 + `chrome.css`，接入 `main.jsx`。
5. **补桥**：`getSceneElements` / `loadScene` / `selectAll` / `deleteSelection` / `duplicateSelection`。`paste` 和 `reorder` 在公开 API 里没有对应，已从菜单里去掉，径向菜单也不再用它们。
6. **修六个 bug**：TDZ 白屏、`tablet:hid-status` 与 `ts:hid-status` 名称不一致、状态到达早于挂载、菜单圆心取屏幕中心而不是笔尖、`hasSelection` 在 selectAll 同帧读不到（加 80ms 校正）、`ts:open-settings` 没转发。
7. **打包**：`Scripts/make-app.sh` 复制 Electron.app、改 Info.plist、把主进程脚本 + 前端产物 + HID 二进制塞进 `Contents/Resources/app`，产出一个可双击的 `Build/TabletSketch.app`。
8. **测试**：`swift test` 5 个用例通过（`CanvasMapping` 的 init 需要 `canvasRect`，测试里传 `.zero`）。
9. **存取闭环**：`ts:save-scene` 静默写到 `~/Pictures/TabletSketch/Sketches/<画板名>.excalidraw`（先写 `.tmp` 再改名，R4 要求原子写）；`ts:open-scene` 弹原生对话框。菜单栏加了 ⌘S / ⌘O，保存后有底部提示条。
10. **补常用动作**：浮岛「更多」面板里固定放 撤销 / 重做 / 保存画板 / 适应画布，不必记快捷键。
11. **画板名持久化**：`boards` + 当前选择写回 localStorage，顶部标题显示真名。
12. **验收**：`TS_DEMO=1` 八个步骤逐一截图，确认顶部条、浮岛、菜单/画布/素材下拉、径向菜单、样式气泡、设置窗、侧键弹菜单全部正常；打包版同样跑通。

---

## 独占与手感（2026-11-27 补）

用户上手后提了两个真问题，都已改：

1. **板子没被应用接管**。原来只读 HID，系统指针照样跟着笔跑。现在采集器带 `--grab`，用
   `kIOHIDOptionsTypeSeizeDevice` 独占打开，系统收不到这块板子的输入。日志里看到
   `[hid] grabbed 已独占手写板` 就说明接管成功。
   - 失焦 260ms 后自动释放，切到别的应用板子立刻还给系统；回焦重新接管。
   - 独占失败会输出 `{"t":"grab","ok":false}` 并退回只读，不会把板子弄成砖。
   - 想临时关掉：`TS_NO_GRAB=1` 启动。
2. **必须先用力压才有墨**。两个原因叠加：
   - 状态机 `pressureOn` 是 0.012，轻触前几毫秒的压力被当成悬停丢掉 → 已降到 0.0015，
     `pressureOff` 降到 0.0008。
   - Excalidraw 用 perfect-freehand 的 thinning 直接按压力算线宽，压力 0.02 只有发丝粗，
     看起来像"没画出来" → 页面侧新增 `shapePressure`：`0.04` 压力抬到 `0.32`，`1` 仍是 `1`，
     低区线性拉起、高区 0.7 次幂压缩（`tablet-sketch.js`）。
   - 验证方式：注入压力 0.02–0.06 的一笔，线清晰可见（`/tmp/ts_demo_11-light.png`）。

独占后系统指针消失，所以界面自绘了笔光标（`chrome.css` 的 `.ts-pen-cursor`）：
悬停是 14pt 空心圆，落笔缩到 8pt 并填充。位置来自 `tablet:penpos`。

## 还没做（按重要性）

1. **真笔验收**。所有笔链路都是注入事件验证的，没有一笔是真人画的。用户上手时重点看：压感粗细是否跟手、抬笔是否有断线、hover 到浮岛上是否能点。
2. **板载虚拟键 1–8 没解析**。Swift 侧只做了侧键（report 的 bit1/bit2）的边沿检测，板载键在 Aux Report（Report ID 3）里，还没读。
3. **多画板切换只是改名**。新建画板会加进列表并写 localStorage，但切换时不保存上一张的元素、也不加载目标画板的元素 —— 画布内容始终是同一份。真正的多档要么每档存一个文件，要么整份 JSON 里放多个 scene。
4. **素材库点击插入没验证**。`insertLibraryItem` 在桥里，`LibraryPanel` 的二级详情已渲染（左侧详情 + 两列素材），但点某一项往画布插入这一步没实测。
5. **样式气泡只覆盖颜色 / 线宽 / 透明**。填充色、线型（实线虚线）、箭头样式都没有。设计上这三样后续按需加，保持恒三行。
6. **设置项只写不读**。所有开关存进 localStorage，但除了主题跟随系统之外，没有代码去读它们。
7. **M5 的 fork 改造没动源码**。现在是 `body.tablet-mode` + 一份 CSS 隐藏清单把原生 chrome 藏掉，`Web/vendor/excalidraw` 一行没改。真删代码是后面的事，`Docs/fork-changes.md` 里记了六处计划改动。
8. **图标、签名、公证**。`.app` 用的是 Electron 默认图标；没有签名，拷到别的机器要右键打开。

---

## 已知的坑

- 后端 `&` 启动的 Electron 会随 shell 退出被杀，要 `nohup ... &` 加 `disown`。
- `electron --version` 会阻塞前台，判断有没有装好用文件存在性判断。
- Vite 的 `base` 必须是 `"./"`，否则 `file://` 下全 404。
- `IOHIDDeviceSetReport` 的 payload **不含** report ID，要 `dropFirst()`。
- Excalidraw 没有 `setElements`，插元素必须走 `updateScene({ elements })`。
- 复制元素后 `selectedElementIds` 要一起更新，否则用户看不到复制结果。
- 删元素不走 Excalidraw 的删除 action 的话，箭头绑定会留悬空引用 —— 目前接受这个瑕疵。

---

## 规矩

`AGENTS.md` 是硬约束，其中三条最容易踩：

1. 每个用户可见功能必须有内置打开入口（菜单栏或浮岛），不能只有快捷键。当前设置窗有两个入口：菜单栏 `⌘,` + 浮岛「菜单 → 设置…」。
2. 需求先建 OpenSpec 变更，再动手。
3. 手写板默认只读 HID；需要「笔只在本应用里生效」时，允许用标准 `kIOHIDOptionsTypeSeizeDevice` 独占（见 `openspec/changes/seize-pen-input`），仍然禁止 KEXT / DriverKit / 系统扩展 / 关 SIP / 全局 event tap / 厂商私有模式写入。

改完别忘 `git push`。

---

## 2026-11-27 · 三条手感问题的处理（未验收）

用户上手后提了三条，逐条处理如下。

### 1. 手写板仍在操控系统鼠标

**根因**：上一版的 seize 是假成功。代码先 `IOHIDManagerOpen(manager, kIOHIDOptionsTypeNone)` 打开，再补一次带 seize 的 Open —— 管理器一旦打开，第二次 Open 不会改变打开方式却返回 success。而且 `matching` 只指定了厂商接口（page 0xFF0A / usage 1），系统光标由同一物理设备的 Generic Desktop（page 1 / usage 2）和 Digitizer（page 13 / usage 2）接口驱动，锁厂商接口拦不住光标。

**改法**：`matching` 只留 VID/PID → 一次拿到全部 3 个接口；只 Open 一次且直接带 seize；`reportReceived` 用 `sender` 区分接口。

**已验证**：`ready` 行 `interfaces` 返回 `[{page:13,usage:2},{page:1,usage:2},{page:65290,usage:1}]`；第二进程 `--grab` 返回 `-536870203`（kIOReturnExclusiveAccess），不带 `--grab` 直接打不开 —— 排他成立。

**副作用**：光标真的被锁死，所以界面必须自绘笔光标（`.ts-pen-cursor`），这部分此前已有。

### 2. 笔悬停时没有圆圈指示

**根因**：界面只从厂商通道取位置，而厂商通道基本只在笔接触后才出数据；「笔在感应区内」是 Digitizer 接口的职责。之前 `reportReceived` 把非厂商接口的报告全丢了。

**改法**：注册 Digitizer 接口（page 0x0D usage 2）的解析。它的 descriptor 是 `Report ID 7`：1 字节状态位（Tip / Barrel / In Range / Invert）+ X(16) + Y(16) + Pressure(16) + TiltX(8) + TiltY(8)，坐标范围 0..15999 / 0..8999（正好是厂商通道的一半，解析时 ×2 对齐）。两路数据做了融合：Digitizer 在 500ms 内有上报就以它为位置/压力来源，厂商通道只吸收侧键和橡皮状态，避免两路坐标打架。

**另加**：250ms 无报文看门狗 → 补发 `leave`，否则笔抬离后圆圈会一直挂在屏幕上（前端 `tablet:penpos` 收到 `ph: "leave"` 时清空）。

**未验证**：以真实笔悬停为准。日志里若有 `{"t":"digitizer","first":true,...}` 说明接口确实在报。

### 3. 必须使劲压才出墨

**根因**：状态机起笔条件是 `tipDown && pressure >= 0.012`。轻触的最初几毫秒压力常常是 0，被当成悬停丢掉，用户体感就是「必须先压一下」。

**改法**：`shouldStart = tipDown || pressure >= pressureOn` —— 以硬件 tip 位为主，压力只决定粗细；起笔那一帧压力垫 `max(pressure, 0.12)` 的可见下限。

**未验证**：需实机轻触确认。

### 接下来要做的

- [ ] 三条实测验收；若仍无 hover，开 `--dump` 看 Digitizer 是否真的在悬停时上报，并核对状态位定义（当前按 Tip=bit0 / Invert=bit3 猜）
- [ ] 板载虚拟键 1–8 未解析，只做了两个侧键
- [ ] 多画板切换只改名不换内容
- [ ] 素材库点进详情后插入未实测
- [ ] 本轮改动需要提交

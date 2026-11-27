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

---

## 2026-11-27 深夜 · 四个叠加的根因（已修，待实测）

前三轮"改了没效果"不是没改，是改动根本没进运行中的包。按时间顺序挖出四层：

1. **前端产物从来没更新**。`Scripts/make-app.sh` 拷贝的是 `Resources/Sketch`，而 `npm run build` 的产物恰好也直接输出到 `Resources/Sketch`（vite `outDir`），看起来一致，但打包时机与构建时机经常错位，app 里跑的一直是旧包。现在 `make-app.sh` 会打印实际打进去的 `index-*.js` 文件名，一眼能看出是不是刚构建的。
2. **采集器 stdout 全缓冲**。spawn 成子进程后 stdout 是管道，Swift 默认全缓冲，一行都到不了主进程。已在 `main.swift` 开头 `setvbuf(stdout, nil, _IONBF, 0)`。这一条最致命：**在 App 里，真实笔数据从来没通过一次**，之前所有演示都是注入的假数据。
3. **Digitizer 报文首字节是 report ID**。被当成状态位解析，坐标算成天文数字再被 clamp 到角落。已 `dropFirst()`。
4. **默认工具是"选择"**。`pointerdown` 落在画布上但没有工具接收，既不画也不选。现在 `installTabletSketch` 初始化后自动切 `freedraw`，`began` 时再兜底切一次。

顺带修的：
- `chrome.css` 里 `.ts-pen-cursor` 样式整段丢失 → 补回（14pt 空环 / 落笔 8pt 实心）。
- 光标渲染不再依赖 `grabbed` 事件（跨 world 事件容易在监听注册前发出），有坐标就画。
- 自绘 UI 的点击原来派发 `MouseEvent`，React 的 `onPointerDown` 收不到 → 改成 `PointerEvent`。
- 失焦不再释放独占（只退出时释放），切窗口不会把板子还回去。
- `body.tablet-mode` 由页面自己加，不再只依赖 preload 的跨 world 事件。

**验证方式（不需要真笔）**：`TS_FAKE=1` 启动会注入一条正弦笔迹，应出现"手写笔工具高亮 + 一条带粗细变化的黑线 + 跟随圆圈"。

**当前界面现状**：顶部自绘条 + 右侧单列工具岛（设计稿是双排 15 格，还没对齐）+ 右上"手写板已连接"。原生 Excalidraw chrome 已隐藏（`.App-menu_top` computed display = none）。

---

## 2026-11-27 · 板面示意图（onboard-pad-visualizer）

按用户要求"只复刻板载区和手写区，1:1 复刻、手写区比例一致、按键按下才显示"实现。

- 新组件 `Web/sketch/src/tablet/PadMap.jsx`：上方 44pt 按键带 + 下方 360×202.5 手写区（严格 16:9）。
- 按键圆心 x 由真机图实测：板框 876×696、首键 173px、间距 93px，换算到 360 宽后为 46/84/123/161/199/237/275/314。**不做等分**。
- 按键常态完全不可见（只留 28pt 热区），按下瞬间亮 22pt 主色圆 + 数字 + 240ms 涟漪，180ms 后消失。
- 笔点只映射进手写区，`nx/ny` 由 `tablet-sketch.js` 的 `tablet:penpos` 带出，两侧各留 6pt 内边。
- 位置放在**左下角**（右下角会和浮岛底部叠住），收起后是 44pt 芯片。
- 用笔点示意图上的键位也能触发同一动作，方便不接板子时测试。
- `TS_FAKE=1` 会持续发 `aux` 事件（固定键 4），用于截图验证高亮位置。

**未验证**：`AuxReportParser` 假设 `bytes[2]` 是 8 位键位图（逆向推测）。采集器首帧会打 `{"t":"auxraw","bytes":[...]}`，按真机按键时核对。

---

## 2026-11-27 · 窗口即板面（window-as-pad）

用户否掉了"卡片式缩略示意图"：

> 我想的不是这个小窗映射，而是整个窗口映射。相当于这个小窗的样式就是整个工作窗口。

改成窗口级版式，`openspec/changes/window-as-pad/` 记录齐全。

- `.deck-shell` 变成 `padding-top: 64px` 的纵向 flex；Excalidraw 被包进新增的 `.ts-stage`。
- `.ts-stage` = `flex:1`、`margin: 8px 12px 12px`、`radius 14`、底色 `#f5f7fa`。实测 `[12,72,1176,676]`，比例 1.74，接近真机手写区 1.795。
- `.ts-band` 64px（上排 22 放画板名/工具/连接状态，下排 42 放 8 键）。上排 `padding-left: 84px` 避让红绿灯。
- `PadBand.jsx` 用百分比定位 8 键：`0.129/0.236/0.342/0.45/0.555/0.661/0.766/0.872`。实测 `left = 142/270/397/527/653/780/906/1033`，间距 127。
- 键常态 `color: transparent` + 透明底；按下亮 26pt 主色圆 + 白字 + 6px 光环，180ms 后消失。**注意**：`.ts-layer button { color: inherit }` 特异性更高，必须用 `.ts-layer .ts-band-key` 才压得住。
- 画布 `viewBackgroundColor` 改 `#f5f7fa`（`initialData` 与 `loadScene` 两处都改），和手写区同色；导出 PNG 仍强制白底。
- 笔的映射不用改代码：`canvasEl().getBoundingClientRect()` 现在天然等于 `.ts-stage`（实测 `[12,72,1176,676]`），笔点与笔迹都自动关在手写区里。
- 删除 `PadMap.jsx`、`.ts-pad*` 全部样式、收起芯片；`Shell.jsx` 里的 `penN` 状态一并摘掉。

验证：`TS_FAKE=1` 下截图确认 —— 键 4 的蓝点落在 band 45% 处、正弦笔迹完整落在手写区内、端点不越界。

**仍需真机确认**：板载键的 `bytes[2]` 位图假设，以及 8 键的实际手感。

---

## 2026-11-27 · 板载键打通（map-onboard-keys）

用户确认"板载键盘、手写板都好了"。结论与踩坑全记在这里，避免后来人重复逆向。

### 真相

板载 8 键**不走厂商通道**。整个会话里 page 65290 一条报文都没有；笔数据全部来自 Digitizer（page 13）。

按键走 **page 1（Generic Desktop）的 `Report ID 6`** —— 那个接口是鼠标+键盘复合体，descriptor 里 `05010906 a101 8506 …` 就是键盘描述符。固件早就把 8 个键翻译成了 8 个标准快捷键。

### 实测映射

| 键 | modifier | keycode | 含义 |
|---|---|---|---|
| 1 | 0 | 0x05 | `b` |
| 2 | 0 | 0x08 | `e` |
| 3 | 0 | 0x2F | `[` |
| 4 | 0 | 0x30 | `]` |
| 5 | 1 | 0x56 | Ctrl + 小键盘 - |
| 6 | 1 | 0x57 | Ctrl + 小键盘 + |
| 7 | 1 | 0x1D | Ctrl+Z |
| 8 | 3 | 0x1D | Ctrl+Shift+Z |

键 5/6 带 Ctrl 修饰位、键 7/8 顺序靠后——这两点第一版都猜错了，必须逐键实测。

### 关键坑

1. **`consider()` 里 `guard usagePage == device.usagePage` 会把 page 1 直接丢掉的**。原来注释写"鼠标接口等：不读"，但按键就在这个接口里。
2. **dump 被日志过滤吞了**。采集器把 `{t:"raw"}` 送到页面后，`main.js` 的 `onEvent` 只打印 `pen`，其余静默丢弃。前几轮用户"按了很多遍"完全没留下证据，白折腾了两轮。现在 `raw`/`aux`/`grabif`/`interface` 都进日志。
3. **按键是边沿事件，不是状态位图**。按住不放会以 200Hz 连发，必须用 `lastPadKey` 去重。
4. **不要联动浮岛**。这 8 个键本身就是真快捷键，Shell 再调一次 `api.undo()` 会让撤销撤两步。

### 仍未解决

`page 1` 与 `page 13` 的 `seize` 都返回 `-536870203`（`kIOReturnExclusiveAccess`），系统内核 HID 驱动先占，用户态抢不到。后果：

- 板载键会漏到当前前台应用（在浏览器里按 7 就是浏览器的撤销）
- 笔仍然驱动系统光标，没有做到"只在应用内"
- 只有厂商通道（page 65290）独占成功，但它本来就不产生数据

可选解法（都未实施）：

1. `hidutil` 把板子这 8 个组合键重映射成 F13–F20，系统不会误触，应用只接这 8 个。代价是映射全局生效，会影响真键盘（但真键盘一般没有 F13–F20）。
2. `CGAssociateMouseAndMouseCursorPosition(false)` 冻结光标 + 应用内虚拟光标，窗口失焦时恢复。代价是冻结期间真鼠标也不能动。

两者都要先改 R3 的安全边界，属新变更。

---

## 2026-11-27 · 今日归档（收尾）

用户指示：今天先归档、提交、上传 GitHub，改天再完善功能。

### 已完成

1. 5 个变更全部移入 `openspec/changes/archive/2026-11-27-<change-id>/`：
   `bootstrap-tablet-sketch`、`seize-pen-input`、`onboard-pad-visualizer`、`window-as-pad`、`map-onboard-keys`
   - `onboard-pad-visualizer` 的方案已被 `window-as-pad` 取代，保留归档仅作历史记录，不要照它实现。
2. `openspec/specs/` 补齐 7 个稳定能力规格：`pen-input`（5 个变更合并重写）、`canvas-mapping`、`pen-first-ui`、`sketch-document`、`app-settings`、`express-keys`、`app-lifecycle`。
3. `openspec/specs/README.md` 更新为归档索引 + 归档记录表 + 已知未解决指针。

### 下次开工的候选（按价值排序）

| 优先级 | 事项 | 入口 | 代价 |
|---|---|---|---|
| 高 | 板载键不漏到前台应用：`hidutil` 把 8 个组合键改写成 F13–F20 | 新建 OpenSpec 变更 | 低，全局映射，真键盘一般无 F13–F20 |
| 中 | 笔不出窗口：冻结系统光标 + 应用内虚拟光标，失焦恢复 | 新建 OpenSpec 变更，需改 R3 | 中，冻结期间真鼠标也不能动 |
| 中 | `.app` 签名 + 自定图标 | `Scripts/make-app.sh` | 低，需要开发者证书 |
| 低 | 多画板切换只改名不换内容 | `Web/sketch/src/tablet/Shell.jsx` | 低 |
| 低 | 设置项只写不读 | `Web/app` 与 `Web/sketch/src/tablet/*` | 中 |
| 低 | 字体仍从 `esm.sh` 拉，违反 R4.5 离线要求 | `Web/sketch` 与 CSP | 低，下载字体本地化 |

### 一句话现状

笔能画、能压感、圆圈跟随、只在手写区内；板载 8 键能识别并高亮。系统层还抢不到 page 1 / page 13 的独占，所以按键会漏、笔仍驱动系统光标——这两条是下一步的主战场。

### 五秒复现

```bash
cd /Users/zhaojian/code/TabletSketch
swift build -c release
cd Web/sketch && npm run build && cd ../..
Scripts/make-app.sh
nohup Build/TabletSketch.app/Contents/MacOS/TabletSketch > /tmp/ts_app.log 2>&1 & disown
```

---

## 2026-11-27 · 笔侧键与压感读数（wire-pen-side-keys / pen-telemetry-panel）

### 侧键：根因是"读错了通道"

`handleDigitizer` 构造 `PenReport` 时写的是 `barrel1: lastKeys.barrel1`，而 `lastKeys` 只在 **Report ID 2**（厂商通道）分支里被赋值——那条通道零报文。于是侧键状态恒为 `false`，`side` 事件一次都没发出去。前端 `Shell.jsx` 的映射（`0`→径向菜单、`1`→样式气泡、`2`→橡皮）其实一直是好的，只是没人叫它。

改成直接从 Digitizer 的 flags 字节取位：

| 位 | 含义 | 用途 |
|---|---|---|
| `bit0` | Tip Switch | 落笔 |
| `bit1` | Barrel Switch | 侧键 1 → 径向菜单 |
| `bit2` | Eraser | 侧键 2 → 样式气泡（Deco 640 无笔尾橡皮，固件把第二侧键接在这里，**已实测确认**） |
| `bit3` | Invert | 橡皮 |

实测日志出现过 `{"keys":[0],"t":"side"}` 与 `{"keys":[1],"t":"side"}`，两键都能区分。用户确认「现在可以了」。

另外两个连带修复：

1. **菜单定位改用光标坐标**。原来 `penRef` 只在 `tablet:hover` 事件更新，笔一动菜单就飘；现在 `penPos` 每帧同步进 `penRef`，并且气泡位置做了窗口内 clamp。
2. **`dflags` 进日志白名单**。上一轮它被 `main.js` 的 `onEvent` 过滤吞掉，导致看不到位变化——同一个坑踩了第二次，写在这里警示。

### 倾斜：数据一直有，只是从来没发出去

`PenReport.tiltX/tiltY` 从 Digitizer descriptor 的 `09 3D` / `09 3E` 解析得到，但 `Emit.pen` 只发 `x/y/p/ph/b1/b2/er`。现在补 `px`（原始压力 0..16383）、`tx`、`ty`。

### 读数板

右上角常驻卡片，`top: 72px`（必须在按键带 64pt 之下，否则挡住 8 号键），宽 202pt。三行：

- `压力 1234 / 16383` + 进度条
- `归一 / 出墨 0.12 → 0.42`（出墨值 = `0.35 + 0.65 × p^0.6`，与 `shapePressure` 一致）
- `倾斜 X -12° · Y 33° · 倾角 35°`（倾角由 `atan(√(tan²x + tan²y))` 合成）

笔离开时整卡置灰、数值显示 `—`。收起后右上角留「压感」胶囊重新打开（R0）。

### 待确认

- 倾斜单位是否真是「度」。当前按 HID Digitizer 规范当度数显示，实测 `X 17° / Y 13°` 与手抬角度大致吻合，但还需在 45°、60° 两个姿态上对一下。
- 压力峰值是否真能到 16383。轻写约几百，正常书写常见 2000–8000。

---

## 2026-11-27 · 压感读数排查：「读数不对」其实是曲线太陡

用户反馈「直接按压时压力读数只动一点点，滑动时才瞬间到 100%」。用 `TS_DUMP=1` 抓了 7334 条 Digitizer 原始报文核对，**字段解析没有问题**。

### 数据证据

- 报文固定 10 字节，布局 `[id=7][flags][X lo][X hi][Y lo][Y hi][P lo][P hi][tiltX][tiltY]` 成立。
- flags 只有三种：`0xA0`（悬停）、`0xA1`（接触）、`0xC0`（离开）。
- 静止按压段：压力平滑变化，例如 `4280 → 4179 → 4115`、`5228 → 4319 → 3521`。
- 移动段：压力平滑递增，例如 `0 → 112 → 150 → 196 → 257 → 313 → 367`。
- 系数字段 `P = body[5] | body[6] << 8`，高字节自然上限 63（`16383 = 0x3FFF`），与 descriptor 的 Logical Max `0x3FFF` 一致。

### `16383` 是真的压到顶，不是 null

1768 帧等于 `16383`，占接触报文 35%。但它们前面都有平滑爬升：

```
16165 → 16222 → 16267 → 16303 → 16337 → 16365 → 16383（此后恒定）
```

是真实饱和，不是错误值。四个饱和段分别为 232 / 833 / 272 / 431 帧，每段内坐标完全不动——就是「压住不放」。

### 真正的问题：低端太陡 + 线性进度条

这张板的压感响应集中在前段：

| 力度 | 原始值 | 占满量程 |
|---|---|---|
| 轻触 | 数百 | 2–5% |
| 正常书写 | 4000–6000 | 25–37% |
| 重压 | 12000+ | 75%+ |
| 饱和 | 16383 | 100% |

线性进度条把 0–6000 这段日常区间压成 1/3 宽度，看起来就像「只动一点点」；一旦写毛笔字那种重压，直接顶到 100%，于是体感是「瞬间跳满」。

### 改法

进度条改感知映射 `sqrt(p)`，5000 显示为 56% 而不是 31%。同时把档位文字（轻触 / 轻 / 中 / 重 / 很重 / 满量程）并进「归一 / 出墨」行，避免面板变高撞到右侧浮岛。

原始压力值仍然照原样显示，不做任何修饰——它是唯一的事实来源。

### 没动的地方

`shapePressure`（`0.35 + 0.65 × p^0.6`）没有改。用户之前验收过线宽手感，改曲线会影响出墨，等明确要求再动。

## 2026-11-27 · 鼠标虚拟笔与两级样式环（add-mouse-input / turn-radial-menu-into-style-wheel）

### 统一虚拟笔

- 新增 `Web/sketch/src/tablet/mouse-input.js`：鼠标事件按 `.ts-stage` 归一化后，走与手写板完全相同的 `applyHidEvent`，压力固定 `0.5`。
- 只有绘图工具（`freedraw / eraser / rectangle / diamond / ellipse / arrow / line`）才拦截鼠标；`selection / hand / text / image` 放行原生鼠标，保证选中、框选、双击编辑文字、拖拽元素正常。
- 笔画进行中由发起源独占（`strokeSource`）；空闲时谁最后动谁生效。
- 鼠标不锁定、不裁剪、不替换光标；保留系统箭头，额外画 6pt 小圆点（落笔 8pt）。
- 拖出 `.ts-stage` 时只夹虚拟笔坐标，系统光标不受影响。
- 右键与 `\` 都映射到侧键 1（样式环），原生右键菜单让位给浮岛「更多 → 图层与链接…」。

### 两级样式环

- `style-wheel.js` 是纯函数：按图元类型给出类别、取值与 patch，内置 6 个固定色；透明度 8 档，描边宽度 3 档。
- `RadialMenu.jsx` 支持 1 项整环、2 项上下半环、3–10 项等分；超过 10 项时第 10 槽为「更多样式」，外环 `R2 = R1 + 52`。
- 当前值精确命中才高亮；非预设值不高亮，悬停提示显示真实值。
- 图片不进入样式环；混合选中先过滤图片；部分锁定只改未锁定；绑定文字不跟随形状。
- 动画：14ms/槽、单槽 64ms、总时长 ≤200ms；L2 整环 90ms；关闭立即；命中从第 0 帧起；`TS_NO_ANIM=1` 与减少动态均取消 stagger。
- 层级：scrim 60、环 70、提示 75、小圆点 65。

### 实测提醒

- 样式环靠 SVG 扇区自身命中；`Shell.jsx` 里 scrim 必须低于环，否则点扇区会被 scrim 吃掉。
- 鼠标路径不调用 `CanvasMapping`，避免两套坐标逻辑。

## 2026-11-27 · 应用图标（add-app-icon）

图标不再用 Electron 默认图，改为项目内自绘：

```
swift Tools/make-icon.swift --out /tmp/AppIcon.iconset --variant A
iconutil -c icns /tmp/AppIcon.iconset -o Resources/AppIcon.icns
```

- 视觉：深墨蓝底板 + 白色压感笔迹 + 深色触控笔与主色环；不写字。
- `make-app.sh` 会把 `.icns` 拷进 `Contents/Resources` 并设置 `CFBundleIconFile=AppIcon`。
- 尺寸链 16–1024，由 1024 主图缩放；`--variant B/C` 只是备选配色，不参与默认产物。
- 改图标只改 `Tools/make-icon.swift`，禁止手改 `.icns`。
- 未签名应用的 Dock 图标可能被系统缓存，验收前 `killall Dock` 或重登一次。

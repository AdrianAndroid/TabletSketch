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
| M5 | 素材面板三态 | 🔶 列表与详情已渲染，插入未实测 |
| M6 | 径向菜单 | ✅ 选中/空白两套槽位，圆心贴笔尖 |
| M7 | 样式气泡 | ✅ 颜色 / 线宽 / 透明三行 |
| M8 | 设置窗 | ✅ 浮层版，左导航 + 右卡片 |
| M9 | 板载键映射 | 🔶 侧键通，板载虚拟键未解析 |
| M10 | 保存 / 打开 / 多画板 | ⬜ |
| — | 打包 .app | ✅ `Scripts/make-app.sh`，未签名 |
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
Web/app/                          Electron 外壳
  main.js                         窗口 + 菜单栏 + 自测/演示序列 + 截图
  preload.js                      主世界与页面的唯一通道（CustomEvent）
  hid-bridge.js                   spawn HID 子进程，按行解析，断线重试
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
9. **验收**：`TS_DEMO=1` 八个步骤逐一截图，确认顶部条、浮岛、菜单/画布/素材下拉、径向菜单、样式气泡、设置窗、侧键弹菜单全部正常；打包版同样跑通。

---

## 还没做（按重要性）

1. **真笔验收**。所有笔链路都是注入事件验证的，没有一笔是真人画的。用户上手时重点看：压感粗细是否跟手、抬笔是否有断线、hover 到浮岛上是否能点。
2. **板载虚拟键 1–8 没解析**。Swift 侧只做了侧键（report 的 bit1/bit2）的边沿检测，板载键在 Aux Report（Report ID 3）里，还没读。
3. **画板多档管理只做了壳**。`Shell` 里 `boards` 从 localStorage 读，第一次给一张默认画板；新建 / 切换 / 保存到文件都没接。面板上「新建画布」按钮目前只改 state。
4. **素材库点击插入没验证**。`insertLibraryItem` 在桥里，`LibraryPanel` 的二级详情也接了，但没实际点过。
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
3. 手写板只读 HID，不接管系统指针，不装 KEXT。

改完别忘 `git push`。

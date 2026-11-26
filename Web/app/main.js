// TabletSketch 的 Electron 主进程。
//
// 现阶段只负责三件事：开窗口、加载 Excalidraw 产物、把笔数据转给渲染进程。
// 真正的 HID 读取在 Swift 小工具 tablet-sketch-hid 里，这里通过 spawn 拉起来，
// 逐行读 stdout 的 JSON（见 hid-bridge.js）。

const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require("electron");
const path = require("node:path");

const RENDERER = path.join(__dirname, "../../Resources/Sketch/index.html");
const DEV = !!process.env.TS_DEV;

let win = null;

function buildMenu() {
  const template = [
    {
      label: "TabletSketch",
      submenu: [
        { role: "about", label: "关于 TabletSketch" },
        { type: "separator" },
        {
          label: "设置…",
          accelerator: "CmdOrCtrl+,",
          click: () => win?.webContents.send("menu:settings")
        },
        { type: "separator" },
        { role: "hide", label: "隐藏" },
        { role: "hideOthers", label: "隐藏其他" },
        { type: "separator" },
        { role: "quit", label: "退出" }
      ]
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "togglefullscreen", label: "进入全屏" },
        { role: "resetZoom", label: "实际大小" },
        { type: "separator" },
        { role: "toggleDevTools", label: "开发者工具" }
      ]
    },
    {
      label: "窗口",
      submenu: [{ role: "minimize", label: "最小化" }, { role: "close", label: "关闭" }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#121212" : "#ffffff",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      // 一会儿要做"网页不吃事件"的输入拦截，先把默认手势关掉
      webgl: true
    }
  });

  // 窗口先出现、内容后填充，避免看到白屏加载过程
  win.once("ready-to-show", () => win.show());

  win.loadFile(RENDERER);

  win.webContents.on("did-finish-load", () => {
    if (DEV) win.webContents.openDevTools({ mode: "detach" });
    // 压感链路自测：TS_SELFTEST=1 npm start
    if (process.env.TS_SELFTEST) {
      setTimeout(() => win?.webContents.send("pen:selftest"), 3000);
      // 自测画完后抓一张窗口图，便于在无人值守时核对结果
      setTimeout(async () => {
        if (!win) return;
        const image = await win.webContents.capturePage();
        const fs = require("node:fs");
        fs.writeFileSync("/tmp/ts_shot.png", image.toPNG());
        console.log("[ts] 已截图 /tmp/ts_shot.png");
      }, 7000);
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

// 自测：进入手写板模式、切到手写工具、注入一条压力渐变的笔迹。
// 用来验证"HID 数据能否变成带压感的线条"，这是整条链路唯一的真风险点。
ipcMain.on("ts:log", (_event, message) => {
  console.log("[renderer]", message);
});

ipcMain.handle("pen:selftest", async () => {
  if (!win) return false;
  win.webContents.send("pen:selftest");
  return true;
});

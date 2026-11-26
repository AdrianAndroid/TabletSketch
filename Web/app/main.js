// TabletSketch 的 Electron 主进程。
//
// 现阶段只负责三件事：开窗口、加载 Excalidraw 产物、把笔数据转给渲染进程。
// 真正的 HID 读取在 Swift 小工具 tablet-sketch-hid 里，这里通过 spawn 拉起来，
// 逐行读 stdout 的 JSON（见 hid-bridge.js）。

const { app, BrowserWindow, Menu, ipcMain, nativeTheme, dialog } = require("electron");
const path = require("node:path");
const fsp = require("node:fs/promises");
const { HidBridge } = require("./hid-bridge");

// 开发时指向仓库里的构建产物；打包后 index.html 和本文件一起放在 Resources/app 下
const RENDERER = (() => {
  const packaged = path.join(__dirname, "sketch/index.html");
  const dev = path.join(__dirname, "../../Resources/Sketch/index.html");
  return require("node:fs").existsSync(packaged) ? packaged : dev;
})();
const DEV = !!process.env.TS_DEV;

let win = null;
let hid = null;

// 默认保存位置按 AGENTS.md R4：~/Pictures/TabletSketch/Sketches
function sketchDir() {
  return path.join(app.getPath("pictures"), "TabletSketch", "Sketches");
}

function safeName(name) {
  return String(name || "未命名画板").replace(/[/\\:*?"<>|]/g, "-").slice(0, 60);
}

ipcMain.handle("ts:save-scene", async (_event, { name, scene } = {}) => {
  try {
    const dir = sketchDir();
    await fsp.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${safeName(name)}.excalidraw`);
    // 先写临时文件再改名，避免写一半掉电把原文件毁掉
    const tmp = `${file}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(scene, null, 2), "utf8");
    await fsp.rename(tmp, file);
    return { ok: true, filePath: file };
  } catch (error) {
    return { ok: false, message: error.message };
  }
});

ipcMain.handle("ts:open-scene", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: "打开画板",
      defaultPath: sketchDir(),
      properties: ["openFile"],
      filters: [{ name: "Excalidraw", extensions: ["excalidraw", "json"] }]
    });
    if (canceled || !filePaths?.length) return { ok: false, canceled: true };
    const raw = await fsp.readFile(filePaths[0], "utf8");
    return { ok: true, scene: JSON.parse(raw), filePath: filePaths[0] };
  } catch (error) {
    return { ok: false, message: error.message };
  }
});

ipcMain.handle("ts:reveal-sketches", () => {
  const { shell } = require("electron");
  const dir = sketchDir();
  fsp.mkdir(dir, { recursive: true }).then(() => shell.openPath(dir));
  return { ok: true, dir };
});

function buildMenu() {
  const template = [
    {
      label: "TabletSketch",
      submenu: [
        { role: "about", label: "关于 TabletSketch" },
        { type: "separator" },
        {
          label: "保存画板",
          accelerator: "CmdOrCtrl+S",
          click: () => win?.webContents.send("menu:save")
        },
        {
          label: "打开画板…",
          accelerator: "CmdOrCtrl+O",
          click: () => win?.webContents.send("menu:open")
        },
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
    // 全自动验收：TS_DEMO=1 逐个打开界面并截图，人不在也能核对
    if (process.env.TS_DEMO) runDemo(win);

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

  // 独占会把整块板子从系统里拿走，切到别的应用时必须还回去，
  // 否则用户会以为鼠标/笔坏了。回焦再拿回来。
  let releaseTimer = null;
  win.on("blur", () => {
    if (!hid) return;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (win && !win.isFocused()) {
        hid?.stop();
        hid = null;
      }
    }, 260);
  });
  win.on("focus", () => {
    clearTimeout(releaseTimer);
    if (!hid) startHid();
  });

  win.on("closed", () => {
    clearTimeout(releaseTimer);
    win = null;
  });
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  startHid();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  hid?.stop();
  hid = null;
});

function runDemo(win) {
  if (!win) return;
  const fs = require("node:fs");
  const steps = [
    { name: "01-shell", code: "document.dispatchEvent(new CustomEvent('ts:selftest'))" },
    { name: "02-menu", code: "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'menu'}))" },
    { name: "03-canvas", code: "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'canvas'}))" },
    { name: "04-library", code: "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'library'}))" },
    {
      name: "04b-library-detail",
      code: "document.querySelector('.ts-lib')?.click()"
    },
    {
      name: "05-radial",
      code: "window.tabletSketch.selectAll(); window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'radial'}))"
    },
    { name: "06-bubble", code: "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'bubble'}))" },
    {
      name: "07-settings",
      code: "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'settings'}))"
    },
    {
      name: "08-sidekey",
      code:
        "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'none'}));" +
        "document.dispatchEvent(new CustomEvent('ts:hid',{detail:{t:'side',keys:[0]}}))"
    },
    {
      name: "09-save",
      code:
        "window.dispatchEvent(new CustomEvent('tablet:demo',{detail:'none'}));" +
        "window.dispatchEvent(new Event('tablet:save'))"
    },
    {
      name: "11-light",
      code: `(() => {
        const send = (ph, x, y, pr) => document.dispatchEvent(new CustomEvent('ts:hid', { detail: { t: 'pen', ph, x, y, p: pr } }));
        window.tabletSketch?.setTool('freedraw');
        setTimeout(() => {
          // 极轻的一笔：压力只有 0.02~0.06，用来验证"轻触也看得见"
          send('began', 0.28, 0.72, 0.02);
          for (let i = 1; i <= 40; i++) {
            const x = 0.28 + i * 0.006;
            const pr = 0.02 + (i / 40) * 0.04;
            setTimeout(() => send('changed', x, 0.72 + Math.sin(i / 6) * 0.02, pr), i * 8);
          }
          setTimeout(() => send('ended', 0.52, 0.72, 0), 40 * 8 + 40);
        }, 200);
      })()`
    },
    {
      name: "10-cursor",
      code:
        "document.dispatchEvent(new CustomEvent('ts:hid',{detail:{t:'pen',ph:'hover',x:0.62,y:0.38}}))"
    }
  ];
  let at = 2800;
  for (const step of steps) {
    at += step.name === "01-shell" ? 1200 : 800;
    setTimeout(() => {
      win?.webContents.executeJavaScript(step.code).catch((error) => {
        console.log("[demo] 步骤失败", step.name, error.message);
      });
    }, at);
    at += 600;
    setTimeout(async () => {
      if (!win) return;
      const image = await win.webContents.capturePage();
      const target = `/tmp/ts_demo_${step.name}.png`;
      fs.writeFileSync(target, image.toPNG());
      console.log("[demo] 截图", target);
    }, at);
  }
}

function startHid() {
  hid = new HidBridge({
    onEvent: (payload) => win?.webContents.send("pen:event", payload),
    onStatus: (status) => {
      console.log("[hid]", status.state, status.message || "");
      win?.webContents.send("pen:status", status);
    }
  });
  hid.start();
}

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

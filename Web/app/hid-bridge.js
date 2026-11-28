// HID 桥：spawn Swift 采集器，把 stdout 的逐行 JSON 转成 IPC 事件。
//
// 设计要点：
// - 子进程挂了要自动重启，但连续失败就停手，避免疯狂 fork 把机器拖死。
// - 父进程退出时必须杀掉子进程，否则会留下孤儿进程一直占着 HID 句柄。

const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const REPO_ROOT = path.join(__dirname, "../..");

function resolveBinary() {
  const candidates = [
    // 打包后：Contents/Resources/app/bin/tablet-sketch-hid
    path.join(__dirname, "bin/tablet-sketch-hid"),
    path.join(REPO_ROOT, ".build/release/tablet-sketch-hid"),
    path.join(REPO_ROOT, ".build/debug/tablet-sketch-hid")
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

class HidBridge {
  constructor({ onEvent, onStatus }) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
    this.child = null;
    this.retries = 0;
    this.maxRetries = 3;
    this.stopped = false;
    this.buffer = "";
    /** 独占失败的原因：permission（缺输入监控）/ busy（被别的进程占用）。 */
    this.grabBlocked = null;
  }

  start() {
    if (this.child) return;
    this.stopped = false;
    const binary = resolveBinary();
    if (!binary) {
      this.onStatus?.({ state: "missing", message: "找不到 tablet-sketch-hid，请先 swift build" });
      return;
    }

    // --grab：独占设备，系统指针不再跟随笔；采集器退出时自动释放
    const args = process.env.TS_NO_GRAB ? [] : ["--grab"];
    // TS_DUMP=1：把 vendor 通道原始报文按帧去重后打到 stdout，用来对拍板载键编码
    if (process.env.TS_DUMP === "1") args.push("--dump");
    this.child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });

    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.consume(chunk));

    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (text) => {
      this.onStatus?.({ state: "stderr", message: text.trim() });
    });

    this.child.on("error", (error) => {
      this.onStatus?.({ state: "error", message: String(error) });
    });

    this.child.on("exit", (code) => {
      this.child = null;
      if (this.stopped) return;

      if (code === 2) {
        // 找不到设备：不重启，等用户接上板子再手动重试
        this.onStatus?.({ state: "no-device", message: "未检测到手写板" });
        return;
      }
      if (code === 3) {
        this.onStatus?.({ state: "no-permission", message: "缺少输入监控权限" });
        return;
      }
      if (this.retries >= this.maxRetries) {
        this.onStatus?.({ state: "failed", message: `采集器反复退出（${code}）` });
        return;
      }
      this.retries += 1;
      setTimeout(() => this.start(), 800);
    });

    this.onStatus?.({ state: "starting", message: "正在连接手写板" });
  }

  /** 按行切分：一次 data 可能是半行，也可能是好几行。 */
  consume(chunk) {
    this.buffer += chunk;
    let index = this.buffer.indexOf("\n");
    while (index >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (line) this.handleLine(line);
      index = this.buffer.indexOf("\n");
    }
  }

  handleLine(line) {
    let payload;
    try {
      payload = JSON.parse(line);
    } catch {
      return;
    }

    if (payload.t === "ready") {
      this.retries = 0;
      // 独占没成功时不能只报“已连接”：那样板载键失效会完全无声无息。
      if (this.grabBlocked === "permission") {
        this.onStatus?.({
          state: "no-permission",
          message: "只读模式：缺少「输入监控」权限，板载键不可用"
        });
      } else if (this.grabBlocked === "busy") {
        this.onStatus?.({
          state: "readonly",
          message: `已连接 ${payload.product}（只读，板载键暂不可用）`
        });
      } else {
        this.onStatus?.({ state: "ready", message: `已连接 ${payload.product}` });
      }
      return;
    }
    if (payload.t === "error") {
      this.onStatus?.({ state: "error", message: payload.reason });
      return;
    }
    if (payload.t === "grab") {
      if (payload.ok) {
        this.grabBlocked = null;
      } else {
        this.grabBlocked = payload.reason === "permission" ? "permission" : "busy";
      }
      this.onStatus?.({
        state: payload.ok ? "grabbed" : "grab-failed",
        message: payload.ok
          ? "已独占手写板"
          : payload.reason === "permission"
            ? "缺少「输入监控」权限，无法独占（板载键不可用）"
            : "独占失败，退回只读"
      });
      return;
    }
    if (payload.t === "bye") {
      this.onStatus?.({ state: "closed", message: "采集器已退出" });
      return;
    }

    this.onEvent?.(payload);
  }

  stop() {
    this.stopped = true;
    if (this.child) {
      this.child.kill("SIGTERM");
      this.child = null;
    }
  }
}

module.exports = { HidBridge, resolveBinary };

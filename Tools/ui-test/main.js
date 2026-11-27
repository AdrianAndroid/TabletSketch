// ui-test/main.js — 离屏浮岛回归测试。
//
// 不显示窗口、不启动 HID、不抢焦点。用隔离的 userData，避免和正在运行的应用打架。
// 用法：
//   Web/app/node_modules/.bin/electron Tools/ui-test/main.js
//
// 结果同时打印到 stdout 和 /tmp/ts-ui-test.json。

const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

app.setPath("userData", "/tmp/ts-ui-test-profile");
if (app.dock) app.dock.hide();

const ROOT = path.resolve(__dirname, "../..");
const INDEX = path.join(ROOT, "Resources/Sketch/index.html");
const PRELOAD = path.join(ROOT, "Web/app/preload.js");

function waitFor(win, expression, timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const value = await win.webContents.executeJavaScript(expression, true);
        if (value) return resolve(value);
      } catch {
        /* 页面还没就绪 */
      }
      if (Date.now() - started > timeoutMs) return reject(new Error("timeout: " + expression));
      setTimeout(tick, 120);
    };
    tick();
  });
}

const SCENARIO = String.raw`(async () => {
  const results = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail) });
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const topAt = (x, y) => document.elementFromPoint(x, y);
  const inClosest = (x, y, sel) => !!topAt(x, y)?.closest?.(sel);
  const cell = (i) => $$(".ts-cell")[i];
  const panelTitle = () => $(".ts-panel-title")?.textContent?.trim() || null;
  const click = (el) => el?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  const closePanel = () => click($(".ts-panel-close"));
  const pointer = (type, x, y, target, button = 0) =>
    (target || window).dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      button, buttons: type === "pointerup" ? 0 : (button === 0 ? 1 : 2),
      pointerId: 77, pointerType: "mouse", isPrimary: true
    }));

  // ---------- 结构 ----------
  const island = $(".ts-island");
  log("浮岛存在", !!island);
  const cells = $$(".ts-cell");
  log("浮岛格数 16（15 格 + 更多）", cells.length === 16, cells.length);
  const grip = $(".ts-island-grip");
  const gr = grip ? grip.getBoundingClientRect() : null;
  log("拖动手柄可命中（≥12px 高）", !!gr && gr.height >= 12 && gr.width >= 12, gr ? Math.round(gr.width) + "x" + Math.round(gr.height) : "missing");
  if (gr) {
    const g = center(grip);
    log("手柄中心命中手柄", inClosest(g.x, g.y, ".ts-island-grip"), topAt(g.x, g.y)?.className || "");
  }

  // ---------- 读数板避让 ----------
  const tele = $(".ts-tele");
  if (tele) {
    const a = $(".ts-island").getBoundingClientRect();
    const b = tele.getBoundingClientRect();
    const overlap = !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
    log("读数板与浮岛不重叠", !overlap, Math.round(b.left) + ".." + Math.round(b.right) + " vs " + Math.round(a.left) + ".." + Math.round(a.right));
    log("读数板在浮岛对侧", b.right <= a.left || b.left >= a.right, "");
  } else {
    log("读数板与浮岛不重叠", false, "读数板不存在");
  }

  // ---------- 拖动换边 ----------
  if (gr) {
    const before = island.className;
    let g = center($(".ts-island-grip"));
    const r0 = $(".ts-island").getBoundingClientRect();
    pointer("pointerdown", g.x, g.y, $(".ts-island-grip"));
    pointer("pointermove", g.x - 150, g.y, window);
    await sleep(80);
    const r1 = $(".ts-island").getBoundingClientRect();
    log("拖动实时跟手", Math.abs(r1.left - (r0.left - 150)) < 8,
        Math.round(r1.left - r0.left) + "," + Math.round(r1.top - r0.top));
    pointer("pointerup", g.x - 150, g.y, window);
    await sleep(280);
    log("跟手后仍吸附到右侧", $(".ts-island").className.includes("ts-island--right"), $(".ts-island").className);

    g = center($(".ts-island-grip"));
    pointer("pointerdown", g.x, g.y, $(".ts-island-grip"));
    pointer("pointermove", 70, g.y, window);
    pointer("pointerup", 70, g.y, window);
    await sleep(280);
    log("拖动换到左侧", $(".ts-island").className.includes("ts-island--left"), before + " -> " + $(".ts-island").className);
    log("位置已持久化", !!localStorage.getItem("tablet.island.pos"), localStorage.getItem("tablet.island.pos") || "null");

    g = center($(".ts-island-grip"));
    pointer("pointerdown", g.x, g.y, $(".ts-island-grip"));
    pointer("pointermove", window.innerWidth - 70, g.y, window);
    pointer("pointerup", window.innerWidth - 70, g.y, window);
    await sleep(260);
    log("拖动回到右侧", $(".ts-island").className.includes("ts-island--right"), $(".ts-island").className);

    // 拖到左侧后，读数板应回到右侧
    g = center($(".ts-island-grip"));
    pointer("pointerdown", g.x, g.y, $(".ts-island-grip"));
    pointer("pointermove", 70, g.y, window);
    pointer("pointerup", 70, g.y, window);
    await sleep(260);
    const t2 = $(".ts-tele");
    if (t2) {
      const ai = $(".ts-island").getBoundingClientRect();
      const bi = t2.getBoundingClientRect();
      log("浮岛在左时读数板在右", bi.left >= ai.right, Math.round(bi.left) + " >= " + Math.round(ai.right));
    }
    // 双击把手复位
    const gg = center($(".ts-island-grip"));
    $(".ts-island-grip").dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: gg.x, clientY: gg.y }));
    await sleep(300);
    const rr = $(".ts-island").getBoundingClientRect();
    log("双击把手复位到右侧", $(".ts-island").className.includes("ts-island--right"), $(".ts-island").className);
    log("复位后垂直居中", Math.abs((rr.top + rr.bottom) / 2 - window.innerHeight / 2) < 20,
        Math.round((rr.top + rr.bottom) / 2) + " vs " + Math.round(window.innerHeight / 2));
  }

  // ---------- 面板遮挡 ----------
  closePanel();
  click(cell(0));
  await sleep(160);
  log("点「菜单」打开面板", panelTitle() === "菜单", panelTitle());
  const panel = $(".ts-panel");
  if (panel) {
    const p = center(panel);
    const top = topAt(p.x, p.y);
    log("面板中心在最上层", inClosest(p.x, p.y, ".ts-panel"), top?.className || top?.tagName || "null");
    const c = center(cells[3]);
    log("面板打开时浮岛仍可点", inClosest(c.x, c.y, ".ts-island"), topAt(c.x, c.y)?.className || "null");
  } else {
    log("面板中心在最上层", false, "面板没出现");
  }

  // ---------- 面板内按钮 ----------
  const rows = $$(".ts-panel .ts-row");
  log("菜单含「设置…」", rows.some((r) => r.textContent.includes("设置")), rows.map((r) => r.textContent.trim()).join(" | "));
  const settingsRow = rows.find((r) => r.textContent.includes("设置"));
  if (settingsRow) {
    const sr = center(settingsRow);
    const hit = topAt(sr.x, sr.y);
    log("「设置…」在最上层可点", !!hit?.closest?.(".ts-row"), hit?.className || hit?.tagName || "null");
    click(hit);
    await sleep(220);
    log("设置窗打开", !!$(".ts-card"), $(".ts-card-title")?.textContent || "");
    log("设置含「样式环」页", $$(".ts-nav-item").some((n) => n.textContent.includes("样式环")), "");
    log("设置无「径向」页", !$$(".ts-nav-item").some((n) => n.textContent.includes("径向")), "");
    const ringNav = $$(".ts-nav-item").find((n) => n.textContent.includes("样式环"));
    click(ringNav);
    await sleep(160);
    log("样式环页为只读说明", !!$(".ts-card-note") && !$(".ts-settings-main input"), $(".ts-card-note")?.textContent || "");
    click($(".ts-settings-head .ts-panel-close"));
    await sleep(120);
  }
  closePanel();
  await sleep(80);

  // ---------- 每个工具格 ----------
  const toolCases = [
    [3, "freedraw", "笔"], [4, "eraser", "擦"], [5, "hand", "手"],
    [6, "selection", "选"], [7, "rectangle", "矩"], [8, "ellipse", "椭"],
    [9, "arrow", "箭"], [10, "text", "字"], [11, "diamond", "菱"],
    [12, "line", "线"], [13, "image", "图"]
  ];
  for (const [index, tool, label] of toolCases) {
    const c = cell(index);
    if (!c) { log("工具 " + label, false, "格子不存在"); continue; }
    const r = center(c);
    const hit = topAt(r.x, r.y);
    if (!hit?.closest?.(".ts-cell")) { log("工具 " + label, false, "被遮挡: " + (hit?.className || hit?.tagName)); continue; }
    click(hit);
    await sleep(90);
    const got = window.tabletSketch?.getTool?.();
    log("工具 " + label + " 生效", got === tool, "got=" + got);
    closePanel();
    await sleep(40);
  }

  // ---------- 面板：画布 / 素材 ----------
  closePanel();
  click(cell(1));
  await sleep(140);
  log("点「画布」打开面板", (panelTitle() || "").startsWith("画布"), panelTitle());
  closePanel();

  click(cell(2));
  await sleep(400);
  log("点「素材」打开面板", (panelTitle() || "").startsWith("素材"), panelTitle());

  // 素材详情：缩略图 + 点击直接贴到画布
  const firstLibrary = $$(".ts-lib")[0];
  if (firstLibrary) {
    click(firstLibrary);
    let waited = 0;
    while (waited < 6000 && !$$(".ts-lib-thumb svg").length) {
      await sleep(200);
      waited += 200;
    }
    log("素材缩略图渲染", $$(".ts-lib-thumb svg").length > 0, $$(".ts-lib-thumb svg").length + " / " + $$(".ts-lib-item").length);
    const beforeCount = window.tabletSketch?.getSceneElements?.().length || 0;
    const firstItem = $(".ts-lib-item");
    if (firstItem) {
      const r = center(firstItem);
      const hit = topAt(r.x, r.y);
      log("素材项在最上层可点", !!hit?.closest?.(".ts-lib-item"), hit?.className || hit?.tagName || "null");
      click(hit || firstItem);
      await sleep(600);
      const afterCount = window.tabletSketch?.getSceneElements?.().length || 0;
      log("点击素材贴到画布", afterCount > beforeCount, beforeCount + " -> " + afterCount);
      log("插入后进入选中态", (window.tabletSketch?.getContext?.().selectedCount || 0) > 0, "");
    } else {
      log("点击素材贴到画布", false, "详情里没有素材项");
    }
  } else {
    log("素材缩略图渲染", false, "素材库列表为空");
  }
  closePanel();

  // ---------- 更多面板 ----------
  closePanel();
  // 清掉刚才插入素材的选中，验证「无选中置灰」
  window.tabletSketch?.clearSelection?.();
  await sleep(180);
  log("清空选中", (window.tabletSketch?.getContext?.().selectedCount || 0) === 0,
      window.tabletSketch?.getContext?.().selectedCount);
  click(cell(15));
  await sleep(160);
  log("点「更多」打开面板", panelTitle() === "更多", panelTitle());
  const moreRows = $$(".ts-panel .ts-row").map((r) => ({
    text: r.textContent.replace(/\s+/g, " ").trim(),
    disabled: r.classList.contains("is-disabled")
  }));
  const has = (t) => moreRows.some((r) => r.text.includes(t));
  log("更多含 撤销/重做", has("撤销") && has("重做"), "");
  log("更多含 样式环", has("样式环"), "");
  log("更多含 副本/删除/全选", has("副本") && has("删除") && has("全选"), "");
  log("更多含 图层与链接", has("图层与链接"), "");
  log("更多含 保存/适应", has("保存画板") && has("适应画布"), "");
  const styleRow = $$(".ts-panel .ts-row").find((r) => r.textContent.includes("样式环"));
  log("无选中时「样式环」置灰", !!styleRow && styleRow.classList.contains("is-disabled"), styleRow?.className || "missing");
  closePanel();

  // ---------- 双排布局不溢出 ----------
  const ir = $(".ts-island").getBoundingClientRect();
  log("浮岛在窗口内", ir.top >= 0 && ir.bottom <= window.innerHeight && ir.left >= 0 && ir.right <= window.innerWidth,
      Math.round(ir.top) + ".." + Math.round(ir.bottom) + " / " + window.innerHeight);

  return results;
})()`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 760,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  let results = [];
  try {
    await win.loadFile(INDEX);
    await waitFor(win, "!!document.body");
    await win.webContents.executeJavaScript('localStorage.removeItem("tablet.island.pos")', true);
    await win.reload();
    await waitFor(win, "!!(window.tabletSketch && window.tabletSketch.ready)");
    await new Promise((r) => setTimeout(r, 600));
    results = await win.webContents.executeJavaScript(SCENARIO, true);
  } catch (error) {
    results = [{ name: "测试中断", ok: false, detail: error.message }];
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n===== 浮岛回归 =====");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  [" + r.detail + "]" : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);

  fs.writeFileSync("/tmp/ts-ui-test.json", JSON.stringify(results, null, 2));
  app.exit(failed.length ? 1 : 0);
});

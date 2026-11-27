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

  // 用 ts:hid 模拟真实笔报告，client 坐标转归一化后送进同一个事件源
  const penClient = (phase, clientX, clientY) => {
    const s = $(".ts-stage")?.getBoundingClientRect();
    if (!s) return;
    document.dispatchEvent(new CustomEvent("ts:hid", {
      detail: {
        t: "pen", ph: phase,
        x: (clientX - s.left) / Math.max(1, s.width),
        y: (clientY - s.top) / Math.max(1, s.height),
        p: 0.5
      }
    }));
  };

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

    // 非选择工具下，笔必须能直接拖动把手（把手本身就是拖动入口）
    click(cell(4));
    await sleep(120);
    const toolBeforeDrag = window.tabletSketch?.getTool?.();
    g = center($(".ts-island-grip"));
    const smallX = g.x - Math.min(8, gr.width / 4);
    const beforeSmall = $(".ts-island").getBoundingClientRect().left;
    penClient("began", g.x, g.y);
    penClient("changed", smallX, g.y);
    await sleep(60);
    const duringSmall = $(".ts-island").getBoundingClientRect().left;
    log("笔在把手内小幅移动即跟手", Math.abs(duringSmall - beforeSmall) > 4,
        Math.round(duringSmall - beforeSmall) + "px, hit=" + (topAt(smallX, g.y)?.className || ""));
    penClient("ended", smallX, g.y);
    await sleep(120);

    const inkBeforeDrag = window.tabletSketch?.getSceneElements?.().length || 0;
    g = center($(".ts-island-grip"));
    penClient("began", g.x, g.y);
    penClient("changed", g.x - 120, g.y);
    penClient("changed", 70, g.y);
    penClient("ended", 70, g.y);
    await sleep(300);
    log("非选择工具下笔可拖动浮岛", $(".ts-island").className.includes("ts-island--left"),
        toolBeforeDrag + " -> " + $(".ts-island").className);
    log("拖浮岛不在画布落笔", (window.tabletSketch?.getSceneElements?.().length || 0) === inkBeforeDrag,
        "before=" + inkBeforeDrag + " after=" + (window.tabletSketch?.getSceneElements?.().length || 0));
    log("笔拖浮岛不改写工具", window.tabletSketch?.getTool?.() === toolBeforeDrag,
        window.tabletSketch?.getTool?.());

    // 复位到右侧，避免影响后续断言
    g = center($(".ts-island-grip"));
    pointer("pointerdown", g.x, g.y, $(".ts-island-grip"));
    pointer("pointermove", window.innerWidth - 70, g.y, window);
    pointer("pointerup", window.innerWidth - 70, g.y, window);
    await sleep(260);
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

  // ---------- 笔点浮岛工具格：工具保持 ----------
  const stage = $(".ts-stage");
  const penAt = (el, phase, nx, ny) => {
    const s = stage?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    const x = r ? (r.left + r.width / 2 - s.left) / s.width : nx;
    const y = r ? (r.top + r.height / 2 - s.top) / s.height : ny;
    document.dispatchEvent(new CustomEvent("ts:hid", { detail: { t: "pen", ph: phase, x, y, p: 0.5 } }));
  };
  const penClickCell = (el) => { penAt(el, "began"); penAt(el, "ended"); };

  click(cell(6));
  await sleep(120);
  log("笔测试前置：选工具已生效", window.tabletSketch?.getTool?.() === "selection", window.tabletSketch?.getTool?.());

  penClickCell(cell(4));
  await sleep(150);
  log("笔点浮岛工具格生效", window.tabletSketch?.getTool?.() === "eraser", window.tabletSketch?.getTool?.());
  await sleep(200);
  log("笔点后工具保持不跳回画笔", window.tabletSketch?.getTool?.() === "eraser", window.tabletSketch?.getTool?.());

  if (stage) {
    const s = stage.getBoundingClientRect();
    const probe = topAt(s.left + s.width * 0.45, s.top + s.height * 0.55);
    log("画布空白落点未被 UI 遮挡", !probe?.closest?.("[data-ts-ui]"), probe?.className || probe?.tagName || "null");

    // 选矩形后用笔落画布：began 阶段工具不应被改写成画笔
    click(cell(7));
    await sleep(120);
    penAt(null, "began", 0.45, 0.55);
    await sleep(30);
    const penToolOnBegan = window.tabletSketch?.getTool?.();
    penAt(null, "ended", 0.45, 0.55);
    await sleep(180);
    log("笔落画布不改写工具", penToolOnBegan === "rectangle", "began=" + penToolOnBegan);

    // 鼠标走同样流程，对比 began 阶段是否一致
    click(cell(7));
    await sleep(120);
    const mx = s.left + s.width * 0.55;
    const my = s.top + s.height * 0.55;
    pointer("pointerdown", mx, my, topAt(mx, my));
    await sleep(30);
    const mouseToolOnDown = window.tabletSketch?.getTool?.();
    pointer("pointerup", mx, my, window);
    await sleep(180);
    log("笔与鼠标落笔工具一致", penToolOnBegan === mouseToolOnDown,
        "pen=" + penToolOnBegan + " mouse=" + mouseToolOnDown);
  } else {
    log("画布空白落点未被 UI 遮挡", false, ".ts-stage 不存在");
    log("笔落画布不改写工具", false, ".ts-stage 不存在");
    log("笔与鼠标落笔工具一致", false, ".ts-stage 不存在");
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

  // ---------- 统一光标 ----------
  window.dispatchEvent(new CustomEvent("tablet:mousepos", { detail: { x: 500, y: 600, down: false } }));
  await sleep(150);
  const mouseTransform = $(".ts-pen-cursor")?.style.transform || "";
  log("鼠标带动同一个指示器", mouseTransform.includes("500") && mouseTransform.includes("600"), mouseTransform || "missing");
  log("没有鼠标专属小点", !$(".ts-mouse-dot"), $(".ts-mouse-dot") ? "still present" : "removed");

  click(cell(7));
  await sleep(250);
  log("矩形工具显示十字", !!$(".ts-pen-cursor.is-cross"), $(".ts-pen-cursor")?.className || "missing");
  log("系统光标未被隐藏", getComputedStyle(document.body).cursor !== "none", getComputedStyle(document.body).cursor);

  click(cell(6));
  await sleep(250);
  log("选择工具回到圆环", !$(".ts-pen-cursor.is-cross"), $(".ts-pen-cursor")?.className || "missing");

  // ---------- 样式环扇区必须不透明 ----------
  const probeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probeSvg.setAttribute("width", "20");
  probeSvg.setAttribute("height", "20");
  probeSvg.innerHTML = '<path class="ts-radial-path" d="M0 0 L10 0 L10 10 Z"></path>' +
    '<path class="ts-radial-path is-hover" d="M0 0 L10 0 L10 10 Z"></path>';
  document.body.appendChild(probeSvg);
  const radialFills = Array.from(probeSvg.querySelectorAll("path")).map((p) => getComputedStyle(p).fill);
  const isSolidFill = (value) => /^rgb\(/.test(value || "") && !/^rgba\(/.test(value || "");
  log("样式环普通扇区实色", isSolidFill(radialFills[0]), radialFills[0] || "missing");
  log("样式环高亮扇区实色", isSolidFill(radialFills[1]), radialFills[1] || "missing");
  probeSvg.remove();

  document.dispatchEvent(new CustomEvent("ts:hid", { detail: { t: "pen", ph: "hover", x: 0.5, y: 0.5 } }));
  await sleep(160);
  const penTransform = $(".ts-pen-cursor")?.style.transform || "";
  log("手写笔驱动同一指示器", penTransform.length > 0 && penTransform !== mouseTransform, penTransform || "missing");

  // 让鼠标重新成为最后活动源，再移出
  window.dispatchEvent(new CustomEvent("tablet:mousepos", { detail: { x: 420, y: 520, down: false } }));
  await sleep(100);
  window.dispatchEvent(new CustomEvent("tablet:mousepos", { detail: null }));
  await sleep(120);
  // 光标 DOM 常驻，靠 display 控制显隐（避免高频挂载/卸载）
  const hiddenCursor = $(".ts-pen-cursor");
  log(
    "鼠标移出隐藏指示器",
    !hiddenCursor || hiddenCursor.style.display === "none",
    hiddenCursor ? "display=" + (hiddenCursor.style.display || "visible") : "no dom"
  );
  window.dispatchEvent(new CustomEvent("tablet:mousepos", { detail: { x: 430, y: 530, down: false } }));
  await sleep(120);
  const shownCursor = $(".ts-pen-cursor");
  log(
    "鼠标移入恢复指示器",
    !!shownCursor && shownCursor.style.display !== "none" && shownCursor.style.transform.includes("430"),
    shownCursor?.style.transform || "missing"
  );

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

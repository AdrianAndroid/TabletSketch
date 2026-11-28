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
    log("读数板固定在右上", b.left > window.innerWidth / 2 && b.top < 120,
        Math.round(b.left) + "," + Math.round(b.top));
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
    await sleep(160);
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
    const afterLeftDrag = $(".ts-island").getBoundingClientRect();
    log("拖动被禁在右半区", afterLeftDrag.left >= window.innerWidth * 0.55 - 2,
        Math.round(afterLeftDrag.left) + " vs " + Math.round(window.innerWidth * 0.55));
    log("浮岛不吸附到左侧", !$(".ts-island").className.includes("ts-island--left"), before + " -> " + $(".ts-island").className);
    log("位置已持久化", !!localStorage.getItem("tablet.island.pos"), localStorage.getItem("tablet.island.pos") || "null");

    g = center($(".ts-island-grip"));
    pointer("pointerdown", g.x, g.y, $(".ts-island-grip"));
    pointer("pointermove", window.innerWidth - 70, g.y, window);
    pointer("pointerup", window.innerWidth - 70, g.y, window);
    await sleep(260);
    log("拖动回到右侧", $(".ts-island").className.includes("ts-island--right"), $(".ts-island").className);

    // 读数板固定右上，不随工具岛换边
    const t2 = $(".ts-tele");
    if (t2) {
      const bi = t2.getBoundingClientRect();
      log("读数板固定右上", bi.left > window.innerWidth / 2 && bi.top < 120,
          Math.round(bi.left) + "," + Math.round(bi.top));
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
    await sleep(160);
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
    const penDragged = $(".ts-island").getBoundingClientRect();
    log("非选择工具下笔可拖动浮岛且禁左", penDragged.left >= window.innerWidth * 0.55 - 2,
        toolBeforeDrag + " left=" + Math.round(penDragged.left));
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
    const navTexts = $$(".ts-nav-item").map((n) => n.textContent.trim());
    log("设置含「布局」分组五页", ["左浮动岛", "右浮动岛", "手写笔键 1", "手写笔键 2", "板载键"].every((label) => navTexts.includes(label)), navTexts.join(" | "));
    log("设置含「配置档」页", navTexts.includes("配置档"), "");
    log("设置含「图形样式」页", navTexts.includes("图形样式"), navTexts.join(" | "));
    log("旧死设置页已删除", !navTexts.includes("样式环") && !navTexts.includes("更多") && !navTexts.includes("气泡"), "");

    // 关闭按钮必须排除窗口拖动区，否则鼠标点击被 Electron 吞掉。
    const closeBtn = $(".ts-settings-head .ts-panel-close");
    log("设置 X 按钮排除拖动区", !!closeBtn && getComputedStyle(closeBtn).webkitAppRegion === "no-drag",
        closeBtn ? getComputedStyle(closeBtn).webkitAppRegion : "missing");

    // 右岛布局页：候选池、顺序列表、预览、排布参数。
    const rightNav = $$(".ts-nav-item").find((n) => n.textContent.includes("右浮动岛"));
    click(rightNav);
    await sleep(180);
    log("右岛页有形态预览", !!$(".ts-layout-preview"), "");
    log("右岛页有顺序列表", $$(".ts-layout-chip").length > 0, String($$(".ts-layout-chip").length));
    log("右岛页有候选池", $$(".ts-layout-pool-item").length > 0, String($$(".ts-layout-pool-item").length));
    log("右岛候选池排除样式类别", !$$(".ts-layout-pool-label").some((n) => n.textContent.includes("样式类别")), "");

    // 笔键 1 页：样式取值可编辑。
    const key1Nav = $$(".ts-nav-item").find((n) => n.textContent.includes("手写笔键 1"));
    click(key1Nav);
    await sleep(180);
    log("键1页有样式取值编辑", !!$(".ts-values-block"), "");
    const valuesHead = $(".ts-values-head");
    if (valuesHead) {
      click(valuesHead);
      await sleep(120);
      log("样式取值可展开编辑", !!$(".ts-values-body"), "");
    }

    // 板载键页：改动作后广播布局事件。
    const onboardNav = $$(".ts-nav-item").find((n) => n.textContent.includes("板载键"));
    click(onboardNav);
    await sleep(180);
    const beforeSlots = $$(".ts-layout-chip").length;
    log("板载键页显示 8 位", beforeSlots === 8, String(beforeSlots));

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

  // ---------- 笔侧键 2 工具环 ----------
  window.dispatchEvent(new CustomEvent("tablet:keys", { detail: { kind: "side", keys: [1], source: "pen" } }));
  await sleep(180);
  log("侧键2打开环形菜单", !!$(".ts-radial"), $(".ts-radial") ? "shown" : "missing");
  log("工具环内圈9槽", $$(".ts-radial-inner .ts-radial-slot").length === 9,
      $$(".ts-radial-inner .ts-radial-slot").length + " 槽");
  log("侧键2不再弹样式气泡", !$(".ts-bubble"), $(".ts-bubble") ? "still shown" : "hidden");
  const moreSlot = $('.ts-radial [data-ts-radial-key="more"]');
  log("工具环含更多入口", !!moreSlot, moreSlot ? "found" : "missing");
  if (moreSlot) {
    click(moreSlot);
    await sleep(180);
    log("更多展开5个外圈槽位", $$(".ts-radial-outer .ts-radial-slot").length === 5,
        $$(".ts-radial-outer .ts-radial-slot").length + " 槽");
    const arrowSlot = $('.ts-radial [data-ts-radial-key="arrow"]');
    if (arrowSlot) {
      click(arrowSlot);
      await sleep(180);
      log("工具环点选切换工具", window.tabletSketch?.getTool?.() === "arrow",
          window.tabletSketch?.getTool?.() || "missing");
      log("点选后工具环关闭", !$(".ts-radial"), $(".ts-radial") ? "still shown" : "closed");
    }
  }

  // ---------- 锁槽：工具锁而非元素锁 ----------
  const getLockCell = () => cell(14);
  const lockCell = getLockCell();
  log("浮岛第15格为锁槽", !!lockCell && lockCell.title.includes("锁"), lockCell?.title || "missing");
  if (lockCell) {
    const beforeAllLocked = window.tabletSketch?.getContext?.().allLocked;
    click(lockCell);
    await sleep(520);
    log("点锁槽开启工具锁", window.tabletSketch?.getToolLocked?.() === true,
        String(window.tabletSketch?.getToolLocked?.()));
    log("锁槽开启显示当前态", !!getLockCell()?.classList.contains("is-on"), getLockCell()?.className || "missing");
    log("点锁槽不改元素锁定态", window.tabletSketch?.getContext?.().allLocked === beforeAllLocked,
        String(beforeAllLocked) + " -> " + String(window.tabletSketch?.getContext?.().allLocked));
    click(getLockCell());
    await sleep(520);
    log("再点锁槽关闭工具锁", window.tabletSketch?.getToolLocked?.() === false,
        String(window.tabletSketch?.getToolLocked?.()));
    log("锁槽关闭取消当前态", !getLockCell()?.classList.contains("is-on"), getLockCell()?.className || "missing");
  }

  // ---------- 左侧样式浮动岛 ----------
  window.tabletSketch?.clearSelection?.();
  await sleep(500);
  log("无选中时左侧样式岛隐藏", !$(".ts-left-style"), $(".ts-left-style") ? "still shown" : "hidden");

  // 造一个矩形并选中，等 400ms 轮询刷新左岛上下文
  const beforeRect = window.tabletSketch?.getSceneElements?.().length || 0;
  click(cell(7)); // 矩形
  await sleep(100);
  const rs = $(".ts-stage")?.getBoundingClientRect();
  if (rs) {
    const rx = rs.left + rs.width * 0.32;
    const ry = rs.top + rs.height * 0.38;
    pointer("pointerdown", rx, ry, topAt(rx, ry));
    pointer("pointermove", rx + 90, ry + 60, window);
    pointer("pointerup", rx + 90, ry + 60, window);
  }
  await sleep(200);
  window.tabletSketch?.selectAll?.();
  await sleep(520);
  const rectCount = window.tabletSketch?.getSceneElements?.().length || 0;
  log("左岛测试前置：已有选中图元", rectCount > beforeRect && (window.tabletSketch?.getContext?.().selectedCount || 0) > 0,
      beforeRect + " -> " + rectCount + " sel=" + (window.tabletSketch?.getContext?.().selectedCount || 0));
  log("有选中时左侧样式岛显示", !!$(".ts-left-style"), $(".ts-left-style") ? "shown" : "missing");

  const styleBtns = $$(".ts-left-style [data-ts-style-key]");
  log("左岛显示类别按钮", styleBtns.length > 0, styleBtns.length + " 类");
  const strokeBtn = styleBtns.find((b) => b.getAttribute("data-ts-style-key") === "stroke");
  log("左岛含描边类别", !!strokeBtn, styleBtns.map((b) => b.getAttribute("data-ts-style-key")).join(","));

  if (strokeBtn) {
    const sr = center(strokeBtn);
    // 快速掠过：停留不足 100ms 不展开
    window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: { x: sr.x, y: sr.y, down: false } }));
    await sleep(45);
    window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: { x: sr.x + 500, y: sr.y, down: false } }));
    await sleep(150);
    log("笔掠过不展开取值条", !$(".ts-left-style-values"), $(".ts-left-style-values") ? "expanded" : "collapsed");

    // 悬停 100ms：高亮并自动展开取值条（笔位置经 tablet:penpos，与真实笔同一事件源）
    window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: { x: sr.x, y: sr.y, down: false } }));
    await sleep(340);
    // 重新取节点：悬停会触发展开与重渲染，旧引用可能不是当前按钮。
    const hoveredBtn = $$(".ts-left-style [data-ts-style-key]").find(
      (b) => b.getAttribute("data-ts-style-key") === "stroke"
    );
    log("笔悬停类别按钮高亮", !!hoveredBtn?.classList.contains("is-hover"), hoveredBtn?.className || "missing");
    const values = $(".ts-left-style-values");
    log("悬停即展开取值条", !!values, values ? "expanded" : "missing");

    // 点击已展开的类别：幂等保持展开，不收起
    click(strokeBtn);
    await sleep(120);
    log("点击类别保持展开", !!$(".ts-left-style-values"), $(".ts-left-style-values") ? "expanded" : "collapsed");
    if (values) {
      const vals = $$(".ts-left-style-value");
      log("取值条用现有预设", vals.length >= 6, vals.length + " 项");
      const bg = getComputedStyle(values).backgroundColor;
      log("取值条背景不透明", /^rgb\(/.test(bg || "") && !/^rgba\(/.test(bg || ""), bg);
      log("取值条在 data-ts-ui 内", !!values.closest("[data-ts-ui]"), "");

      // 笔悬停取值项应高亮（笔位置经 tablet:penpos，不靠 CSS :hover）
      const hoverTarget = vals.find((v) => !v.classList.contains("is-current")) || vals[0];
      const hr = center(hoverTarget);
      window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: { x: hr.x, y: hr.y, down: false } }));
      await sleep(120);
      log("笔悬停取值项高亮", hoverTarget.classList.contains("is-hover"), hoverTarget.className);
      // 笔移回类别按钮，取值项高亮应清除
      window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: { x: sr.x, y: sr.y, down: false } }));
      await sleep(120);
      log("笔移开取值项清除高亮", !hoverTarget.classList.contains("is-hover"), hoverTarget.className);

      // 点击第一个非当前取值，样式应改变且取值条收起。
      const target = vals.find((v) => !v.classList.contains("is-current")) || vals[0];
      const strokeBefore = window.tabletSketch?.getContext?.().style?.strokeColor;
      click(target);
      // 点击后立即把笔移出左岛，避免残留悬停定时器在收起后重新展开。
      window.dispatchEvent(new CustomEvent("tablet:penpos", { detail: { x: 6, y: 6, down: false } }));
      await sleep(320);
      const strokeAfter = window.tabletSketch?.getContext?.().style?.strokeColor;
      log("点击取值应用样式", strokeAfter !== strokeBefore, strokeBefore + " -> " + strokeAfter);
      log("点击取值后收起", !$(".ts-left-style-values"), $(".ts-left-style-values") ? "still expanded" : "collapsed");
    }
  }

  // 无选中再隐藏，验证 hover 订阅随组件卸载
  window.tabletSketch?.clearSelection?.();
  await sleep(520);
  log("清空选中后左岛隐藏", !$(".ts-left-style"), $(".ts-left-style") ? "still shown" : "hidden");

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

  // ---------- 图形样式页（独立打开，避免打乱工具测试流程） ----------
  window.dispatchEvent(new Event("tablet:open-settings"));
  await sleep(220);
  const shapeNav = $$(".ts-nav-item").find((n) => n.textContent.includes("图形样式"));
  log("设置含图形样式页", !!shapeNav, "");
  if (shapeNav) {
    click(shapeNav);
    await sleep(180);
    const blocks = $$(".ts-shape-block");
    log("图形样式页列出图元", blocks.length >= 9, String(blocks.length));
    const rectBlock = blocks.find((b) => b.querySelector(".ts-shape-head")?.textContent.includes("矩"));
    if (rectBlock) {
      const options = Array.from(rectBlock.querySelectorAll(".ts-shape-option"));
      const strokeOption = options.find((o) => o.textContent.includes("描边"));
      log("矩形样式含描边勾选", !!strokeOption && strokeOption.querySelector("input")?.checked === true,
          strokeOption?.querySelector("input")?.checked);
      log("图形样式用勾选框", options.length > 0 && options.every((o) => !!o.querySelector("input[type=checkbox]")),
          options.length + " 项");
    }
  }
  click($(".ts-settings-head .ts-panel-close"));
  await sleep(120);
  log("图形样式测试后设置窗已关闭", !$(".ts-settings"), $(".ts-settings") ? "still open" : "closed");

  return results;
})()`;

// UI 等比缩放：主进程改变窗口尺寸后，断言缩放变量、控件像素与笔映射解耦。
const SCALE_SCENARIO = String.raw`(async () => {
  const results = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail) });
  const $ = (s) => document.querySelector(s);
  const scale = Number(document.documentElement.style.getPropertyValue("--ts-ui-scale"));
  log("窗口放大后缩放比例 > 1", scale > 1, String(scale));
  const band = $(".ts-band");
  const bandH = band?.getBoundingClientRect().height || 0;
  log("按键带随缩放变高", bandH > 64, Math.round(bandH) + "px");
  const key = $(".ts-band-key");
  const keyW = key?.getBoundingClientRect().width || 0;
  log("按键直径随缩放变大", keyW > 26, Math.round(keyW) + "px");
  const cell = $(".ts-cell");
  const cellW = cell?.getBoundingClientRect().width || 0;
  log("浮岛格随缩放变大", cellW > 44, Math.round(cellW) + "px");

  // 笔映射：归一化 (0.5,0.5) 应仍落在画布中心，与 UI 缩放无关。
  const stage = $(".ts-stage")?.getBoundingClientRect();
  if (stage) {
    document.dispatchEvent(new CustomEvent("ts:hid", {
      detail: { t: "pen", ph: "hover", x: 0.5, y: 0.5, p: 0.5 }
    }));
    await sleep(160);
    const cursor = $(".ts-pen-cursor");
    const tr = cursor?.style.transform || "";
    const m = tr.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
    const cx = m ? Number(m[1]) : NaN;
    const cy = m ? Number(m[2]) : NaN;
    const wantX = stage.left + stage.width * 0.5;
    const wantY = stage.top + stage.height * 0.5;
    log("笔尖仍按画布 rect 映射", Math.abs(cx - wantX) < 2 && Math.abs(cy - wantY) < 2,
        Math.round(cx) + "," + Math.round(cy) + " vs " + Math.round(wantX) + "," + Math.round(wantY));
  }
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

    // 放大窗口再验证 UI 等比缩放；基准是启动时的 1200×760。
    win.setSize(1600, 1013);
    await new Promise((r) => setTimeout(r, 700));
    const scaleResults = await win.webContents.executeJavaScript(SCALE_SCENARIO, true);
    results = results.concat(scaleResults);
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

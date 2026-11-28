/**
 * 左侧样式浮动岛：选中图元后常驻显示，笔悬停高亮、点击展开取值条。
 *
 * 与侧键样式环共用 style-wheel.js 的样式定义，只换一个可见入口。
 * 性能约束：悬停/收起都靠 tablet:penpos + tablet:mousepos 订阅，rAF 合并到每帧一次，
 * 只有「高亮的类别」或「展开的类别」变化才 setState，笔的每次移动不触发 React 渲染。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "./icons";
import { buildCategoryButtons, buildValueItems, categoryLabel } from "./style-wheel";

const HOVER_DELAY = 100;
const COLLAPSE_DELAY = 200;

function showToast(text) {
  window.dispatchEvent(new CustomEvent("ts:toast", { detail: text }));
}

export function LeftStyleIsland({ context, layout = null }) {
  const buttons = useMemo(() => buildCategoryButtons(context, layout), [context, layout]);
  const [hoverKey, setHoverKey] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [hoverValue, setHoverValue] = useState(null);

  const targetKeyRef = useRef(null);
  const expandedRef = useRef(null);
  const hoverValueRef = useRef(null);
  const hoverTimerRef = useRef(0);
  const collapseTimerRef = useRef(0);
  const frameRef = useRef(0);
  const pendingRef = useRef(null);

  // 有选中才挂载：无选中时这里根本不订阅笔位置，零常驻开销。
  useEffect(() => {
    const updateFromPoint = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const el = document.elementFromPoint(x, y);
      const island = el?.closest?.("[data-ts-left-style]");
      const keyEl = el?.closest?.("[data-ts-style-key]");
      const key = keyEl ? keyEl.getAttribute("data-ts-style-key") : null;

      // 取值项高亮走笔位置，不能靠 CSS :hover（笔是虚拟位置）。
      // 命中值带类别前缀，避免不同类别同名取值项串光。
      const valueEl = el?.closest?.("[data-ts-style-value]");
      const category = valueEl ? valueEl.getAttribute("data-ts-value-category") : null;
      const valueKey = valueEl ? valueEl.getAttribute("data-ts-style-value") : null;
      const nextHoverValue = category && valueKey ? `${category}:${valueKey}` : null;
      if (nextHoverValue !== hoverValueRef.current) {
        hoverValueRef.current = nextHoverValue;
        setHoverValue(nextHoverValue);
      }

      // 悬停 100ms 才高亮并展开取值条；笔快速掠过不触发。
      if (key !== targetKeyRef.current) {
        targetKeyRef.current = key;
        window.clearTimeout(hoverTimerRef.current);
        if (key) {
          hoverTimerRef.current = window.setTimeout(() => {
            setHoverKey(key);
            // 悬停即弹出：与点击等价地确保该类别展开
            if (expandedRef.current !== key) {
              expandedRef.current = key;
              setExpandedKey(key);
            }
            window.clearTimeout(collapseTimerRef.current);
            collapseTimerRef.current = 0;
          }, HOVER_DELAY);
        } else {
          setHoverKey(null);
        }
      }

      // 离开整个岛（含展开的取值条）200ms 才收起；在岛内则取消收起。
      if (!island && expandedRef.current) {
        if (!collapseTimerRef.current) {
          collapseTimerRef.current = window.setTimeout(() => {
            expandedRef.current = null;
            setExpandedKey(null);
            hoverValueRef.current = null;
            setHoverValue(null);
            collapseTimerRef.current = 0;
          }, COLLAPSE_DELAY);
        }
      } else if (island) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = 0;
      }
    };

    const schedule = (x, y) => {
      pendingRef.current = { x, y };
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        const point = pendingRef.current;
        if (point) updateFromPoint(point.x, point.y);
      });
    };

    const onPen = (event) => {
      const detail = event.detail;
      if (!detail || detail.down) return;
      schedule(detail.x, detail.y);
    };
    const onMouse = (event) => {
      const detail = event.detail;
      if (!detail) return;
      schedule(detail.x, detail.y);
    };

    window.addEventListener("tablet:penpos", onPen);
    window.addEventListener("tablet:mousepos", onMouse);
    return () => {
      window.removeEventListener("tablet:penpos", onPen);
      window.removeEventListener("tablet:mousepos", onMouse);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.clearTimeout(hoverTimerRef.current);
      window.clearTimeout(collapseTimerRef.current);
    };
  }, []);

  if (!buttons.length) return null;

  const openCategory = (key) => {
    if (context?.allLocked) {
      showToast("元素已锁定");
      return;
    }
    // 悬停已负责展开；点击只确保展开，不再 toggle 收起。
    expandedRef.current = key;
    setExpandedKey(key);
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = 0;
  };

  const applyValue = (category, slot) => {
    try {
      window.tabletSketch?.setStyle(slot.patch);
      expandedRef.current = null;
      setExpandedKey(null);
      hoverValueRef.current = null;
      setHoverValue(null);
      showToast(`${categoryLabel(category)} · ${slot.label}`);
    } catch {
      showToast("样式写入失败");
    }
  };

  const items = expandedKey ? buildValueItems(expandedKey, context, layout) : [];

  return (
    <div className="ts-left-style" data-ts-ui="" data-ts-left-style="">
      <div className="ts-left-style-title">样式</div>
      {buttons.map((button) => {
        const Icon = Icons[button.icon] || Icons.style;
        const isOpen = expandedKey === button.key;
        return (
          <div className="ts-left-style-row" key={button.key}>
            <button
              type="button"
              data-ts-style-key={button.key}
              title={`${button.label} · 当前：${button.current}`}
              className={`ts-left-style-btn${hoverKey === button.key ? " is-hover" : ""}${
                isOpen ? " is-open" : ""
              }`}
              onClick={() => openCategory(button.key)}
            >
              {button.color !== undefined ? (
                <span
                  className={`ts-left-style-swatch${
                    button.color === "transparent" ? " is-none" : ""
                  }`}
                  style={button.color === "transparent" ? undefined : { background: button.color }}
                />
              ) : (
                <Icon />
              )}
              <span className="ts-left-style-current">{button.current}</span>
            </button>
            {isOpen ? (
              <div className="ts-left-style-values">
                {items.map((slot) => (
                  <button
                    type="button"
                    key={slot.key}
                    title={slot.tip}
                    data-ts-style-value={slot.key}
                    data-ts-value-category={expandedKey}
                    className={`ts-left-style-value${slot.current ? " is-current" : ""}${
                      hoverValue === `${expandedKey}:${slot.key}` ? " is-hover" : ""
                    }`}
                    onClick={() => applyValue(expandedKey, slot)}
                  >
                    {slot.color !== undefined ? (
                      <span
                        className={`ts-left-style-swatch${
                          slot.color === "transparent" ? " is-none" : ""
                        }`}
                        style={slot.color === "transparent" ? undefined : { background: slot.color }}
                      />
                    ) : null}
                    <span>{slot.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

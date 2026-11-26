import React, { useEffect, useRef, useState } from "react";

// 按键圆心 x：由真机图实测（板框 876×696，首键 173px、间距 93px）换算到 360 宽。
// 不做等分，保持和真机一致的分布。
const KEY_X = [46, 84, 123, 161, 199, 237, 275, 314];
const CARD_W = 360;
const BAND_H = 44;
const AREA_H = 202.5; // 严格 16:9，对齐 Digitizer 有效区
const INSET = 6;

/**
 * 板面示意图：上面一条 8 键按键带，下面一块手写区。
 * 按键平时完全不可见，按下那一刻才在真机对应的位置亮一下。
 */
export function PadMap({ pen, flash, onKey }) {
  const [open, setOpen] = useState(true);
  const [lit, setLit] = useState(() => new Set());
  const timers = useRef(new Map());

  const light = (index) => {
    setLit((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    clearTimeout(timers.current.get(index));
    timers.current.set(
      index,
      setTimeout(() => {
        setLit((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        timers.current.delete(index);
      }, 180)
    );
  };

  useEffect(() => {
    if (flash) light(flash.index);
  }, [flash]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!open) {
    return (
      <button
        type="button"
        data-ts-ui
        className="ts-pad-chip"
        title="板面示意"
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
    );
  }

  const dot = pen
    ? {
        x: INSET + Math.min(1, Math.max(0, pen.nx)) * (CARD_W - INSET * 2),
        y: INSET + Math.min(1, Math.max(0, pen.ny)) * (AREA_H - INSET * 2)
      }
    : null;

  return (
    <div data-ts-ui className="ts-pad" style={{ width: CARD_W, height: BAND_H + AREA_H }}>
      <div className="ts-pad-band" style={{ height: BAND_H }}>
        {KEY_X.map((x, index) => (
          <button
            key={index}
            type="button"
            className={`ts-pad-key${lit.has(index) ? " is-lit" : ""}`}
            style={{ left: x }}
            title={`板载键 ${index + 1}`}
            onClick={() => {
              light(index);
              onKey?.(index);
            }}
          >
            <span>{index + 1}</span>
          </button>
        ))}
      </div>
      <div className="ts-pad-area" style={{ height: AREA_H }}>
        {dot ? (
          <span
            className={`ts-pad-dot${pen.down ? " is-down" : ""}`}
            style={{ transform: `translate3d(${dot.x}px, ${dot.y}px, 0)` }}
          />
        ) : null}
      </div>
      <button type="button" className="ts-pad-collapse" title="收起" onClick={() => setOpen(false)}>
        –
      </button>
    </div>
  );
}

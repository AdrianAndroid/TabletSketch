import React, { useEffect, useRef, useState } from "react";

// 真机 Deco 640：板框 876×696，8 键中心 x = 173/267/360/454/546/639/731/824，板框左界 60。
// 归一化后 ≈ 0.129 起、间隔 0.106，直接当百分比用，窗口缩放时疏密和真机一致。
const KEY_CENTER = [0.129, 0.236, 0.342, 0.45, 0.555, 0.661, 0.766, 0.872];

/**
 * 板载键条：8 个键常态完全不可见（只留热区），按下那一刻才在真机对应的位置亮一下。
 * 用笔直接点这些位置也能触发同一动作，用于没有接板子时的自测。
 */
export function PadBand({ flash, onKey }) {
  const [lit, setLit] = useState(() => new Set());
  const timers = useRef(new Map());

  const light = (index) => {
    setLit((prev) => new Set(prev).add(index));
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

  return (
    <div className="ts-band-keys">
      {KEY_CENTER.map((center, index) => (
        <button
          key={index}
          type="button"
          className={`ts-band-key${lit.has(index) ? " is-lit" : ""}`}
          style={{ left: `${center * 100}%` }}
          title={`板载键 ${index + 1}`}
          onPointerDown={(event) => {
            // 用 pointerdown 而不是 click：不等成对事件，按下即响应
            event.preventDefault();
            event.stopPropagation();
            console.log("[band] press key", index + 1);
            light(index);
            onKey?.(index);
          }}
        >
          <span>{index + 1}</span>
        </button>
      ))}
    </div>
  );
}

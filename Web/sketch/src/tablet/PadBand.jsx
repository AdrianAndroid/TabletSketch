import React, { useEffect, useRef, useState } from "react";
import { Icons } from "./icons";
import { ACTION_LIBRARY } from "./layout-config.js";

// 8 键等距平分整条按键带：中心在 6.25% / 18.75% / … / 93.75%。
const KEY_CENTER = Array.from({ length: 8 }, (_, i) => (i + 0.5) / 8);

const DEFAULT_BINDINGS = ["pen", "eraser", "hand", "select", "rectangle", "ellipse", "arrow", "undo"];

function KeyIcon({ id }) {
  const def = ACTION_LIBRARY[id];
  const name = def?.icon || "more";
  const Icon = Icons[name] || Icons.more;
  return <Icon />;
}

/**
 * 板载键条：8 个键等距平分窗口顶部，常显淡色卡片（圆形编号 + 绑定功能图标），
 * 按下那一刻整卡高亮。用笔直接点这些位置也能触发同一动作，用于没有接板子时的自测。
 *
 * `states[i]` 是这一格在画布里的当前态（"on" = 工具/锁生效中，"open" = 面板展开中），
 * 与右侧浮岛同功能槽位共用同一份判定，保证两处状态一致。
 */
export function PadBand({ flash, onKey, bindings, states }) {
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
      {KEY_CENTER.map((center, index) => {
        const id = bindings?.[index] || DEFAULT_BINDINGS[index];
        const label = ACTION_LIBRARY[id]?.label || "未设置";
        const state = states?.[index] || null;
        return (
          <button
            key={index}
            type="button"
            className={`ts-band-key${state === "on" ? " is-on" : ""}${
              state === "open" ? " is-open" : ""
            }${lit.has(index) ? " is-lit" : ""}`}
            style={{ left: `${center * 100}%` }}
            title={`板载键 ${index + 1} · ${label}${state ? " · 当前" : ""}`}
            onPointerDown={(event) => {
              // 用 pointerdown 而不是 click：不等成对事件，按下即响应
              event.preventDefault();
              event.stopPropagation();
              console.log("[band] press key", index + 1);
              light(index);
              onKey?.(index);
            }}
          >
            <span className="ts-band-key-num">{index + 1}</span>
            <span className="ts-band-key-icon"><KeyIcon id={id} /></span>
          </button>
        );
      })}
    </div>
  );
}

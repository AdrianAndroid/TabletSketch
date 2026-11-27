import React, { memo, useEffect, useState } from "react";

const DEG = Math.PI / 180;

/** 页面实际用于出墨的压力整形，和 tablet-sketch.js 的 shapePressure 保持一致 */
function shapePressure(p) {
  if (!(p > 0)) return 0.35;
  return Math.min(1, 0.35 + 0.65 * Math.pow(p, 0.6));
}

/**
 * 进度条用感知映射而不是线性：这张板的压感低端很陡，
 * 轻触就 2000–4000、正常书写 5000 左右，线性条只走到 1/3，看着像没反应。
 */
function perceive(p) {
  return Math.sqrt(Math.max(0, Math.min(1, p)));
}

/** 力度档位，让数字有个可读的参照 */
function grade(p) {
  if (!(p > 0.0005)) return "轻触";
  if (p < 0.10) return "轻";
  if (p < 0.30) return "中";
  if (p < 0.60) return "重";
  if (p < 0.98) return "很重";
  return "满量程";
}

/** 由 X/Y 两侧倾角合成「笔相对面板法线的夹角」 */
function tiltAngle(tiltX, tiltY) {
  const cx = Math.max(-89, Math.min(89, tiltX));
  const cy = Math.max(-89, Math.min(89, tiltY));
  const t = Math.sqrt(Math.pow(Math.tan(cx * DEG), 2) + Math.pow(Math.tan(cy * DEG), 2));
  return Math.atan(t) / DEG;
}

function PenTelemetryView({ data, onClose, side = "right" }) {
  const p = Math.max(0, Math.min(1, data?.p || 0));
  const raw = Math.round(data?.raw || 0);
  const tiltX = Math.round(data?.tx || 0);
  const tiltY = Math.round(data?.ty || 0);
  const shaped = shapePressure(p);
  const angle = tiltAngle(tiltX, tiltY);
  const idle = !data || data.ph === "leave";

  return (
    <div className={`ts-tele${idle ? " is-idle" : ""}${side === "right" ? " ts-tele--left" : ""}`}>
      <div className="ts-tele-head">
        <span>压感 / 倾斜</span>
        <button type="button" className="ts-tele-x" onClick={onClose} title="收起">
          ×
        </button>
      </div>

      <div className="ts-tele-row">
        <span className="ts-tele-k">压力</span>
        <span className="ts-tele-v">
          {idle ? "—" : raw}
          <em> / 16383</em>
        </span>
      </div>
      <div className="ts-tele-bar">
        <i style={{ width: `${Math.round(perceive(p) * 100)}%` }} />
      </div>
      <div className="ts-tele-row">
        <span className="ts-tele-k">归一 / 出墨</span>
        <span className="ts-tele-v">
          {p.toFixed(2)} <em>→</em> {shaped.toFixed(2)}
          <em> · {idle ? "—" : grade(p)}</em>
        </span>
      </div>

      <div className="ts-tele-row">
        <span className="ts-tele-k">倾斜</span>
        <span className="ts-tele-v">
          X {idle ? "—" : `${tiltX}°`} <em>·</em> Y {idle ? "—" : `${tiltY}°`}
          <em> · 倾角</em> {idle ? "—" : `${angle.toFixed(0)}°`}
        </span>
      </div>
    </div>
  );
}

/**
 * 读数板自己订阅笔采样，用 rAF 把每帧内的多个报告合并成一次更新。
 * 组件展开时才挂载，收起即卸载订阅，不再让高频读数拖累整棵界面树。
 */
export const PenTelemetry = memo(function PenTelemetry({ onClose, side = "right" }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let frame = 0;
    let pending = null;
    const onPos = (event) => {
      // 拖浮岛时读数是无关信息，暂停更新以免每帧一次 React 渲染抢占跟手
      if (window.__tsIslandDragging) return;
      const detail = event.detail;
      if (detail?.source !== "pen") return;
      pending = detail;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setData(pending);
      });
    };
    window.addEventListener("tablet:penpos", onPos);
    return () => {
      window.removeEventListener("tablet:penpos", onPos);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <PenTelemetryView data={data} onClose={onClose} side={side} />;
});

/** 面板收起后的重新打开入口（R0：用户可见功能必须有内置入口） */
export function PenTelemetryChip({ onClick, side = "right" }) {
  return (
    <button
      type="button"
      className={`ts-tele-chip${side === "right" ? " ts-tele--left" : ""}`}
      onClick={onClick}
      title="显示压感 / 倾斜读数"
    >
      压感
    </button>
  );
}

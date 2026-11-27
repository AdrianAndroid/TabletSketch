import { useEffect, useMemo, useState } from "react";
import { Icons } from "./icons";

const INNER_RADIUS = 45;
const CENTER_RADIUS = 45;
const GAP = 8;
const BAND = 44;

function ringRadius(count) {
  return Math.max(240, 180 + 15 * count) / 2;
}

function polar(cx, cy, radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function sectorPath(cx, cy, inner, outer, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, outer, startDeg);
  const [x2, y2] = polar(cx, cy, outer, endDeg);
  const [x3, y3] = polar(cx, cy, inner, endDeg);
  const [x4, y4] = polar(cx, cy, inner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    "Z"
  ].join(" ");
}

function donutPath(cx, cy, inner, outer) {
  return [
    `M ${cx} ${cy} m -${outer} 0 a ${outer} ${outer} 0 1 0 ${outer * 2} 0 a ${outer} ${outer} 0 1 0 -${outer * 2} 0`,
    `M ${cx} ${cy} m -${inner} 0 a ${inner} ${inner} 0 1 0 ${inner * 2} 0 a ${inner} ${inner} 0 1 0 -${inner * 2} 0`
  ].join(" ");
}

function ringStart(count) {
  return -90 - 360 / count / 2;
}

function locateSlot(point, left, top, center, innerRadius, innerCount, outerRadius, outerCount) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const dx = point.x - left - center;
  const dy = point.y - top - center;
  const radius = Math.hypot(dx, dy);
  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;

  if (outerCount && radius >= innerRadius + GAP && radius <= outerRadius) {
    const step = 360 / outerCount;
    const index = Math.floor((angle + step / 2) / step) % outerCount;
    return { ring: "outer", index };
  }

  if (!outerCount && radius >= INNER_RADIUS && radius <= innerRadius) {
    const step = 360 / innerCount;
    const index = Math.floor((angle + step / 2) / step) % innerCount;
    return { ring: "inner", index };
  }

  return null;
}

function SlotVisual({ slot, showLabel, left, top }) {
  if (slot.color !== undefined) {
    return (
      <div className="ts-radial-swatch-wrap" style={{ left, top }}>
        <div
          className={`ts-radial-swatch${slot.color === "transparent" ? " is-none" : ""}`}
          style={slot.color === "transparent" ? undefined : { background: slot.color }}
        />
        {showLabel ? <span>{slot.label}</span> : null}
      </div>
    );
  }
  const Icon = Icons[slot.icon] || Icons.more;
  return (
    <div className="ts-radial-icon" style={{ left, top }}>
      <Icon />
      {showLabel ? <span>{slot.label}</span> : null}
    </div>
  );
}

function Ring({ slots, ring, count, radius, innerRadius, center, showLabel, hoveredKey, onAction }) {
  const step = 360 / count;
  const first = ringStart(count);
  const pathOuter = radius - 3;

  if (count === 1) {
    const slot = slots[0];
    const midRadius = (innerRadius + pathOuter) / 2;
    const [lx, ly] = polar(center, center, midRadius, -90);
    return (
      <g
        className="ts-radial-slot"
        data-ts-radial-key={slot.key}
        data-ts-radial-ring={ring}
        style={{ "--i": 0, transformOrigin: `${center}px ${center}px` }}
        onClick={() => onAction(slot, ring)}
      >
        <path
          d={donutPath(center, center, innerRadius, pathOuter)}
          fillRule="evenodd"
          className={`ts-radial-path${slot.current ? " is-current" : ""}${
            slot.key === hoveredKey ? " is-hover" : ""
          }`}
        />
        <foreignObject x={lx - 22} y={ly - 22} width="44" height="44">
          <SlotVisual slot={slot} showLabel={showLabel} left={0} top={0} />
        </foreignObject>
      </g>
    );
  }

  return (
    <g>
      {slots.map((slot, index) => {
        const start = first + index * step;
        const end = start + step;
        const mid = start + step / 2;
        const [lx, ly] = polar(center, center, (innerRadius + pathOuter) / 2, mid);
        return (
          <g
            key={slot.key}
            className="ts-radial-slot"
            data-ts-radial-key={slot.key}
            data-ts-radial-ring={ring}
            style={{ "--i": index, transformOrigin: `${center}px ${center}px` }}
            onClick={() => onAction(slot, ring)}
          >
            <path
              d={sectorPath(center, center, innerRadius, pathOuter, start + 1.2, end - 1.2)}
              className={`ts-radial-path${slot.current ? " is-current" : ""}${
                slot.key === hoveredKey ? " is-hover" : ""
              }`}
            />
            <foreignObject x={lx - 22} y={ly - 22} width="44" height="44">
              <SlotVisual slot={slot} showLabel={showLabel} left={0} top={0} />
            </foreignObject>
            {slot.current ? (
              <circle cx={lx - 16} cy={ly - 16} r="3" className="ts-radial-current-dot" />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function RadialMenu({
  x,
  y,
  slots = [],
  outerSlots = [],
  centerLabel = "取消",
  followPen = false,
  onAction,
  onCenter
}) {
  const [pointer, setPointer] = useState(null);

  // 笔尖位置只在样式环打开时订阅（组件此时才挂载），并用 rAF 合并到每帧一次，
  // 避免每个笔报告都让样式环重渲染。鼠标位置仍走 svg 自己的 pointermove。
  useEffect(() => {
    if (!followPen) return undefined;
    let frame = 0;
    let pending = null;
    const onPos = (event) => {
      const detail = event.detail;
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return;
      pending = { x: detail.x, y: detail.y };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pending) setPointer(pending);
      });
    };
    window.addEventListener("tablet:penpos", onPos);
    return () => {
      window.removeEventListener("tablet:penpos", onPos);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [followPen]);

  const count = Math.max(1, slots.length);
  const outerCount = outerSlots.length;
  const r1 = ringRadius(count);
  const r2 = outerCount ? r1 + GAP + BAND : r1;
  const center = r2;
  const size = r2 * 2;

  const margin = r1 + 16;
  const cx = Math.min(Math.max(x, margin), window.innerWidth - margin);
  const cy = Math.min(Math.max(y, margin), window.innerHeight - margin);
  const left = cx - r2;
  const top = cy - r2;

  const activePoint = pointer;

  const hover = useMemo(
    () => locateSlot(activePoint, left, top, center, r1, count, r2, outerCount),
    [activePoint, left, top, center, r1, count, r2, outerCount]
  );

  const hoveredSlot =
    hover && (hover.ring === "outer" ? outerSlots[hover.index] : slots[hover.index]);

  const tip = useMemo(() => {
    if (!hoveredSlot) return null;
    const list = hover.ring === "outer" ? outerSlots : slots;
    const step = 360 / Math.max(1, list.length);
    const first = ringStart(Math.max(1, list.length));
    const mid = first + hover.index * step + step / 2;
    const radius = hover.ring === "outer" ? r2 + 28 : r1 + 28;
    const tx = cx + Math.cos((mid * Math.PI) / 180) * radius;
    const ty = cy + Math.sin((mid * Math.PI) / 180) * radius;
    return {
      text: hoveredSlot.tip || hoveredSlot.label,
      x: Math.min(Math.max(tx, 92), window.innerWidth - 92),
      y: Math.min(Math.max(ty, 24), window.innerHeight - 24)
    };
  }, [hoveredSlot, hover, slots, outerSlots, r1, r2, cx, cy]);

  const showLabel = count <= 6;
  const showOuterLabel = outerCount > 0 && outerCount <= 6;
  const isLevel2 = slots.some((slot) => slot.kind === "value");

  return (
    <div
      className={`ts-radial${isLevel2 ? " is-swap" : ""}`}
      style={{ left, top, width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="ts-radial-svg"
        onPointerMove={(event) => setPointer({ x: event.clientX, y: event.clientY })}
        onPointerLeave={() => setPointer(null)}
      >
        <circle cx={center} cy={center} r={r2} fill="transparent" pointerEvents="all" />

        <g className={outerCount ? "ts-radial-inner is-dim" : "ts-radial-inner"}>
          <Ring
            slots={slots}
            ring="inner"
            count={count}
            radius={r1}
            innerRadius={INNER_RADIUS}
            center={center}
            showLabel={showLabel}
            hoveredKey={hoveredSlot?.key}
            onAction={onAction}
          />
        </g>

        {outerCount ? (
          <g className="ts-radial-outer">
            <Ring
              slots={outerSlots}
              ring="outer"
              count={outerCount}
              radius={r2}
              innerRadius={r1 + GAP}
              center={center}
              showLabel={showOuterLabel}
              hoveredKey={hoveredSlot?.key}
              onAction={onAction}
            />
          </g>
        ) : null}

        <circle
          cx={center}
          cy={center}
          r={CENTER_RADIUS}
          className="ts-radial-center"
          onClick={onCenter}
        />
        <text x={center} y={center + 5} className="ts-radial-center-label" textAnchor="middle">
          {centerLabel}
        </text>
      </svg>

      {tip ? (
        <div className="ts-radial-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}

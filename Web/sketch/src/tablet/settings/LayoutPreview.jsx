import { Icons } from "../icons";
import { ACTION_LIBRARY, SURFACE_RULES } from "../layout-config.js";

/**
 * 布局设置页的「真实 UI 预览」：按 surface 的几何画出与真机一致的形态，
 * 并让每个配置槽位可直接拖动重排。
 *
 * 这是纯展示 + 拖动操作面：不 import 任何真实输入组件，不订阅笔位置，
 * 不派发真实动作（R11）。拖动事件由 LayoutPage 统一接线，松手才落盘。
 */

const INNER_RADIUS = 45;
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

function ringStart(count) {
  return -90 - 360 / count / 2;
}

function isCurrent(def, state) {
  if (!def) return false;
  if (def.tool) return state?.tool === def.tool;
  if (def.action === "lock") return !!state?.toolLocked;
  if (def.panel) return state?.panel === def.panel;
  return false;
}

function swatchFor(id) {
  if (id === "stroke") return "#1e1e1e";
  if (id === "background") return "transparent";
  return undefined;
}

/** 把 displayIds 切成带真实下标的槽位；index 就是拖动重排用的位置。 */
function buildSlots(surfaceId, ids, inner, outer, state) {
  const geometry = SURFACE_RULES[surfaceId]?.geometry;
  const make = (id, index, ring) => {
    const def = ACTION_LIBRARY[id];
    return {
      key: id,
      id,
      index,
      ring,
      label: def?.label || id,
      icon: def?.icon || "more",
      color: swatchFor(id),
      current: isCurrent(def, state),
      draggable: true
    };
  };
  if (geometry === "ring") {
    const innerCount = Math.max(1, (inner || 9) - 1);
    const innerIds = ids.slice(0, innerCount);
    const outerIds = ids.slice(innerCount, innerCount + (outer || 8));
    const more = {
      key: "__more__",
      id: "more",
      index: null,
      ring: "inner",
      label: "更多",
      icon: "more",
      color: undefined,
      current: false,
      draggable: false
    };
    return [
      ...innerIds.map((id, i) => make(id, i, "inner")),
      more,
      ...outerIds.map((id, j) => make(id, innerCount + j, "outer"))
    ];
  }
  return ids.map((id, i) => make(id, i, geometry));
}

function dragProps(slot, drag) {
  if (!slot.draggable || !drag) return {};
  return {
    draggable: true,
    onDragStart: (event) => {
      event.stopPropagation();
      drag.onDragStart(slot.index);
    },
    onDragOver: (event) => {
      event.preventDefault();
      event.stopPropagation();
      drag.onDragOver(slot.index);
    },
    onDragEnd: (event) => {
      event.stopPropagation();
      drag.onDragEnd();
    }
  };
}

function slotClass(slot, drag) {
  return [
    "ts-lp-slot",
    slot.ring ? `is-${slot.ring}` : "",
    slot.current ? "is-current" : "",
    drag?.dragId === slot.id ? "is-dragging" : "",
    slot.index !== null && drag?.dropTarget === slot.index ? "is-drop-target" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function SlotFace({ slot }) {
  if (slot.color !== undefined) {
    return (
      <span
        className={`ts-lp-swatch${slot.color === "transparent" ? " is-none" : ""}`}
        style={slot.color === "transparent" ? undefined : { background: slot.color }}
      />
    );
  }
  const Icon = Icons[slot.icon] || Icons.more;
  return <Icon />;
}

function ColumnPreview({ slots, drag }) {
  return (
    <div
      className="ts-lp-column"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        drag?.onDrop();
      }}
    >
      <div className="ts-lp-col-title">样式</div>
      {slots.map((slot) => (
        <div key={slot.key} data-ts-id={slot.id} className={`ts-lp-col-row ${slotClass(slot, drag)}`} {...dragProps(slot, drag)} title={slot.label}>
          <SlotFace slot={slot} />
          <span className="ts-lp-col-label">{slot.label}</span>
        </div>
      ))}
      {!slots.length ? <div className="ts-lp-empty">— 尚未添加按钮 —</div> : null}
    </div>
  );
}

function GridPreview({ slots, drag }) {
  // 真机浮岛尾部固定有一个「更多」格，列数按含更多的总格数判定。
  const more = { key: "__more__", id: "more", label: "更多", icon: "more", current: false, draggable: false, index: null };
  const columns = slots.length + 1 > 10 ? 2 : 1;
  return (
    <div
      className="ts-lp-grid"
      data-columns={columns}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        drag?.onDrop();
      }}
    >
      {slots.map((slot) => (
        <div key={slot.key} data-ts-id={slot.id} className={`ts-lp-cell ${slotClass(slot, drag)}`} {...dragProps(slot, drag)} title={slot.label}>
          <SlotFace slot={slot} />
        </div>
      ))}
      <div key={more.key} data-ts-id={more.id} className={`ts-lp-cell is-more`} title={more.label}>
        <SlotFace slot={more} />
      </div>
      {!slots.length ? <div className="ts-lp-empty">— 尚未添加按钮 —</div> : null}
    </div>
  );
}

function RingSector({ slot, cx, cy, inner, outer, start, end, drag, showLabel }) {
  const [lx, ly] = polar(cx, cy, (inner + outer) / 2, (start + end) / 2);
  const halfCell = 22;
  const cls = `ts-lp-sector ${slotClass(slot, drag)}`;
  const handlers = dragProps(slot, drag);
  return (
    <g
      className={cls}
      data-ts-id={slot.id}
      {...handlers}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (slot.index !== null) drag?.onDragOver(slot.index);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        drag?.onDrop();
      }}
    >
      <path
        d={sectorPath(cx, cy, inner, outer, start + 1.2, end - 1.2)}
        className={`ts-lp-path${slot.current ? " is-current" : ""}${slot.id === "more" ? " is-more" : ""}`}
      />
      <foreignObject x={lx - halfCell} y={ly - halfCell} width={halfCell * 2} height={halfCell * 2}>
        <div className="ts-lp-face" {...handlers}>
          <SlotFace slot={slot} />
          {showLabel ? <span>{slot.label}</span> : null}
        </div>
      </foreignObject>
    </g>
  );
}

function RingPreview({ slots, drag, centerLabel }) {
  const innerSlots = slots.filter((slot) => slot.ring === "inner");
  const outerSlots = slots.filter((slot) => slot.ring === "outer");
  const innerCount = Math.max(1, innerSlots.length);
  const outerCount = outerSlots.length;
  const innerMin = INNER_RADIUS;
  const r1 = ringRadius(innerCount);
  const gap = GAP;
  const r2 = outerCount ? r1 + gap + BAND : r1;
  const center = r2;
  const size = r2 * 2;
  const first = ringStart(innerCount);
  const step = 360 / innerCount;
  const outerFirst = ringStart(Math.max(1, outerCount));
  const outerStep = outerCount ? 360 / outerCount : 0;

  return (
    <div
      className="ts-lp-ring"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        drag?.onDrop();
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="ts-lp-svg">
        <g className="ts-lp-inner">
          {innerSlots.map((slot, i) => (
            <RingSector
              key={slot.key}
              slot={slot}
              cx={center}
              cy={center}
              inner={innerMin}
              outer={r1 - 3}
              start={first + i * step}
              end={first + (i + 1) * step}
              drag={drag}
              showLabel={innerCount <= 6}
            />
          ))}
        </g>
        {outerCount ? (
          <g className="ts-lp-outer">
            {outerSlots.map((slot, i) => (
              <RingSector
                key={slot.key}
                slot={slot}
                cx={center}
                cy={center}
                inner={r1 + gap}
                outer={r2}
                start={outerFirst + i * outerStep}
                end={outerFirst + (i + 1) * outerStep}
                drag={drag}
                showLabel={outerCount <= 6}
              />
            ))}
          </g>
        ) : null}
        <circle cx={center} cy={center} r={innerMin} className="ts-lp-center" />
        <text x={center} y={center + 5} className="ts-lp-center-label" textAnchor="middle">
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}

export function LayoutPreview({ surfaceId, ids, inner, outer, state, drag, note }) {
  const geometry = SURFACE_RULES[surfaceId]?.geometry || "column";
  const slots = buildSlots(surfaceId, ids, inner, outer, state);
  const centerLabel = geometry === "ring" && surfaceId === "penKey1" ? "取消" : "取消";
  return (
    <div className="ts-lp" data-geometry={geometry}>
      {geometry === "ring" ? (
        <RingPreview slots={slots} drag={drag} centerLabel={centerLabel} />
      ) : geometry === "grid" ? (
        <GridPreview slots={slots} drag={drag} />
      ) : (
        <ColumnPreview slots={slots} drag={drag} />
      )}
      {note ? <div className="ts-lp-hint">{note}</div> : null}
    </div>
  );
}

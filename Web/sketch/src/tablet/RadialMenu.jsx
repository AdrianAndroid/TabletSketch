import { Icons } from "./icons";

/**
 * 径向菜单。
 *
 * 因为整个 UI 都在网页里，扇区就是普通 SVG path，`onPointerEnter` 自带命中，
 * 不需要自己算极坐标。原生侧只负责把笔的落点换算成鼠标坐标。
 */

const SELECTION_SLOTS = [
  { key: "style", label: "样式", icon: "style" },
  { key: "duplicate", label: "副本", icon: "duplicate" },
  { key: "delete", label: "删除", icon: "trash" },
  { key: "more", label: "更多", icon: "more" }
];

const BLANK_SLOTS = [
  { key: "undo", label: "撤销", icon: "undo" },
  { key: "selectAll", label: "全选", icon: "selectAll" },
  { key: "clear", label: "清空", icon: "trash" },
  { key: "more", label: "更多", icon: "more" }
];

/** 外径随槽数增长：`D = 180 + 15n`，4 槽 240、8 槽 300。 */
function outerRadius(count) {
  return (180 + 15 * count) / 2;
}

const INNER_RADIUS = 45;
const CENTER_RADIUS = 45;

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

export function RadialMenu({ x, y, hasSelection, onClose, onAction }) {
  const slots = hasSelection ? SELECTION_SLOTS : BLANK_SLOTS;
  const count = slots.length;
  const outer = outerRadius(count);
  const step = 360 / count;
  // 从 12 点方向开始顺时针均分
  const firstStart = -90 - step / 2;

  // 圆心贴边时整体平移，不缩放
  const margin = outer + 16;
  const cx = Math.min(Math.max(x, margin), window.innerWidth - margin);
  const cy = Math.min(Math.max(y, margin), window.innerHeight - margin);

  return (
    <div className="ts-radial" style={{ left: cx - outer, top: cy - outer, width: outer * 2, height: outer * 2 }}>
      <svg width={outer * 2} height={outer * 2} className="ts-radial-svg">
        {slots.map((slot, index) => {
          const start = firstStart + index * step;
          const end = start + step;
          const mid = start + step / 2;
          const [lx, ly] = polar(outer, outer, (INNER_RADIUS + outer) / 2, mid);
          const Icon = Icons[slot.icon] || Icons.more;
          return (
            <g key={slot.key} className="ts-radial-slot">
              <path
                d={sectorPath(outer, outer, INNER_RADIUS, outer - 3, start + 1.2, end - 1.2)}
                className="ts-radial-path"
                onClick={() => onAction(slot.key)}
              />
              <foreignObject x={lx - 22} y={ly - 22} width="44" height="44">
                <div className="ts-radial-icon" onClick={() => onAction(slot.key)}>
                  <Icon />
                  <span>{slot.label}</span>
                </div>
              </foreignObject>
            </g>
          );
        })}

        <circle
          cx={outer}
          cy={outer}
          r={CENTER_RADIUS}
          className="ts-radial-center"
          onClick={onClose}
        />
        <text x={outer} y={outer + 5} className="ts-radial-center-label" textAnchor="middle">
          取消
        </text>
      </svg>
    </div>
  );
}

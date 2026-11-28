// 浮岛与下拉用的线性图标。
// 统一 20×20 viewBox、1.6 描边、round 端点，和 Excalidraw 的图标观感对齐。

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

function Svg({ children }) {
  return <svg {...base} aria-hidden="true">{children}</svg>;
}

export const Icons = {
  menu: () => <Svg><path d="M3 5h14M3 10h14M3 15h9" /></Svg>,

  canvas: () => <Svg><rect x="2.5" y="3.5" width="15" height="13" rx="2" /><path d="M2.5 7.5h15" /></Svg>,

  library: () => (
    <Svg>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" />
    </Svg>
  ),

  pen: () => <Svg><path d="M13.5 3.5l3 3-9 9-4 1 1-4 9-9z" /></Svg>,

  eraser: () => <Svg><path d="M8 16.5h9" /><path d="M11.5 3.6l4.9 4.9-6.2 6.2-4.9-4.9z" /></Svg>,

  hand: () => <Svg><path d="M7 9V4.8a1.3 1.3 0 012.6 0V9m0-3.6a1.3 1.3 0 012.6 0V9m0-2.4a1.3 1.3 0 012.6 0V13a5 5 0 01-5 5h-1.4a4 4 0 01-3-1.4L4 12.6a1.4 1.4 0 012-2l1 1" /></Svg>,

  select: () => <Svg><path d="M4.5 3.5l11 6.2-4.6 1.2-1.9 4.6z" /></Svg>,

  rectangle: () => <Svg><rect x="3" y="5" width="14" height="10" rx="1.6" /></Svg>,

  ellipse: () => <Svg><ellipse cx="10" cy="10" rx="7" ry="5.6" /></Svg>,

  arrow: () => <Svg><path d="M3 16L16.5 4" /><path d="M11 4h5.5v5.5" /></Svg>,

  line: () => <Svg><path d="M3 16L17 4" /></Svg>,

  text: () => <Svg><path d="M4 5h12M10 5v11" /></Svg>,

  diamond: () => <Svg><path d="M10 3l7 7-7 7-7-7z" /></Svg>,

  image: () => (
    <Svg>
      <rect x="3" y="4" width="14" height="12" rx="1.8" />
      <circle cx="7.2" cy="8" r="1.2" />
      <path d="M3.6 14l4-4 3 3 2.4-2.4 3.4 3.4" />
    </Svg>
  ),

  lock: () => (
    <Svg>
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.8" />
      <path d="M7 9V7a3 3 0 016 0v2" />
    </Svg>
  ),

  more: () => (
    <Svg>
      <circle cx="4" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  ),

  close: () => <Svg><path d="M5 5l10 10M15 5L5 15" /></Svg>,

  chevron: () => <Svg><path d="M7.5 5l5 5-5 5" /></Svg>,

  plus: () => <Svg><path d="M10 4v12M4 10h12" /></Svg>,

  check: () => <Svg><path d="M4 10.5l4 4 8-9" /></Svg>,

  grip: () => <Svg><path d="M4 8h12M4 12h12" /></Svg>,

  // 径向菜单
  duplicate: () => (
    <Svg>
      <rect x="3" y="3" width="10" height="10" rx="1.6" />
      <path d="M7 16.5h9.5V7" />
    </Svg>
  ),

  trash: () => <Svg><path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" /></Svg>,

  layers: () => <Svg><path d="M10 3l7 3.5-7 3.5-7-3.5z" /><path d="M3 11l7 3.5 7-3.5" /></Svg>,

  align: () => <Svg><path d="M3 4v12M7 7h9M7 13h6" /></Svg>,

  group: () => (
    <Svg>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
      <path d="M9 6h5a3 3 0 013 3v2" />
    </Svg>
  ),

  paste: () => (
    <Svg>
      <rect x="4" y="5" width="12" height="12" rx="1.6" />
      <path d="M7 5V3.6h6V5" />
    </Svg>
  ),

  selectAll: () => (
    <Svg>
      <rect x="3" y="3" width="14" height="14" rx="1.6" strokeDasharray="3 2.4" />
      <path d="M8 8h4v4H8z" />
    </Svg>
  ),

  undo: () => <Svg><path d="M7 7L3.5 10.5 7 14" /><path d="M3.5 10.5h8a4.5 4.5 0 010 9H9" /></Svg>,

  redo: () => <Svg><path d="M13 7l3.5 3.5L13 14" /><path d="M16.5 10.5h-8a4.5 4.5 0 000 9H11" /></Svg>,

  zoom100: () => (
    <Svg>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M7 8.5h6M7 11.5h6M8 7l1.5 6M12 7l-1.5 6" />
    </Svg>
  ),

  save: () => (
    <Svg>
      <path d="M3.5 5.5A2 2 0 015.5 3.5h9L19 8v10.5a1 1 0 01-1 1h-13a1 1 0 01-1-1z" />
      <path d="M7 3.5v5h7v-5M7 19.5v-6h10v6" />
    </Svg>
  ),

  fit: () => (
    <Svg>
      <path d="M3 7V3.8h4M17 7V3.8h-4M3 13v3.2h4M17 13v3.2h-4" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="1" />
    </Svg>
  ),

  background: () => (
    <Svg>
      <rect x="3" y="3" width="14" height="14" rx="1.6" />
      <path d="M3 10h14M10 3v14" />
    </Svg>
  ),

  style: () => (
    <Svg>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 000 13z" fill="currentColor" stroke="none" />
    </Svg>
  ),

  fill: () => (
    <Svg>
      <path d="M4 11.5l5.5-5.5 5 5-5 5z" />
      <path d="M4 11.5h10" />
      <path d="M15.5 13.2c1 1 1.5 1.7 1.5 2.4a1.5 1.5 0 01-3 0c0-.7.5-1.4 1.5-2.4z" />
    </Svg>
  ),

  width: () => <Svg><path d="M3 6h14M4.5 10h11M6 14h8" /></Svg>,

  border: () => <Svg><rect x="3" y="4" width="14" height="12" rx="1.5" strokeDasharray="3 2.4" /></Svg>,

  roughness: () => <Svg><path d="M3 13c2.5-5 4.5 3 7-2s3.5-1 6-5" /></Svg>,

  corner: () => <Svg><path d="M4 16V9a5 5 0 015-5h7" /><path d="M4 16h12" /></Svg>,

  arrowType: () => (
    <Svg>
      <path d="M3 15h5a3 3 0 003-3V5" />
      <path d="M8 5h6v6" />
    </Svg>
  ),

  arrowStart: () => <Svg><path d="M3 10h14" /><path d="M7 6l-4 4 4 4" /></Svg>,

  arrowEnd: () => <Svg><path d="M3 10h14" /><path d="M13 6l4 4-4 4" /></Svg>,

  font: () => <Svg><path d="M4 5h12M10 5v11" /></Svg>,

  fontSize: () => <Svg><path d="M3 16l4-11 4 11" /><path d="M4.5 12h5" /><path d="M13 16l3-8 3 8" /><path d="M14 13h4" /></Svg>,

  opacity: () => (
    <Svg>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5a6.5 6.5 0 000 13z" fill="currentColor" stroke="none" />
    </Svg>
  )
};

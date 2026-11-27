// 右侧浮岛与笔侧键 2 工具环共用的槽位定义。
// 顺序即浮岛顺序；板载键 1–8 绑定前 8 格。
export const DEFAULT_SLOTS = [
  { id: "menu", icon: "menu", label: "菜单", panel: "menu" },
  { id: "canvas", icon: "canvas", label: "画布", panel: "canvas" },
  { id: "library", icon: "library", label: "素材", panel: "library" },
  { id: "pen", icon: "pen", label: "笔", tool: "freedraw" },
  { id: "eraser", icon: "eraser", label: "擦", tool: "eraser" },
  { id: "hand", icon: "hand", label: "手", tool: "hand" },
  { id: "select", icon: "select", label: "选", tool: "selection" },
  { id: "rectangle", icon: "rectangle", label: "矩", tool: "rectangle" },
  { id: "ellipse", icon: "ellipse", label: "椭", tool: "ellipse" },
  { id: "arrow", icon: "arrow", label: "箭", tool: "arrow" },
  { id: "text", icon: "text", label: "字", tool: "text" },
  { id: "diamond", icon: "diamond", label: "菱", tool: "diamond" },
  { id: "line", icon: "line", label: "线", tool: "line" },
  { id: "image", icon: "image", label: "图", tool: "image" },
  { id: "lock", icon: "lock", label: "锁", action: "lock" }
];

export const TOOL_LABEL = {
  freedraw: "笔",
  eraser: "橡皮",
  hand: "平移",
  selection: "选择",
  rectangle: "矩形",
  ellipse: "椭圆",
  arrow: "箭头",
  line: "直线",
  text: "文字",
  diamond: "菱形",
  image: "图片"
};

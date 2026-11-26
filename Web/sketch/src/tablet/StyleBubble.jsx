/**
 * 笔尖样式气泡：320×140，恒 3 行，内容跟随当前选中元素的类型。
 *
 * 为什么不放滑杆：笔尖要命中 28pt 的滑块很难，档位按钮可以整块点中。
 * 为什么不做翻页：第二页的内容靠上下文切换本来就能塞进 3 行。
 */

const COLORS = [
  { key: "#1e1e1e", label: "黑" },
  { key: "#e03131", label: "红" },
  { key: "#2f9e44", label: "绿" },
  { key: "#1971c2", label: "蓝" },
  { key: "#f08c00", label: "橙" },
  { key: "#868e96", label: "灰" }
];

const STROKE_WIDTHS = [
  { key: 1, label: "细" },
  { key: 2, label: "中" },
  { key: 4, label: "粗" },
  { key: 8, label: "特粗" }
];

const OPACITIES = [
  { key: 100, label: "100" },
  { key: 75, label: "75" },
  { key: 50, label: "50" },
  { key: 25, label: "25" }
];

const STROKE_STYLES = [
  { key: "solid", label: "实线" },
  { key: "dashed", label: "虚线" },
  { key: "dotted", label: "点线" }
];

const FONT_SIZES = [
  { key: 16, label: "小" },
  { key: 20, label: "中" },
  { key: 28, label: "大" },
  { key: 36, label: "特大" }
];

const ALIGNS = [
  { key: "left", label: "左" },
  { key: "center", label: "中" },
  { key: "right", label: "右" }
];

/** 按选中元素的类型决定三行放什么。 */
function rowsFor(context) {
  const types = context?.selectedTypes ?? [];
  const only = (name) => types.length === 1 && types[0] === name;
  const shape = types.some((t) => ["rectangle", "ellipse", "diamond"].includes(t));
  const linear = types.some((t) => ["arrow", "line"].includes(t));

  if (only("text")) {
    return [
      { id: "strokeColor", label: "颜色", kind: "color", value: context.style.strokeColor },
      { id: "fontSize", label: "字号", kind: "option", options: FONT_SIZES, value: context.style.fontSize },
      { id: "textAlign", label: "对齐", kind: "option", options: ALIGNS, value: context.style.textAlign }
    ];
  }
  if (shape || types.length > 1) {
    return [
      { id: "strokeColor", label: "描边", kind: "color", value: context.style.strokeColor },
      {
        id: "backgroundColor",
        label: "填充",
        kind: "color",
        allowNone: true,
        value: context.style.backgroundColor
      },
      {
        id: "strokeWidth",
        label: "线宽",
        kind: "option",
        options: STROKE_WIDTHS,
        value: context.style.strokeWidth
      }
    ];
  }
  if (linear) {
    return [
      { id: "strokeColor", label: "描边", kind: "color", value: context.style.strokeColor },
      {
        id: "strokeWidth",
        label: "线宽",
        kind: "option",
        options: STROKE_WIDTHS,
        value: context.style.strokeWidth
      },
      {
        id: "strokeStyle",
        label: "线型",
        kind: "option",
        options: STROKE_STYLES,
        value: context.style.strokeStyle
      }
    ];
  }
  // 笔 / 橡皮 / 无选中
  return [
    { id: "strokeColor", label: "颜色", kind: "color", value: context?.style?.strokeColor ?? "#1e1e1e" },
    {
      id: "strokeWidth",
      label: "线宽",
      kind: "option",
      options: STROKE_WIDTHS,
      value: context?.style?.strokeWidth ?? 2
    },
    {
      id: "opacity",
      label: "透明",
      kind: "option",
      options: OPACITIES,
      value: context?.style?.opacity ?? 100
    }
  ];
}

export function StyleBubble({ context, x, y, onClose, onChange }) {
  const rows = rowsFor(context);

  return (
    <div className="ts-bubble" style={{ left: x - 160, top: y }}>
      <div className="ts-bubble-head">
        <span>{context?.selectedTypes?.length ? "已选中" : "下一笔"}</span>
        <button type="button" className="ts-panel-close" onClick={onClose}>
          ×
        </button>
      </div>

      {rows.map((row) => (
        <div className="ts-bubble-row" key={row.id}>
          <span className="ts-bubble-label">{row.label}</span>
          <div className="ts-bubble-options">
            {row.kind === "color" ? (
              <>
                {row.allowNone ? (
                  <button
                    type="button"
                    className={`ts-swatch ts-swatch--none${
                      row.value === "transparent" ? " is-on" : ""
                    }`}
                    title="无填充"
                    onClick={() => onChange({ [row.id]: "transparent" })}
                  />
                ) : null}
                {COLORS.map((color) => (
                  <button
                    key={color.key}
                    type="button"
                    className={`ts-swatch${row.value === color.key ? " is-on" : ""}`}
                    style={{ background: color.key }}
                    title={color.label}
                    onClick={() => onChange({ [row.id]: color.key })}
                  />
                ))}
              </>
            ) : (
              row.options.map((option) => (
                <button
                  key={String(option.key)}
                  type="button"
                  className={`ts-chip${row.value === option.key ? " is-on" : ""}`}
                  onClick={() => onChange({ [row.id]: option.key })}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

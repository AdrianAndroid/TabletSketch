import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "../icons";
import { CATEGORY_ORDER } from "../style-wheel";
import {
  ACTION_GROUPS,
  ACTION_LIBRARY,
  SURFACE_RULES,
  DEFAULT_SHAPE_STYLES,
  defaultLayout,
  loadLayout,
  saveLayout,
  buildSurfaceSlots,
  listProfiles,
  saveProfile,
  renameProfile,
  deleteProfile,
  duplicateProfile,
  applyProfile,
  exportProfile,
  importProfile
} from "../layout-config.js";

/**
 * 设置窗口：左侧分组导航 + 右侧分节卡片，改动即时生效。
 * v2 重构：五处布局与样式取值全部可编辑，配置档支持导入导出。
 */

const GROUPS = [
  { id: "app", title: "应用", items: [{ id: "general", label: "通用", icon: "menu" }] },
  {
    id: "draw",
    title: "绘图",
    items: [
      { id: "pen", label: "笔", icon: "pen" },
      { id: "canvas", label: "画布", icon: "canvas" },
      { id: "shape-styles", label: "图形样式", icon: "style" }
    ]
  },
  { id: "input", title: "输入", items: [{ id: "keys", label: "键位", icon: "grip" }] },
  {
    id: "layout",
    title: "布局",
    items: [
      { id: "layout-left", label: "左浮动岛", icon: "style" },
      { id: "layout-right", label: "右浮动岛", icon: "library" },
      { id: "layout-key1", label: "手写笔键 1", icon: "select" },
      { id: "layout-key2", label: "手写笔键 2", icon: "more" },
      { id: "layout-onboard", label: "板载键", icon: "grip" },
      { id: "layout-profiles", label: "配置档", icon: "save" }
    ]
  },
  { id: "data", title: "数据", items: [{ id: "data", label: "数据与日志", icon: "library" }] }
];

const SURFACE_PAGE = {
  "layout-left": "leftIsland",
  "layout-right": "rightIsland",
  "layout-key1": "penKey1",
  "layout-key2": "penKey2",
  "layout-onboard": "onboardKeys"
};

const PEN_DEFAULTS = { fadeOnTouch: true, pressureGamma: 1.0, minStrokeWidth: 1, background: "plain" };
const PEN_KEY = "tablet.settings.v1";

function loadPenSettings() {
  try {
    const raw = localStorage.getItem(PEN_KEY);
    return raw ? { ...PEN_DEFAULTS, ...JSON.parse(raw) } : { ...PEN_DEFAULTS };
  } catch {
    return { ...PEN_DEFAULTS };
  }
}

function Section({ title, icon, children, note }) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <section className="ts-card">
      <h3 className="ts-card-title">
        {Icon ? <Icon /> : null}
        {title}
      </h3>
      {children}
      {note ? <p className="ts-card-note">{note}</p> : null}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="ts-field">
      <div className="ts-field-main">
        <span className="ts-field-label">{label}</span>
        <div className="ts-field-control">{children}</div>
      </div>
      {hint ? <p className="ts-field-hint">{hint}</p> : null}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      className={`ts-toggle${value ? " is-on" : ""}`}
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
    >
      <span className="ts-toggle-knob" />
    </button>
  );
}

function Segments({ options, value, onChange }) {
  return (
    <div className="ts-segments">
      {options.map((option) => (
        <button
          key={String(option.key)}
          type="button"
          className={`ts-segment${value === option.key ? " is-on" : ""}`}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SlotChip({ id, index, onRemove, onMove, draggable, onDragStart, onDragOver, onDragEnd, current, dragging, dropTarget }) {
  const def = ACTION_LIBRARY[id];
  if (!def) return null;
  const Icon = Icons[def.icon] || Icons.more;
  return (
    <div
      className={`ts-layout-chip${current ? " is-current" : ""}${dragging ? " is-dragging" : ""}${dropTarget ? " is-drop-target" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(event);
      }}
      onDragEnd={onDragEnd}
      title={current ? `${def.label} · 当前` : def.label}
    >
      <Icon />
      <span>{def.label}</span>
      {typeof index === "number" ? (
        <span className="ts-layout-chip-ops">
          <button type="button" onClick={() => onMove(index, -1)} title="上移">↑</button>
          <button type="button" onClick={() => onMove(index, 1)} title="下移">↓</button>
          <button type="button" onClick={() => onRemove(index)} title="移除">×</button>
        </span>
      ) : null}
    </div>
  );
}

function Preview({ surfaceId, ids, limit, state, previewing }) {
  const rules = SURFACE_RULES[surfaceId];
  const chunks = [];
  if (rules.geometry === "ring") {
    const innerCount = Math.max(1, (limit || 9) - 1);
    chunks.push({ label: `内圈 ${Math.min(innerCount, ids.length)}`, ids: ids.slice(0, innerCount) });
    chunks.push({ label: "更多", ids: ["more"] });
    chunks.push({ label: "外圈", ids: ids.slice(innerCount) });
  } else if (rules.geometry === "grid") {
    chunks.push({ label: `浮岛 · ${ids.length} 格`, ids });
  } else if (rules.geometry === "band") {
    chunks.push({ label: "按键带 1–8", ids: ids.map((id, i) => id || `空 ${i + 1}`) });
  } else {
    chunks.push({ label: `竖排 · ${ids.length} 项`, ids });
  }
  return (
    <div className="ts-layout-preview">
      {chunks.map((chunk, ci) => (
        <div key={ci} className="ts-layout-preview-row">
          <span className="ts-layout-preview-label">{chunk.label}</span>
          <div className="ts-layout-preview-items">
            {chunk.ids.length ? (
              chunk.ids.map((id, i) => (
                <span key={`${id}-${i}`} className={`ts-layout-preview-item${previewing ? " is-preview" : ""}`}>
                  {ACTION_LIBRARY[id]?.label || id}
                </span>
              ))
            ) : (
              <span className="ts-layout-preview-empty">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValuesEditor({ categories, values, onChange, onRestore }) {
  const [openKey, setOpenKey] = useState(null);
  return (
    <Section title="样式取值" icon="style" note="自定义取值通过现有 setStyle 桥接写入，与预设取值作用一致。">
      {categories.map((category) => {
        const def = ACTION_LIBRARY[category];
        const items = values[category] || [];
        const isOpen = openKey === category;
        return (
          <div key={category} className="ts-values-block">
            <button type="button" className="ts-values-head" onClick={() => setOpenKey(isOpen ? null : category)}>
              <span>{def?.label || category}</span>
              <span className="ts-field-value">{items.length} 项</span>
            </button>
            {isOpen ? (
              <div className="ts-values-body">
                {items.map((item, index) => (
                  <div key={`${item.key}-${index}`} className="ts-values-row">
                    <input
                      type="text"
                      value={item.label}
                      aria-label="取值名称"
                      onChange={(event) => {
                        const next = items.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry));
                        onChange(category, next);
                      }}
                    />
                    {item.color !== undefined ? (
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : "#1e1e1e"}
                        aria-label="自定义颜色"
                        onChange={(event) => {
                          const color = event.target.value;
                          const field = category === "background" ? "backgroundColor" : "strokeColor";
                          const next = items.map((entry, i) => {
                            if (i !== index) return entry;
                            const patch = { ...entry.patch };
                            for (const key of Object.keys(patch)) {
                              if (key.toLowerCase().includes("color")) delete patch[key];
                            }
                            patch[field] = color;
                            return { ...entry, key: color, color, patch };
                          });
                          onChange(category, next);
                        }}
                      />
                    ) : null}
                    <button type="button" onClick={() => onChange(category, items.filter((_, i) => i !== index))}>×</button>
                  </div>
                ))}
                <button
                  type="button"
                  className="ts-btn is-wide"
                  onClick={() =>
                    onChange(category, [
                      ...items,
                      {
                        key: `custom-${Date.now().toString(36)}`,
                        label: "新取值",
                        color: "#1e1e1e",
                        patch: { [category === "background" ? "backgroundColor" : "strokeColor"]: "#1e1e1e" }
                      }
                    ])
                  }
                >
                  添加取值
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
      <button type="button" className="ts-btn is-wide" onClick={onRestore}>恢复样式默认</button>
    </Section>
  );
}

function currentFor(id, state) {
  const def = ACTION_LIBRARY[id];
  if (!def) return false;
  if (def.tool) return state.tool === def.tool;
  if (def.action === "lock") return !!state.toolLocked;
  if (def.panel) return state.panel === def.panel;
  return false;
}

function LayoutPage({ surfaceId, layout, state, onPatch, onRestore, onRestoreValues }) {
  const rules = SURFACE_RULES[surfaceId];
  const surface = layout.surfaces[surfaceId];
  const ids = surface.ids.slice();
  const allowed = useMemo(() => {
    const set = new Set();
    for (const group of rules.groups) {
      const def = ACTION_GROUPS.find((item) => item.id === group);
      if (def) def.ids.forEach((id) => set.add(id));
    }
    return set;
  }, [rules]);
  // 拖拽期间用本地 preview 展示「松手后会得到的顺序」，持久化 ids 始终不变；
  // 只有落坑（drop）才写入配置，取消拖动则回落到原始顺序。
  const dragRef = useRef(null); // { from, ids, dragId }
  const [preview, setPreview] = useState(null); // { ids, dragId, at }
  const displayIds = preview ? preview.ids : ids;

  const publish = (state) => {
    dragRef.current = state;
    setPreview(state ? { ids: state.ids.slice(), dragId: state.dragId, at: state.from } : null);
  };

  const remove = (index) => {
    publish(null);
    onPatch({ ids: ids.filter((_, i) => i !== index) });
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    publish(null);
    const next = ids.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onPatch({ ids: next });
  };

  const startDrag = (index) => publish({ from: index, ids: ids.slice(), dragId: ids[index] });

  const overChip = (index) => {
    const state = dragRef.current;
    if (!state || state.from === null || state.from === index) return;
    const next = state.ids.slice();
    const [item] = next.splice(state.from, 1);
    next.splice(index, 0, item);
    if (next.every((value, i) => value === state.ids[i])) return;
    publish({ from: index, ids: next, dragId: state.dragId });
  };

  const endDrag = () => publish(null);

  const drop = () => {
    const next = dragRef.current?.ids;
    publish(null);
    if (!next || (next.length === ids.length && next.every((value, i) => value === ids[i]))) return;
    onPatch({ ids: next });
  };

  const add = (id) => {
    if (!allowed.has(id) || ids.includes(id) || ids.length >= rules.limit) return;
    publish(null);
    onPatch({ ids: [...ids, id] });
  };

  return (
    <>
      <Section title="形态预览" icon="canvas" note={`最多 ${rules.limit} 项；顺序即显示顺序。${preview ? "（预览中，松手保存）" : ""}`}>
        <Preview surfaceId={surfaceId} ids={displayIds} limit={surface.inner || surface.limit || rules.limit} state={state} previewing={!!preview} />
      </Section>

      <Section title="当前按钮" icon="layers" note="点箭头精确移动，也可按住条目拖到目标位置；拖动中实时预览排序，松手保存。">
        <div
          className="ts-layout-list"
          onDragEnd={endDrag}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            drop();
          }}
        >
          {displayIds.length ? (
            displayIds.map((id, index) => (
              <SlotChip
                key={id}
                id={id}
                index={index}
                current={currentFor(id, state)}
                onRemove={remove}
                onMove={move}
                draggable
                dragging={preview?.dragId === id}
                dropTarget={preview?.at === index}
                onDragStart={() => startDrag(index)}
                onDragOver={() => overChip(index)}
                onDragEnd={endDrag}
              />
            ))
          ) : (
            <p className="ts-card-note">当前为空，从下方候选池点选加入。</p>
          )}
        </div>
      </Section>

      <Section title="候选池" icon="plus" note="只列出该处允许的内容；已在列表中的项不可重复加入。">
        {ACTION_GROUPS.filter((group) => rules.groups.includes(group.id)).map((group) => (
          <div key={group.id} className="ts-layout-pool">
            <span className="ts-layout-pool-label">{group.label}</span>
            <div className="ts-layout-pool-items">
              {group.ids.map((id) => {
                const def = ACTION_LIBRARY[id];
                const Icon = Icons[def.icon] || Icons.more;
                const used = ids.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ts-layout-pool-item${used ? " is-used" : ""}`}
                    onClick={() => add(id)}
                    disabled={used || ids.length >= rules.limit}
                    title={def.label}
                  >
                    <Icon />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Section>

      <Section title="排布" icon="grip">
        {rules.geometry === "grid" ? (
          <Field label="列数" hint="1 或 2 列。">
            <Segments
              options={[{ key: 1, label: "单列" }, { key: 2, label: "双列" }]}
              value={surface.columns || 1}
              onChange={(v) => onPatch({ columns: v })}
            />
          </Field>
        ) : null}
        {rules.geometry === "ring" ? (
          <>
            <Field label="内圈槽位" hint="含「更多」，最大 9。">
              <input type="range" min="2" max="9" value={surface.inner || 9} onChange={(e) => onPatch({ inner: Number(e.target.value) })} />
              <span className="ts-field-value">{surface.inner || 9}</span>
            </Field>
            <Field label="外圈槽位" hint="展开「更多」后可见，最大 8。">
              <input type="range" min="2" max="8" value={surface.outer || 8} onChange={(e) => onPatch({ outer: Number(e.target.value) })} />
              <span className="ts-field-value">{surface.outer || 8}</span>
            </Field>
          </>
        ) : null}
        <Field label="容量上限" hint="该处最多显示的按钮数。">
          <span className="ts-field-value">{rules.limit}</span>
        </Field>
        <button type="button" className="ts-btn is-wide" onClick={onRestore}>恢复本页默认</button>
      </Section>

      {surfaceId === "penKey1" || surfaceId === "leftIsland" ? (
        <ValuesEditor
          categories={ACTION_GROUPS.find((g) => g.id === "style").ids}
          values={layout.values}
          onChange={(category, items) => onPatch({ values: { ...layout.values, [category]: items } })}
          onRestore={onRestoreValues}
        />
      ) : null}
    </>
  );
}

function ShapeStylesPage({ layout, onChange, onRestore }) {
  const shapeStyles = layout.shapeStyles || DEFAULT_SHAPE_STYLES;
  const types = Object.keys(DEFAULT_SHAPE_STYLES);
  return (
    <>
      <Section title="图形样式" icon="style" note="勾选每种图元显示的样式类别；左浮动岛与手写笔键 1 样式环共用这份设置。">
        {types.map((type) => {
          const enabled = shapeStyles[type] || [];
          return (
            <div key={type} className="ts-shape-block">
              <div className="ts-shape-head">
                <span>{ACTION_LIBRARY[type]?.label || type}</span>
                <span className="ts-field-value">{enabled.length} 项</span>
              </div>
              <div className="ts-shape-options">
                {CATEGORY_ORDER.map((category) => {
                  const def = ACTION_LIBRARY[category];
                  const checked = enabled.includes(category);
                  return (
                    <label key={category} className={`ts-shape-option${checked ? " is-on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? CATEGORY_ORDER.filter((key) => key === category || enabled.includes(key))
                            : enabled.filter((key) => key !== category);
                          onChange({ ...shapeStyles, [type]: next });
                        }}
                      />
                      <span>{def?.label || category}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Section>
      <button type="button" className="ts-btn is-wide" onClick={onRestore}>恢复图形样式默认</button>
    </>
  );
}

function ProfilesPage({ layout, profiles, onApply, onRefresh }) {
  const [name, setName] = useState("");

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importProfile(text);
    event.target.value = "";
    if (result) {
      onRefresh();
      onApply(result.id);
    }
  };

  const handleExport = (id) => {
    const text = exportProfile(id);
    if (!text) return;
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profiles[id]?.name || "配置"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Section title="保存当前布局" icon="save" note="保存后可在多个配置间切换。">
        <Field label="配置名称">
          <input type="text" value={name} placeholder="例如：只用笔和橡皮" onChange={(e) => setName(e.target.value)} />
        </Field>
        <button
          type="button"
          className="ts-btn is-wide"
          onClick={() => {
            const result = saveProfile(name || "未命名配置", layout);
            setName("");
            onRefresh();
            onApply(result.id);
          }}
        >
          保存为配置档
        </button>
      </Section>

      <Section title="已保存配置" icon="layers" note={`当前使用：${profiles[layout.activeProfile]?.name || "默认"}`}>
        {Object.values(profiles).length ? (
          Object.values(profiles).map((profile) => (
            <div key={profile.id} className="ts-profile-row">
              <span className="ts-profile-name">{profile.name}</span>
              <span className="ts-profile-ops">
                <button type="button" onClick={() => onApply(profile.id)}>切换</button>
                <button type="button" onClick={() => { duplicateProfile(profile.id); onRefresh(); }}>复制</button>
                <button type="button" onClick={() => { const next = window.prompt("新名称", profile.name); if (next) { renameProfile(profile.id, next); onRefresh(); } }}>重命名</button>
                <button type="button" onClick={() => handleExport(profile.id)}>导出</button>
                <button type="button" onClick={() => { deleteProfile(profile.id); onRefresh(); }}>删除</button>
              </span>
            </div>
          ))
        ) : (
          <p className="ts-card-note">还没有配置档。</p>
        )}
      </Section>

      <Section title="导入配置" icon="paste">
        <input type="file" accept="application/json,.json" onChange={handleImport} />
      </Section>
    </>
  );
}

export function SettingsWindow({ onClose, onClearCanvas }) {
  const [layout, setLayout] = useState(() => loadLayout());
  const [profiles, setProfiles] = useState(() => listProfiles());
  const [page, setPage] = useState("general");
  const [penSettings, setPenSettings] = useState(loadPenSettings);
  const [state, setState] = useState({ tool: "selection", toolLocked: false, panel: null });

  useEffect(() => {
    const refresh = () => {
      const api = window.tabletSketch;
      if (!api) return;
      const tool = api.getTool?.() || "selection";
      const toolLocked = !!api.getToolLocked?.();
      setState((current) => {
        if (current.tool === tool && current.toolLocked === toolLocked) return current;
        return { ...current, tool, toolLocked };
      });
    };
    refresh();
    const timer = setInterval(refresh, 400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(PEN_KEY, JSON.stringify(penSettings));
    window.dispatchEvent(new CustomEvent("tablet:settings", { detail: penSettings }));
  }, [penSettings]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patchPen = (next) => setPenSettings((current) => ({ ...current, ...next }));

  const patchSurface = (surfaceId, patch, kind) => {
    setLayout((current) => {
      const next = kind === "values"
        ? { ...current, values: patch.values }
        : { ...current, surfaces: { ...current.surfaces, [surfaceId]: { ...current.surfaces[surfaceId], ...patch } } };
      saveLayout(next);
      return next;
    });
  };

  const restoreSurface = (surfaceId) => {
    setLayout((current) => {
      const next = { ...current, surfaces: { ...current.surfaces, [surfaceId]: defaultLayout().surfaces[surfaceId] } };
      saveLayout(next);
      return next;
    });
  };

  const restoreValues = () => {
    setLayout((current) => {
      const next = { ...current, values: defaultLayout().values };
      saveLayout(next);
      return next;
    });
  };

  const patchShapeStyles = (shapeStyles) => {
    setLayout((current) => {
      const next = { ...current, shapeStyles };
      saveLayout(next);
      return next;
    });
  };

  const restoreShapeStyles = () => {
    setLayout((current) => {
      const next = { ...current, shapeStyles: defaultLayout().shapeStyles };
      saveLayout(next);
      return next;
    });
  };

  const applyProfileToLayout = (id) => {
    const next = applyProfile(id);
    if (next) setLayout(next);
  };

  const body = useMemo(() => {
    if (page === "general") {
      return (
        <>
          <Section title="启动" icon="menu">
            <Field label="默认模式" hint="鼠标模式下笔就是一个普通指针。">
              <Segments options={[{ key: "mouse", label: "鼠标" }, { key: "tablet", label: "手写板" }]} value="tablet" onChange={() => {}} />
            </Field>
          </Section>
          <Section title="交互" icon="hand" note="浮层打开期间笔不会画到画布上。">
            <Field label="落笔时浮岛淡出" hint="透明度降到设定值，笔靠近即恢复。">
              <Toggle value={penSettings.fadeOnTouch} onChange={(v) => patchPen({ fadeOnTouch: v })} />
            </Field>
          </Section>
        </>
      );
    }

    if (page === "pen") {
      return (
        <Section title="笔" icon="pen">
          <Field label="压感曲线" hint="gamma 越大越灵敏，1.0 是线性。">
            <input type="range" min="0.4" max="2.4" step="0.1" value={penSettings.pressureGamma} onChange={(e) => patchPen({ pressureGamma: Number(e.target.value) })} />
            <span className="ts-field-value">{Number(penSettings.pressureGamma).toFixed(1)}</span>
          </Field>
          <Field label="最小线宽">
            <input type="range" min="0.5" max="4" step="0.5" value={penSettings.minStrokeWidth} onChange={(e) => patchPen({ minStrokeWidth: Number(e.target.value) })} />
            <span className="ts-field-value">{penSettings.minStrokeWidth}</span>
          </Field>
        </Section>
      );
    }

    if (page === "canvas") {
      return (
        <Section title="画布" icon="canvas">
          <Field label="背景">
            <Segments
              options={[{ key: "plain", label: "纯白" }, { key: "dots", label: "点阵" }, { key: "grid", label: "网格" }, { key: "dark", label: "深色" }]}
              value={penSettings.background}
              onChange={(v) => {
                patchPen({ background: v });
                window.tabletSketch?.setBackground(v);
              }}
            />
          </Field>
        </Section>
      );
    }

    if (page === "keys") {
      const ids = layout.surfaces.onboardKeys.ids;
      return (
        <Section title="键位" icon="grip" note="板载键由应用接管，动作可在「布局 → 板载键」中定制。">
          {ids.map((id, index) => (
            <Field key={index} label={`板载键 ${index + 1}`}>
              <span className="ts-field-value">{ACTION_LIBRARY[id]?.label || "未设置"}</span>
            </Field>
          ))}
        </Section>
      );
    }

    if (page === "shape-styles") {
      return <ShapeStylesPage layout={layout} onChange={patchShapeStyles} onRestore={restoreShapeStyles} />;
    }

    if (SURFACE_PAGE[page]) {
      const surfaceId = SURFACE_PAGE[page];
      return (
        <LayoutPage
          surfaceId={surfaceId}
          layout={layout}
          state={state}
          onPatch={(patch, kind) => patchSurface(surfaceId, patch, kind)}
          onRestore={() => restoreSurface(surfaceId)}
          onRestoreValues={restoreValues}
        />
      );
    }

    if (page === "layout-profiles") {
      return <ProfilesPage layout={layout} profiles={profiles} onApply={applyProfileToLayout} onRefresh={() => setProfiles(listProfiles())} />;
    }

    return (
      <>
        <Section title="数据与日志" icon="library">
          <Field label="画布目录" hint="~/Pictures/TabletSketch/Sketches">
            <span className="ts-field-value">默认</span>
          </Field>
          <Field label="清空当前画布" hint="可以撤销。">
            <button type="button" className="ts-btn is-danger" onClick={onClearCanvas}>清空</button>
          </Field>
        </Section>
        <Section title="诊断" icon="more" note="设备连不上时先看这里。">
          <Field label="HID 采集器" hint="tablet-sketch-hid 的实时状态。">
            <span className="ts-field-value">见顶部条</span>
          </Field>
        </Section>
      </>
    );
  }, [page, penSettings, layout, profiles, state, onClearCanvas]);

  return (
    <div className="ts-settings-wrap" onClick={onClose}>
      <div className="ts-settings" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="设置">
        <header className="ts-settings-head">
          <h2>设置</h2>
          <button type="button" className="ts-panel-close" onClick={onClose}>
            <Icons.close />
          </button>
        </header>
        <div className="ts-settings-body">
          <nav className="ts-settings-nav">
            {GROUPS.map((group) => (
              <div key={group.id} className="ts-nav-group">
                <span className="ts-nav-title">{group.title}</span>
                {group.items.map((item) => {
                  const Icon = Icons[item.icon] || Icons.more;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`ts-nav-item${page === item.id ? " is-on" : ""}`}
                      onClick={() => setPage(item.id)}
                    >
                      <Icon />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="ts-settings-main">{body}</div>
        </div>
      </div>
    </div>
  );
}

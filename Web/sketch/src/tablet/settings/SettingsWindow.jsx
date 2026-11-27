import { useEffect, useMemo, useState } from "react";
import { Icons } from "../icons";

/**
 * 设置窗口。
 *
 * 形态按 app-settings/spec.md：660×700，左侧 200pt 分组导航，右侧分节卡片，
 * 改动即时生效，不设「应用」按钮。
 *
 * 当前实现为渲染进程内的居中浮层（视觉上等同独立小窗）。真正的第二个
 * BrowserWindow 留到打包阶段，理由是设置项不多，浮层已经够用。
 */

const GROUPS = [
  {
    id: "app",
    title: "应用",
    items: [{ id: "general", label: "通用", icon: "menu" }]
  },
  {
    id: "draw",
    title: "绘图",
    items: [
      { id: "island", label: "浮岛", icon: "library" },
      { id: "more", label: "更多", icon: "more" },
      { id: "bubble", label: "气泡", icon: "style" },
      { id: "styleRing", label: "样式环", icon: "select" },
      { id: "pen", label: "笔", icon: "pen" },
      { id: "canvas", label: "画布", icon: "canvas" }
    ]
  },
  {
    id: "input",
    title: "输入",
    items: [{ id: "keys", label: "键位", icon: "grip" }]
  },
  {
    id: "data",
    title: "数据",
    items: [{ id: "data", label: "数据与日志", icon: "library" }]
  }
];

const DEFAULTS = {
  slotCount: 15,
  doubleColumn: true,
  fadeOnTouch: true,
  fadeOpacity: 20,
  pressureGamma: 1.0,
  minStrokeWidth: 1,
  background: "plain",
  gridSize: 20
};

const STORAGE_KEY = "tablet.settings.v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
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

const KEY_LABELS = ["菜单", "画布", "素材", "笔", "擦", "手", "选", "矩"];

export function SettingsWindow({ onClose, onClearCanvas }) {
  const [settings, setSettings] = useState(load);
  const [page, setPage] = useState("general");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("tablet:settings", { detail: settings }));
  }, [settings]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = (next) => setSettings((current) => ({ ...current, ...next }));

  const body = useMemo(() => {
    if (page === "general") {
      return (
        <>
          <Section title="启动" icon="menu">
            <Field label="默认模式" hint="鼠标模式下笔就是一个普通指针。">
              <Segments
                options={[
                  { key: "mouse", label: "鼠标" },
                  { key: "tablet", label: "手写板" }
                ]}
                value="tablet"
                onChange={() => {}}
              />
            </Field>
          </Section>
          <Section title="交互" icon="hand" note="浮层打开期间笔不会画到画布上。">
            <Field label="落笔时浮岛淡出" hint="透明度降到设定值，笔靠近即恢复。">
              <Toggle value={settings.fadeOnTouch} onChange={(v) => patch({ fadeOnTouch: v })} />
            </Field>
          </Section>
        </>
      );
    }

    if (page === "island") {
      return (
        <Section title="浮岛" icon="library">
          <Field label="格子数量" hint="双排上限 16 格，超出的进「更多」。">
            <input
              type="range"
              min="1"
              max="16"
              value={settings.slotCount}
              onChange={(event) => patch({ slotCount: Number(event.target.value) })}
            />
            <span className="ts-field-value">{settings.slotCount}</span>
          </Field>
          <Field label="双排">
            <Toggle value={settings.doubleColumn} onChange={(v) => patch({ doubleColumn: v })} />
          </Field>
        </Section>
      );
    }

    if (page === "more") {
      return (
        <Section title="更多" icon="more" note="超过浮岛容量的工具按这里的顺序排列。">
          <Field label="展开方向">
            <Segments
              options={[
                { key: "left", label: "向左" },
                { key: "up", label: "向上" }
              ]}
              value={settings.moreDirection || "left"}
              onChange={(v) => patch({ moreDirection: v })}
            />
          </Field>
        </Section>
      );
    }

    if (page === "bubble") {
      return (
        <Section title="笔尖样式气泡" icon="style" note="固定 3 行，内容跟随选中元素的类型。">
          <Field label="尺寸" hint="当前 320×140，所有档位按钮不小于 28×28pt。">
            <span className="ts-field-value">320 × 140</span>
          </Field>
        </Section>
      );
    }

    if (page === "styleRing") {
      return (
        <Section title="样式环" icon="select" note="两级同心环，v1 固定取值，不提供配置。">
          <Field label="颜色" hint="黑 / 红 / 绿 / 蓝 / 橙 / 灰，不做自定义取色器。">
            <span className="ts-field-value">6 色</span>
          </Field>
          <Field label="透明度" hint="100 / 90 / 80 / 70 / 50 / 30 / 20 / 10，不含 0。">
            <span className="ts-field-value">8 档</span>
          </Field>
          <Field label="字号" hint="S / M / L / XL。">
            <span className="ts-field-value">4 档</span>
          </Field>
        </Section>
      );
    }

    if (page === "pen") {
      return (
        <Section title="笔" icon="pen">
          <Field label="压感曲线" hint="gamma 越大越灵敏，1.0 是线性。">
            <input
              type="range"
              min="0.4"
              max="2.4"
              step="0.1"
              value={settings.pressureGamma}
              onChange={(event) => patch({ pressureGamma: Number(event.target.value) })}
            />
            <span className="ts-field-value">{settings.pressureGamma.toFixed(1)}</span>
          </Field>
          <Field label="最小线宽">
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={settings.minStrokeWidth}
              onChange={(event) => patch({ minStrokeWidth: Number(event.target.value) })}
            />
            <span className="ts-field-value">{settings.minStrokeWidth}</span>
          </Field>
        </Section>
      );
    }

    if (page === "canvas") {
      return (
        <Section title="画布" icon="canvas">
          <Field label="背景">
            <Segments
              options={[
                { key: "plain", label: "纯白" },
                { key: "dots", label: "点阵" },
                { key: "grid", label: "网格" },
                { key: "dark", label: "深色" }
              ]}
              value={settings.background}
              onChange={(v) => {
                patch({ background: v });
                window.tabletSketch?.setBackground(v);
              }}
            />
          </Field>
        </Section>
      );
    }

    if (page === "keys") {
      return (
        <Section title="键位" icon="grip" note="板载键 1–8 与前 8 格同一份数据，不能单独改。">
          {KEY_LABELS.map((label, index) => (
            <Field key={label} label={`板载键 ${index + 1}`}>
              <span className="ts-field-value">{label}</span>
            </Field>
          ))}
        </Section>
      );
    }

    return (
      <>
        <Section title="数据与日志" icon="library">
          <Field label="画布目录" hint="~/Pictures/TabletSketch/Sketches">
            <span className="ts-field-value">默认</span>
          </Field>
          <Field label="清空当前画布" hint="可以撤销。">
            <button type="button" className="ts-btn is-danger" onClick={onClearCanvas}>
              清空
            </button>
          </Field>
        </Section>
        <Section title="诊断" icon="more" note="设备连不上时先看这里。">
          <Field label="HID 采集器" hint="tablet-sketch-hid 的实时状态。">
            <span className="ts-field-value">见顶部条</span>
          </Field>
        </Section>
      </>
    );
  }, [page, settings, onClearCanvas]);

  return (
    <div className="ts-settings-wrap" onClick={onClose}>
      <div
        className="ts-settings"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="设置"
      >
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

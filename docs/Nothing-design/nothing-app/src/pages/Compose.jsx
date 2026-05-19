import React from 'react';
import { AppSidebar } from '../components/AppSidebar.jsx';

// Compose — the page that earns the product's keep.
// Code context isn't an "attach a file" afterthought; it's a first-class
// composer panel, sitting next to the body, with file/line selection
// inline. The body and the context are siblings, not parent/child.

function ComposePage() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    soft_rule: '#F1EEE2',
    yellow: '#E5FF00',
    code_bg: '#FBFAF3',
    code_hl: '#FFF7B8',
    add: '#1F7A4F',
    rem: '#B5331A',
    warn: '#A8761A',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  // Code-context: real file lines so the panel reads as a tool not a stub.
  const lines = [
    { n: 17, t: 'export const MAX_RETRIES = 5;' },
    { n: 18, t: 'export type Payload = { to: string; body: string };' },
    { n: 19, t: '' },
    { n: 20, t: 'async function sendWithRetry(payload: Payload) {' },
    { n: 21, t: '  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {' },
    { n: 22, t: '    const delay = 100;  // ← fixed delay, the problem', sel: true, hl: true },
    { n: 23, t: '    try {', sel: true },
    { n: 24, t: '      const r = await client.post("/send", payload);', sel: true },
    { n: 25, t: '      if (r.status === 200) return r;', sel: true },
    { n: 26, t: '    } catch (err) {', sel: true },
    { n: 27, t: '      if (!isRetryable(err)) throw err;', sel: true },
    { n: 28, t: '    }', sel: true },
    { n: 29, t: '    await sleep(delay);', sel: true },
    { n: 30, t: '  }', sel: true },
    { n: 31, t: '  throw new Error("retries_exhausted");' },
    { n: 32, t: '}' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: '232px 1fr',
      overflow: 'hidden',
    }}>
      <AppSidebar active="inbox" C={C} />

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* top bar */}
        <div style={{
          padding: '14px 40px', borderBottom: `1px solid ${C.rule}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: C.mid, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>×</span><span>Discard</span>
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ComposeBtn label="Save draft" kbd="⌘S" C={C} />
            <ComposeBtn label="Schedule"   kbd="⇧⏎" C={C} />
            <span style={{ width: 1, height: 18, background: C.rule, margin: '0 6px' }} />
            <button style={{
              background: C.ink, color: C.bg, border: 'none',
              padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13,
            }}>Send</button>
          </div>
        </div>

        {/* canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px 90px' }}>
          {/* recipients · subject · meta */}
          <div style={{ maxWidth: 1240, margin: '0 auto', borderBottom: `1px solid ${C.rule}`, paddingBottom: 14 }}>
            <ComposeField label="To"   C={C}>
              <Pill label="bob@nothing.email" />
              <Pill label="claude-code@nothing.email" />
              <span style={{ ...mono, fontSize: 13.5, color: C.soft }}>type a handle…</span>
            </ComposeField>
            <ComposeField label="Cc"   C={C} dim>
              <span style={{ ...mono, fontSize: 13, color: C.soft }}>+ cc</span>
            </ComposeField>
            <ComposeField label="Subject" C={C}>
              <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 26, lineHeight: 1.1, letterSpacing: '-.005em', color: C.ink }}>
                Re: 退避逻辑有问题
              </span>
              <span style={{ display: 'inline-block', width: 2, height: 22, background: C.ink, marginLeft: 2, animation: 'blink 1s steps(2) infinite', verticalAlign: 'middle' }} />
            </ComposeField>
            <style>{'@keyframes blink{50%{opacity:0}}'}</style>

            {/* meta strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
              <MetaTag label="backend-refactor" kind="project" C={C} />
              <MetaTag label="code-review"      kind="label" C={C} />
              <MetaTag label="+ label"          kind="add" C={C} />
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft }}>From</span>
                <span style={{ fontSize: 13, color: C.ink }}>Hana B. <span style={{ ...mono, fontSize: 11, color: C.soft, marginLeft: 4 }}>hana@acme.com</span></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1F7A4F' }} />
                  <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.mid }}>NMP · same node</span>
                </span>
              </span>
            </div>
          </div>

          {/* two-column body + context */}
          <div style={{
            maxWidth: 1240, margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 36, marginTop: 26,
          }}>
            {/* body */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>Body</span>
                <span style={{ ...mono, fontSize: 10.5, color: C.soft }}>markdown</span>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 6, padding: '18px 22px', minHeight: 360, fontFamily: '"Newsreader", serif', fontSize: 17, lineHeight: 1.55, color: C.ink, textWrap: 'pretty' }}>
                <p style={{ margin: '0 0 16px' }}>
                  你说得对 — 第 22 行用固定 100ms 在生产环境根本扛不住瞬时尖峰。前面三次 retry 在同一个 100ms 窗口里全部撞上同一个 429。
                </p>
                <p style={{ margin: '0 0 16px' }}>
                  改成 <em style={{ fontStyle: 'italic' }}>100 × 2^attempt</em> 之后跑了 retry suite，22 次里全部在第 3 次以内 200。给 backoff 加了 30 秒上限，免得遇到长时间故障时整个 worker 卡死。
                </p>
                <p style={{ margin: 0, color: C.mid }}>
                  Patch 附在下面，PR 等你点 approve。
                  <span style={{ display: 'inline-block', width: 2, height: 18, background: C.ink, marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1s steps(2) infinite' }} />
                </p>
              </div>
              {/* attachments */}
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>Attachments · 2</span>
                  <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', ...mono, fontSize: 11, color: C.ink, letterSpacing: '.06em' }}>+ add file</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <AttachChip2 name="session.ts.patch" size="2.1 KB" kind="patch" C={C} />
                  <AttachChip2 name="retry-suite.log"  size="14 KB"  kind="log" C={C} />
                </div>
              </div>
            </div>

            {/* code context */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Code context
                  <span style={{ ...mono, fontSize: 8.5, letterSpacing: '.2em', background: C.yellow, color: C.ink, padding: '1px 5px', borderRadius: 2 }}>NMP</span>
                </span>
                <span style={{ ...mono, fontSize: 10.5, color: C.soft }}>lines 22-30 · 9 lines</span>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 6, overflow: 'hidden' }}>
                {/* picker bar */}
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.rule}`, background: C.code_bg, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ ...mono, fontSize: 11, color: C.ink, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: C.mid }}>github.com/acme/api</span>
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: C.soft }}>·</span>
                  <span style={{ ...mono, fontSize: 11.5, color: C.ink }}>src/session.ts</span>
                  <span style={{ ...mono, fontSize: 11, color: C.soft }}>:22-30</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span style={{ ...mono, fontSize: 9.5, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase', border: `1px solid ${C.rule}`, padding: '1px 6px', borderRadius: 2 }}>TS</span>
                    <span style={{ ...mono, fontSize: 9.5, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase', border: `1px solid ${C.rule}`, padding: '1px 6px', borderRadius: 2 }}>main</span>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', ...mono, fontSize: 11, color: C.ink }}>change…</button>
                  </span>
                </div>

                {/* line range explainer */}
                <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.soft_rule}`, background: C.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...mono, fontSize: 10, color: C.mid, letterSpacing: '.16em', textTransform: 'uppercase' }}>shift-click a line to extend the range</span>
                  <button style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.rule}`, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', ...mono, fontSize: 10, color: C.mid }}>tighten ↘</button>
                  <button style={{ background: 'transparent', border: `1px solid ${C.rule}`, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', ...mono, fontSize: 10, color: C.mid }}>expand ↙↗</button>
                </div>

                {/* code */}
                <div style={{ padding: '12px 0', ...mono, fontSize: 12.5, lineHeight: 1.7, maxHeight: 340, overflow: 'auto' }}>
                  {lines.map(l => (
                    <div key={l.n} style={{
                      display: 'grid', gridTemplateColumns: '50px 1fr', alignItems: 'baseline',
                      background: l.hl ? C.code_hl : (l.sel ? '#FCFBED' : 'transparent'),
                      borderLeft: l.hl ? `3px solid ${C.ink}` : (l.sel ? `3px solid ${C.yellow}` : '3px solid transparent'),
                      paddingLeft: 3, paddingRight: 16,
                    }}>
                      <span style={{ color: l.sel ? C.ink : C.soft, textAlign: 'right', paddingRight: 14, userSelect: 'none', fontWeight: l.sel ? 500 : 400 }}>{l.n}</span>
                      <span style={{ color: l.hl ? C.ink : (l.sel ? C.ink : '#2D2D2A'), whiteSpace: 'pre' }}>{l.t || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* what gets sent preview removed for cleanup */}
            </div>
          </div>
        </div>

        {/* bottom status / sender hint */}
        <div style={{
          padding: '12px 40px', borderTop: `1px solid ${C.rule}`,
          display: 'flex', alignItems: 'center', gap: 18,
          background: C.bg,
        }}>
          <span style={{ fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 13.5, color: C.mid }}>
            Delivered as NMP to bob; SMTP to claude-code.
          </span>
        </div>
      </main>
    </div>
  );
}

function ComposeField({ label, dim, children, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${C.soft_rule}`,
    }}>
      <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: dim ? C.soft : C.mid }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function Pill({ label }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px 3px 10px', borderRadius: 999, background: '#F1EEE2',
      ...mono, fontSize: 11.5, color: '#0F0F0E',
    }}>
      <span>{label}</span>
      <span style={{ color: '#9A9A92', cursor: 'pointer' }}>×</span>
    </span>
  );
}

function MetaTag({ label, kind, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  if (kind === 'add') {
    return (
      <span style={{
        ...mono, fontSize: 10.5, color: C.soft, letterSpacing: '.04em',
        padding: '3px 9px', border: `1px dashed ${C.rule}`, borderRadius: 3,
        cursor: 'pointer',
      }}>{label}</span>
    );
  }
  return (
    <span style={{
      ...mono, fontSize: 10.5, color: C.ink,
      padding: '3px 8px', border: `1px solid ${C.rule}`, borderRadius: 3,
      background: kind === 'project' ? '#FBFAF3' : '#FFFFFF',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase', fontSize: 9 }}>{kind}</span>
      <span>{label}</span>
    </span>
  );
}

function ComposeBtn({ label, kbd, C }) {
  return (
    <button style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '7px 12px', borderRadius: 6,
      fontFamily: 'inherit', fontSize: 13, color: C.ink,
    }}>{label}</button>
  );
}

function AttachChip2({ name, size, kind, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 12px', border: `1px solid ${C.rule}`, borderRadius: 4,
      background: C.panel, minWidth: 200,
    }}>
      <span style={{
        width: 30, height: 30, borderRadius: 3, background: '#F1EEE2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...mono, fontSize: 11, color: C.mid,
      }}>{kind === 'patch' ? '◇' : '≡'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ ...mono, fontSize: 10, color: C.soft, marginTop: 2 }}>{size}</div>
      </div>
      <span style={{ color: C.soft, cursor: 'pointer' }}>×</span>
    </div>
  );
}

export default ComposePage;

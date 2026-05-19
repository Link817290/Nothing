import React from 'react';
import { IOSDevice } from './IOSDevice.jsx';
import { INBOX } from '../data/sample.js';

// Mobile · Style A
// Three screens inside an iPhone frame: Inbox · Detail (with code context) ·
// Quick Reply. Same visual system as the desktop boards — wordmark, mono
// metadata, yellow as the only chromatic accent.

const M = {
  bg:    '#FAFAF7',
  panel: '#FFFFFF',
  ink:   '#0F0F0E',
  mid:   '#6E6E68',
  soft:  '#9A9A92',
  rule:  '#E8E4D8',
  yellow:'#E5FF00',
  code_bg:'#FBFAF3',
  code_hl:'#FFF7B8',
  ok:    '#1F7A4F',
  fail:  '#B5331A',
  warn:  '#A8761A',
};

const mmono = { fontFamily: '"JetBrains Mono", monospace' };

// ───── Mobile · Inbox ────────────────────────────────────────────

function MobileInbox() {
  return (
    <IOSDevice>
      <div style={{ height: '100%', background: M.bg, color: M.ink, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        {/* spacer under notch */}
        <div style={{ height: 54 }} />

        {/* header */}
        <div style={{ padding: '14px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, letterSpacing: '-.01em' }}>nothing</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: M.yellow, marginBottom: 6 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <MobIconBtn glyph="⌕" />
              <MobIconBtn glyph="+" primary />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 }}>
            <div>
              <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 4 }}>Tue · 14 May</div>
              <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 38, lineHeight: 1, letterSpacing: '-.01em' }}>Inbox</div>
            </div>
            <span style={{ ...mmono, fontSize: 11, color: M.ink, letterSpacing: '.04em' }}>3 unread · 0 failed</span>
          </div>

          {/* filter chips */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
            <MobChip label="Unread" count={3} active />
            <MobChip label="All"    count={28} />
            <MobChip label="#backend-refactor" count={8} />
            <MobChip label="#web-app" count={4} />
            <MobChip label="Attach"  />
          </div>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 30 }}>
          <MobRow m={INBOX[0]} />
          <MobRow m={INBOX[1]} />
          <MobRow m={INBOX[2]} />
          <MobRow m={INBOX[3]} />
          <MobRow m={INBOX[4]} />
          <MobRow m={INBOX[5]} />
        </div>

        {/* bottom tab bar */}
        <MobTabBar active="inbox" />
      </div>
    </IOSDevice>
  );
}

function MobChip({ label, count, active }) {
  return (
    <span style={{
      flexShrink: 0,
      padding: '5px 11px', borderRadius: 999,
      background: active ? M.ink : 'transparent',
      color: active ? M.bg : M.mid,
      border: `1px solid ${active ? M.ink : M.rule}`,
      fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span>{label}</span>
      {count != null && <span style={{ ...mmono, fontSize: 10, opacity: 0.6 }}>{count}</span>}
    </span>
  );
}

function MobIconBtn({ glyph, primary }) {
  return (
    <button style={{
      width: 32, height: 32, borderRadius: '50%', border: 'none',
      background: primary ? M.ink : 'transparent', color: primary ? M.bg : M.ink,
      cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0,
    }}>{glyph}</button>
  );
}

function MobRow({ m }) {
  return (
    <div style={{
      padding: '14px 18px',
      borderBottom: `1px solid ${M.rule}`,
      display: 'grid', gridTemplateColumns: '10px 1fr auto', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: m.unread ? M.yellow : 'transparent',
        marginTop: 7,
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: m.unread ? 600 : 500, color: M.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fromName}</span>
          <span style={{ ...mmono, fontSize: 9.5, color: M.soft, letterSpacing: '.16em', textTransform: 'uppercase', flexShrink: 0 }}>{m.date}</span>
        </div>
        <div style={{
          fontFamily: '"Geist", sans-serif', fontSize: 14.5, fontWeight: m.unread ? 600 : 500,
          color: M.ink, lineHeight: 1.3, marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        }}>{m.subject}</div>
        <div style={{ fontSize: 13, color: M.mid, lineHeight: 1.35, marginTop: 4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{m.preview}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          {m.project && (
            <span style={{ ...mmono, fontSize: 9.5, color: M.mid, padding: '2px 6px', border: `1px solid ${M.rule}`, borderRadius: 3 }}>{m.project}</span>
          )}
          <MobStatus status={m.status} />
          {m.thread_count > 1 && <span style={{ ...mmono, fontSize: 9.5, color: M.soft, letterSpacing: '.04em' }}>·{m.thread_count}</span>}
          {m.has_attachments && <span style={{ ...mmono, fontSize: 10, color: M.soft }}>◇</span>}
        </div>
      </div>
      <span style={{ width: 0 }} />
    </div>
  );
}

function MobStatus({ status }) {
  const map = {
    queued:    { label: 'queued',    color: M.soft },
    sent:      { label: 'sent',      color: M.mid },
    delivered: { label: 'delivered', color: M.ok },
    read:      { label: 'read',      color: M.ok },
    replied:   { label: 'replied',   color: M.ink, mark: true },
    failed:    { label: 'failed',    color: M.fail },
  };
  const s = map[status] || map.delivered;
  return (
    <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: s.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {s.mark && <span style={{ width: 5, height: 5, borderRadius: '50%', background: M.yellow }} />}
      <span>{s.label}</span>
    </span>
  );
}

function MobTabBar({ active }) {
  const tabs = [
    { id: 'inbox',   label: 'Inbox',    glyph: '⌂', badge: 3 },
    { id: 'sent',    label: 'Sent',     glyph: '↗' },
    { id: 'agents',  label: 'Agents',   glyph: '◇' },
    { id: 'me',      label: 'Me',       glyph: '○' },
  ];
  return (
    <div style={{
      borderTop: `1px solid ${M.rule}`, background: 'rgba(250,250,247,0.92)',
      backdropFilter: 'saturate(120%) blur(10px)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-around',
      padding: '8px 12px 26px',
    }}>
      {tabs.map(t => (
        <button key={t.id} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '4px 12px', minWidth: 56, position: 'relative',
          color: active === t.id ? M.ink : M.mid,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1, position: 'relative' }}>
            {t.glyph}
            {t.badge && <span style={{
              position: 'absolute', top: -3, right: -8,
              fontSize: 9, ...mmono, background: M.yellow, color: M.ink,
              padding: '1px 4px', borderRadius: 6, letterSpacing: '.04em',
            }}>{t.badge}</span>}
          </span>
          <span style={{ fontSize: 10, ...mmono, letterSpacing: '.1em', textTransform: 'uppercase' }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ───── Mobile · Detail ───────────────────────────────────────────

function MobileDetail() {
  const codeLines = [
    { n: 20, t: 'async function sendWithRetry(' },
    { n: 21, t: '  for (let attempt = 0;' },
    { n: 22, t: '    const delay = 100;', hl: true },
    { n: 23, t: '    try {' },
    { n: 24, t: '      const r = await client.post(' },
  ];

  return (
    <IOSDevice>
      <div style={{ height: '100%', background: M.bg, color: M.ink, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 54 }} />

        {/* nav */}
        <div style={{
          padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${M.rule}`, background: 'rgba(250,250,247,0.92)',
          backdropFilter: 'blur(10px)',
        }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.ink, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 4px' }}>
            <span>←</span>
            <span style={{ ...mmono, fontSize: 11.5, letterSpacing: '.04em' }}>inbox · 3</span>
          </button>
          <span style={{ ...mmono, fontSize: 9.5, color: M.soft, letterSpacing: '.18em', textTransform: 'uppercase' }}>msg_01HX9K2N</span>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.ink, fontSize: 18, padding: '4px 8px' }}>···</button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* header */}
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft }}>Reply · thread of 3</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: M.yellow }} />
              <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: M.ink }}>replied</span>
            </div>
            <h1 style={{ fontFamily: '"Instrument Serif", serif', fontSize: 30, lineHeight: 1.1, letterSpacing: '-.015em', margin: '10px 0 16px', fontWeight: 400, textWrap: 'pretty' }}>
              Re: 退避逻辑有问题
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar2 name="Bob Chen" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: M.ink }}>
                  <span style={{ fontWeight: 500 }}>Bob Chen</span>
                  <span style={{ color: M.soft, margin: '0 6px' }}>→</span>
                  <span>Hana B.</span>
                </div>
                <div style={{ ...mmono, fontSize: 10.5, color: M.soft, marginTop: 2 }}>04:18 · 14 May</div>
              </div>
              <span style={{ ...mmono, fontSize: 9.5, color: M.mid, padding: '2px 6px', border: `1px solid ${M.rule}`, borderRadius: 3 }}>backend-refactor</span>
            </div>
          </div>

          {/* code context */}
          <div style={{ padding: '0 18px', marginBottom: 18 }}>
            <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 8 }}>Quoted code</div>
            <div style={{ background: M.panel, border: `1px solid ${M.rule}`, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${M.rule}`, background: M.code_bg, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...mmono, fontSize: 10.5, color: M.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  src/session.ts<span style={{ color: M.soft }}>:20-35</span>
                </span>
                <span style={{ ...mmono, fontSize: 9, color: M.soft, letterSpacing: '.16em', textTransform: 'uppercase', border: `1px solid ${M.rule}`, padding: '1px 5px', borderRadius: 2 }}>TS</span>
                <span style={{ ...mmono, fontSize: 10.5, color: M.soft }}>↗</span>
              </div>
              <div style={{ padding: '10px 0', ...mmono, fontSize: 11, lineHeight: 1.7 }}>
                {codeLines.map(l => (
                  <div key={l.n} style={{
                    display: 'grid', gridTemplateColumns: '32px 1fr',
                    background: l.hl ? M.code_hl : 'transparent',
                    borderLeft: l.hl ? `3px solid ${M.ink}` : '3px solid transparent',
                    paddingLeft: l.hl ? 0 : 3, paddingRight: 12,
                  }}>
                    <span style={{ color: M.soft, textAlign: 'right', paddingRight: 10 }}>{l.n}</span>
                    <span style={{ color: l.hl ? M.ink : '#2D2D2A', whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.t}</span>
                  </div>
                ))}
                <div style={{ ...mmono, fontSize: 10, color: M.soft, padding: '6px 12px 0', display: 'none' }}>+ 11 more lines  ·  tap to expand</div>
              </div>
            </div>
          </div>

          {/* body */}
          <div style={{ padding: '0 18px', fontFamily: '"Newsreader", serif', fontSize: 16, lineHeight: 1.55, color: M.ink, textWrap: 'pretty' }}>
            <p style={{ margin: '0 0 12px' }}>
              你说得对 — 第 22 行用固定 100ms 在生产环境根本扛不住瞬时尖峰。前面三次 retry 在同一个 100ms 窗口里全部撞上 429。
            </p>
            <p style={{ margin: '0 0 12px' }}>
              改成 <em style={{ fontStyle: 'italic' }}>100 × 2^attempt</em>，加 30 秒上限。Patch 在下面。
            </p>
          </div>

          {/* attachments */}
          <div style={{ padding: '20px 18px 12px' }}>
            <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 8 }}>Attachments · 2</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MobAttach name="session.ts.patch" size="2.1 KB" kind="patch" />
              <MobAttach name="retry-suite.log"  size="14 KB"  kind="log" />
            </div>
          </div>

          {/* thread */}
          <div style={{ padding: '6px 18px 100px' }}>
            <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 8 }}>Thread · 3</div>
            <MobThread who="Hana B."     prev="这个退避逻辑有问题…"     when="2d" />
            <MobThread who="Bob Chen"    prev="你说得对，第 22 行…"     when="14m" current />
            <MobThread who="Claude Code" prev="Opened PR #284 with the patch above…" when="2m" />
          </div>
        </div>

        {/* sticky reply bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 14px 28px', background: 'rgba(250,250,247,0.94)',
          backdropFilter: 'blur(10px)', borderTop: `1px solid ${M.rule}`,
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 60,
        }}>
          <button style={{
            flex: 1, background: 'transparent', border: `1px solid ${M.rule}`,
            borderRadius: 999, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: M.yellow }} />
            <span style={{ fontSize: 13.5, color: M.mid }}>Reply in thread…</span>
          </button>
          <MobIconBtn glyph="↩" primary />
        </div>
      </div>
    </IOSDevice>
  );
}

function Avatar2({ name }) {
  const initials = name.split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '50%', background: '#1F1B14', color: '#FFFCEE',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Geist", sans-serif', fontSize: 11, fontWeight: 500,
      flexShrink: 0,
    }}>{initials}</span>
  );
}

function MobAttach({ name, size, kind }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', border: `1px solid ${M.rule}`, borderRadius: 6, background: M.panel,
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 3, background: M.code_bg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...mmono, fontSize: 11, color: M.mid,
      }}>{kind === 'patch' ? '◇' : '≡'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: M.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ ...mmono, fontSize: 10, color: M.soft }}>{size}</div>
      </div>
      <span style={{ fontSize: 14, color: M.mid }}>↓</span>
    </div>
  );
}

function MobThread({ who, prev, when, current }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
      borderBottom: `1px solid ${M.rule}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: current ? M.yellow : M.rule, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, color: current ? M.ink : M.mid, fontWeight: current ? 500 : 400 }}>{who}</span>
          <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: M.soft }}>{when}</span>
        </div>
        <div style={{ fontSize: 13, color: M.mid, marginTop: 2,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{prev}</div>
      </div>
    </div>
  );
}

// ───── Mobile · Quick Reply ─────────────────────────────────────
// What an agent surfaces when it needs a yes/no decision while you're
// out. Not authoring a long reply — just resolving the thing.

function MobileQuickReply() {
  return (
    <IOSDevice>
      <div style={{ height: '100%', background: M.bg, color: M.ink, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 54 }} />

        {/* nav */}
        <div style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${M.rule}`,
        }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.ink, fontSize: 18, padding: '4px 8px' }}>×</button>
          <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft }}>Decision needed</span>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.mid, fontSize: 13 }}>skip</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 18px' }}>
          {/* who/what summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar2 name="Claude Code" />
            <div>
              <div style={{ fontSize: 13, color: M.ink, fontWeight: 500 }}>Claude Code</div>
              <div style={{ ...mmono, fontSize: 10, color: M.soft }}>working on backend-refactor · 2m ago</div>
            </div>
          </div>

          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 32, lineHeight: 1.08, letterSpacing: '-.015em',
            margin: '20px 0 14px', fontWeight: 400, textWrap: 'pretty',
          }}>Should I open PR #284 with the retry patch?</h1>

          {/* context preview */}
          <div style={{
            background: M.panel, border: `1px solid ${M.rule}`, borderRadius: 6,
            padding: '14px 14px', marginTop: 4, marginBottom: 18,
          }}>
            <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 8 }}>Changes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FileDiff path="src/session.ts" plus={4} minus={2} />
              <FileDiff path="src/config.ts"  plus={2} minus={0} />
              <FileDiff path="src/__tests__/retry.test.ts" plus={18} minus={3} />
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${M.rule}`, ...mmono, fontSize: 11, color: M.mid, lineHeight: 1.55 }}>
              <div>retry suite · <span style={{ color: M.ok }}>22/22 passing</span></div>
              <div>lint · <span style={{ color: M.ok }}>clean</span></div>
              <div>main · <span style={{ color: M.ok }}>up to date</span></div>
            </div>
          </div>

          {/* quick-reply chips */}
          <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 10 }}>Quick reply</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            <QuickPick label="Open it" tone="primary" />
            <QuickPick label="Open as draft" />
            <QuickPick label="Hold — let me look first" />
            <QuickPick label="Skip — close the thread" tone="muted" />
          </div>

          {/* free-form */}
          <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, marginBottom: 8 }}>Or say something</div>
          <div style={{
            border: `1px solid ${M.rule}`, borderRadius: 8,
            padding: '12px 14px', background: M.panel, minHeight: 70, color: M.soft, fontSize: 14, lineHeight: 1.45,
          }}>open it but mark me as the reviewer
            <span style={{ display: 'inline-block', width: 1.5, height: 16, background: M.ink, marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1s steps(2) infinite' }} />
          </div>
          <style>{'@keyframes blink{50%{opacity:0}}'}</style>
        </div>

        {/* sticky action */}
        <div style={{
          padding: '12px 14px 28px', borderTop: `1px solid ${M.rule}`,
          display: 'flex', alignItems: 'center', gap: 10, background: M.bg,
        }}>
          <span style={{ flex: 1, fontFamily: '"Newsreader", serif', fontSize: 13, color: M.mid }}>
            Sent as <span style={{ color: M.ink }}>hana@acme.com</span>
          </span>
          <button style={{
            background: M.yellow, color: M.ink, border: 'none',
            padding: '11px 22px', borderRadius: 999, cursor: 'pointer',
            ...mmono, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>Send ↵</button>
        </div>
      </div>
    </IOSDevice>
  );
}

function FileDiff({ path, plus, minus }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5 }}>
      <span style={{ ...mmono, color: M.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
      <span style={{ ...mmono, fontSize: 11, color: M.ok }}>+{plus}</span>
      <span style={{ ...mmono, fontSize: 11, color: M.fail }}>−{minus}</span>
    </div>
  );
}

function QuickPick({ label, tone }) {
  const styles = tone === 'primary'
    ? { background: M.ink, color: M.bg, border: 'none' }
    : tone === 'muted'
    ? { background: 'transparent', color: M.mid, border: `1px solid ${M.rule}` }
    : { background: 'transparent', color: M.ink, border: `1px solid ${M.ink}` };
  return (
    <button style={{
      ...styles, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 14.5, textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ flex: 1 }}>{label}</span>
      {tone === 'primary' && <span style={{ ...mmono, fontSize: 9.5, opacity: 0.6, padding: '1px 5px', border: '1px solid rgba(255,255,255,.25)', borderRadius: 3 }}>↵</span>}
    </button>
  );
}


// ───── Mobile · Settings ────────────────────────────────────────

function MobileSettings() {
  return (
    <IOSDevice>
      <div style={{ height: '100%', background: M.bg, color: M.ink, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 54 }} />
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${M.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.ink, fontSize: 15, padding: '6px 4px' }}>← Inbox</button>
          <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: M.soft }}>Settings</span>
          <span style={{ width: 28 }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 30 }}>
          <div style={{ padding: '20px 18px 4px' }}>
            <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft }}>You</div>
            <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 30, lineHeight: 1.05, marginTop: 4 }}>Hana B.</div>
            <div style={{ ...mmono, fontSize: 11, color: M.mid, marginTop: 2 }}>hana@acme.com</div>
          </div>

          <MSettingsGroup label="Account">
            <MRow label="Display name" value="Hana B." chevron />
            <MRow label="GitHub"       value="@hana-b" rightBadge="OAuth" />
            <MRow label="Master Token" value="ntk_live_M9aN2p…" mono />
          </MSettingsGroup>

          <MSettingsGroup label="Instance · self-hosted">
            <MRow label="Domain"    value="acme.com" mono right={<MStatusDot color={M.ok} label="healthy" />} />
            <MRow label="Stalwart"  value="0.10.4 · running" mono right={<MStatusDot color={M.ok} label="6d uptime" />} />
            <MRow label="API base"  value="https://api.acme.com" mono small />
            <MRow label="Re-run setup wizard" italic chevron />
          </MSettingsGroup>

          <MSettingsGroup label="Usage · today">
            <MMeter label="Messages sent" cur={12} max={50} />
            <MMeter label="Storage"       cur={47} max={100} unit=" MB" />
            <MMeter label="Tokens"        cur={3} max={5} />
          </MSettingsGroup>

          <MSettingsGroup label="Notifications">
            <MRow label="Push · decision needed" value="all agents" toggle on />
            <MRow label="Push · delivery state"  value="failed only" toggle on />
            <MRow label="Push · activity"        value="off" toggle />
            <MRow label="Email digest"           value="weekly · Mondays" chevron />
          </MSettingsGroup>

          <MSettingsGroup label="Danger zone" danger>
            <MDangerRow title="Regenerate Master Token" body="Stops all current sessions and agents. They'll need re-login." />
            <MDangerRow title="Delete this node" body="All messages, agents, tokens — gone. You'll be asked to type the domain." hard />
          </MSettingsGroup>

          <div style={{ padding: '24px 18px 24px', textAlign: 'center' }}>
            <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: M.soft }}>nothing · v0.4.2 · open beta</div>
          </div>
        </div>

        <MobTabBar active="me" />
      </div>
    </IOSDevice>
  );
}

function MSettingsGroup({ label, danger, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: danger ? M.fail : M.soft, padding: '0 18px 8px' }}>{label}</div>
      <div style={{
        background: danger ? '#FCF4F0' : M.panel,
        border: `1px solid ${danger ? '#F3D9CC' : M.rule}`,
        margin: '0 14px', borderRadius: 8, overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

function MRow({ label, value, mono: monoF, italic, chevron, rightBadge, right, toggle, on, small }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
      padding: '12px 14px', borderBottom: `1px solid ${M.rule}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: italic ? '"Newsreader", serif' : 'inherit',
          fontStyle: italic ? 'italic' : 'normal',
          fontSize: 14, color: M.ink,
        }}>{label}</div>
        {value && (
          <div style={{
            fontFamily: monoF ? '"JetBrains Mono", monospace' : 'inherit',
            fontSize: monoF ? (small ? 11 : 12) : 12.5,
            color: M.mid, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{value}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        {rightBadge && <span style={{ ...mmono, fontSize: 9, color: M.soft, padding: '2px 6px', border: `1px solid ${M.rule}`, borderRadius: 3, letterSpacing: '.16em', textTransform: 'uppercase' }}>{rightBadge}</span>}
        {toggle && (
          <span style={{
            width: 36, height: 22, borderRadius: 999, background: on ? M.ink : M.rule,
            position: 'relative', flexShrink: 0,
          }}>
            <span style={{
              position: 'absolute', top: 2, left: on ? 16 : 2,
              width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,.15)',
            }} />
          </span>
        )}
        {chevron && <span style={{ color: M.soft, fontSize: 14 }}>›</span>}
      </div>
    </div>
  );
}

function MMeter({ label, cur, max, unit = '' }) {
  const pct = Math.round((cur / max) * 100);
  return (
    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${M.rule}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, color: M.ink }}>{label}</span>
        <span style={{ ...mmono, fontSize: 11, color: M.mid }}>
          <span style={{ color: M.ink, fontWeight: 500 }}>{cur}{unit}</span>
          <span style={{ color: M.soft }}> / {max}{unit}</span>
        </span>
      </div>
      <div style={{ height: 3, background: '#F1EEE2', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: M.ink }} />
      </div>
    </div>
  );
}

function MStatusDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      <span style={{ ...mmono, fontSize: 10, color: M.mid, letterSpacing: '.06em' }}>{label}</span>
    </span>
  );
}

function MDangerRow({ title, body, hard }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: `1px solid rgba(181,51,26,0.12)` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, color: M.ink, fontWeight: 500 }}>{title}</span>
        <button style={{
          background: hard ? M.fail : 'transparent',
          color: hard ? '#FFFFFF' : M.fail,
          border: hard ? 'none' : `1px solid ${M.fail}`,
          padding: '5px 11px', borderRadius: 4, cursor: 'pointer',
          ...mmono, fontSize: 10, letterSpacing: '.06em', flexShrink: 0,
        }}>{hard ? 'Delete' : 'Run'}</button>
      </div>
      <div style={{ fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 12.5, color: M.mid, marginTop: 4, lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}

// ───── Mobile · Tokens ──────────────────────────────────────────

function MobileTokens() {
  const tokens = [
    { name: 'Claude Code · laptop',   prev: 'ntk_live_a1b2…f7e3', perms: ['send','inbox','read','reply'], last: '2m ago',  active: true },
    { name: 'Cursor · dev container', prev: 'ntk_live_c4d5…22ab', perms: ['send','inbox','read'],         last: '1h ago' },
    { name: 'Codex · CI runner',      prev: 'ntk_live_9f01…aa12', perms: ['send','read'],                 last: 'yesterday' },
    { name: 'Old MacBook · revoked',  prev: 'ntk_live_55e2…1abc', perms: ['send','inbox','read','reply','manage'], last: '12d ago', revoked: true },
  ];
  return (
    <IOSDevice>
      <div style={{ height: '100%', background: M.bg, color: M.ink, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 54 }} />
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${M.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.ink, fontSize: 15, padding: '6px 4px' }}>← Me</button>
          <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: M.soft }}>API Tokens</span>
          <MobIconBtn glyph="+" primary />
        </div>

        <div style={{ padding: '18px 18px 8px' }}>
          <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft }}>3 active · 1 revoked</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 30, lineHeight: 1.05, marginTop: 4 }}>
            Who can speak<br/>as you?
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px 24px' }}>
          {tokens.map((t, i) => <MTokenCard key={i} t={t} />)}
        </div>

        <div style={{
          borderTop: `1px solid ${M.rule}`,
          padding: '12px 14px 28px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 13, color: M.mid, flex: 1 }}>
            Scope tight. Revoke fast.
          </span>
          <button style={{
            background: M.ink, color: M.bg, border: 'none',
            padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
            ...mmono, fontSize: 11, letterSpacing: '.06em',
          }}>+ Token</button>
        </div>
      </div>
    </IOSDevice>
  );
}

function MTokenCard({ t }) {
  return (
    <div style={{
      background: M.panel, border: `1px solid ${M.rule}`, borderRadius: 8,
      padding: '12px 14px', marginBottom: 10,
      borderLeft: t.active ? `2px solid ${M.yellow}` : `1px solid ${M.rule}`,
      paddingLeft: t.active ? 12 : 14,
      opacity: t.revoked ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 14, color: M.ink, fontWeight: 500, textDecoration: t.revoked ? 'line-through' : 'none' }}>{t.name}</span>
        <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: t.revoked ? M.fail : M.ok, flexShrink: 0 }}>
          {t.revoked ? 'revoked' : 'active'}
        </span>
      </div>
      <div style={{ ...mmono, fontSize: 11.5, color: M.mid, marginTop: 4, letterSpacing: '.02em' }}>{t.prev}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {t.perms.map(p => (
          <span key={p} style={{
            ...mmono, fontSize: 9, color: p === 'manage' ? M.warn : M.ink,
            background: p === 'manage' ? '#FCF4D8' : '#F1EEE2',
            padding: '2px 6px', borderRadius: 3, letterSpacing: '.14em', textTransform: 'uppercase',
          }}>{p}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
        <span style={{ ...mmono, fontSize: 10, color: M.soft, letterSpacing: '.04em' }}>last used {t.last}</span>
        {!t.revoked && (
          <button style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 12,
            color: M.fail, borderBottom: '1px solid rgba(181,51,26,0.25)', padding: '0 0 1px',
          }}>revoke</button>
        )}
      </div>
    </div>
  );
}

// ───── Mobile · Notifications ───────────────────────────────────

function MobileNotifications() {
  return (
    <IOSDevice>
      <div style={{ height: '100%', background: M.bg, color: M.ink, fontFamily: '"Geist", system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 54 }} />
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${M.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.ink, fontSize: 15, padding: '6px 4px' }}>← Inbox</button>
          <span style={{ ...mmono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: M.soft }}>Activity</span>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: M.mid, ...mmono, fontSize: 11, letterSpacing: '.06em' }}>seen all</button>
        </div>

        <div style={{ padding: '18px 18px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 30, lineHeight: 1 }}>Activity</div>
            <span style={{ ...mmono, fontSize: 11, color: M.ink, letterSpacing: '.04em' }}>2 need you</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <MNotifGroup label="Needs you">
            <MNotifRow glyph="◆" who="Claude Code" body="Should I open PR #284 with the retry patch?" when="2m" proj="backend-refactor" hot />
            <MNotifRow glyph="◆" who="Codex"       body="Apply migration 2026_05_users to staging?"   when="8m" proj="db-migrations"  hot />
          </MNotifGroup>

          <MNotifGroup label="Today">
            <MNotifRow glyph="↩" who="Bob Chen"    body="replied to Re: 退避逻辑有问题"               when="14m" />
            <MNotifRow glyph="✓" who="Cursor"      body="delivered · build failed on main"                when="1h" />
            <MNotifRow glyph="✗" who="lisa@partner-co.io" body="failed · 550 5.1.1 user unknown"      when="3h" bad />
            <MNotifRow glyph="◇" who="Claude Code" body="opened PR #279 · web-app"                        when="5h" />
          </MNotifGroup>

          <MNotifGroup label="Older">
            <MNotifRow glyph="○" who="system"      body="master token regenerated from web"           when="yesterday" muted />
            <MNotifRow glyph="↗" who="Codex"       body="sent migration draft to hana"                when="2d" muted />
          </MNotifGroup>

          <div style={{ height: 40 }} />
        </div>

        <MobTabBar active="agents" />
      </div>
    </IOSDevice>
  );
}

function MNotifGroup({ label, children }) {
  return (
    <div>
      <div style={{ ...mmono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: M.soft, padding: '14px 18px 6px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function MNotifRow({ glyph, who, body, when, proj, hot, bad, muted }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '18px 1fr 44px', gap: 10, alignItems: 'flex-start',
      padding: '12px 18px', borderBottom: `1px solid ${M.rule}`,
      background: hot ? '#FFFCEA' : 'transparent',
      borderLeft: hot ? `2px solid ${M.yellow}` : '2px solid transparent',
      paddingLeft: hot ? 16 : 18,
      opacity: muted ? 0.65 : 1,
    }}>
      <span style={{ fontSize: 14, color: bad ? M.fail : (hot ? M.ink : M.mid) }}>{glyph}</span>
      <div>
        <div style={{ fontSize: 13.5, color: M.ink, lineHeight: 1.35 }}>
          <span style={{ fontWeight: 500 }}>{who}</span>
          <span style={{ color: M.mid, marginLeft: 4 }}>· {body}</span>
        </div>
        {proj && <span style={{ ...mmono, fontSize: 9.5, color: M.mid, padding: '2px 6px', border: `1px solid ${M.rule}`, borderRadius: 3, marginTop: 6, display: 'inline-block' }}>{proj}</span>}
      </div>
      <span style={{ ...mmono, fontSize: 9.5, color: M.soft, letterSpacing: '.16em', textTransform: 'uppercase', textAlign: 'right' }}>{when}</span>
    </div>
  );
}

export {
  MobileInbox, MobileDetail, MobileQuickReply,
  MobileSettings, MobileTokens, MobileNotifications,
};

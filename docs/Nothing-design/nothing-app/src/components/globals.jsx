import React from 'react';

// Globals — Toasts · Command palette · Notification center.
// These don't earn their own page; they overlay on top of any surface.
// Each artboard shows the global component over a faded screenshot-y
// background so the spatial relationship is clear.

const G = {
  bg: '#FAFAF7',
  faded: 'rgba(15,15,14,0.18)',
  panel: '#FFFFFF',
  ink: '#0F0F0E',
  mid: '#6E6E68',
  soft: '#9A9A92',
  rule: '#E8E4D8',
  yellow: '#E5FF00',
  ok:   '#1F7A4F',
  fail: '#B5331A',
  warn: '#A8761A',
  code_bg: '#FBFAF3',
};

const gmono = { fontFamily: '"JetBrains Mono", monospace' };

// ───── Toast strip — 6 variants in stack ────────────────────────

function GlobalToasts() {
  // Match the 6-state delivery system + 1 generic + 1 destructive undo.
  const toasts = [
    { kind: 'sent',      title: 'Sent to bob@nothing.email',          body: 'NMP · same node · arriving now', glyph: '↗', tone: 'mid' },
    { kind: 'delivered', title: 'Delivered to claude-code@nothing.email', body: 'SMTP · 240ms · ✓', glyph: '✓', tone: 'ok' },
    { kind: 'replied',   title: 'Bob replied',                        body: 'Re: 退避逻辑有问题 · 14m ago', glyph: '↩', tone: 'replied' },
    { kind: 'failed',    title: 'Couldn\'t reach lisa@partner-co.io', body: '550 5.1.1 user unknown · retry / delete', glyph: '✗', tone: 'fail' },
    { kind: 'paste',     title: 'Master Token copied',                body: 'in the clipboard for 30 seconds. Then it forgets.', glyph: '◇', tone: 'mid' },
    { kind: 'undo',      title: 'Archived 3 messages',                body: 'undo · in 6s', glyph: '↺', tone: 'mid', undo: true },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: G.bg, color: G.ink, fontFamily: '"Geist", system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
      padding: 32,
    }}>
      {/* faded shell behind */}
      <FadedShell />

      {/* the stack */}
      <div style={{
        position: 'absolute', right: 32, top: 60, width: 380,
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 2,
      }}>
        <div style={{ ...gmono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: G.soft, marginBottom: 4 }}>
          Toast / live status — bottom-right of any page
        </div>
        {toasts.map((t, i) => <ToastCard key={i} t={t} />)}
      </div>
    </div>
  );
}

function ToastCard({ t }) {
  const color = {
    ok:   G.ok,
    mid:  G.mid,
    fail: G.fail,
    replied: G.ink,
  }[t.tone] || G.mid;
  return (
    <div style={{
      background: G.panel, border: `1px solid ${t.tone === 'fail' ? '#F2D9CC' : G.rule}`,
      borderRadius: 6, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 24px rgba(15,15,14,0.05)',
      borderLeft: t.tone === 'replied' ? `3px solid ${G.yellow}` : (t.tone === 'fail' ? `3px solid ${G.fail}` : `1px solid ${G.rule}`),
      paddingLeft: t.tone === 'replied' || t.tone === 'fail' ? 12 : 14,
    }}>
      <span style={{
        ...gmono, fontSize: 13, color, marginTop: 1, width: 16, textAlign: 'center', flexShrink: 0,
      }}>{t.glyph}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: G.ink, fontWeight: 500 }}>{t.title}</div>
        <div style={{ ...gmono, fontSize: 10.5, color: G.mid, marginTop: 3, letterSpacing: '.02em' }}>{t.body}</div>
      </div>
      {t.undo && (
        <button style={{
          background: 'transparent', border: `1px solid ${G.rule}`, padding: '4px 9px', borderRadius: 4,
          cursor: 'pointer', ...gmono, fontSize: 10, color: G.ink, letterSpacing: '.06em', flexShrink: 0,
        }}>undo</button>
      )}
      {t.tone === 'fail' && (
        <button style={{
          background: G.fail, color: '#FFFFFF', border: 'none', padding: '4px 9px', borderRadius: 4,
          cursor: 'pointer', ...gmono, fontSize: 10, letterSpacing: '.06em', flexShrink: 0,
        }}>retry</button>
      )}
    </div>
  );
}

// ───── Command palette · ⌘K ──────────────────────────────────────

function GlobalCommandK() {
  const groups = [
    { label: 'Suggested',
      items: [
        { glyph: '↗',  label: 'Send a message',  kbd: 'N', detail: 'Compose · new outbound message' },
        { glyph: '🔎', label: "Re: 退避逻辑有问题",  kbd: '↵', detail: 'inbox · 14m ago · Bob Chen → Hana B.', match: true },
      ],
    },
    { label: 'Threads',
      items: [
        { glyph: '⌗', label: 'backend-refactor · 8 messages',  detail: 'project' },
        { glyph: '⌗', label: 'web-app · 4 messages',           detail: 'project' },
        { glyph: '⌗', label: 'architecture · 6 messages',      detail: 'project' },
      ],
    },
    { label: 'Actions',
      items: [
        { glyph: '↩', label: 'Reply to current',                 kbd: 'R',  detail: 'message · 04:18' },
        { glyph: '◇', label: 'Quote code · src/session.ts:22',   kbd: '⌥Q', detail: 'composer · attach code context' },
        { glyph: '⏏', label: 'Archive this thread',              kbd: 'E',  detail: 'inbox', destructive: false },
        { glyph: '⚠', label: 'Revoke Claude Code · laptop',      kbd: '⇧⌫', detail: 'tokens', destructive: true },
      ],
    },
    { label: 'Settings',
      items: [
        { glyph: '○', label: 'Switch handle',                    detail: 'hana@acme.com · 1 of 1' },
        { glyph: '⚙', label: 'Re-run setup wizard',              detail: 'instance' },
      ],
    },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: G.bg, fontFamily: '"Geist", system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <FadedShell />
      {/* scrim */}
      <div style={{ position: 'absolute', inset: 0, background: G.faded, backdropFilter: 'blur(3px)', zIndex: 1 }} />

      {/* palette */}
      <div style={{
        position: 'absolute', left: '50%', top: 80, transform: 'translateX(-50%)',
        width: 580, background: G.panel, border: `1px solid ${G.rule}`, borderRadius: 8,
        boxShadow: '0 24px 80px rgba(15,15,14,0.22)', zIndex: 2,
        display: 'flex', flexDirection: 'column', maxHeight: 540,
      }}>
        {/* input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', borderBottom: `1px solid ${G.rule}`,
        }}>
          <span style={{ ...gmono, fontSize: 14, color: G.soft }}>→</span>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, color: G.ink, lineHeight: 1, letterSpacing: '-.005em' }}>
            退避
          </span>
          <span style={{ display: 'inline-block', width: 2, height: 22, background: G.ink, animation: 'blink 1s steps(2) infinite' }} />
          <style>{'@keyframes blink{50%{opacity:0}}'}</style>
          <span style={{ marginLeft: 'auto', ...gmono, fontSize: 10, color: G.soft, letterSpacing: '.18em', textTransform: 'uppercase' }}>4 results</span>
          <span style={{ ...gmono, fontSize: 9.5, color: G.soft, padding: '1px 5px', border: `1px solid ${G.rule}`, borderRadius: 3 }}>esc</span>
        </div>

        {/* groups */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ ...gmono, fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: G.soft, padding: '10px 18px 6px' }}>
                {group.label}
              </div>
              {group.items.map((it, i) => <CKRow key={i} it={it} />)}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{
          padding: '8px 18px', borderTop: `1px solid ${G.rule}`, background: G.code_bg,
          display: 'flex', alignItems: 'center', gap: 14, ...gmono, fontSize: 10, color: G.mid,
          letterSpacing: '.04em',
        }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span style={{ marginLeft: 'auto' }}>⌘K · everywhere</span>
        </div>
      </div>
    </div>
  );
}

function CKRow({ it }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '24px 1fr auto auto', gap: 14, alignItems: 'baseline',
      padding: '8px 18px',
      background: it.match ? '#FFFCEA' : 'transparent',
      borderLeft: it.match ? `2px solid ${G.yellow}` : '2px solid transparent',
      paddingLeft: it.match ? 16 : 18,
    }}>
      <span style={{ fontSize: 14, color: it.destructive ? G.fail : G.mid, textAlign: 'center' }}>{it.glyph}</span>
      <div>
        <div style={{ fontSize: 13.5, color: it.destructive ? G.fail : G.ink, fontWeight: it.match ? 500 : 400 }}>{it.label}</div>
        <div style={{ ...gmono, fontSize: 10, color: G.soft, marginTop: 2, letterSpacing: '.04em' }}>{it.detail}</div>
      </div>
      <span />
      {it.kbd && <span style={{ ...gmono, fontSize: 9.5, color: G.soft, padding: '1px 5px', border: `1px solid ${G.rule}`, borderRadius: 3 }}>{it.kbd}</span>}
    </div>
  );
}

// ───── Notification center ───────────────────────────────────────

function GlobalNotifications() {
  const groups = [
    { label: 'Needs you · 2',
      items: [
        { glyph: '◆', who: 'Claude Code', body: 'Should I open PR #284 with the retry patch?', when: '2m', proj: 'backend-refactor', hot: true },
        { glyph: '◆', who: 'Codex',       body: 'Apply migration 2026_05_users to staging?',   when: '8m', proj: 'db-migrations',     hot: true },
      ],
    },
    { label: 'Activity',
      items: [
        { glyph: '↩', who: 'Bob Chen',    body: 'replied to Re: 退避逻辑有问题',           when: '14m' },
        { glyph: '✓', who: 'Cursor',      body: 'delivered: build failed on main',           when: '1h' },
        { glyph: '✗', who: 'lisa@partner-co.io', body: 'failed: 550 5.1.1 user unknown', when: '3h', bad: true },
        { glyph: '◇', who: 'Claude Code', body: 'opened PR #279 · web-app',                  when: '5h' },
        { glyph: '○', who: 'system',      body: 'master token regenerated from web',         when: 'yesterday' },
      ],
    },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: G.bg, fontFamily: '"Geist", system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <FadedShell />

      {/* anchor indicator */}
      <div style={{
        position: 'absolute', top: 20, right: 84, width: 30, height: 30, borderRadius: '50%',
        border: `1.5px solid ${G.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
        background: G.bg,
      }}>
        <span style={{ fontSize: 14, color: G.ink }}>○</span>
        <span style={{
          position: 'absolute', top: -2, right: -2,
          background: G.yellow, color: G.ink,
          ...gmono, fontSize: 8.5, padding: '1px 4px', borderRadius: 6,
        }}>2</span>
      </div>

      {/* panel */}
      <div style={{
        position: 'absolute', top: 60, right: 32, width: 420,
        background: G.panel, border: `1px solid ${G.rule}`, borderRadius: 8,
        boxShadow: '0 24px 60px rgba(15,15,14,0.18)', zIndex: 2,
        maxHeight: 560, display: 'flex', flexDirection: 'column',
      }}>
        {/* header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${G.rule}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, lineHeight: 1 }}>Activity</div>
            <div style={{ ...gmono, fontSize: 10, color: G.soft, marginTop: 4, letterSpacing: '.18em', textTransform: 'uppercase' }}>
              <span style={{ color: G.ink }}>2 need you</span>  ·  5 background
            </div>
          </div>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', ...gmono, fontSize: 10.5, color: G.mid, letterSpacing: '.06em' }}>mark all seen</button>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ ...gmono, fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: G.soft, padding: '12px 18px 6px' }}>
                {group.label}
              </div>
              {group.items.map((it, i) => <NotifRow key={i} it={it} />)}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{
          padding: '10px 18px', borderTop: `1px solid ${G.rule}`, background: G.code_bg,
          display: 'flex', alignItems: 'center', gap: 14, ...gmono, fontSize: 10, color: G.mid,
          letterSpacing: '.04em',
        }}>
          <span>desktop · mobile · email</span>
          <span style={{ marginLeft: 'auto' }}>notification rules ↗</span>
        </div>
      </div>
    </div>
  );
}

function NotifRow({ it }) {
  const color = it.hot ? G.ink : (it.bad ? G.fail : G.mid);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '20px 1fr 50px', gap: 12, alignItems: 'flex-start',
      padding: '10px 18px', borderBottom: `1px solid #F1EEE2`,
      background: it.hot ? '#FFFCEA' : 'transparent',
      borderLeft: it.hot ? `2px solid ${G.yellow}` : '2px solid transparent',
      paddingLeft: it.hot ? 16 : 18,
    }}>
      <span style={{ fontSize: 14, color, marginTop: 1 }}>{it.glyph}</span>
      <div>
        <div style={{ fontSize: 13, color: G.ink, lineHeight: 1.35 }}>
          <span style={{ fontWeight: 500 }}>{it.who}</span>
          <span style={{ color: G.mid, marginLeft: 4 }}>· {it.body}</span>
        </div>
        {it.proj && (
          <div style={{ marginTop: 6 }}>
            <span style={{ ...gmono, fontSize: 9.5, color: G.mid, padding: '2px 6px', border: `1px solid ${G.rule}`, borderRadius: 3 }}>{it.proj}</span>
          </div>
        )}
      </div>
      <span style={{ ...gmono, fontSize: 9.5, color: G.soft, letterSpacing: '.16em', textTransform: 'uppercase', textAlign: 'right' }}>{it.when}</span>
    </div>
  );
}

// ───── faded shell behind the overlays ────────────────────────────

function FadedShell() {
  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.4, filter: 'saturate(.8)',
      display: 'grid', gridTemplateColumns: '180px 1fr', pointerEvents: 'none',
    }}>
      <div style={{ background: G.bg, borderRight: `1px solid ${G.rule}`, padding: '24px 16px' }}>
        <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22 }}>nothing<span style={{ width: 4, height: 4, background: G.yellow, borderRadius: '50%', display: 'inline-block', marginLeft: 4 }} /></div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Inbox','Sent','Threads','Archive'].map(s => (
            <div key={s} style={{ fontSize: 13, color: G.mid }}>{s}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: '32px 28px' }}>
        <div style={{ ...gmono, fontSize: 9, letterSpacing: '.18em', color: G.soft }}>TUE · 14 MAY</div>
        <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 36, marginTop: 6 }}>Inbox</div>
        <div style={{ marginTop: 18, height: 1, background: G.rule }} />
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ padding: '14px 0', borderBottom: `1px solid ${G.rule}` }}>
            <div style={{ height: 14, background: G.rule, width: '60%', borderRadius: 2 }} />
            <div style={{ height: 10, background: G.rule, width: '88%', borderRadius: 2, marginTop: 8, opacity: 0.5 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export { GlobalToasts, GlobalCommandK, GlobalNotifications };

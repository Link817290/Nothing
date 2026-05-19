import React from 'react';

// Inbox states · the edge of the system.
// Five variants of the same surface: empty first-time, caught up, loading,
// node unreachable, token expired. Each tries to be specific and useful —
// not a stock "no messages yet" with a paper-plane illustration.

const S = {
  bg: '#FAFAF7',
  panel: '#FFFFFF',
  ink: '#0F0F0E',
  mid: '#6E6E68',
  soft: '#9A9A92',
  rule: '#E8E4D8',
  soft_rule: '#F1EEE2',
  yellow: '#E5FF00',
  ok:   '#1F7A4F',
  warn: '#A8761A',
  fail: '#B5331A',
  code_bg: '#FBFAF3',
};

const smono = { fontFamily: '"JetBrains Mono", monospace' };

function StateShell({ eyebrow, title, count, children }) {
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: S.bg, color: S.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 28px 14px', borderBottom: `1px solid ${S.rule}` }}>
        <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 4 }}>{eyebrow}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 32, lineHeight: 1, letterSpacing: '-.01em' }}>{title}</div>
          {count != null && <div style={{ ...smono, fontSize: 11, color: S.ink, letterSpacing: '.04em' }}>{count}</div>}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

// ───── 1. Empty · first time ─────────────────────────────────────
// User just finished Setup. They have a node, a handle, a token. No
// agent has sent them anything yet. The page is a 90-second to-do list,
// not a sad illustration.

function StateEmptyFirstTime() {
  return (
    <StateShell eyebrow="Tue · 14 May · setup complete" title="Inbox" count="0 messages · waiting for your first agent">
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0 }}>
        {/* Left: what to do */}
        <div style={{ padding: '40px 36px', borderRight: `1px solid ${S.rule}` }}>
          <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 12 }}>The other 90 seconds</div>
          <h2 style={{ fontFamily: '"Instrument Serif", serif', fontSize: 34, lineHeight: 1.05, letterSpacing: '-.015em', margin: 0, fontWeight: 400, color: S.ink, maxWidth: 380 }}>
            Hook up one agent and the page starts filling itself.
          </h2>
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Checklist done label="Node running"     detail="acme.com · stalwart healthy" />
            <Checklist done label="Handle picked"    detail="hana@acme.com" />
            <Checklist done label="Master Token saved"   detail="ntk_live_M9aN2p…  ·  ⌘C to copy again" />
            <Checklist label="CLI installed"         detail="npm i -g nothing-cli  ·  haven't seen a login yet" current />
            <Checklist label="One MCP wired up"      detail="any of: Claude Code, Cursor, Codex" dim />
          </div>
        </div>

        {/* Right: hint about what the inbox will look like */}
        <div style={{ padding: '40px 36px', background: S.code_bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 14 }}>What an agent's first message looks like</div>
            <div style={{ background: S.panel, border: `1px solid ${S.rule}`, borderRadius: 4, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: S.ink, fontWeight: 600 }}>Claude Code</span>
                <span style={{ ...smono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: S.soft }}>2m ago</span>
              </div>
              <div style={{ fontFamily: '"Geist", sans-serif', fontSize: 14.5, fontWeight: 600, color: S.ink, lineHeight: 1.25 }}>
                hello from your laptop · 5 things to do
              </div>
              <div style={{ fontSize: 12.5, color: S.mid, lineHeight: 1.45, marginTop: 4 }}>
                I'm wired up. Here's what I noticed in the repo while waiting…
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <span style={{ ...smono, fontSize: 9.5, color: S.mid, padding: '2px 6px', border: `1px solid ${S.rule}`, borderRadius: 3 }}>backend-refactor</span>
                <span style={{ ...smono, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: S.ok }}>delivered</span>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: S.soft, fontFamily: '"Newsreader", serif', fontStyle: 'italic' }}>
              — preview only. Nothing's actually arrived yet.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 30 }}>
            <button style={{
              background: S.ink, color: S.bg, border: 'none', padding: '12px 18px', borderRadius: 6,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span>Copy CLI install</span>
              <span style={{ ...smono, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>npm i -g nothing-cli</span>
              <span style={{ marginLeft: 'auto', ...smono, fontSize: 9.5, padding: '1px 5px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 3, color: 'rgba(255,255,255,.6)' }}>⌘C</span>
            </button>
            <button style={{
              background: 'transparent', color: S.ink, border: `1px solid ${S.rule}`, padding: '11px 18px', borderRadius: 6,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span>Send a test to yourself</span>
              <span style={{ ...smono, fontSize: 11, color: S.soft, letterSpacing: '.04em' }}>nothing send --to hana --subject "hi"</span>
            </button>
          </div>
        </div>
      </div>
    </StateShell>
  );
}

function Checklist({ label, detail, done, current, dim }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 12, alignItems: 'baseline' }}>
      <span style={{
        width: 12, height: 12, borderRadius: 3,
        border: `1.5px solid ${done ? S.ok : (current ? S.ink : S.soft)}`,
        background: done ? S.ok : (current ? S.bg : 'transparent'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(1px)',
      }}>
        {done && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
        {current && <span style={{ width: 4, height: 4, background: S.ink, borderRadius: 1 }} />}
      </span>
      <div>
        <div style={{ fontSize: 14, color: dim ? S.mid : (done ? S.mid : S.ink), fontWeight: current ? 500 : 400, textDecoration: done ? 'line-through' : 'none' }}>{label}</div>
        <div style={{ ...smono, fontSize: 10.5, color: dim ? S.soft : S.mid, marginTop: 3, letterSpacing: '.02em' }}>{detail}</div>
      </div>
    </div>
  );
}

// ───── 2. Caught up ──────────────────────────────────────────────
// All messages processed. Different from "first time" — user has used
// the inbox before. Show a quiet earned-ending feel + recent activity
// summary so the page doesn't feel like a void.

function StateCaughtUp() {
  return (
    <StateShell eyebrow="Tue · 14 May · 16:42" title="Inbox" count="0 unread · 28 messages today">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 36 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 12 }}>Caught up</div>
          <h2 style={{ fontFamily: '"Instrument Serif", serif', fontSize: 44, lineHeight: 1.05, letterSpacing: '-.015em', margin: 0, fontWeight: 400 }}>
            Nothing left for you.
          </h2>
          <p style={{ fontFamily: '"Newsreader", serif', fontSize: 16, color: S.mid, margin: '14px 0 0', lineHeight: 1.55, textWrap: 'pretty' }}>
            Your agents are still working. The page will fill itself when there's something worth your attention.
          </p>
        </div>

        {/* Recent activity, minimal */}
        <div style={{ width: '100%', maxWidth: 560, background: S.panel, border: `1px solid ${S.rule}`, borderRadius: 6, padding: '18px 22px' }}>
          <div style={{ ...smono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 12 }}>Today · resolved</div>
          <SmallLine who="Claude Code" what="opened PR #284 · backend-refactor" tone="ok" />
          <SmallLine who="Cursor"      what="fixed 4 ts errors · web-app" tone="ok" />
          <SmallLine who="Codex"       what="applied migration 2026_05_users" tone="ok" />
          <SmallLine who="Hana B."     what="approved 3 things, replied to 6" tone="self" last />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ background: S.ink, color: S.bg, border: 'none', padding: '10px 18px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Open Sent (28)</button>
          <button style={{ background: 'transparent', color: S.ink, border: `1px solid ${S.rule}`, padding: '9px 18px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Compose ⌘N</button>
        </div>
      </div>
    </StateShell>
  );
}

function SmallLine({ who, what, tone, last }) {
  const c = tone === 'ok' ? S.ok : tone === 'self' ? S.ink : S.mid;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '14px 110px 1fr', gap: 12, alignItems: 'baseline', padding: '7px 0', borderBottom: last ? 'none' : `1px solid ${S.soft_rule}` }}>
      <span style={{ ...smono, fontSize: 10, color: c, textAlign: 'left' }}>{tone === 'self' ? '↺' : '✓'}</span>
      <span style={{ fontSize: 12.5, color: S.ink }}>{who}</span>
      <span style={{ fontSize: 12.5, color: S.mid }}>{what}</span>
    </div>
  );
}

// ───── 3. Loading skeleton ───────────────────────────────────────

function StateLoading() {
  return (
    <StateShell eyebrow="Connecting · acme.com · 04:18" title="Inbox" count="—">
      <style>{`
        @keyframes nothing-shimmer { 0% { opacity: .35 } 50% { opacity: .65 } 100% { opacity: .35 } }
        .sk { background: ${S.soft_rule}; border-radius: 3px; animation: nothing-shimmer 1.5s ease-in-out infinite; }
      `}</style>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '14px 28px', borderBottom: `1px solid ${S.rule}`, display: 'flex', gap: 10 }}>
          <div className="sk" style={{ width: 110, height: 18 }} />
          <div className="sk" style={{ width: 80, height: 18 }} />
          <div className="sk" style={{ width: 130, height: 18 }} />
        </div>
        {[0.95, 0.78, 0.6, 0.5, 0.35].map((opacity, i) => (
          <div key={i} style={{ opacity, padding: '18px 28px', borderBottom: `1px solid ${S.rule}`, display: 'grid', gridTemplateColumns: '14px 160px 1fr 90px', gap: 18, alignItems: 'flex-start' }}>
            <span className="sk" style={{ width: 7, height: 7, borderRadius: 999, marginTop: 6 }} />
            <div>
              <div className="sk" style={{ width: 90, height: 13, marginBottom: 6 }} />
              <div className="sk" style={{ width: 130, height: 10 }} />
            </div>
            <div>
              <div className="sk" style={{ width: '70%', height: 15, marginBottom: 8 }} />
              <div className="sk" style={{ width: '92%', height: 12, marginBottom: 5 }} />
              <div className="sk" style={{ width: '55%', height: 12, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="sk" style={{ width: 80, height: 14 }} />
                <div className="sk" style={{ width: 50, height: 14 }} />
              </div>
            </div>
            <div className="sk" style={{ width: 60, height: 10, marginLeft: 'auto' }} />
          </div>
        ))}

        <div style={{ padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: S.yellow, animation: 'nothing-shimmer 1.2s ease-in-out infinite' }} />
          <span style={{ ...smono, fontSize: 11, color: S.mid, letterSpacing: '.04em' }}>
            <span style={{ color: S.ink }}>imap select inbox</span>  ·  fetched 0 / 148  ·  this may take a moment on first sync
          </span>
        </div>
      </div>
    </StateShell>
  );
}

// ───── 4. Error · node unreachable ──────────────────────────────

function StateNodeDown() {
  return (
    <StateShell eyebrow="Tue · 14 May · 04:18" title="Inbox" count="cached · 12 hours stale">
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* alert banner */}
        <div style={{
          background: '#FCF4F0', borderBottom: `1px solid #F2D9CC`,
          padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: S.fail, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: S.ink, fontWeight: 500 }}>
              <span>Can't reach </span>
              <span style={{ ...smono, fontSize: 13 }}>api.acme.com</span>
              <span> — last successful contact 12h ago.</span>
            </div>
            <div style={{ ...smono, fontSize: 11, color: S.mid, marginTop: 4, letterSpacing: '.02em' }}>
              ECONNREFUSED · the rest of the page is from local cache and may be wrong.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={{ ...smono, fontSize: 11, color: S.ink, background: 'transparent', border: `1px solid ${S.fail}`, padding: '6px 11px', borderRadius: 4, cursor: 'pointer', letterSpacing: '.06em' }}>Retry now</button>
            <button style={{ ...smono, fontSize: 11, color: S.bg, background: S.fail, border: 'none', padding: '6px 11px', borderRadius: 4, cursor: 'pointer', letterSpacing: '.06em' }}>Open diagnostics</button>
          </div>
        </div>

        {/* what we know */}
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${S.rule}` }}>
          <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 10 }}>What we tried</div>
          <DiagLine label="DNS · api.acme.com"   state="ok"   detail="resolved to 203.0.113.42" />
          <DiagLine label="TLS handshake"         state="fail" detail="connection refused after 5.2s" />
          <DiagLine label="Heartbeat (3 attempts)" state="fail" detail="100ms, 800ms, 3000ms — all timed out" />
          <DiagLine label="Stalwart status (last known)" state="warn" detail="running · 12h ago — could be a network issue between you and the node" last />
        </div>

        {/* cached preview */}
        <div style={{ padding: '20px 28px' }}>
          <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.soft, marginBottom: 10 }}>From local cache · 12h ago</div>
          <div style={{ opacity: 0.55 }}>
            <CachedRow who="Bob Chen"     subject="Re: 退避逻辑有问题" when="14m ago" />
            <CachedRow who="Cursor"       subject="Build failed on main — typescript strict" when="1h ago" />
          </div>
        </div>
      </div>
    </StateShell>
  );
}

function DiagLine({ label, state, detail, last }) {
  const map = {
    ok:   { glyph: '✓', col: S.ok },
    warn: { glyph: '~', col: S.warn },
    fail: { glyph: '✗', col: S.fail },
  }[state];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '18px 200px 1fr', gap: 14, alignItems: 'baseline', padding: '7px 0', borderBottom: last ? 'none' : `1px solid ${S.soft_rule}` }}>
      <span style={{ ...smono, fontSize: 12, color: map.col }}>{map.glyph}</span>
      <span style={{ fontSize: 13, color: S.ink }}>{label}</span>
      <span style={{ ...smono, fontSize: 11, color: S.mid, letterSpacing: '.02em' }}>{detail}</span>
    </div>
  );
}

function CachedRow({ who, subject, when }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 16, padding: '8px 0', borderBottom: `1px solid ${S.soft_rule}`, alignItems: 'baseline' }}>
      <span style={{ fontSize: 13, color: S.mid }}>{who}</span>
      <span style={{ fontSize: 13.5, color: S.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</span>
      <span style={{ ...smono, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: S.soft, textAlign: 'right' }}>{when}</span>
    </div>
  );
}

// ───── 5. Token expired ─────────────────────────────────────────

function StateTokenExpired() {
  return (
    <StateShell eyebrow="Authorization · 04:18" title="Inbox" count="locked">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 28 }}>
        <div style={{ width: '100%', maxWidth: 580 }}>
          <div style={{
            background: S.panel, border: `1px solid ${S.ink}`, borderRadius: 6,
            padding: '28px 30px',
          }}>
            <div style={{ ...smono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: S.warn }}>Token expired · 4 hours ago</div>
            <h2 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 36, lineHeight: 1.08, letterSpacing: '-.015em',
              margin: '8px 0 14px', fontWeight: 400,
            }}>You need to sign in again.</h2>
            <p style={{ fontFamily: '"Newsreader", serif', fontSize: 15.5, color: S.mid, margin: '0 0 16px', lineHeight: 1.55, textWrap: 'pretty' }}>
              The Master Token on this browser stopped working — most likely you regenerated it from another machine.
              Your messages and agents are unaffected; just this session is locked out.
            </p>

            <div style={{
              background: S.code_bg, border: `1px solid ${S.rule}`, borderRadius: 4,
              padding: '10px 14px', marginBottom: 16, ...smono, fontSize: 11.5, color: S.ink, lineHeight: 1.6,
            }}>
              <div><span style={{ color: S.soft }}>token   ·</span> ntk_live_M9aN2p…</div>
              <div><span style={{ color: S.soft }}>handle  ·</span> hana@acme.com</div>
              <div><span style={{ color: S.soft }}>error   ·</span> <span style={{ color: S.fail }}>401 invalid_token</span></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button style={{
                background: S.ink, color: S.bg, border: 'none',
                padding: '10px 18px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span>Sign in with GitHub</span>
                <span style={{ ...smono, fontSize: 9.5, color: 'rgba(255,255,255,.6)', padding: '1px 5px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 3 }}>↵</span>
              </button>
              <button style={{
                background: 'transparent', color: S.ink, border: `1px solid ${S.rule}`,
                padding: '9px 16px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13,
              }}>Paste a token</button>
              <span style={{ marginLeft: 'auto', ...smono, fontSize: 10.5, color: S.soft, letterSpacing: '.04em' }}>esc · stay here</span>
            </div>
          </div>

          <div style={{ marginTop: 18, fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 13.5, color: S.mid, textAlign: 'center' }}>
            You can keep reading cached messages, but you can't send or reply until you sign in.
          </div>
        </div>
      </div>
    </StateShell>
  );
}

export {
  StateEmptyFirstTime, StateCaughtUp, StateLoading, StateNodeDown, StateTokenExpired,
};

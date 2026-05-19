import React from 'react';

// Landing — public first impression. No app chrome.
// Hero · what it is · three-step "your agent is alive in 90 seconds" ·
// who it's for · footer. Yellow used for one statement word + one CTA chip.

function Landing() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <header style={{
        padding: '20px 48px', borderBottom: `1px solid ${C.rule}`,
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 24, letterSpacing: '-.01em' }}>nothing</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 7 }} />
        </div>
        <nav style={{ display: 'flex', gap: 22, fontSize: 13, color: C.mid }}>
          <a style={navLink(C)}>Docs</a>
          <a style={navLink(C)}>NMP spec</a>
          <a style={navLink(C)}>Self-host</a>
          <a style={navLink(C)}>Changelog</a>
          <a style={navLink(C)}>GitHub ↗</a>
        </nav>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft }}>v0.4 · open beta</span>
          <button style={{
            background: C.ink, color: C.bg, border: 'none',
            padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5,
          }}>Sign in with GitHub →</button>
        </span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <section style={{
          padding: '76px 56px 48px', maxWidth: 1180, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 64, alignItems: 'end',
        }}>
          <div>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 18 }}>
              AI agent email — powered by NMP
            </div>
            <h1 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 92, lineHeight: 0.97, letterSpacing: '-.02em',
              margin: 0, fontWeight: 400, color: C.ink, textWrap: 'balance',
            }}>
              Give your agent<br />
              <span>an inbox</span>
              <span style={{
                display: 'inline-block', position: 'relative', marginLeft: 10,
              }}>
                <span style={{
                  position: 'absolute', left: -6, right: -6, top: '64%', bottom: '6%',
                  background: C.yellow, zIndex: 0,
                }} />
                <span style={{ position: 'relative', zIndex: 1 }}>worth checking.</span>
              </span>
            </h1>
            <p style={{
              fontFamily: '"Newsreader", serif', fontSize: 19, lineHeight: 1.5, color: C.mid,
              margin: '24px 0 0', maxWidth: 540, textWrap: 'pretty',
            }}>
              Nothing is a mail server <em>and</em> an API for AI agents — Claude Code, Cursor,
              Codex, whatever you write next. Real handles. Real delivery state. Real
              threading. Plain email underneath; built for the agents that read it.
            </p>
            <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button style={{
                background: C.ink, color: C.bg, border: 'none',
                padding: '14px 22px', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span>Start a node</span>
              </button>
              <button style={{
                background: 'transparent', color: C.ink, border: `1px solid ${C.ink}`,
                padding: '13px 21px', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14,
              }}>Get an email account →</button>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: C.mid, marginLeft: 4 }}>
                or just <span style={{ borderBottom: `1px solid ${C.rule}` }}>read the spec</span>
              </span>
            </div>
          </div>

          {/* Live snippet — what an agent sees */}
          <div style={{
            background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 6,
            padding: '18px 22px', boxShadow: '0 12px 40px rgba(15,15,14,.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${C.rule}` }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.yellow }} />
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: C.soft }}>
                claude-code@acme.com  ·  live
              </span>
              <span style={{ marginLeft: 'auto', ...mono, fontSize: 10, color: C.soft }}>04:18</span>
            </div>
            <pre style={{
              ...mono, fontSize: 12.5, color: C.ink, lineHeight: 1.7,
              margin: '14px 0 0', whiteSpace: 'pre-wrap',
            }}>{`$ nothing inbox --project backend-refactor

3 unread · 0 failed

◌ Hana B.        the retry logic is broken           2d
↩ Bob Chen       Re: 退避逻辑有问题                   14m
✓ Cursor         build failed on main — ts strict    1h

$ nothing send --to bob \\
    --subject "PR ready" \\
    --quote src/session.ts:22 \\
    --body "patch attached"

  → queued.   delivered.   read.   `}<span style={{ background: C.yellow, color: C.ink, padding: '0 4px' }}>replied.</span>
            </pre>
          </div>
        </section>

        {/* Three steps */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 56px 16px' }}>
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 18 }}>
            Three steps · ninety seconds
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <Step n="01" title="Sign in & pick a handle"
                  body="GitHub OAuth, then a handle on your own domain or on nothing.email."
                  meta="hana@acme.com" C={C} />
            <Step n="02" title="Install the CLI"
                  body="Configures your shell, then drops a Master Token your agents can use."
                  meta="npm i -g nothing-cli  →  nothing login <token>" C={C} mono />
            <Step n="03" title="Your agents are mail-native"
                  body="One MCP config, every agent on this machine can read, send, thread, reply."
                  meta="works with Claude Code · Cursor · Codex" C={C} highlight />
          </div>
        </section>

        {/* Why-it's-different strip */}
        <section style={{ maxWidth: 1180, margin: '32px auto 0', padding: '0 56px' }}>
          <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 28 }}>
            <Differentiator C={C} k="NMP-native nodes" v="Same-node delivery skips SMTP. Sub-50ms agent ↔ agent." />
            <Differentiator C={C} k="6-state delivery" v="queued · sent · delivered · read · replied · failed." />
            <Differentiator C={C} k="Code context"   v="Every message can carry a repo / file / line — first class." />
            <Differentiator C={C} k="Plain email"    v="Everything underneath is RFC. Talk to non-Nothing inboxes." />
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          marginTop: 48, padding: '24px 56px',
          borderTop: `1px solid ${C.rule}`,
          display: 'flex', alignItems: 'center', gap: 18,
          ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft,
        }}>
          <span>nothing · made for agents that ship</span>
          <span style={{ marginLeft: 'auto' }}>open source · AGPLv3</span>
          <span>·</span>
          <span>built on stalwart + NMP</span>
        </footer>
      </div>
    </div>
  );
}

function navLink(C) {
  return { color: C.ink, textDecoration: 'none', cursor: 'pointer' };
}

function Step({ n, title, body, meta, mono, highlight, C }) {
  const monoF = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      background: highlight ? '#FFFCEA' : 'transparent',
      border: highlight ? `1px solid #F2EBB6` : 'none',
      borderRadius: 6, padding: highlight ? '20px 22px' : '4px 0 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <span style={{ ...monoF, fontSize: 10.5, color: C.soft, letterSpacing: '.16em' }}>{n}</span>
        <span style={{ height: 1, background: C.rule, flex: 1 }} />
      </div>
      <h3 style={{
        fontFamily: '"Instrument Serif", serif',
        fontSize: 26, lineHeight: 1.1, margin: '4px 0 8px', fontWeight: 400,
      }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: C.mid, margin: '0 0 12px' }}>{body}</p>
      <div style={{
        ...monoF, fontSize: mono ? 12 : 11, color: mono ? C.ink : C.soft,
        letterSpacing: mono ? '.02em' : '.18em', textTransform: mono ? 'none' : 'uppercase',
        padding: mono ? '8px 10px' : 0,
        background: mono ? '#FBFAF3' : 'transparent',
        border: mono ? `1px solid ${C.rule}` : 'none',
        borderRadius: 3, display: 'inline-block',
      }}>{meta}</div>
    </div>
  );
}

function Differentiator({ C, k, v }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div>
      <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.ink, marginBottom: 8 }}>{k}</div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14.5, lineHeight: 1.45, color: C.mid }}>{v}</div>
    </div>
  );
}

export default Landing;

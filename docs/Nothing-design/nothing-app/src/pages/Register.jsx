import React from 'react';

// Register · pick a handle  +  Master Token reveal (shown side-by-side
// as two states of the same screen — left: choosing, right: just created).
// The token-reveal is the only time in the product the secret is visible —
// the visual should respect that: locked-feeling card, one-time copy.

function RegisterAndReveal() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
    warn: '#A8761A',
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
      {/* top strip */}
      <div style={{
        padding: '20px 40px', borderBottom: `1px solid ${C.rule}`,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22 }}>nothing</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 6 }} />
        </div>
        <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.mid, marginLeft: 8 }}>
          signed in as <span style={{ color: C.ink }}>@hana-b</span>  ·  via github
        </span>
        <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>
          Account creation · the only step
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1180, padding: '52px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>

          {/* LEFT — choose handle */}
          <div>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 12 }}>
              ① Pick a handle
            </div>
            <h1 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 48, lineHeight: 1.05, letterSpacing: '-.015em',
              margin: 0, fontWeight: 400,
            }}>What should we<br/>call you here?</h1>
            <p style={{ fontFamily: '"Newsreader", serif', fontSize: 16, lineHeight: 1.55, color: C.mid, margin: '18px 0 0', maxWidth: 460, textWrap: 'pretty' }}>
              3–20 characters, lowercase, hyphens fine. Choose well — this is the address your agents
              will pass around, and it doesn't change without breaking threads.
            </p>

            {/* input + live preview */}
            <div style={{ marginTop: 30, background: C.panel, border: `1px solid ${C.ink}`, borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'baseline' }}>
              <span style={{ ...mono, fontSize: 16, color: C.ink, fontWeight: 500 }}>hana</span>
              <span style={{ width: 2, height: 18, background: C.ink, marginLeft: 1, animation: 'blink 1s steps(2) infinite', transform: 'translateY(2px)' }} />
              <span style={{ ...mono, fontSize: 16, color: C.mid, marginLeft: 0 }}>@acme.com</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1F7A4F' }} />
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: '#1F7A4F' }}>available</span>
              </span>
            </div>
            <style>{'@keyframes blink{50%{opacity:0}}'}</style>

            {/* validation states */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ValidationLine ok label="3–20 characters" C={C} />
              <ValidationLine ok label="lowercase a–z · digits · hyphens" C={C} />
              <ValidationLine ok label="not taken" C={C} />
            </div>

            {/* taken examples (visual texture) */}
            <div style={{ marginTop: 24 }}>
              <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft, marginBottom: 8 }}>recently taken</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['admin','bob','infra','ops','claude','team','test'].map(t => (
                  <span key={t} style={{
                    ...mono, fontSize: 11, color: C.soft, padding: '3px 8px',
                    border: `1px solid ${C.rule}`, borderRadius: 3, textDecoration: 'line-through',
                  }}>{t}</span>
                ))}
              </div>
            </div>

            <button style={{
              marginTop: 32, background: C.ink, color: C.bg, border: 'none',
              padding: '12px 22px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 10,
            }}>
              <span>Create account</span>
            </button>
          </div>

          {/* RIGHT — Master Token reveal */}
          <div style={{ borderLeft: `1px solid ${C.rule}`, paddingLeft: 36 }}>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.warn, marginBottom: 12 }}>
              ② This is shown once
            </div>
            <h2 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 36, lineHeight: 1.05, letterSpacing: '-.015em',
              margin: 0, fontWeight: 400,
            }}>Your Master Token.</h2>
            <p style={{ fontFamily: '"Newsreader", serif', fontSize: 14.5, lineHeight: 1.55, color: C.mid, margin: '12px 0 0', maxWidth: 500, textWrap: 'pretty' }}>
              Use it to bootstrap your first agent. Then create scoped tokens for the rest —
              this one is for emergencies and recovery, and once you close this screen
              you'll never see it in plaintext again.
            </p>

            {/* The locked card */}
            <div style={{
              marginTop: 24, background: '#FBFAF3',
              border: `1px solid ${C.ink}`, borderRadius: 6,
              padding: '20px 22px',
            }}>
              <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 10 }}>
                handle  ·  hana@acme.com
              </div>
              <div style={{
                ...mono, fontSize: 16.5, color: C.ink, letterSpacing: '.02em',
                wordBreak: 'break-all', lineHeight: 1.5, userSelect: 'all',
                paddingBottom: 14, borderBottom: `1px dashed ${C.rule}`, marginBottom: 14,
              }}>
                ntk_live_M9aN2pQ8sR4tV6wY7xZ1bC3dE5fG0hI<span style={{ color: C.soft }}>·</span>iJkL2mNoPqRsTuVw
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button style={{
                  background: C.ink, color: C.bg, border: 'none', padding: '8px 14px', borderRadius: 4,
                  cursor: 'pointer', ...mono, fontSize: 11, letterSpacing: '.06em',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <span>copy</span>
                  <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.55)', padding: '1px 4px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 2 }}>⌘C</span>
                </button>
                <button style={{
                  background: 'transparent', color: C.ink, border: `1px solid ${C.rule}`,
                  padding: '7px 13px', borderRadius: 4, cursor: 'pointer', ...mono, fontSize: 11, letterSpacing: '.06em',
                }}>save .env</button>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.warn }} />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.warn }}>do not commit</span>
                </span>
              </div>
            </div>

            {/* CLI install line */}
            <div style={{ marginTop: 24 }}>
              <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 8 }}>
                ③ wire it up
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 4, padding: '12px 16px', ...mono, fontSize: 12.5, lineHeight: 1.7, color: C.ink }}>
                <div><span style={{ color: C.soft }}>$</span> npm i -g nothing-cli</div>
                <div><span style={{ color: C.soft }}>$</span> nothing login <span style={{ background: '#FCF4D8' }}>ntk_live_M9aN2pQ8…</span></div>
                <div style={{ color: C.soft }}>  signed in as hana@acme.com  ·  3 agents can use this CLI</div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button style={{
                background: 'transparent', color: C.ink, border: `1px solid ${C.rule}`,
                padding: '10px 18px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              }}>I've saved it</button>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid }}>
                — only enabled once the token's been copied.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ValidationLine({ ok, label, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: C.mid }}>
      <span style={{ ...mono, fontSize: 11, color: ok ? '#1F7A4F' : C.soft, width: 12 }}>{ok ? '✓' : '·'}</span>
      <span>{label}</span>
    </div>
  );
}

const notch = (C) => ({ position: 'absolute', width: 6, height: 6, background: C.yellow });
const notchTL = (C) => ({ ...notch(C), top: -1, left: -1 });
const notchTR = (C) => ({ ...notch(C), top: -1, right: -1 });
const notchBL = (C) => ({ ...notch(C), bottom: -1, left: -1 });
const notchBR = (C) => ({ ...notch(C), bottom: -1, right: -1 });

export default RegisterAndReveal;

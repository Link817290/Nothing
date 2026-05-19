import React from 'react';
import { Steps } from '../components/Steps.jsx';

// Setup · Step 2A — domain + DNS verification.
// The most information-dense onboarding screen. Real-feeling DNS rows that
// look like a tool, not a SaaS popup. The verify panel updates in place.

function SetupStep2A() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
    ok:   '#1F7A4F',
    warn: '#A8761A',
    bad:  '#B5331A',
    code_bg: '#FBFAF3',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  const domain = 'acme.com';
  const serverIp = '203.0.113.42';

  const records = [
    { type: 'A',   name: 'acme.com',        value: `→ ${serverIp}`,                                  state: 'ok'   },
    { type: 'A',   name: 'mail.acme.com',   value: `→ ${serverIp}`,                                  state: 'ok'   },
    { type: 'A',   name: 'api.acme.com',    value: `→ ${serverIp}`,                                  state: 'pending' },
    { type: 'MX',  name: 'acme.com',        value: '→ mail.acme.com  (prio 10)',                     state: 'ok'   },
    { type: 'TXT', name: 'acme.com',        value: `"v=spf1 ip4:${serverIp} -all"`,                  state: 'ok'   },
    { type: 'TXT', name: '_dmarc.acme.com', value: '"v=DMARC1; p=reject; rua=mailto:dmarc@…"',       state: 'partial' },
  ];

  const dkim = `v=DKIM1; k=ed25519; p=MCowBQYDK2VwAyEA/aMA68Z3M0kU5UH2vJ4DCQa9F+yc7L+i1qPzL3wNz3o=`;

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* top */}
      <div style={{
        padding: '20px 40px', borderBottom: `1px solid ${C.rule}`,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: C.mid }}>← back</button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22 }}>nothing</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 6 }} />
        </span>
        <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>
          Setup · Step 2 of 5 · Self-hosted
        </span>
        <Steps current={1} mode="self" C={C} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px' }}>
          {/* heading */}
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>The domain</div>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 48, lineHeight: 1.05, letterSpacing: '-.015em',
            margin: '8px 0 14px', fontWeight: 400,
          }}>Point a domain at this box.</h1>
          <p style={{ fontFamily: '"Newsreader", serif', fontSize: 16.5, lineHeight: 1.55, color: C.mid, margin: 0, maxWidth: 720, textWrap: 'pretty' }}>
            You'll need DNS access. Add the six records below; we'll verify each one in real time.
            Until all six are green, your handles can't send or receive.
          </p>

          {/* domain input */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>domain</label>
            <div style={{
              flex: 1, maxWidth: 420, display: 'flex', alignItems: 'center',
              border: `1px solid ${C.ink}`, borderRadius: 4, padding: '10px 14px',
              background: C.panel,
            }}>
              <span style={{ ...mono, fontSize: 13, color: C.ink }}>{domain}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} />
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.ok }}>reachable</span>
              </span>
            </div>
            <button style={{
              background: C.ink, color: C.bg, border: 'none',
              padding: '10px 18px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>Verify DNS</span>
            </button>
          </div>

          {/* DNS records table */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>Required records · 6</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: C.mid }}>
                <span style={{ color: C.ok }}>4 ok</span> · <span style={{ color: C.warn }}>1 partial</span> · <span style={{ color: C.soft }}>1 pending</span>
              </span>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '70px 1fr 24px',
                padding: '10px 16px', background: C.code_bg, borderBottom: `1px solid ${C.rule}`,
                ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft, gap: 16,
              }}>
                <span>type · name</span>
                <span>value</span>
                <span />
              </div>
              {records.map((r, i) => (
                <DnsRow key={i} r={r} last={i === records.length - 1} C={C} />
              ))}
            </div>
          </div>

          {/* DKIM */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>DKIM public key · TXT  default._domainkey.acme.com</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid }}>generated by Stalwart on first boot</span>
            </div>
            <div style={{
              background: '#FBFAF3', border: `1px solid ${C.rule}`, borderRadius: 4,
              padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 16,
            }}>
              <span style={{
                ...mono, fontSize: 12, color: C.ink, lineHeight: 1.6,
                wordBreak: 'break-all', flex: 1, userSelect: 'all',
              }}>{dkim}</span>
              <button style={{
                background: 'transparent', border: `1px solid ${C.rule}`, borderRadius: 3,
                padding: '4px 9px', cursor: 'pointer', ...mono, fontSize: 10, color: C.ink, letterSpacing: '.06em',
              }}>copy ⌘C</button>
            </div>
          </div>

          {/* footer actions */}
          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{ background: 'transparent', border: `1px solid ${C.rule}`, padding: '11px 20px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, color: C.ink, cursor: 'pointer' }}>← Mode</button>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: C.mid }}>
              4 of 6 records verified — you can continue and finish DNS later, but agents won't deliver until everything is green.
            </span>
            <button style={{ marginLeft: 'auto', background: C.ink, color: C.bg, border: 'none', padding: '12px 22px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
              GitHub OAuth →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DnsRow({ r, last, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const state = {
    ok:      { glyph: '✓', col: C.ok,   label: 'verified',  desc: 'matches expected value',  bg: 'transparent' },
    partial: { glyph: '~', col: C.warn, label: 'partial',   desc: 'present but parser flagged a key', bg: '#FCF8E8' },
    pending: { glyph: '◌', col: C.soft, label: 'not found', desc: 'not visible yet · DNS may still be propagating', bg: 'transparent' },
  }[r.state];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '70px 1fr 24px', gap: 16,
      padding: '14px 16px', alignItems: 'baseline',
      borderBottom: last ? 'none' : `1px solid ${C.rule}`,
      background: state.bg,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...mono, fontSize: 11.5, fontWeight: 600, color: C.ink }}>{r.type}</span>
        <span style={{ ...mono, fontSize: 10.5, color: C.soft }}>{r.name}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...mono, fontSize: 12, color: C.ink, wordBreak: 'break-all' }}>{r.value}</span>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5, color: state.col }}>
          {state.glyph}  {state.label} — <span style={{ color: C.mid }}>{state.desc}</span>
        </span>
      </div>
      <span style={{ ...mono, fontSize: 14, color: state.col, textAlign: 'right' }}>{state.glyph}</span>
    </div>
  );
}

export default SetupStep2A;

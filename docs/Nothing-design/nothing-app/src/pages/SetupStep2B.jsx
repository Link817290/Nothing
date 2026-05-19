import React from 'react';
import { INBOX } from '../data/sample.js';

// Setup · Step 2B — Email account.
// The "fast path": pick a provider, paste creds, test, move on.
// Nothing is the star option (with NMP feature parity); the others fall back.

function SetupStep2B() {
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
    fail: '#B5331A',
    code_bg: '#FBFAF3',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  // Active provider — we render the "Nothing" path so the NMP parity panel can be
  // shown. The other tiles are visible but not selected. Note the comparison
  // panel collapses when a non-Nothing provider is chosen (we hint at it via
  // border).
  const providers = [
    { id: 'nothing',  label: 'Nothing',  star: true,  smtp: 'smtp.nothing.email:465',  imap: 'imap.nothing.email:993',  hint: 'NMP native — same-node delivery, code context, threading.' },
    { id: 'gmail',    label: 'Gmail',                smtp: 'smtp.gmail.com:465',      imap: 'imap.gmail.com:993',      hint: 'Requires an app-specific password.' },
    { id: 'outlook',  label: 'Outlook',              smtp: 'smtp.office365.com:587',  imap: 'outlook.office365.com:993', hint: 'M365 OAuth recommended.' },
    { id: 'qq',       label: 'QQ',                   smtp: 'smtp.qq.com:465',         imap: 'imap.qq.com:993',         hint: '需要在邮箱设置中开启 IMAP 与授权码。' },
    { id: 'custom',   label: 'Custom',               smtp: '—',                       imap: '—',                       hint: 'Fill the four fields manually.' },
  ];
  const active = providers[0];

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
          Setup · 02 of 04 · Email mode
        </span>
        <StepsB current={1} C={C} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 40px' }}>
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>Email mode</div>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 48, lineHeight: 1.05, letterSpacing: '-.015em',
            margin: '8px 0 14px', fontWeight: 400,
          }}>Connect an inbox you already have.</h1>
          <p style={{ fontFamily: '"Newsreader", serif', fontSize: 16.5, lineHeight: 1.55, color: C.mid, margin: 0, maxWidth: 720, textWrap: 'pretty' }}>
            Nothing speaks plain IMAP/SMTP. Anything that does will work. Some providers carry more of the
            product's powers than others — Nothing-hosted inboxes are the only ones with native NMP.
          </p>

          {/* provider grid */}
          <div style={{ marginTop: 30 }}>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 10 }}>① Provider</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {providers.map(p => <ProviderTile key={p.id} p={p} active={p.id === active.id} C={C} />)}
            </div>
            <div style={{ marginTop: 10, fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 13.5, color: C.mid }}>
              {active.hint}
            </div>
          </div>

          {/* form */}
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* left: credentials */}
            <div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 10 }}>② Credentials</div>
              <Field label="email" value="hana@nothing.email" mono C={C} />
              <Field label="password / token" value="••••••••••••••••" mono right={
                <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', ...mono, fontSize: 10.5, color: C.mid, letterSpacing: '.06em' }}>show</button>
              } C={C} />
              <div style={{ marginTop: 8, ...mono, fontSize: 10.5, color: C.mid, lineHeight: 1.5 }}>
                <span style={{ color: C.soft }}>·</span>  No account?  <span style={{ borderBottom: `1px solid ${C.yellow}`, paddingBottom: 1 }}>sign up at nothing.email</span>
              </div>
            </div>

            {/* right: servers */}
            <div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 10 }}>
                ③ Server endpoints
                <span style={{ marginLeft: 8, ...mono, fontSize: 10, color: C.soft, letterSpacing: '.04em' }}>filled from provider</span>
              </div>
              <Field label="SMTP" value={active.smtp} mono C={C} />
              <Field label="IMAP" value={active.imap} mono C={C} />
            </div>
          </div>

          {/* test results + comparison */}
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: 24 }}>
            {/* test */}
            <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 6, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>④ Test connection</span>
                <button style={{
                  background: C.ink, color: C.bg, border: 'none',
                  padding: '7px 14px', borderRadius: 4, cursor: 'pointer',
                  ...mono, fontSize: 11, letterSpacing: '.06em', display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <span>run test</span>
                </button>
              </div>
              <TestRow label="DNS resolves"     state="ok"   detail="smtp · imap reachable" C={C} />
              <TestRow label="SMTP TLS"         state="ok"   detail="465 · TLS 1.3 ECDHE-RSA-AES256-GCM" C={C} />
              <TestRow label="SMTP auth"        state="ok"   detail="LOGIN as hana@nothing.email" C={C} />
              <TestRow label="IMAP TLS"         state="ok"   detail="993 · TLS 1.3" C={C} />
              <TestRow label="IMAP auth + select INBOX" state="ok" detail="148 messages · 3 unread" C={C} />
              <TestRow label="NMP capability"   state="ok"   detail="server advertises NMP 1.0" C={C} last />
            </div>

            {/* NMP parity */}
            <div style={{
              background: C.code_bg, border: `1px solid ${C.rule}`, borderRadius: 6,
              padding: '18px 20px',
            }}>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 12 }}>
                Why Nothing vs. others
              </div>
              <FeatureTable C={C} rows={[
                { f: 'NMP messages',       a: 'server-parsed · structured',  b: 'agent parses locally'   },
                { f: 'project/label query',a: 'server index · ms-level',     b: 'client-side pull · slow' },
                { f: 'delivery state',     a: '6-state real-time',           b: 'fire-and-forget'        },
                { f: 'same-node send',     a: 'direct db write',             b: 'always SMTP round-trip' },
                { f: 'read sync',          a: 'server state · cross-device', b: 'IMAP flags · best-effort' },
              ]}/>
            </div>
          </div>

          {/* footer */}
          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{ background: 'transparent', border: `1px solid ${C.rule}`, padding: '11px 20px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, color: C.ink, cursor: 'pointer' }}>← Mode</button>
            <span style={{ fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 14, color: C.mid }}>
              All 6 checks passed — you're good to go.
            </span>
            <button style={{ marginLeft: 'auto', background: C.ink, color: C.bg, border: 'none', padding: '12px 22px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
              Create local account →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepsB({ current, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const labels = ['mode', 'email', 'account', 'done'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {labels.map((l, i) => (
        <span key={l} style={{
          ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 3,
          background: i === current ? C.ink : 'transparent',
          color: i === current ? C.bg : (i < current ? C.ink : C.soft),
          border: i < current ? `1px solid ${C.rule}` : '1px solid transparent',
        }}>
          {String(i+1).padStart(2,'0')} {l}
        </span>
      ))}
    </div>
  );
}

function ProviderTile({ p, active, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <button style={{
      background: active ? C.panel : 'transparent',
      border: `1px solid ${active ? C.ink : C.rule}`,
      borderRadius: 6, padding: '14px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
      cursor: 'pointer', position: 'relative', textAlign: 'left',
      fontFamily: 'inherit',
    }}>
      {p.star && (
        <span style={{
          position: 'absolute', top: -8, left: 12,
          background: '#E5FF00', color: C.ink, ...mono, fontSize: 8.5,
          letterSpacing: '.2em', textTransform: 'uppercase',
          padding: '2px 6px', borderRadius: 2,
        }}>NMP native</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: p.star ? 4 : 0 }}>
        <span style={{
          width: 16, height: 16, borderRadius: 4,
          background: p.id === 'nothing' ? C.ink : C.rule,
          color: p.id === 'nothing' ? '#E5FF00' : C.soft,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Instrument Serif", serif', fontSize: 11, lineHeight: 1,
        }}>{p.label[0]}</span>
        <span style={{ fontSize: 13.5, color: active ? C.ink : C.mid, fontWeight: active ? 500 : 400 }}>{p.label}</span>
      </div>
      <span style={{ ...mono, fontSize: 9.5, color: C.soft, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{p.smtp}</span>
    </button>
  );
}

function Field({ label, value, mono: monoF, right, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft, marginBottom: 4 }}>{label}</div>
      <div style={{
        background: '#FFFFFF', border: `1px solid ${C.rule}`, borderRadius: 4,
        padding: '10px 14px', display: 'flex', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: monoF ? '"JetBrains Mono", monospace' : 'inherit',
          fontSize: monoF ? 13 : 14, color: C.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</span>
        {right}
      </div>
    </div>
  );
}

function TestRow({ label, state, detail, hot, last, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const map = {
    ok:   { glyph: '✓', col: C.ok },
    warn: { glyph: '~', col: C.warn },
    fail: { glyph: '✗', col: C.fail },
  }[state];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 12, alignItems: 'baseline',
      padding: '8px 0', borderBottom: last ? 'none' : `1px solid ${C.rule}`,
    }}>
      <span style={{ ...mono, fontSize: 13, color: map.col }}>{map.glyph}</span>
      <div>
        <div style={{ fontSize: 13.5, color: C.ink }}>{label}</div>
        <div style={{ ...mono, fontSize: 10.5, color: C.soft, marginTop: 2 }}>{detail}</div>
      </div>
      <span style={{ ...mono, fontSize: 10, color: C.soft, letterSpacing: '.16em', textTransform: 'uppercase' }}>{state}</span>
    </div>
  );
}

function FeatureTable({ rows, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: 14,
        ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft,
        paddingBottom: 8, borderBottom: `1px solid ${C.rule}`,
      }}>
        <span />
        <span>Nothing</span>
        <span>Gmail / Outlook / IMAP</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: 14,
          alignItems: 'baseline', padding: '8px 0',
          borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${C.rule}`,
          fontSize: 12.5, lineHeight: 1.4,
        }}>
          <span style={{ color: C.mid }}>{r.f}</span>
          <span style={{ color: C.ink, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...mono, fontSize: 10, color: C.ok }}>✓</span><span>{r.a}</span>
          </span>
          <span style={{ color: C.mid, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...mono, fontSize: 10, color: C.soft }}>·</span><span>{r.b}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default SetupStep2B;

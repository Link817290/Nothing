import React from 'react';
import { AppSidebar } from '../components/AppSidebar.jsx';

// Settings — the "closing" surface. Account · Instance · Usage · Danger Zone.

function SettingsPage() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
    warn: '#A8761A',
    bad:  '#B5331A',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: '232px 1fr',
      overflow: 'hidden',
    }}>
      <AppSidebar active="settings" C={C} />

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '28px 40px 18px', borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 6 }}>Account · instance · usage</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 42, lineHeight: 1 }}>Settings</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 36, maxWidth: 1020 }}>
            <SectionTitle C={C} label="Account" />
            <div>
              <FieldRow C={C} label="Handle"        value="hana@acme.com" mono readOnly />
              <FieldRow C={C} label="Display name"  value="Hana B." editable />
              <FieldRow C={C} label="GitHub"        value="@hana-b · avatar synced" right={<span style={{
                ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase',
                color: C.soft, padding: '2px 7px', border: `1px solid ${C.rule}`, borderRadius: 3,
              }}>OAuth</span>} />
            </div>

            <SectionTitle C={C} label="Instance" sub="Self-hosted · admin" />
            <div>
              <FieldRow C={C} label="Mode"     value="Self-hosted" mono right={<span style={{ ...mono, fontSize: 9.5, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase', padding: '2px 7px', border: `1px solid ${C.rule}`, borderRadius: 3 }}>NMP node</span>} />
              <FieldRow C={C} label="Domain"   value="acme.com" mono right={<DotPill C={C} color="#1F7A4F" label="DNS healthy" />} />
              <FieldRow C={C} label="Stalwart" value="0.10.4 · running" mono right={<DotPill C={C} color="#1F7A4F" label="uptime 6d 04:18" />} />
              <FieldRow C={C} label="API base" value="https://api.acme.com" mono />
              <FieldRow C={C} label="Setup"    value="Re-run the setup wizard if you've moved hosts" italicValue
                        right={<button style={{
                          ...mono, fontSize: 11, color: C.ink, background: 'transparent',
                          border: `1px solid ${C.rule}`, padding: '5px 10px', borderRadius: 3, cursor: 'pointer', letterSpacing: '.04em',
                        }}>Re-run setup</button>} />
            </div>

            <SectionTitle C={C} label="Usage" sub="Today · resets 00:00 UTC" />
            <div>
              <MeterRow C={C} label="Messages sent today" cur={12} max={50}  rightLabel="38 remaining" />
              <MeterRow C={C} label="Storage"             cur={45} max={100} unit=" MB" />
              <MeterRow C={C} label="Active tokens"       cur={3} max={5}    rightLabel="2 slots free" />
              <MeterRow C={C} label="Threads tracked"     cur={28} max={500} small />
            </div>

            <SectionTitle C={C} label="Danger zone" danger />
            <div style={{ border: `1px solid #F3D9CC`, borderRadius: 6, background: '#FCF4F0', padding: '6px 0' }}>
              <DangerRow C={C}
                title="Regenerate Master Token"
                body="Useful if you suspect the token was committed. Old token stops working immediately; agents need to be re-installed."
                cta="Regenerate" />
              <DangerRow C={C}
                title="Reset setup wizard"
                body="Clears DNS verification state and OAuth credentials. The node keeps running; you just walk through the wizard again."
                cta="Reset wizard" />
              <DangerRow C={C} hard
                title="Delete this node"
                body="All messages, threads, tokens, and projects are permanently removed. You'll be asked to type the domain to confirm. There is no recovery."
                cta="Delete node" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ label, sub, danger, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: danger ? '#B5331A' : C.soft }}>{label}</div>
      {sub && <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: C.mid, marginTop: 6, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

function FieldRow({ label, value, mono: monoF, italicValue, editable, readOnly, right, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: 18, alignItems: 'baseline',
      padding: '14px 0', borderBottom: `1px solid ${C.rule}`,
    }}>
      <span style={{ fontSize: 12.5, color: C.mid }}>{label}</span>
      <span style={{
        fontFamily: monoF ? '"JetBrains Mono", monospace' : (italicValue ? '"Newsreader", serif' : 'inherit'),
        fontStyle: italicValue ? 'italic' : 'normal',
        fontSize: monoF ? 13 : 14, color: C.ink,
      }}>
        {value}
        {readOnly && <span style={{ ...mono, fontSize: 9.5, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase', marginLeft: 10 }}>read-only</span>}
        {editable && <span style={{ marginLeft: 10, color: C.soft, ...mono, fontSize: 11 }}>·</span>}
        {editable && <button style={{ marginLeft: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink, fontFamily: 'inherit', fontSize: 12, borderBottom: `1px solid ${C.rule}` }}>edit</button>}
      </span>
      <span>{right}</span>
    </div>
  );
}

function MeterRow({ label, cur, max, unit = '', rightLabel, small, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const pct = Math.round((cur / max) * 100);
  const warn = pct > 80;
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.rule}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13.5, color: C.ink }}>{label}</span>
        <span style={{ ...mono, fontSize: 11.5, color: C.mid, letterSpacing: '.04em' }}>
          <span style={{ color: warn ? C.warn : C.ink, fontWeight: 500 }}>{cur}{unit}</span>
          <span style={{ color: C.soft }}> / {max}{unit}</span>
          {rightLabel && <span style={{ color: C.soft, marginLeft: 10 }}>· {rightLabel}</span>}
        </span>
      </div>
      <div style={{ height: small ? 3 : 4, background: '#F1EEE2', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: warn ? C.warn : C.ink,
        }} />
      </div>
    </div>
  );
}

function DotPill({ color, label, C }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid }}>{label}</span>
    </span>
  );
}

function DangerRow({ title, body, cta, hard, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
      padding: '14px 18px', borderBottom: `1px solid rgba(181,51,26,0.12)`,
    }}>
      <div>
        <div style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>{title}</div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid, marginTop: 4, lineHeight: 1.45, maxWidth: 640 }}>{body}</div>
      </div>
      <button style={{
        background: hard ? '#B5331A' : 'transparent',
        color: hard ? '#FFFFFF' : '#B5331A',
        border: hard ? 'none' : `1px solid #B5331A`,
        padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
        ...mono, fontSize: 11, letterSpacing: '.06em',
      }}>{cta}</button>
    </div>
  );
}

export default SettingsPage;

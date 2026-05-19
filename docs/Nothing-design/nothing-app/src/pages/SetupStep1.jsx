import React from 'react';
import { Steps } from '../components/Steps.jsx';

// Setup · Step 1 — mode select.
// First screen the user ever sees after `docker compose up`.
// No sidebar. Centered. Brand allowed to breathe.
// Two big cards; a third "compare" link drops the difference table inline.

function SetupStep1() {
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
      overflow: 'hidden', position: 'relative',
    }}>
      {/* top step strip */}
      <div style={{
        padding: '20px 40px', borderBottom: `1px solid ${C.rule}`,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22 }}>nothing</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 6 }} />
        </div>
        <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>
          Setup · Step 1 of 5
        </span>
        <Steps current={0} mode="self" C={C} />
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 980, padding: '64px 40px 40px' }}>

          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 14 }}>
            Welcome — your node is running on localhost:3000
          </div>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 64, lineHeight: 1.02, letterSpacing: '-.015em',
            margin: 0, fontWeight: 400,
          }}>
            How do you want to use it?
          </h1>
          <p style={{
            fontFamily: '"Newsreader", serif', fontSize: 18, lineHeight: 1.55, color: C.mid,
            margin: '20px 0 0', maxWidth: 640, textWrap: 'pretty',
          }}>
            Pick once, change later. The self-hosted path takes ~10 minutes and a domain
            you can edit DNS for. The other path takes 90 seconds and an existing
            email account.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 44 }}>
            <ModeCard
              C={C} recommended
              eyebrow="Self-hosted"
              title={<>Your domain.<br/>Your mail server.</>}
              email="handle@your-domain.com"
              points={[
                'NMP-native node — others can address you by handle',
                'Multi-user, multi-handle from day one',
                'Stalwart SMTP/IMAP runs in the same compose file',
              ]}
              suited="Teams · serious deployments · you own the data"
              setup="~10 minutes · DNS + GitHub OAuth"
            />
            <ModeCard
              C={C}
              eyebrow="Email Account"
              title={<>Connect an<br/>existing inbox.</>}
              email="yourname@gmail.com"
              points={[
                'Works with Nothing, Gmail, Outlook, QQ, custom IMAP',
                'Single user — no DNS, no domain, no waiting',
                'NMP features pass-through for Nothing addresses',
              ]}
              suited="Solo devs · trying it out · agents on your laptop"
              setup="~90 seconds · paste your IMAP/SMTP credentials"
            />
          </div>

          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14.5, color: C.mid }}>
              Not sure?
            </span>
            <button style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, color: C.ink,
              borderBottom: `1.5px solid ${C.yellow}`, padding: '0 0 1px',
            }}>see the feature difference</button>
            <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, color: C.soft }}>↑↓ to navigate · ↵ to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({ C, recommended, eyebrow, title, email, points, suited, setup }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      background: C.panel, border: `1px solid ${recommended ? C.ink : C.rule}`,
      borderRadius: 6, padding: '28px 28px 24px', position: 'relative',
      display: 'flex', flexDirection: 'column', gap: 18, minHeight: 380,
      cursor: 'pointer',
    }}>
      {recommended && (
        <span style={{
          position: 'absolute', top: -10, left: 24,
          background: C.yellow, color: C.ink,
          ...mono, fontSize: 9.5, letterSpacing: '.2em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 2,
        }}>Recommended for teams</span>
      )}
      <div>
        <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 10 }}>{eyebrow}</div>
        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 36, lineHeight: 1.05, letterSpacing: '-.015em', color: C.ink,
        }}>{title}</div>
        <div style={{ ...mono, fontSize: 12.5, color: C.mid, marginTop: 12, letterSpacing: '.02em' }}>
          → {email}
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {points.map((p, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: C.ink, lineHeight: 1.45 }}>
            <span style={{ color: C.soft, ...mono, fontSize: 11 }}>·</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, borderTop: `1px solid ${C.rule}` }}>
        <div>
          <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>For</div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: C.mid, marginTop: 2 }}>{suited}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>Setup</div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: C.mid, marginTop: 2 }}>{setup}</div>
        </div>
      </div>
    </div>
  );
}

export default SetupStep1;

import React from 'react';
import { AppSidebar } from '../components/AppSidebar.jsx';

// Tokens — list + create modal (modal shown open so we can review both at once).
// Permissions are first-class: every token shows what it CAN do as inline chips.

function TokensPage() {
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

  const tokens = [
    { id: 't1', name: 'Claude Code · laptop',    preview: 'ntk_live_a1b2…f7e3', perms: ['send','inbox','read','reply'], last: '2m ago',  created: '14 days ago', revoked: false, active: true },
    { id: 't2', name: 'Cursor · dev container',  preview: 'ntk_live_c4d5…22ab', perms: ['send','inbox','read'],         last: '1h ago',  created: '30 days ago', revoked: false },
    { id: 't3', name: 'Codex · CI runner',       preview: 'ntk_live_9f01…aa12', perms: ['send','read'],                 last: 'yesterday', created: '60 days ago', revoked: false },
    { id: 't4', name: 'Old MacBook · revoked',   preview: 'ntk_live_55e2…1abc', perms: ['send','inbox','read','reply','manage'], last: '12 days ago', created: '180 days ago', revoked: true },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: '232px 1fr',
      overflow: 'hidden', position: 'relative',
    }}>
      <AppSidebar active="tokens" C={C} />

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '28px 40px 18px', borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 6 }}>Authorization · 3 active · 1 revoked</div>
              <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 42, lineHeight: 1 }}>API Tokens</div>
            </div>
            <button style={{
              background: C.ink, color: C.bg, border: 'none',
              padding: '11px 20px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>＋ Create token</span>
            </button>
          </div>
          <p style={{ fontFamily: '"Newsreader", serif', fontStyle: 'italic', fontSize: 14.5, color: C.mid, margin: '14px 0 0' }}>
            One agent, one token. Scope tight.
          </p>
        </div>

        {/* table header */}
        <div style={{
          ...mono, fontSize: 9.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft,
          padding: '12px 40px', borderBottom: `1px solid ${C.rule}`,
          display: 'grid', gridTemplateColumns: '1fr 220px 280px 140px 90px', gap: 20,
        }}>
          <span>Name · token</span>
          <span>Permissions</span>
          <span>Last used · created</span>
          <span>Status</span>
          <span />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tokens.map(t => <TokenRow key={t.id} t={t} C={C} />)}
        </div>
      </main>

      {/* Create-Token modal overlay */}
      <CreateTokenModal C={C} />
    </div>
  );
}

function TokenRow({ t, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const fade = t.revoked ? 0.45 : 1;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 220px 280px 140px 90px', gap: 20,
      alignItems: 'baseline', padding: '20px 40px',
      borderBottom: `1px solid ${C.rule}`,
      opacity: fade, position: 'relative',
    }}>
      {t.active && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.yellow }} />}
      <div>
        <div style={{ fontSize: 14.5, color: C.ink, fontWeight: 500, textDecoration: t.revoked ? 'line-through' : 'none' }}>{t.name}</div>
        <div style={{ ...mono, fontSize: 11.5, color: C.mid, marginTop: 4, letterSpacing: '.02em' }}>{t.preview}</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {t.perms.map(p => (
          <span key={p} style={{
            ...mono, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase',
            color: p === 'manage' ? '#A8761A' : C.ink,
            background: p === 'manage' ? '#FCF4D8' : '#F1EEE2',
            padding: '3px 7px', borderRadius: 3,
          }}>{p}</span>
        ))}
      </div>
      <div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: C.ink }}>{t.last}</div>
        <div style={{ ...mono, fontSize: 10.5, color: C.soft, marginTop: 2 }}>created {t.created}</div>
      </div>
      <div>
        {t.revoked
          ? <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: '#B5331A' }}>revoked</span>
          : <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: '#1F7A4F', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1F7A4F' }} />
              active
            </span>
        }
      </div>
      <div style={{ textAlign: 'right' }}>
        {!t.revoked && (
          <button style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
            color: '#B5331A', borderBottom: '1px solid rgba(181,51,26,0.25)', padding: '0 0 1px',
          }}>revoke</button>
        )}
      </div>
    </div>
  );
}

function CreateTokenModal({ C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  const perms = [
    { id: 'send',   label: 'send',   desc: 'compose and send messages',    checked: true,  recommended: true  },
    { id: 'inbox',  label: 'inbox',  desc: 'list and read inbox messages',  checked: true,  recommended: true  },
    { id: 'read',   label: 'read',   desc: 'fetch full message bodies + attachments', checked: true,  recommended: true  },
    { id: 'reply',  label: 'reply',  desc: 'reply inside existing threads', checked: true },
    { id: 'manage', label: 'manage', desc: 'create / revoke tokens, change settings', checked: false, danger: true },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(15, 15, 14, 0.18)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    }}>
      <div style={{
        width: 560, background: C.panel, border: `1px solid ${C.rule}`,
        borderRadius: 8, boxShadow: '0 18px 60px rgba(15,15,14,.18)',
        padding: '26px 28px',
      }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 6 }}>
          New token
        </div>
        <h2 style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 32, lineHeight: 1.05, letterSpacing: '-.01em',
          margin: '0 0 6px', fontWeight: 400,
        }}>What is this token for?</h2>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13.5, color: C.mid, margin: '0 0 22px' }}>
          A name now, scopes below. You'll see the secret value exactly once.
        </p>

        {/* name input */}
        <label style={{ ...mono, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft, display: 'block', marginBottom: 6 }}>Name</label>
        <div style={{
          border: `1px solid ${C.ink}`, borderRadius: 4, padding: '10px 14px',
          marginBottom: 22, display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13.5, color: C.ink }}>Claude Code · staging container</span>
          <span style={{ marginLeft: 'auto', width: 2, height: 16, background: C.ink, animation: 'blink 1s steps(2) infinite' }} />
        </div>
        <style>{'@keyframes blink{50%{opacity:0}}'}</style>

        {/* permissions */}
        <div style={{ ...mono, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft, marginBottom: 8 }}>Permissions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 20 }}>
          {perms.map(p => <PermRow key={p.id} p={p} C={C} />)}
        </div>

        {/* expiry */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 22 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: C.soft, marginRight: 6 }}>Expires</span>
          <ExpiryChip label="never" C={C} />
          <ExpiryChip label="30 days" C={C} />
          <ExpiryChip label="90 days" C={C} active />
          <ExpiryChip label="custom" C={C} />
        </div>

        {/* actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 18, borderTop: `1px solid ${C.rule}` }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid }}>
            You can revoke this at any time.
          </span>
          <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: C.mid, padding: '10px 14px' }}>
            Cancel <span style={{ ...mono, fontSize: 10, color: C.soft, marginLeft: 4 }}>esc</span>
          </button>
          <button style={{
            background: C.yellow, color: C.ink, border: 'none',
            padding: '10px 18px', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>Create token</span>
            <span style={{ ...mono, fontSize: 9.5, color: 'rgba(15,15,14,.65)', padding: '1px 5px', border: '1px solid rgba(15,15,14,.25)', borderRadius: 3 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PermRow({ p, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <label style={{
      display: 'grid', gridTemplateColumns: '20px 100px 1fr auto', gap: 12, alignItems: 'baseline',
      padding: '9px 6px', borderRadius: 4, cursor: 'pointer',
      background: p.checked ? '#FBFAF3' : 'transparent',
    }}>
      <span style={{
        width: 14, height: 14, border: `1.5px solid ${p.checked ? C.ink : C.rule}`,
        background: p.checked ? C.ink : 'transparent', borderRadius: 2,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(2px)',
      }}>
        {p.checked && <span style={{ color: C.bg, fontSize: 10, lineHeight: 1 }}>✓</span>}
      </span>
      <span style={{ ...mono, fontSize: 12, color: p.danger ? '#A8761A' : C.ink, letterSpacing: '.04em' }}>{p.label}</span>
      <span style={{ fontSize: 12.5, color: C.mid }}>{p.desc}</span>
      {p.recommended && <span style={{ ...mono, fontSize: 9, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase' }}>typical</span>}
      {p.danger && <span style={{ ...mono, fontSize: 9, color: '#A8761A', letterSpacing: '.18em', textTransform: 'uppercase' }}>admin only</span>}
    </label>
  );
}

function ExpiryChip({ label, active, C }) {
  return (
    <button style={{
      background: active ? C.ink : 'transparent',
      color: active ? C.bg : C.mid,
      border: `1px solid ${active ? C.ink : C.rule}`,
      borderRadius: 999, padding: '4px 12px', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 12,
    }}>{label}</button>
  );
}

export default TokensPage;

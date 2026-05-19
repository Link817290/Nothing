import React from 'react';
import { INBOX, FOLDERS, PROJECTS } from '../data/sample.js';

// Inbox · Quiet
// White paper, serif only on subject lines, generous breathing room.
// Yellow is a 5px dot next to unread items. Nothing else is yellow.

function InboxQuiet() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
  };

  const items   = INBOX;
  const folders = FOLDERS;
  const projects= PROJECTS;

  const wrap = {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: C.bg, color: C.ink,
    fontFamily: '"Geist", system-ui, sans-serif',
    display: 'grid', gridTemplateColumns: '232px 1fr',
    overflow: 'hidden',
  };

  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  return (
    <div style={wrap}>
      {/* Sidebar */}
      <aside style={{ borderRight: `1px solid ${C.rule}`, padding: '28px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 28px' }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 26, letterSpacing: '-.01em' }}>nothing</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 8 }} />
        </div>

        <NavGroup label="Mail">
          {folders.map(f =>
            <NavItem key={f.id} label={f.label} count={f.count} active={f.active} C={C} />
          )}
        </NavGroup>

        <NavGroup label="Projects" mt={24}>
          {projects.map(p =>
            <NavItem key={p.id} label={p.label} count={p.count} dim C={C} />
          )}
        </NavGroup>

        <div style={{ marginTop: 'auto', borderTop: `1px solid ${C.rule}`, paddingTop: 14, fontSize: 12 }}>
          <div style={{ color: C.ink }}>Hana B.</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '28px 40px 18px', borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 6 }}>Tuesday · 14 May</div>
              <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 42, lineHeight: 1, letterSpacing: '-.01em' }}>Inbox</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <FilterChip label="Unread" active count={3} C={C} />
              <FilterChip label="All"          count={28} C={C} />
              <FilterChip label="Has attachments" C={C} />
              <div style={{ width: 1, height: 22, background: C.rule, margin: '0 6px' }} />
              <button style={{
                background: C.ink, color: C.bg, border: 'none', padding: '9px 16px', borderRadius: 999,
                fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              }}>Compose</button>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.map((m, i) => <QuietRow key={m.id} m={m} C={C} first={i === 0} />)}
        </div>
      </main>
    </div>
  );
}

function NavGroup({ label, mt = 0, children }) {
  return (
    <div style={{ marginTop: mt }}>
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5,
        letterSpacing: '.22em', textTransform: 'uppercase', color: '#9A9A92',
        padding: '0 6px 8px',
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>
    </div>
  );
}

function NavItem({ label, count, active, dim, C }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 8px', borderRadius: 6,
      background: active ? '#F1EEE2' : 'transparent',
      fontSize: 13.5, color: dim ? C.mid : C.ink,
    }}>
      <span>{label}</span>
      {count > 0 && (
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
          color: active ? C.ink : C.soft, letterSpacing: '.04em',
        }}>{count}</span>
      )}
    </div>
  );
}

function FilterChip({ label, active, count, C }) {
  return (
    <button style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, padding: '6px 2px',
      color: active ? C.ink : C.mid,
      borderBottom: active ? `1.5px solid ${C.ink}` : '1.5px solid transparent',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span>{label}</span>
      {count != null && <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, color: '#9A9A92' }}>{count}</span>}
    </button>
  );
}

function QuietRow({ m, C, first }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '16px 180px 1fr 200px',
      gap: 20, alignItems: 'baseline',
      padding: '20px 40px',
      borderBottom: `1px solid ${C.rule}`,
      borderTop: first ? 'none' : undefined,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: m.unread ? C.yellow : 'transparent',
        display: 'inline-block', transform: 'translateY(-3px)',
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: m.unread ? C.ink : C.mid, fontWeight: m.unread ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.fromName}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span data-subject-text style={{
            fontFamily: '"Geist", sans-serif',
            fontSize: 15, lineHeight: 1.25, letterSpacing: '-.005em',
            fontWeight: m.unread ? 600 : 500,
            color: C.ink,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: '0 1 auto', minWidth: 0,
          }}>{m.subject}</span>
          {m.thread_count > 1 && (
            <span style={{ ...mono, fontSize: 10, color: C.soft, letterSpacing: '.04em', flex: '0 0 auto' }}>· {m.thread_count}</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '54ch' }}>
          {m.preview}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          {m.project && (
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              color: C.mid, letterSpacing: '.02em',
              padding: '2px 7px', border: `1px solid ${C.rule}`, borderRadius: 3,
            }}>{m.project}</span>
          )}
          {m.has_attachments && (
            <span style={{ ...mono, fontSize: 10.5, color: C.soft }}>◇</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.mid }}>{m.date}</div>
      </div>
    </div>
  );
}

function StatusQuiet({ status, C }) {
  const map = {
    queued:    { label: 'queued',    color: C.soft },
    sent:      { label: 'sent',      color: C.mid },
    delivered: { label: 'delivered', color: C.mid },
    read:      { label: 'read',      color: C.mid },
    replied:   { label: 'replied',   color: C.ink },
    failed:    { label: 'failed',    color: '#B5331A' },
  };
  const s = map[status] || map.delivered;
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
      letterSpacing: '.16em', textTransform: 'uppercase',
      color: s.color,
    }}>{s.label}</span>
  );
}

export default InboxQuiet;

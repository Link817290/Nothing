import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { C } from '../tokens.js';
import { FOLDERS, PROJECTS } from '../data/sample.js';

const mono = { fontFamily: '"JetBrains Mono", monospace' };

export function AppSidebar({ active = 'inbox' }) {
  const tools = [
    { id: 'tokens',   label: 'Tokens',   count: 2,  href: '/tokens' },
    { id: 'settings', label: 'Settings', href: '/settings' },
  ];

  return (
    <aside style={{ borderRight: `1px solid ${C.rule}`, padding: '28px 20px', display: 'flex', flexDirection: 'column' }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 28px' }}>
        <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 26, letterSpacing: '-.01em' }}>nothing</span>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 8 }} />
      </Link>

      <SidebarGroup label="Mail">
        {FOLDERS.map(f => (
          <SidebarRow key={f.id} label={f.label} count={f.count} active={active === f.id} href={`/${f.id}`} />
        ))}
      </SidebarGroup>

      <SidebarGroup label="Projects" mt={24}>
        {PROJECTS.map(p => (
          <SidebarRow key={p.id} label={p.label} count={p.count} dim href={`/inbox?project=${p.id}`} />
        ))}
      </SidebarGroup>

      <SidebarGroup label="Manage" mt={24}>
        {tools.map(t => (
          <SidebarRow key={t.id} label={t.label} count={t.count} active={active === t.id} href={t.href} />
        ))}
      </SidebarGroup>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${C.rule}`, paddingTop: 14, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} />
          <span style={{ color: C.ink }}>Hana B.</span>
        </div>
      </div>
    </aside>
  );
}

function SidebarGroup({ label, mt = 0, children }) {
  return (
    <div style={{ marginTop: mt }}>
      <div style={{
        ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase',
        color: C.soft, padding: '0 6px 8px',
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>
    </div>
  );
}

function SidebarRow({ label, count, active, dim, href }) {
  return (
    <Link to={href || '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 8px', borderRadius: 6,
        background: active ? '#F1EEE2' : 'transparent',
        fontSize: 13.5, color: dim ? C.mid : C.ink,
      }}>
        <span>{label}</span>
        {count > 0 && (
          <span style={{ ...mono, fontSize: 10.5, color: active ? C.ink : C.soft, letterSpacing: '.04em' }}>{count}</span>
        )}
      </div>
    </Link>
  );
}

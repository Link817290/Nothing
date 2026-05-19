import React from 'react';
import { C } from '../tokens.js';

const mono = { fontFamily: '"JetBrains Mono", monospace' };

export function Steps({ current, mode = 'self' }) {
  const labels = mode === 'self'
    ? ['mode', 'domain', 'oauth', 'admin', 'done']
    : ['mode', 'email', 'account', 'done'];
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

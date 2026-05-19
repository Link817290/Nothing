import React from 'react';
import { useParams } from 'react-router-dom';
import {
  StateEmptyFirstTime, StateCaughtUp, StateLoading, StateNodeDown, StateTokenExpired,
} from '../components/inbox-states.jsx';

const map = {
  empty:   StateEmptyFirstTime,
  caught:  StateCaughtUp,
  loading: StateLoading,
  down:    StateNodeDown,
  auth:    StateTokenExpired,
};

export default function States() {
  const { kind = 'empty' } = useParams();
  const Component = map[kind] || StateEmptyFirstTime;
  // States are designed for ~1000×680 frames; render in a centred card.
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0eee9', padding: 24 }}>
      <div style={{ width: 1000, height: 680, background: '#FAFAF7', border: '1px solid #E8E4D8', borderRadius: 8, overflow: 'hidden' }}>
        <Component />
      </div>
      <nav style={{ position: 'fixed', top: 12, left: 12, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#6E6E68', display: 'flex', gap: 12 }}>
        {Object.keys(map).map(k => (
          <a key={k} href={`/states/${k}`} style={{ color: k === kind ? '#0F0F0E' : '#9A9A92', textDecoration: 'none' }}>{k}</a>
        ))}
      </nav>
    </div>
  );
}

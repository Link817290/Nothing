import React from 'react';
import { SENT } from '../data/sample.js';
import { AppSidebar } from '../components/AppSidebar.jsx';

// Sent — same visual system as Inbox A. The point of this page is
// validating that all 6 delivery states co-exist legibly in one list.

SENT = [
  { id: 'msg_o01', to: 'claude-code@nothing.email', toName: 'Claude Code', subject: 'Please patch the retry logic per the diff', preview: 'See src/session.ts:22 — fixed 100ms is the bug. Want 100 × 2^attempt with a 30s cap.', date: '2m',  status: 'queued',    project: 'backend-refactor', labels: ['patch'],  has_attachments: true,  thread_count: 1 },
  { id: 'msg_o02', to: 'bob@nothing.email',         toName: 'Bob Chen',    subject: 'Approving PR #284 — one nit',                preview: 'LGTM on the retry change. Could you also pull MAX_RETRIES into config? Right now 5 is hard-coded.', date: '9m', status: 'sent', project: 'backend-refactor', labels: ['pr-review'], has_attachments: false, thread_count: 2 },
  { id: 'msg_o03', to: 'codex@nothing.email',       toName: 'Codex',       subject: 'Re: Migration draft — 2026_05_users',         preview: "Looks good. Apply on staging Wed at 14:00 UTC. I'll watch the deploy.", date: '32m', status: 'delivered', project: 'db-migrations',    labels: [], has_attachments: false, thread_count: 2 },
  { id: 'msg_o04', to: 'hana@acme.com',             toName: 'Hana B.',     subject: 'Friday demo slides — comments',                preview: 'Pitch is good. I cut the third slide; it was repeating slide two. Diff attached.', date: '1h', status: 'read',      project: null,               labels: [], has_attachments: true,  thread_count: 3 },
  { id: 'msg_o05', to: 'cursor@nothing.email',      toName: 'Cursor',      subject: 'Re: Build failed on main — typescript strict', preview: 'Applied patches 1–3. Skipping 4 (false positive in test fixture). Pushing to ci/strict-fix.', date: '3h', status: 'replied',   project: 'web-app',          labels: ['ci'], has_attachments: false, thread_count: 4 },
  { id: 'msg_o06', to: 'lisa@partner-co.io',        toName: 'Lisa Park',   subject: 'Intro: Hana <> Lisa on the NMP rollout',       preview: 'Both of you have been asking, so: connecting you. Hana runs comms for our side…', date: '5h', status: 'failed',    project: null,               labels: ['external'], has_attachments: false, thread_count: 1, error: '550 5.1.1 user unknown' },
  { id: 'msg_o07', to: 'claude-code@nothing.email', toName: 'Claude Code', subject: 'Token budget bumped — go ahead with the index', preview: 'Approved the higher daily limit. You can resume the back-fill on db-migrations.', date: 'yesterday', status: 'delivered', project: 'db-migrations', labels: ['admin'], has_attachments: false, thread_count: 1 },
  { id: 'msg_o08', to: 'team@acme.com',             toName: 'team@acme.com', subject: 'NMP node moved to acme.com (was internal-mail.acme.com)', preview: 'DNS is propagated. Old address still receives for 30 days. Update your CLI configs.', date: '2d', status: 'read', project: null, labels: ['announce'], has_attachments: false, thread_count: 1 },
];

function SentQuiet() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
    fail: '#B5331A',
  };
  const items = SENT;
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: '232px 1fr',
      overflow: 'hidden',
    }}>
      <AppSidebar active="sent" C={C} />

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '28px 40px 18px', borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 6 }}>Outbound · 28 today</div>
              <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 42, lineHeight: 1, letterSpacing: '-.01em' }}>Sent</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatChip label="In flight"  count={2} dot={C.soft} C={C} />
              <StatChip label="Delivered"  count={18} dot="#1F7A4F" C={C} />
              <StatChip label="Read"       count={12} dot="#1F7A4F" C={C} />
              <StatChip label="Replied"    count={6}  dot={C.yellow} C={C} />
              <StatChip label="Failed"     count={1}  dot={C.fail} alert C={C} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.map((m, i) => <SentRow key={m.id} m={m} C={C} first={i === 0} />)}
        </div>
      </main>
    </div>
  );
}

function SentRow({ m, C, first }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '16px 180px 1fr 200px',
      gap: 20, alignItems: 'baseline',
      padding: '20px 40px',
      borderBottom: `1px solid ${C.rule}`,
      borderTop: first ? 'none' : undefined,
      background: m.status === 'failed' ? '#FBF3F0' : 'transparent',
    }}>
      <SentStatusGlyph status={m.status} C={C} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.toName}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span data-subject-text style={{
            fontFamily: '"Geist", sans-serif',
            fontSize: 15, lineHeight: 1.25, fontWeight: 500,
            color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: '0 1 auto', minWidth: 0,
          }}>{m.subject}</span>
          {m.thread_count > 1 && (
            <span style={{ ...mono, fontSize: 10, color: C.soft, letterSpacing: '.04em', flex: '0 0 auto' }}>· {m.thread_count}</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '54ch' }}>
          {m.preview}
        </div>
        {m.status === 'failed' && (
          <div style={{ ...mono, fontSize: 11, color: C.fail, marginTop: 6 }}>
            ✗ {m.error}  ·  <span style={{ borderBottom: `1px solid ${C.fail}`, paddingBottom: 1, cursor: 'pointer' }}>retry</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          {m.project && (
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, color: C.mid,
              padding: '2px 7px', border: `1px solid ${C.rule}`, borderRadius: 3,
            }}>{m.project}</span>
          )}
          {m.labels.length > 0 && null}
          {m.has_attachments && (
            <span style={{ ...mono, fontSize: 10.5, color: C.soft }}>◇</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: C.mid }}>{m.date}</div>
        <div style={{ marginTop: 6 }}>
          <SentStatusLabel status={m.status} C={C} />
        </div>
      </div>
    </div>
  );
}

function SentStatusGlyph({ status, C }) {
  // Tiny left-gutter glyph keyed to status. Replaces unread dot.
  const map = {
    queued:    { ch: '◌', col: C.soft  },
    sent:      { ch: '↗', col: C.mid   },
    delivered: { ch: '✓', col: '#1F7A4F' },
    read:      { ch: '✓✓', col: '#1F7A4F' },
    replied:   { ch: '↩', col: C.ink },
    failed:    { ch: '✗', col: C.fail  },
  };
  const s = map[status] || map.delivered;
  return <span style={{
    fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, color: s.col,
    transform: 'translateY(-3px)', display: 'inline-block',
  }}>{s.ch}</span>;
}

function SentStatusLabel({ status, C }) {
  const map = {
    queued:    { label: 'queued',    color: C.soft },
    sent:      { label: 'sent · in flight',  color: C.mid },
    delivered: { label: 'delivered', color: C.mid },
    read:      { label: 'read', color: C.ink },
    replied:   { label: 'replied · ↩', color: C.ink, mark: true },
    failed:    { label: 'failed', color: '#B5331A' },
  };
  const s = map[status] || map.delivered;
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
      letterSpacing: '.16em', textTransform: 'uppercase',
      color: s.color, display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {s.mark && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E5FF00' }} />}
      <span>{s.label}</span>
    </span>
  );
}

function StatChip({ label, count, dot, alert, C }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '5px 10px', borderRadius: 999,
      border: `1px solid ${alert ? C.fail : C.rule}`,
      fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
      color: alert ? C.fail : C.mid, letterSpacing: '.04em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
      <span style={{ textTransform: 'lowercase' }}>{label}</span>
      <span style={{ color: alert ? C.fail : C.ink }}>{count}</span>
    </span>
  );
}

export default SentQuiet;

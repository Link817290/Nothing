import React from 'react';

// Message Detail — Style A (Quiet)
// The killer page: subject + sender + the CODE CONTEXT block + reply body +
// attachments + thread. Code context is the differentiator and gets the most
// real estate. Status uses the same italic-serif system as the Inbox.

function MessageDetailQuiet() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    soft_rule: '#F1EEE2',
    yellow: '#E5FF00',
    code_bg: '#FBFAF3',
    code_hl: '#FFF7B8',
    add: '#1F7A4F',
    rem: '#B5331A',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  // Hard-coded message (msg_01HX9K2N from inbox)
  const m = {
    id: 'msg_01HX9K2N',
    from: { name: 'Bob Chen', addr: 'bob@nothing.email' },
    to:   { name: 'Hana B.',  addr: 'hana@acme.com'    },
    subject: 'Re: 退避逻辑有问题',
    date: 'Tuesday · 14 May · 04:18',
    project: 'backend-refactor',
    labels: ['code-review'],
    status: 'replied',
    type: 'reply',
    context: {
      repo: 'github.com/acme/api',
      file: 'src/session.ts',
      lines: '20-35',
      hl: 22,
      language: 'typescript',
    },
    body: [
      "你说得对 — 第 22 行用固定 100ms 在生产环境根本扛不住瞬时尖峰，前面三次 retry 在同一个 100ms 窗口里全部撞上同一个 429。",
      "改成 *100 × 2^attempt* 之后跑了 retry suite，22 次里全部在第 3 次以内 200。给 backoff 加了 30 秒上限，免得遇到长时间故障时整个 worker 卡死。",
      "Patch 附在下面，PR 等你点 approve。"
    ],
    attachments: [
      { filename: 'session.ts.patch', size: '2.1 KB', kind: 'patch' },
      { filename: 'retry-suite.log',  size: '14 KB',  kind: 'log'   },
    ],
    thread: [
      { id: 'msg_01HX9K1M', who: 'Hana B.',  preview: '这个退避逻辑有问题 — 看 src/session.ts:22，固定 100ms 在生产环境 retry 全撞一起了。', date: '2 days ago', current: false },
      { id: 'msg_01HX9K2N', who: 'Bob Chen', preview: '你说得对，第 22 行应该用 100 * 2 ** attempt…', date: '14m ago', current: true },
      { id: 'msg_01HX9K2P', who: 'Claude Code', preview: 'Opened PR #284 with the patch above. Tests pass locally.',  date: '2m ago',  current: false },
    ],
  };

  const codeLines = [
    { n: 20, t: 'async function sendWithRetry(payload: Payload) {' },
    { n: 21, t: '  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {' },
    { n: 22, t: '    const delay = 100;  // ← fixed delay, the problem', hl: true },
    { n: 23, t: '    try {' },
    { n: 24, t: '      const r = await client.post("/send", payload);' },
    { n: 25, t: '      if (r.status === 200) return r;' },
    { n: 26, t: '    } catch (err) {' },
    { n: 27, t: '      if (!isRetryable(err)) throw err;' },
    { n: 28, t: '    }' },
    { n: 29, t: '    await sleep(delay);' },
    { n: 30, t: '  }' },
    { n: 31, t: '  throw new Error("retries_exhausted");' },
    { n: 32, t: '}' },
    { n: 33, t: '' },
    { n: 34, t: '// Caller:' },
    { n: 35, t: 'await sendWithRetry({ to, subject, body });' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: '232px 1fr',
      overflow: 'hidden',
    }}>
      {/* Sidebar (same as Inbox A) */}
      <MiniSidebar C={C} />

      {/* Main */}
      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          padding: '14px 40px', borderBottom: `1px solid ${C.rule}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <button style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, color: C.mid,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>← Inbox</button>
          <span style={{ ...mono, fontSize: 10.5, color: C.soft, letterSpacing: '.04em' }}>/ {m.id}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ActionBtn label="Reply"      kbd="R" primary C={C} />
            <ActionBtn label="Reply all"  kbd="⇧R" C={C} />
            <ActionBtn label="Forward"    kbd="F" C={C} />
            <span style={{ width: 1, height: 18, background: C.rule, margin: '0 6px' }} />
            <ActionBtn label="Archive"    kbd="E"  C={C} />
            <ActionBtn label="More"       kbd="⌘." C={C} />
          </div>
        </div>

        {/* Scrollable detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '36px 56px 60px' }}>
          {/* Header */}
          <div style={{ maxWidth: 920 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>Reply · in thread of 3</span>
              <span style={{
                ...mono, fontSize: 10, color: C.mid, letterSpacing: '.18em', textTransform: 'uppercase',
                borderLeft: `1px solid ${C.rule}`, paddingLeft: 12,
              }}>{m.date}</span>
            </div>
            <h1 style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 44, lineHeight: 1.1, letterSpacing: '-.015em',
              margin: 0, fontWeight: 400, color: C.ink,
            }}>{m.subject}</h1>

            <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'baseline' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={m.from.name} />
                <div>
                  <div style={{ fontSize: 14, color: C.ink }}>
                    <span style={{ fontWeight: 500 }}>{m.from.name}</span>
                    <span style={{ color: C.soft, margin: '0 8px' }}>→</span>
                    <span>{m.to.name}</span>
                  </div>
                  <div style={{ ...mono, fontSize: 10.5, color: C.soft, marginTop: 3, letterSpacing: '.02em' }}>
                    {m.from.addr}  ·  {m.to.addr}
                  </div>
                </div>
              </div>
              <div />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, color: C.mid, padding: '2px 7px', border: `1px solid ${C.rule}`, borderRadius: 3 }}>
                  {m.project}
                </span>
                {m.labels.map(l => (
                  <span key={l} style={{ ...mono, fontSize: 9.5, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase' }}>{l}</span>
                ))}
                <span style={{ width: 1, height: 14, background: C.rule }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.yellow }} />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: C.ink }}>replied</span>
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxWidth: 920, marginTop: 40 }}>
            {/* Code context */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 10 }}>
                Quoted code
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 4, overflow: 'hidden' }}>
                {/* code header */}
                <div style={{
                  padding: '10px 16px', borderBottom: `1px solid ${C.rule}`,
                  display: 'flex', alignItems: 'center', gap: 10, background: C.code_bg,
                }}>
                  <span style={{ ...mono, fontSize: 11.5, color: C.ink }}>
                    <span style={{ color: C.mid }}>{m.context.repo}</span>
                    <span style={{ color: C.soft, margin: '0 6px' }}>·</span>
                    <span>{m.context.file}</span>
                    <span style={{ color: C.soft }}>:{m.context.lines}</span>
                  </span>
                  <span style={{
                    ...mono, fontSize: 9.5, color: C.soft, letterSpacing: '.16em', textTransform: 'uppercase',
                    border: `1px solid ${C.rule}`, padding: '1px 7px', borderRadius: 3,
                  }}>{m.context.language}</span>
                </div>
                <div style={{ padding: '14px 0', fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5, lineHeight: 1.7 }}>
                  {codeLines.map(l => (
                    <div key={l.n} style={{
                      display: 'grid', gridTemplateColumns: '52px 1fr', alignItems: 'baseline',
                      background: l.hl ? C.code_hl : 'transparent',
                      borderLeft: l.hl ? `3px solid ${C.ink}` : '3px solid transparent',
                      paddingLeft: l.hl ? 3 : 6, paddingRight: 16,
                    }}>
                      <span style={{ color: C.soft, textAlign: 'right', paddingRight: 16, userSelect: 'none' }}>{l.n}</span>
                      <span style={{ color: l.hl ? C.ink : '#2D2D2A', whiteSpace: 'pre' }}>{l.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reply body */}
            <div style={{ fontFamily: '"Newsreader", serif', fontSize: 17.5, lineHeight: 1.65, color: C.ink, textWrap: 'pretty' }}>
              {m.body.map((p, i) => (
                <p key={i} style={{ margin: i === 0 ? '0 0 16px' : '0 0 16px' }}>{renderInlineEm(p)}</p>
              ))}
            </div>

            {/* Attachments */}
            <div style={{ marginTop: 36, borderTop: `1px solid ${C.rule}`, paddingTop: 20 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 12 }}>
                Attachments · {m.attachments.length}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {m.attachments.map(a => <AttachChip key={a.filename} a={a} C={C} />)}
              </div>
            </div>
          </div>

          {/* Thread */}
          <div style={{ maxWidth: 920, marginTop: 48, borderTop: `1px solid ${C.rule}`, paddingTop: 24 }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, marginBottom: 14 }}>
              Thread · {m.thread.length} messages
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {m.thread.map((t, i) => <ThreadRow key={t.id} t={t} last={i === m.thread.length - 1} C={C} />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ───────────── helpers (board-local) ─────────────

function renderInlineEm(s) {
  // turn *text* into em
  const parts = s.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) => p.startsWith('*') && p.endsWith('*')
    ? <em key={i} style={{ fontStyle: 'italic', fontFamily: '"Newsreader", serif' }}>{p.slice(1, -1)}</em>
    : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function MiniSidebar({ C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <aside style={{ borderRight: `1px solid ${C.rule}`, padding: '28px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 28px' }}>
        <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 26, letterSpacing: '-.01em' }}>nothing</span>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 8 }} />
      </div>
      <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, padding: '0 6px 8px' }}>Mail</div>
      <SideRow label="Inbox"    count={3}  active C={C} />
      <SideRow label="Sent"     count={0}  C={C} />
      <SideRow label="Threads"  count={12} C={C} />
      <SideRow label="Archive"  C={C} />

      <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft, padding: '24px 6px 8px' }}>Projects</div>
      <SideRow label="backend-refactor" count={8} highlight C={C} />
      <SideRow label="web-app"          count={4} dim C={C} />
      <SideRow label="db-migrations"    count={2} dim C={C} />
      <SideRow label="architecture"     count={6} dim C={C} />

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${C.rule}`, paddingTop: 14, fontSize: 12 }}>
        <div style={{ color: C.ink }}>Hana B.</div>
      </div>
    </aside>
  );
}

function SideRow({ label, count, active, dim, highlight, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 8px', borderRadius: 6,
      background: active ? '#F1EEE2' : 'transparent',
      fontSize: 13.5, color: dim ? C.mid : C.ink,
      borderLeft: highlight ? `2px solid ${C.yellow}` : '2px solid transparent',
      paddingLeft: highlight ? 6 : 8,
    }}>
      <span>{label}</span>
      {count > 0 && (
        <span style={{ ...mono, fontSize: 10.5, color: active ? C.ink : C.soft }}>{count}</span>
      )}
    </div>
  );
}

function Avatar({ name }) {
  const initials = name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span style={{
      width: 32, height: 32, borderRadius: '50%', background: '#1F1B14', color: '#FFFCEE',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Geist", sans-serif', fontSize: 12, fontWeight: 500, letterSpacing: '.04em',
      flexShrink: 0,
    }}>{initials}</span>
  );
}

function ActionBtn({ label, kbd, primary, C }) {
  return (
    <button style={{
      background: primary ? C.ink : 'transparent',
      color: primary ? C.bg : C.ink,
      border: primary ? 'none' : `1px solid transparent`,
      padding: '7px 13px', borderRadius: 6, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13,
    }}>{label}</button>
  );
}

function AttachChip({ a, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', border: `1px solid ${C.rule}`, borderRadius: 4,
      background: C.panel, minWidth: 220,
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: 3, background: '#F1EEE2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...mono, fontSize: 10, color: C.mid, letterSpacing: '.06em',
      }}>{a.kind === 'patch' ? '◇' : '≡'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</div>
        <div style={{ ...mono, fontSize: 10.5, color: C.soft, marginTop: 2 }}>{a.size}</div>
      </div>
      <span style={{ fontSize: 11, color: C.mid }}>↓</span>
    </div>
  );
}

function ThreadRow({ t, last, C }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '24px 140px 1fr 90px', gap: 18, alignItems: 'baseline',
      padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${C.soft_rule}`,
      background: t.current ? 'transparent' : 'transparent',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: t.current ? C.yellow : C.rule,
        display: 'inline-block', transform: 'translateY(-1px)',
      }} />
      <span style={{ fontSize: 13.5, color: t.current ? C.ink : C.mid, fontWeight: t.current ? 500 : 400 }}>{t.who}</span>
      <span style={{ fontSize: 13, color: C.mid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.preview}</span>
      <span style={{ ...mono, fontSize: 10.5, color: C.soft, textAlign: 'right', letterSpacing: '.04em' }}>{t.date}</span>
    </div>
  );
}

export default MessageDetailQuiet;

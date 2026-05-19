import React from 'react';
import { Steps } from '../components/Steps.jsx';

// Setup · Step 5 — Done. CLI install + MCP config + "you're live" summary.
// The page that converts a 10-min DNS slog into a satisfying finish.

function SetupStep5() {
  const C = {
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    ink: '#0F0F0E',
    mid: '#6E6E68',
    soft: '#9A9A92',
    rule: '#E8E4D8',
    yellow: '#E5FF00',
    code_bg: '#FBFAF3',
  };
  const mono = { fontFamily: '"JetBrains Mono", monospace' };

  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      background: C.bg, color: C.ink,
      fontFamily: '"Geist", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 40px', borderBottom: `1px solid ${C.rule}`,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22 }}>nothing</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, marginBottom: 6 }} />
        </div>
        <span style={{ marginLeft: 'auto', ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>
          Setup · 05 of 05 · Done
        </span>
        <Steps current={4} mode="self" C={C} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1080, padding: '52px 40px 40px' }}>

          <div style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: '#1F7A4F', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1F7A4F' }} />
            <span>your node is live</span>
          </div>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 64, lineHeight: 1.02, letterSpacing: '-.015em',
            margin: 0, fontWeight: 400, textWrap: 'balance',
          }}>You're <span style={{ display: 'inline-block', position: 'relative' }}>
            <span style={{ position: 'absolute', left: -4, right: -4, top: '58%', bottom: '8%', background: C.yellow, zIndex: 0 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>all set.</span>
          </span></h1>
          <p style={{ fontFamily: '"Newsreader", serif', fontSize: 18, lineHeight: 1.55, color: C.mid, margin: '20px 0 0', maxWidth: 640, textWrap: 'pretty' }}>
            One CLI command on every machine that needs to send mail; one MCP config in every
            editor that runs agents. Nothing else.
          </p>

          {/* Summary cards */}
          <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <SummaryCard C={C} label="Handle"       value="hana@acme.com"           tag="self-hosted" />
            <SummaryCard C={C} label="API base"     value="api.acme.com"            tag="https · 443" />
            <SummaryCard C={C} label="NMP node"     value="acme.com · stalwart 0.10" tag="● running" tagColor="#1F7A4F" />
          </div>

          {/* Install · two columns */}
          <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24 }}>
            {/* CLI */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>① Install the CLI</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid }}>~30 seconds</span>
              </div>
              <CodeBlock C={C} lang="zsh">
                <div><span style={{ color: C.soft }}>$</span> npm i -g nothing-cli</div>
                <div><span style={{ color: C.soft }}>$</span> nothing login <span style={{ background: '#FCF4D8' }}>ntk_live_M9aN2p…</span></div>
                <div style={{ color: C.soft }}>  signed in as hana@acme.com</div>
                <div style={{ color: C.soft }}>  3 agents can now reach this inbox</div>
                <div style={{ height: 6 }} />
                <div><span style={{ color: C.soft }}>$</span> nothing send --to bob --subject "ping"</div>
                <div style={{ color: '#1F7A4F' }}>  ✓ queued  ✓ sent  ✓ delivered</div>
              </CodeBlock>
            </div>

            {/* MCP config */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>② Wire it into your editor · MCP</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: C.mid }}>Claude Code · Cursor · Codex</span>
              </div>
              <CodeBlock C={C} lang="json" path="~/.config/nothing/mcp.json">
                <div>{'{'}</div>
                <div>{'  "mcpServers": {'}</div>
                <div>{'    "nothing": {'}</div>
                <div>{'      "command": "nothing",'}</div>
                <div>{'      "args": ["mcp"]'}</div>
                <div>{'    }'}</div>
                <div>{'  }'}</div>
                <div>{'}'}</div>
              </CodeBlock>
            </div>
          </div>

          {/* footer */}
          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16, paddingTop: 22, borderTop: `1px solid ${C.rule}` }}>
            <button style={{
              background: C.ink, color: C.bg, border: 'none',
              padding: '12px 22px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5,
            }}>Enter Inbox →</button>
            <button style={{
              background: 'transparent', border: `1px solid ${C.rule}`,
              padding: '11px 20px', borderRadius: 999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, color: C.ink,
            }}>Read the docs</button>
            <span style={{ marginLeft: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: C.mid }}>
              You can re-run Setup any time from <span style={{ borderBottom: `1px solid ${C.rule}`, paddingBottom: 1 }}>Settings · Instance</span>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ C, label, value, tag, tagColor }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 6, padding: '16px 18px' }}>
      <div style={{ ...mono, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: C.soft }}>{label}</div>
      <div style={{ ...mono, fontSize: 14.5, color: C.ink, marginTop: 8, marginBottom: 6, letterSpacing: '.02em' }}>{value}</div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5, color: tagColor || C.mid }}>{tag}</div>
    </div>
  );
}

function CodeBlock({ C, lang, path, children }) {
  const mono = { fontFamily: '"JetBrains Mono", monospace' };
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        padding: '8px 14px', borderBottom: `1px solid ${C.rule}`,
        background: C.code_bg, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ ...mono, fontSize: 10, color: C.soft, letterSpacing: '.18em', textTransform: 'uppercase' }}>{lang}</span>
        {path && <span style={{ ...mono, fontSize: 10.5, color: C.mid }}>{path}</span>}
        <span style={{ marginLeft: 'auto', ...mono, fontSize: 10, color: C.soft, letterSpacing: '.06em' }}>copy ⌘C</span>
      </div>
      <pre style={{ ...mono, fontSize: 12.5, color: C.ink, lineHeight: 1.7, margin: 0, padding: '14px 16px', whiteSpace: 'pre-wrap' }}>
        {children}
      </pre>
    </div>
  );
}

export default SetupStep5;

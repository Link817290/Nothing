/**
 * Smart Envelope Hooks — 5 real-world multi-turn scenarios
 *
 * Scenario A: Bug report → fix → review → approve
 * Scenario B: Deploy approval chain
 * Scenario C: Agent-to-agent task delegation with capsule
 * Scenario D: Casual team chat (should NOT add structure)
 * Scenario E: Cross-repo code review with context
 */

import { preSendHook, postReadHook, preReplyHook } from '../hooks.js'
import { decideRoute } from '../routing.js'
import type { NmpPayload } from '../types.js'

function sep(title: string) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('═'.repeat(60))
}

function step(n: number, desc: string) {
  console.log(`\n── Step ${n}: ${desc} ──`)
}

function show(label: string, val: any) {
  if (typeof val === 'object') console.log(`  ${label}: ${JSON.stringify(val)}`)
  else console.log(`  ${label}: ${val}`)
}

function showHints(hints: string[]) {
  if (hints.length === 0) console.log('  Hints: (none)')
  else hints.forEach(h => console.log(`  → ${h}`))
}

// ─────────────────────────────────────────────────────────────────
//  Scenario A: Bug Report → Fix → Review → Approve
// ─────────────────────────────────────────────────────────────────

sep('Scenario A: Bug Report → Fix → Review → Approve')

// A1: QA agent reports a bug, wants structured reply
step(1, 'QA agent sends bug report with reply_schema')
const a1 = preSendHook({
  text: 'Login page crashes on Safari when password > 32 chars. Stack trace attached.',
  type: 'nmp:task',
  files: ['/logs/crash-2026-06-03.log'],
  agentId: 'qa-bot',
})
show('Route', `${a1.route.route} (needLLM: ${a1.route.needLLM})`)
show('Patch', a1.patch)
showHints(a1.hints)

// QA agent follows hint, adds reply_schema
const a1Payload: NmpPayload = {
  nmp: 1, type: 'nmp:task', agent: 'qa-bot',
  context: a1.patch.context,
  expires: a1.patch.expires,
  project: 'web-frontend',
  reply_schema: {
    properties: {
      root_cause: { type: 'string' },
      fix_description: { type: 'string' },
      files_changed: { type: 'array' },
    },
  },
}

// A2: Dev reads the bug report
step(2, 'Dev agent reads the bug report')
const a2read = postReadHook(a1Payload)
a2read.forEach(l => console.log(`  ${l}`))

// A3: Dev replies with fix (missing files_changed)
step(3, 'Dev replies with fix — missing files_changed')
const a3 = preReplyHook(
  'Root cause: password input truncation in Safari WebKit. Fix: added maxLength bypass in auth handler.',
  ['/workspace/src/auth/login.ts'],
  a1Payload,
)
show('Satisfies', a3.satisfies)
show('Patch', a3.patch)
showHints(a3.hints)

// A4: Dev sends second reply with all fields
step(4, 'Dev replies again with all fields covered')
const a4 = preReplyHook(
  'Root_cause: Safari WebKit truncates password at 32 chars. Fix_description: removed maxLength constraint. Files_changed: auth/login.ts, auth/validation.ts',
  ['/workspace/src/auth/login.ts', '/workspace/src/auth/validation.ts'],
  a1Payload,
)
show('Satisfies', a4.satisfies)
showHints(a4.hints)

// A5: QA approves
step(5, 'QA sends "confirmed, closing"')
const a5route = decideRoute({
  inReplyTo: 'msg_dev_fix',
  parent: { ...a1Payload, artifact: { name: 'fix-patch' } },
  hasArtifact: false,
  text: '确认，关闭',
})
show('Route', `${a5route.route} (confidence: ${a5route.confidence})`)

// ─────────────────────────────────────────────────────────────────
//  Scenario B: Deploy Approval Chain (3 approvers)
// ─────────────────────────────────────────────────────────────────

sep('Scenario B: Deploy Approval — multi-approver chain')

// B1: DevOps requests deploy approval
step(1, 'DevOps requests production deploy approval')
const b1 = preSendHook({
  text: 'Requesting approval to deploy v2.3.0 to production. Changes: auth refactor + new API endpoints. Rollback plan: revert to v2.2.9.',
  type: 'nmp:approval',
  agentId: 'devops-agent',
})
show('Route', `${b1.route.route}`)
show('Auto-expires', b1.patch.expires)
showHints(b1.hints)

const b1Payload: NmpPayload = {
  nmp: 1, type: 'nmp:approval', agent: 'devops-agent',
  project: 'backend-api', expires: b1.patch.expires,
  reply_schema: {
    properties: {
      approved: { type: 'boolean' },
      conditions: { type: 'string' },
    },
  },
}

// B2: Tech lead reads
step(2, 'Tech lead reads deploy request')
const b2read = postReadHook(b1Payload)
b2read.forEach(l => console.log(`  ${l}`))

// B3: Tech lead approves with condition
step(3, 'Tech lead approves with condition')
const b3 = preReplyHook(
  'Approved with condition: run load test before final deploy.',
  undefined,
  b1Payload,
)
show('Satisfies', b3.satisfies)
showHints(b3.hints)

// B4: Security lead replies "ok"
step(4, 'Security lead replies "ok"')
const b4route = decideRoute({
  inReplyTo: 'msg_deploy_req',
  parent: b1Payload,
  hasArtifact: false,
  text: 'ok',
})
show('Route', `${b4route.route} (confidence: ${b4route.confidence})`)

// B5: PM rejects
step(5, 'PM replies with rejection — no "approved" keyword')
const b5 = preReplyHook(
  'Hold off. Marketing needs 2 more days for the landing page. Postpone to Monday.',
  undefined,
  b1Payload,
)
show('Satisfies', b5.satisfies)
showHints(b5.hints)

// ─────────────────────────────────────────────────────────────────
//  Scenario C: Agent delegation with structured handoff
// ─────────────────────────────────────────────────────────────────

sep('Scenario C: Agent-to-agent task delegation')

// C1: Orchestrator sends task to specialist
step(1, 'Orchestrator delegates data migration task')
const c1 = preSendHook({
  text: 'Migrate user table from PostgreSQL to the new schema. 50k rows. Must preserve all foreign keys.',
  type: 'nmp:task',
  agentId: 'orchestrator',
})
show('Route', `${c1.route.route}`)
showHints(c1.hints)

const c1Payload: NmpPayload = {
  nmp: 1, type: 'nmp:task', agent: 'orchestrator',
  project: 'db-migration',
  help_request: {
    id: 'hr_migrate_users',
    goal: 'Migrate user table to new schema',
    constraints: ['zero downtime', 'preserve FKs', 'rollback within 5min'],
    expected_artifacts: [
      { type: 'file', name: 'migration.sql' },
      { type: 'file', name: 'rollback.sql' },
    ],
  },
  reply_schema: {
    properties: {
      migration_sql: { type: 'string' },
      rollback_sql: { type: 'string' },
      rows_affected: { type: 'number' },
    },
  },
}

// C2: Specialist reads task
step(2, 'Specialist reads the task')
const c2read = postReadHook(c1Payload)
c2read.forEach(l => console.log(`  ${l}`))

// C3: Specialist delivers with files
step(3, 'Specialist delivers migration + rollback scripts')
const c3route = decideRoute({
  inReplyTo: 'msg_migration_task',
  parent: c1Payload,
  hasArtifact: true,
  text: 'Migration ready. 50,123 rows affected. Tested on staging.',
})
show('Route', `${c3route.route} (confidence: ${c3route.confidence})`)

const c3reply = preReplyHook(
  'Migration_sql attached. Rollback_sql attached. Rows_affected: 50123. Tested on staging with zero downtime.',
  ['/workspace/migration.sql', '/workspace/rollback.sql'],
  c1Payload,
)
show('Satisfies', c3reply.satisfies)
show('Patch', c3reply.patch)
showHints(c3reply.hints)

// C4: Orchestrator asks for revision
step(4, 'Orchestrator asks to revise: add index creation')
const c4route = decideRoute({
  inReplyTo: 'msg_specialist_delivery',
  parent: { ...c1Payload, artifact: { name: 'migration.sql' } },
  hasArtifact: true,
  text: 'Good, but add index on email column after migration. Updated script attached.',
})
show('Route', `${c4route.route} (confidence: ${c4route.confidence})`)

// ─────────────────────────────────────────────────────────────────
//  Scenario D: Casual team chat (zero structure expected)
// ─────────────────────────────────────────────────────────────────

sep('Scenario D: Casual team chat — hooks should stay quiet')

// D1: Someone sends casual message
step(1, 'Send: "下午三点开会讨论一下"')
const d1 = preSendHook({
  text: '下午三点开会讨论一下',
  agentId: 'claude-code',
})
show('Route', `${d1.route.route}`)
show('Patch keys', Object.keys(d1.patch))
showHints(d1.hints)

// D2: Reply in conversation
step(2, 'Reply: "好的，我到时候在线"')
const d2parent: NmpPayload = { nmp: 1, type: 'nmp:chat' }
const d2 = preReplyHook('好的，我到时候在线', undefined, d2parent)
show('Satisfies', d2.satisfies)
showHints(d2.hints)

// D3: Another reply
step(3, 'Reply: "收到"')
const d3route = decideRoute({
  inReplyTo: 'msg_meeting',
  parent: d2parent,
  hasArtifact: false,
  text: '收到',
})
show('Route', `${d3route.route} (confidence: ${d3route.confidence})`)

// D4: Follow-up casual
step(4, 'Reply: "顺便带一下上周的数据报告"')
const d4route = decideRoute({
  inReplyTo: 'msg_meeting',
  parent: d2parent,
  hasArtifact: false,
  text: '顺便带一下上周的数据报告',
})
show('Route', `${d4route.route} (needLLM: ${d4route.needLLM})`)

// D5: Read casual message — should NOT inject anything
step(5, 'Read casual chat message — expect no prompts')
const d5read = postReadHook(d2parent)
console.log(`  Injected lines: ${d5read.length} (expected: 0)`)

// ─────────────────────────────────────────────────────────────────
//  Scenario E: Cross-repo code review with rich context
// ─────────────────────────────────────────────────────────────────

sep('Scenario E: Cross-repo code review with context')

// E1: Send review for frontend file
step(1, 'Send code review for React component')
const e1 = preSendHook({
  text: 'Review this component — the useEffect cleanup might leak subscriptions.',
  type: 'nmp:code-review',
  files: ['/workspace/frontend/src/hooks/useWebSocket.tsx', '/workspace/frontend/src/hooks/useWebSocket.test.tsx'],
  agentId: 'claude-code',
})
show('Route', `${e1.route.route}`)
show('Context auto-filled', e1.patch.context)
show('Expires', e1.patch.expires)

// E2: Reviewer reads
step(2, 'Reviewer reads with require + expires')
const e2Payload: NmpPayload = {
  nmp: 1, type: 'nmp:code-review',
  context: { file: '/workspace/frontend/src/hooks/useWebSocket.tsx', language: 'typescript', repo: 'github.com/team/frontend' },
  require: ['react', 'websocket'],
  expires: e1.patch.expires,
  reply_schema: { properties: { approved: {}, issues: {}, suggestions: {} } },
}
const e2read = postReadHook(e2Payload)
e2read.forEach(l => console.log(`  ${l}`))

// E3: Reviewer replies with detailed review
step(3, 'Reviewer replies with full review')
const e3 = preReplyHook(
  'Issues: useEffect missing AbortController cleanup. Suggestions: use useRef for socket instance. Approved: false, needs fix first.',
  undefined,
  e2Payload,
)
show('Satisfies', e3.satisfies)
showHints(e3.hints)

// E4: Author sends fix
step(4, 'Author sends fixed file')
const e4route = decideRoute({
  inReplyTo: 'msg_review_feedback',
  parent: { ...e2Payload, artifact: { name: 'useWebSocket.tsx' } },
  hasArtifact: true,
  text: 'Fixed: added AbortController + useRef. See updated file.',
})
show('Route', `${e4route.route} (confidence: ${e4route.confidence})`)

// E5: Reviewer approves
step(5, 'Reviewer: "lgtm"')
const e5route = decideRoute({
  inReplyTo: 'msg_fix',
  parent: e2Payload,
  hasArtifact: false,
  text: 'lgtm',
})
show('Route', `${e5route.route} (confidence: ${e5route.confidence})`)

// ─── Summary ─────────────────────────────────────────────────────

sep('Summary')
console.log(`
  Scenario A (Bug fix):     initiate → read+contract → reply(miss) → reply(ok) → ack
  Scenario B (Deploy):      initiate+approval → read+contract → approve → ack → reject
  Scenario C (Delegation):  initiate+help → read+contract → deliver → revise
  Scenario D (Casual chat): initiate → reply(no schema) → ack → discuss → read(clean)
  Scenario E (Code review): initiate+context → read+contract → reply → revise → ack
`)

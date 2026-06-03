import { NothingClient } from '../client.js'
import { loadConfig } from '../config.js'

function getClient(): NothingClient {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.\n')
    process.exit(1)
  }
  return new NothingClient({ serverUrl: config.server_url, token: config.token })
}

export async function capsuleList() {
  const client = getClient()
  const { capsules } = await client.listCapsules()
  if (capsules.length === 0) {
    console.log('\n  No capsules received yet.\n')
    return
  }
  console.log(`\n  Capsules (${capsules.length}):\n`)
  for (const c of capsules) {
    console.log(`  ${c.id}  ${c.name} v${c.version}`)
    if (c.description) console.log(`    ${c.description}`)
  }
  console.log()
}

export async function capsuleInspect(id: string) {
  const client = getClient()
  const capsule = await client.getCapsule(id)

  console.log(`\n  ═══ ${capsule.name} v${capsule.version} ═══\n`)
  if (capsule.description) console.log(`  ${capsule.description}\n`)

  // Activation
  console.log(`  Applies to: ${capsule.activation?.task_types?.join(', ') || 'general'}`)
  if (capsule.activation?.keywords?.length) {
    console.log(`  Keywords: ${capsule.activation.keywords.join(', ')}`)
  }

  // State machine
  const sm = capsule.state_machine
  console.log(`\n  State Machine: ${sm.initial} → ${sm.final.join(', ')}`)
  for (const [name, state] of Object.entries(sm.states)) {
    const marker = name === sm.initial ? ' (start)' : sm.final.includes(name) ? ' (end)' : ''
    console.log(`    ${name}${marker}: ${(state as any).goal}`)
    for (const t of (state as any).transitions || []) {
      console.log(`      → ${t.to} when ${t.when}`)
    }
  }

  // Tool policy
  const tp = capsule.tool_policy
  console.log(`\n  Tool Policy:`)
  console.log(`    Allow: ${tp.allow.join(', ')}`)
  if (tp.deny?.length) console.log(`    Deny: ${tp.deny.join(', ')}`)
  if (tp.require_confirm?.length) console.log(`    Confirm: ${tp.require_confirm.join(', ')}`)

  // Validators
  if (capsule.validators?.length) {
    console.log(`\n  Validators:`)
    for (const v of capsule.validators) {
      console.log(`    [${v.severity}] ${v.id}: ${v.rule}`)
    }
  }

  // Artifacts
  if (capsule.artifacts?.length) {
    console.log(`\n  Expected Artifacts:`)
    for (const a of capsule.artifacts) {
      console.log(`    ${a.name} (${a.type})${a.required ? ' *required' : ''}`)
    }
  }

  console.log()
}

export async function capsuleStart(capsuleId: string, inputsJson?: string) {
  const client = getClient()
  let inputs: Record<string, unknown> | undefined
  if (inputsJson) {
    try { inputs = JSON.parse(inputsJson) } catch { console.log('  Invalid JSON for inputs\n'); return }
  }

  const result = await client.startCapsule(capsuleId, inputs)
  console.log(`\n  ✓ Run started: ${result.id}`)
  console.log(`  Status: ${result.status}`)
  console.log(`  Current state: ${result.current_state}`)

  // Show first step
  const state = result.capsule?.state_machine?.states?.[result.current_state]
  if (state) {
    console.log(`\n  Goal: ${state.goal}`)
    if (state.instructions) console.log(`  Instructions: ${state.instructions}`)
    if (state.allowed_tools?.length) console.log(`  Tools: ${state.allowed_tools.join(', ')}`)
    if (state.expected_outputs?.length) console.log(`  Expected outputs: ${state.expected_outputs.join(', ')}`)
  }
  console.log()
}

export async function capsuleNext(runId: string) {
  const client = getClient()
  const step = await client.getNextStep(runId)

  if (step.is_final) {
    console.log(`\n  ✓ Run completed (state: ${step.current_state})\n`)
    return
  }

  console.log(`\n  ═══ State: ${step.current_state} ═══`)
  console.log(`  Status: ${step.status}\n`)
  console.log(`  Goal: ${step.goal}`)
  if (step.instructions) console.log(`  Instructions: ${step.instructions}`)
  if (step.allowed_tools?.length) console.log(`  Tools: ${step.allowed_tools.join(', ')}`)
  if (step.expected_outputs?.length) console.log(`  Expected: ${step.expected_outputs.join(', ')}`)
  if (step.transitions?.length) {
    console.log(`\n  Transitions:`)
    for (const t of step.transitions) {
      console.log(`    → ${t.to} when ${t.when}`)
    }
  }
  console.log()
}

export async function capsuleGuard(runId: string, command: string) {
  const client = getClient()
  const result = await client.guardCommand(runId, command)

  const icon = result.effect === 'allow' ? '✓' : result.effect === 'deny' ? '✗' : '?'
  console.log(`\n  ${icon} ${result.effect.toUpperCase()}: ${command}`)
  console.log(`  Reason: ${result.reason}\n`)
}

export async function capsuleTransition(runId: string, toState: string, reason?: string) {
  const client = getClient()
  const result = await client.transitionState(runId, toState, reason)

  console.log(`\n  ✓ ${result.previous_state} → ${result.current_state}`)
  console.log(`  Status: ${result.status}\n`)
}

export async function capsuleEvent(runId: string, type: string, opts?: { state?: string; message?: string }) {
  const client = getClient()
  const result = await client.appendCapsuleEvent(runId, { type, state: opts?.state, message: opts?.message })
  console.log(`\n  ✓ Event recorded: ${result.event_id}\n`)
}

export async function capsuleStatus(runId: string) {
  const client = getClient()
  const r = await client.getRun(runId)
  const { events } = await client.listCapsuleEvents(runId)

  console.log(`\n  ═══ Run: ${r.id} ═══`)
  console.log(`  Capsule: ${r.capsule_id}`)
  console.log(`  Status: ${r.status}`)
  console.log(`  Current state: ${r.current_state}`)
  console.log(`  Started: ${r.created_at}`)
  if (r.completed_at) console.log(`  Completed: ${r.completed_at}`)

  if (events.length > 0) {
    console.log(`\n  Timeline (${events.length} events):`)
    for (const e of events) {
      const time = new Date(e.created_at).toLocaleTimeString()
      const state = e.state ? `[${e.state}]` : ''
      console.log(`    ${time} ${e.event_type} ${state} ${e.message || ''}`)
    }
  }
  console.log()
}

export async function capsuleValidate(runId: string, artifactName: string, artifactPath?: string) {
  const client = getClient()
  const result = await client.validateArtifact(runId, artifactName, artifactPath)

  console.log(`\n  Artifact: ${result.artifact}`)
  console.log(`  Result: ${result.passed ? '✓ PASSED' : '✗ FAILED'}\n`)

  for (const r of result.results) {
    const icon = r.passed ? '✓' : '✗'
    console.log(`  ${icon} ${r.id}: ${r.message}`)
  }
  console.log()
}

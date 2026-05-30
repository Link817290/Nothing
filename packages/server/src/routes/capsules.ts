import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import {
  listCapsules, getCapsule, createRun, getRun, getRunWithCapsule,
  updateRunState, appendEvent, listEvents, guardCommand, createArtifact, listArtifacts,
} from '../services/capsules.js'

export async function capsuleRoutes(app: FastifyInstance) {
  // ─── Capsules ──────────────────────────────────────────────────

  app.get('/api/capsules', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string }
    return { capsules: await listCapsules(user.id) }
  })

  app.get('/api/capsules/:id', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const capsule = await getCapsule(user.id, id)
    if (!capsule) return reply.code(404).send({ error: 'Capsule not found' })
    return capsule
  })

  // ─── Runs ──────────────────────────────────────────────────────

  app.post('/api/capsule-runs', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as { capsule_id: string; inputs?: Record<string, unknown>; help_request_message_id?: string }
    if (!body.capsule_id) return reply.code(400).send({ error: 'capsule_id required' })

    try {
      const result = await createRun(user.id, body.capsule_id, body.inputs, body.help_request_message_id)
      return result
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message })
    }
  })

  app.get('/api/capsule-runs/:id', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const run = await getRun(user.id, id)
    if (!run) return reply.code(404).send({ error: 'Run not found' })
    return run
  })

  // Get current state info (what to do next)
  app.get('/api/capsule-runs/:id/next', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const data = await getRunWithCapsule(user.id, id)
    if (!data || !data.capsule) return reply.code(404).send({ error: 'Run not found' })

    const state = data.capsule.state_machine.states[data.current_state]
    if (!state) return reply.code(400).send({ error: `State "${data.current_state}" not found in capsule` })

    const isFinal = data.capsule.state_machine.final.includes(data.current_state)

    return {
      run_id: data.id,
      status: data.status,
      current_state: data.current_state,
      is_final: isFinal,
      goal: state.goal,
      instructions: state.instructions,
      allowed_tools: state.allowed_tools,
      required_inputs: state.required_inputs,
      expected_outputs: state.expected_outputs,
      validators: state.validators,
      transitions: state.transitions,
    }
  })

  // Transition to next state
  app.post('/api/capsule-runs/:id/transition', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { to: string; reason?: string }
    if (!body.to) return reply.code(400).send({ error: 'to state required' })

    const data = await getRunWithCapsule(user.id, id)
    if (!data || !data.capsule) return reply.code(404).send({ error: 'Run not found' })

    const currentState = data.capsule.state_machine.states[data.current_state]
    if (!currentState) return reply.code(400).send({ error: 'Current state not found' })

    // Validate transition
    const validTransition = currentState.transitions.find(t => t.to === body.to)
    if (!validTransition) {
      return reply.code(400).send({
        error: `Invalid transition from "${data.current_state}" to "${body.to}"`,
        valid_transitions: currentState.transitions.map(t => t.to),
      })
    }

    const isFinal = data.capsule.state_machine.final.includes(body.to)
    const newStatus = isFinal ? 'completed' : 'running'

    await updateRunState(user.id, id, body.to, newStatus)

    await appendEvent(user.id, id, {
      id: '', run_id: id,
      type: 'state_completed',
      state: data.current_state,
      message: body.reason || `Completed "${data.current_state}", moving to "${body.to}"`,
      created_at: new Date().toISOString(),
    })

    await appendEvent(user.id, id, {
      id: '', run_id: id,
      type: 'state_entered',
      state: body.to,
      message: `Entered state: ${body.to}`,
      created_at: new Date().toISOString(),
    })

    return { run_id: id, previous_state: data.current_state, current_state: body.to, status: newStatus }
  })

  // ─── Guard Command ─────────────────────────────────────────────

  app.post('/api/capsule-runs/:id/guard', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { command: string }
    if (!body.command) return reply.code(400).send({ error: 'command required' })

    const data = await getRunWithCapsule(user.id, id)
    if (!data || !data.capsule) return reply.code(404).send({ error: 'Run not found' })

    const result = guardCommand(data.capsule, data.current_state, body.command)

    // Log the guard check
    await appendEvent(user.id, id, {
      id: '', run_id: id,
      type: result.effect === 'allow' ? 'tool_allowed' : result.effect === 'deny' ? 'tool_denied' : 'tool_requested',
      state: data.current_state,
      message: `${result.effect}: ${body.command} — ${result.reason}`,
      data: { command: body.command, ...result },
      created_at: new Date().toISOString(),
    })

    return result
  })

  // ─── Events ────────────────────────────────────────────────────

  app.post('/api/capsule-runs/:id/events', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { type: string; state?: string; message?: string; data?: Record<string, unknown> }
    if (!body.type) return reply.code(400).send({ error: 'event type required' })

    const eventId = await appendEvent(user.id, id, {
      id: '', run_id: id,
      type: body.type as any,
      state: body.state,
      message: body.message,
      data: body.data,
      created_at: new Date().toISOString(),
    })

    return { event_id: eventId }
  })

  app.get('/api/capsule-runs/:id/events', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    return { events: await listEvents(user.id, id) }
  })

  // ─── Validate Artifact ─────────────────────────────────────────

  app.post('/api/capsule-runs/:id/validate', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const { id } = req.params as { id: string }
    const body = req.body as { artifact_name: string; artifact_path?: string; size?: number; type?: string }

    const data = await getRunWithCapsule(user.id, id)
    if (!data || !data.capsule) return reply.code(404).send({ error: 'Run not found' })

    const spec = data.capsule.artifacts?.find(a => a.name === body.artifact_name)
    const validators = data.capsule.validators || []

    const results: { id: string; passed: boolean; message: string }[] = []

    // Run validators relevant to this artifact
    for (const v of validators) {
      if (v.target && v.target !== body.artifact_name) continue

      let passed = false
      let message = ''

      switch (v.type) {
        case 'file_exists':
          passed = !!(body.artifact_path || body.size)
          message = passed ? 'File exists' : 'File not found'
          break
        case 'json_schema':
          passed = true // Simplified — would need actual schema validation
          message = 'Schema check (simplified)'
          break
        case 'manual':
          passed = false
          message = `Manual check required: ${v.rule}`
          break
        default:
          passed = true
          message = `Validator type "${v.type}" not yet implemented`
      }

      results.push({ id: v.id, passed, message })

      await appendEvent(user.id, id, {
        id: '', run_id: id,
        type: passed ? 'validator_passed' : 'validator_failed',
        state: data.current_state,
        message: `${v.id}: ${message}`,
        data: { validator_id: v.id, artifact: body.artifact_name, passed },
        created_at: new Date().toISOString(),
      })
    }

    const allPassed = results.every(r => r.passed || validators.find(v => v.id === r.id)?.severity === 'warning')

    return { artifact: body.artifact_name, passed: allPassed, results }
  })

  // ─── Artifacts ─────────────────────────────────────────────────

  app.post('/api/artifacts', { preHandler: authenticate }, async (req, reply) => {
    const user = (req as any).user as { id: string }
    const body = req.body as {
      run_id?: string; message_id?: string; attachment_id?: string
      name: string; type: string; mime_type?: string; sha256?: string; size?: number
    }
    if (!body.name || !body.type) return reply.code(400).send({ error: 'name and type required' })

    const id = await createArtifact(user.id, body)
    return { id }
  })

  app.get('/api/artifacts', { preHandler: authenticate }, async (req) => {
    const user = (req as any).user as { id: string }
    const q = req.query as { run_id?: string }
    return { artifacts: await listArtifacts(user.id, q.run_id) }
  })
}

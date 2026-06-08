/**
 * Smart Envelope — Route Decision Engine
 *
 * Determines the intent of a message based on hard facts (not LLM),
 * then maps to field obligations. 80% of messages resolved by R1–R4.
 */

import type { NmpPayload } from './types.js'

// ─── Route types ─────────────────────────────────────────────────

export type Route = 'initiate' | 'deliver' | 'revise' | 'discuss' | 'acknowledge'

export interface RouteResult {
  route: Route
  needLLM: boolean     // true if agent should confirm (R1 ambiguity or R5 fallback)
  confidence: 'high' | 'medium'
}

export interface RouteInput {
  inReplyTo?: string | null
  parent?: NmpPayload | null
  parentHasArtifact?: boolean   // whether parent message had attachments/artifacts
  hasArtifact: boolean          // this message has files/deliverable
  text: string
}

// ─── Route Decision ──────────────────────────────────────────────

/** Short text heuristic — not for classification, just to flag as "likely simple" */
function isShortText(text: string): boolean {
  return text.trim().length <= 20
}

/**
 * Determine route from hard facts only. Pure function, no IO.
 *
 * Only structural signals decide routes deterministically:
 * R1: No inReplyTo → initiate (needLLM=true, agent confirms)
 * R2: Parent has reply_schema + this has artifact → deliver
 * R3: Parent has artifact + this has artifact → revise
 * R4+R5: Everything else → agent classifies from closed set of 5
 *
 * The agent receives the route as a suggestion + needLLM flag.
 * When needLLM=true, the agent should confirm or pick the correct route.
 */
export function decideRoute(input: RouteInput): RouteResult {
  const { inReplyTo, parent, hasArtifact, parentHasArtifact, text } = input

  // R1: New message (no parent) → likely initiate, agent confirms
  if (!inReplyTo || !parent) {
    return { route: 'initiate', needLLM: true, confidence: 'medium' }
  }

  // R2: Parent has reply_schema + this has deliverable → deliver
  // reply_schema is the structural signal — type doesn't matter
  if (parent.reply_schema && hasArtifact) {
    return { route: 'deliver', needLLM: false, confidence: 'high' }
  }

  // R3: Both parent and this have artifacts → revision (hard fact)
  const parentHadArtifact = !!parentHasArtifact
  if (parentHadArtifact && hasArtifact) {
    return { route: 'revise', needLLM: false, confidence: 'high' }
  }

  // R4+R5: Can't determine from structure alone.
  // Give agent a hint based on text length, but always needLLM=true.
  const suggestedRoute: Route = isShortText(text) ? 'acknowledge' : 'discuss'
  return { route: suggestedRoute, needLLM: true, confidence: 'medium' }
}

// ─── Route → Field Obligations ───────────────────────────────────

export interface FieldObligation {
  suggest: string[]   // Missing → hint to agent (soft)
  forbid: string[]    // Present → strip silently (hard)
}

export const ROUTE_CONTRACT: Record<Route, FieldObligation> = {
  initiate: { suggest: ['help_request', 'reply_schema', 'require'], forbid: [] },
  deliver:  { suggest: ['artifact'], forbid: [] },
  revise:   { suggest: ['artifact'], forbid: [] },
  discuss:  { suggest: [], forbid: ['reply_schema'] },
  acknowledge: { suggest: [], forbid: ['reply_schema', 'artifact'] },
}

// ─── Route → Thread Shape ────────────────────────────────────────

export const ROUTE_THREAD_SHAPE: Record<Route, {
  description: string
  inReplyToTarget: 'none' | 'parent' | 'specific_version' | 'weak'
}> = {
  initiate:    { description: 'New tree root', inReplyToTarget: 'none' },
  deliver:     { description: 'Mainline extension', inReplyToTarget: 'parent' },
  revise:      { description: 'Branch (version tree)', inReplyToTarget: 'specific_version' },
  discuss:     { description: 'Side thread', inReplyToTarget: 'weak' },
  acknowledge: { description: 'Status event (no new node)', inReplyToTarget: 'parent' },
}

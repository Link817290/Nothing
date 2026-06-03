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
  hasArtifact: boolean    // files attached or text contains deliverable
  text: string
}

// ─── Acknowledgment word list ────────────────────────────────────

const ACK_WORDS = new Set([
  // English
  'ok', 'okay', 'got it', 'received', 'thanks', 'thank you', 'noted',
  'agreed', 'approved', 'confirmed', 'yes', 'yep', 'sure', 'done',
  'ack', 'acknowledged', 'rgr', 'roger', '+1', 'lgtm', 'sgtm',
  // Chinese
  '好', '好的', '收到', '了解', '知道了', '同意', '确认', '没问题',
  '可以', '行', '嗯', '嗯嗯', '谢谢', '感谢', '批准', '通过',
])

function isAck(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.!。！~～\s]+$/g, '')
  return ACK_WORDS.has(normalized)
}

// ─── Route Decision ──────────────────────────────────────────────

/**
 * Determine route from hard facts. Pure function, no IO.
 *
 * R1: No inReplyTo → initiate (or discuss if ambiguous, needLLM=true)
 * R2: Parent is initiate + has reply_schema + this has artifact → deliver
 * R3: Parent has artifact + this has artifact → revise
 * R4: Short ack text → acknowledge
 * R5: Fallback → discuss (needLLM=true, agent picks from 5 options)
 */
export function decideRoute(input: RouteInput): RouteResult {
  const { inReplyTo, parent, hasArtifact, text } = input

  // R1: New message (no parent)
  if (!inReplyTo || !parent) {
    // If text asks for something concrete, it's an initiation
    // But we can't be sure without LLM — mark needLLM for ambiguous cases
    return { route: 'initiate', needLLM: true, confidence: 'medium' }
  }

  // R2: Parent initiated with reply_schema + this has deliverable
  if (parent.reply_schema && hasArtifact) {
    return { route: 'deliver', needLLM: false, confidence: 'high' }
  }

  // R3: Both parent and this have artifacts → revision
  if (parent.artifact && hasArtifact) {
    return { route: 'revise', needLLM: false, confidence: 'high' }
  }

  // R4: Short acknowledgment
  if (isAck(text)) {
    return { route: 'acknowledge', needLLM: false, confidence: 'high' }
  }

  // R5: Fallback — agent should pick from closed set
  return { route: 'discuss', needLLM: true, confidence: 'medium' }
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

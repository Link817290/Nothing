import {
  NMP_VERSION, NMP_HEADERS, NMP_ATTACHMENT_NAME, NMP_DEFAULTS,
  resolveType,
  type NmpType, type NmpPriority, type NmpContext, type NmpPayload, type NmpEmail,
  type NmpHelpRequest, type NmpExecutionCapsule, type NmpCapsuleRun, type NmpCapsuleEvent, type NmpArtifact,
} from './types.js'
import { generateMarkdown, generatePlainText } from './markdown.js'

/**
 * Fluent builder for constructing NMP emails.
 *
 * Usage:
 *   const email = NmpBuilder.create()
 *     .from('agent@example.com')
 *     .to('user@example.com')
 *     .subject('Hello')
 *     .type('nmp:chat')
 *     .agent('claude-code')
 *     .body('Message content here')
 *     .build()
 *
 * Returns an NmpEmail object ready for nodemailer.
 */
export class NmpBuilder {
  private _from = ''
  private _to = ''
  private _subject = ''
  private _body = ''
  private _type: NmpType = NMP_DEFAULTS.type
  private _agent?: string
  private _project?: string
  private _labels?: string[]
  private _priority: NmpPriority = NMP_DEFAULTS.priority
  private _expires?: string
  private _conversationId?: string
  private _context?: NmpContext
  private _files?: string[]
  private _capabilities?: string[]
  private _require?: string[]
  private _replySchema?: Record<string, unknown>
  private _ack?: boolean
  private _inReplyTo?: string
  private _references?: string[]
  private _signature?: string
  private _helpRequest?: NmpHelpRequest
  private _executionCapsule?: NmpExecutionCapsule
  private _capsuleRun?: NmpCapsuleRun
  private _capsuleEvent?: NmpCapsuleEvent
  private _artifact?: NmpArtifact

  static create(): NmpBuilder {
    return new NmpBuilder()
  }

  from(email: string): this { this._from = email; return this }
  to(email: string): this { this._to = email; return this }
  subject(s: string): this { this._subject = s; return this }
  body(text: string): this { this._body = text; return this }

  type(t: string): this { this._type = resolveType(t); return this }
  agent(name: string): this { this._agent = name; return this }
  project(name: string): this { this._project = name; return this }
  labels(l: string[]): this { this._labels = l; return this }
  priority(p: NmpPriority): this { this._priority = p; return this }
  expires(iso: string): this { this._expires = iso; return this }
  conversationId(id: string): this { this._conversationId = id; return this }
  context(ctx: NmpContext): this { this._context = ctx; return this }
  files(paths: string[]): this { this._files = paths; return this }
  capabilities(caps: string[]): this { this._capabilities = caps; return this }
  require(reqs: string[]): this { this._require = reqs; return this }
  replySchema(schema: Record<string, unknown>): this { this._replySchema = schema; return this }
  ack(v = true): this { this._ack = v; return this }
  inReplyTo(id: string): this { this._inReplyTo = id; return this }
  references(refs: string[]): this { this._references = refs; return this }
  signature(sig: string): this { this._signature = sig; return this }
  helpRequest(req: NmpHelpRequest): this { this._helpRequest = req; this._type = 'nmp:help-request'; return this }
  executionCapsule(cap: NmpExecutionCapsule): this { this._executionCapsule = cap; this._type = 'nmp:execution-capsule'; return this }
  capsuleRun(run: NmpCapsuleRun): this { this._capsuleRun = run; this._type = 'nmp:capsule-run'; return this }
  capsuleEvent(evt: NmpCapsuleEvent): this { this._capsuleEvent = evt; this._type = 'nmp:capsule-event'; return this }
  artifactCreated(art: NmpArtifact): this { this._artifact = art; this._type = 'nmp:artifact-created'; return this }

  /** Build the NMP payload object */
  buildPayload(): NmpPayload {
    return {
      nmp: NMP_VERSION,
      type: this._type,
      agent: this._agent,
      project: this._project,
      labels: this._labels,
      priority: this._priority !== 'normal' ? this._priority : undefined,
      expires: this._expires,
      ack: this._ack,
      conversation_id: this._conversationId,
      context: this._context,
      files: this._files,
      capabilities: this._capabilities,
      require: this._require,
      reply_schema: this._replySchema,
      signature: this._signature,
      help_request: this._helpRequest,
      execution_capsule: this._executionCapsule,
      capsule_run: this._capsuleRun,
      capsule_event: this._capsuleEvent,
      artifact: this._artifact,
    }
  }

  /** Build a complete NMP email structure ready for nodemailer */
  build(): NmpEmail {
    if (!this._from) throw new Error('NmpBuilder: from is required')
    if (!this._to) throw new Error('NmpBuilder: to is required')
    if (!this._body) throw new Error('NmpBuilder: body is required')

    const subject = this._subject || this._body.slice(0, NMP_DEFAULTS.subjectMaxLength)
    const payload = this.buildPayload()

    const plainText = generatePlainText(this._body, payload)
    const markdown = generateMarkdown(this._body, payload)
    const jsonPayload = JSON.stringify(payload)

    // Build X-NMP-* headers
    const headers: Record<string, string> = {
      [NMP_HEADERS.version]: String(NMP_VERSION),
      [NMP_HEADERS.type]: this._type,
    }
    if (this._agent) headers[NMP_HEADERS.agent] = this._agent
    if (this._project) headers[NMP_HEADERS.project] = this._project
    if (this._labels?.length) headers[NMP_HEADERS.labels] = this._labels.join(', ')
    if (this._priority && this._priority !== 'normal') headers[NMP_HEADERS.priority] = this._priority
    if (this._expires) headers[NMP_HEADERS.expires] = this._expires
    if (this._conversationId) headers[NMP_HEADERS.conversationId] = this._conversationId
    if (this._capabilities?.length) headers[NMP_HEADERS.capabilities] = this._capabilities.join(', ')
    if (this._require?.length) headers[NMP_HEADERS.require] = this._require.join(', ')
    if (this._signature) headers[NMP_HEADERS.signature] = this._signature

    return {
      from: this._from,
      to: this._to,
      subject,
      text: plainText,
      headers,
      attachments: [
        { filename: NMP_ATTACHMENT_NAME, content: markdown, contentType: 'text/plain; charset=utf-8' },
        { filename: 'nmp.json', content: jsonPayload, contentType: 'application/json; charset=utf-8' },
      ],
      inReplyTo: this._inReplyTo,
      references: this._references?.join(' '),
    }
  }
}

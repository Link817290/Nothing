import { createTransport } from 'nodemailer'
import { NmpBuilder } from '@nothingmail/nmp'
import type { NmpPayload } from '@nothingmail/nmp'
import type { EmailAccount } from '../types/index.js'
import { decrypt } from '../services/accounts.js'

export interface SmtpSendOptions {
  account: EmailAccount
  from: string
  to: string
  subject: string
  text: string
  payload: NmpPayload
  inReplyTo?: string
  references?: string[]
  userAttachments?: { filename: string; content: Buffer; contentType: string }[]
}

export async function smtpSend(opts: SmtpSendOptions): Promise<{ messageId: string; accepted: boolean }> {
  const pass = decrypt(opts.account.auth_pass_encrypted)

  const transporter = createTransport({
    host: opts.account.smtp_host,
    port: opts.account.smtp_port,
    secure: opts.account.smtp_port === 465,
    auth: { user: opts.account.auth_user, pass },
  })

  // Use NmpBuilder to construct the email
  const builder = NmpBuilder.create()
    .from(opts.from)
    .to(opts.to)
    .subject(opts.subject)
    .body(opts.text)
    .type(opts.payload.type)

  if (opts.payload.agent) builder.agent(opts.payload.agent)
  if (opts.payload.project) builder.project(opts.payload.project)
  if (opts.payload.labels?.length) builder.labels(opts.payload.labels)
  if (opts.payload.priority) builder.priority(opts.payload.priority)
  if (opts.payload.expires) builder.expires(opts.payload.expires)
  if (opts.payload.conversation_id) builder.conversationId(opts.payload.conversation_id)
  if (opts.payload.context) builder.context(opts.payload.context)
  if (opts.payload.capabilities?.length) builder.capabilities(opts.payload.capabilities)
  if (opts.payload.require?.length) builder.require(opts.payload.require)
  if (opts.payload.reply_schema) builder.replySchema(opts.payload.reply_schema)
  if (opts.payload.ack) builder.ack()
  if (opts.inReplyTo) builder.inReplyTo(opts.inReplyTo)
  if (opts.references) builder.references(opts.references)

  const email = builder.build()

  const result = await transporter.sendMail({
    from: email.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    headers: email.headers,
    inReplyTo: email.inReplyTo,
    references: email.references,
    attachments: [
      // NMP protocol attachments
      ...email.attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
      // User attachments
      ...(opts.userAttachments || []).map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    ],
  })

  transporter.close()

  return {
    messageId: result.messageId || `smtp_${Date.now()}`,
    accepted: result.accepted?.length > 0,
  }
}

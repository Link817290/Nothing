import { createTransport } from 'nodemailer'
import { generateMarkdown, generatePlainText, NMP_HEADERS, NMP_ATTACHMENT_NAME } from '@nothingmail/nmp'
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
}

export async function smtpSend(opts: SmtpSendOptions): Promise<{ messageId: string; accepted: boolean }> {
  const pass = decrypt(opts.account.auth_pass_encrypted)

  const transporter = createTransport({
    host: opts.account.smtp_host,
    port: opts.account.smtp_port,
    secure: opts.account.smtp_port === 465,
    auth: { user: opts.account.auth_user, pass },
  })

  const plainText = generatePlainText(opts.text, opts.payload)
  const markdown = generateMarkdown(opts.text, opts.payload)
  const jsonPayload = JSON.stringify(opts.payload)

  const headers: Record<string, string> = {
    [NMP_HEADERS.version]: String(opts.payload.nmp),
  }
  if (opts.payload.type) headers[NMP_HEADERS.type] = opts.payload.type
  if (opts.payload.agent) headers[NMP_HEADERS.agent] = opts.payload.agent
  if (opts.payload.project) headers[NMP_HEADERS.project] = opts.payload.project
  if (opts.payload.labels?.length) headers[NMP_HEADERS.labels] = opts.payload.labels.join(', ')
  if (opts.payload.priority && opts.payload.priority !== 'normal') headers[NMP_HEADERS.priority] = opts.payload.priority

  const result = await transporter.sendMail({
    from: opts.from, to: opts.to, subject: opts.subject,
    text: plainText, headers,
    inReplyTo: opts.inReplyTo,
    references: opts.references?.join(' '),
    attachments: [
      { filename: NMP_ATTACHMENT_NAME, content: markdown, contentType: 'text/plain; charset=utf-8' },
      { filename: 'nmp.json', content: jsonPayload, contentType: 'application/json; charset=utf-8' },
    ],
  })

  transporter.close()

  return {
    messageId: result.messageId || `smtp_${Date.now()}`,
    accepted: result.accepted?.length > 0,
  }
}

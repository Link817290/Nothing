import { createTransport, type Transporter } from 'nodemailer'
import { loadConfig } from '../config.js'
import { generateMarkdown, generatePlainText, NMP_HEADERS, NMP_ATTACHMENT_NAME } from '@nothingmail/nmp'
import type { NmpPayload } from '@nothingmail/nmp'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (transporter) return transporter

  const config = loadConfig()
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) return null

  transporter = createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 465,
    secure: (config.smtp_port || 465) === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  })

  return transporter
}

export interface SmtpSendOptions {
  from: string
  to: string
  subject: string
  text: string
  payload: NmpPayload
  inReplyTo?: string
  references?: string[]
}

export async function smtpSend(opts: SmtpSendOptions): Promise<{ messageId: string; accepted: boolean }> {
  const t = getTransporter()
  if (!t) {
    // No SMTP configured (local mode) — return fake success
    return { messageId: `local_${Date.now()}`, accepted: true }
  }

  const plainText = generatePlainText(opts.text, opts.payload)
  const markdown = generateMarkdown(opts.text, opts.payload)
  const jsonPayload = JSON.stringify(opts.payload)

  // Build custom headers
  const headers: Record<string, string> = {
    [NMP_HEADERS.version]: String(opts.payload.nmp),
  }
  if (opts.payload.type) headers[NMP_HEADERS.type] = opts.payload.type
  if (opts.payload.agent) headers[NMP_HEADERS.agent] = opts.payload.agent
  if (opts.payload.project) headers[NMP_HEADERS.project] = opts.payload.project
  if (opts.payload.labels?.length) headers[NMP_HEADERS.labels] = opts.payload.labels.join(', ')
  if (opts.payload.priority && opts.payload.priority !== 'normal') headers[NMP_HEADERS.priority] = opts.payload.priority
  if (opts.payload.expires) headers[NMP_HEADERS.expires] = opts.payload.expires
  if (opts.payload.capabilities?.length) headers[NMP_HEADERS.capabilities] = opts.payload.capabilities.join(', ')
  if (opts.payload.require?.length) headers[NMP_HEADERS.require] = opts.payload.require.join(', ')

  const result = await t.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    text: plainText,
    headers,
    inReplyTo: opts.inReplyTo,
    references: opts.references?.join(' '),
    attachments: [
      // nmp.md — Agent readable layer
      {
        filename: NMP_ATTACHMENT_NAME,
        content: markdown,
        contentType: 'text/plain; charset=utf-8',
      },
      // JSON payload — machine readable layer
      {
        filename: 'nmp.json',
        content: jsonPayload,
        contentType: 'application/json; charset=utf-8',
      },
    ],
  })

  return {
    messageId: result.messageId || `smtp_${Date.now()}`,
    accepted: result.accepted?.length > 0,
  }
}

export async function testSmtpConnection(): Promise<boolean> {
  const t = getTransporter()
  if (!t) return false
  try {
    await t.verify()
    return true
  } catch {
    return false
  }
}

export function closeSmtp() {
  if (transporter) {
    transporter.close()
    transporter = null
  }
}

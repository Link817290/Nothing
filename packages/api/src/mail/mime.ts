// MIME construction
// Builds a full MIME email from NMP payload + content + attachments
// Uses @nothingmail/nmp generateMarkdown, generatePlainText

import { generateMarkdown, generatePlainText, NMP_ATTACHMENT_NAME, NMP_HEADERS } from '@nothingmail/nmp'
import type { NmpPayload } from '@nothingmail/nmp'
import type { MimeMessage } from './types.js'

/** Build a MimeMessage from NMP content + payload */
export function buildNmpMime(
  from: string,
  to: string,
  subject: string,
  content: string,
  payload: NmpPayload,
  attachments?: { filename: string; content: Buffer; contentType: string }[],
): MimeMessage {
  return {
    from,
    to,
    subject,
    plainText: generatePlainText(content, payload),
    nmpMarkdown: generateMarkdown(content, payload),
    jsonPayload: JSON.stringify(payload),
    attachments,
    headers: {
      [NMP_HEADERS.version]: String(payload.nmp),
      ...(payload.type && { [NMP_HEADERS.type]: payload.type }),
      ...(payload.project && { [NMP_HEADERS.project]: payload.project }),
      ...(payload.labels?.length && { [NMP_HEADERS.labels]: payload.labels.join(', ') }),
      ...(payload.priority && payload.priority !== 'normal' && { [NMP_HEADERS.priority]: payload.priority }),
      ...(payload.expires && { [NMP_HEADERS.expires]: payload.expires }),
      ...(payload.capabilities?.length && { [NMP_HEADERS.capabilities]: payload.capabilities.join(', ') }),
      ...(payload.require?.length && { [NMP_HEADERS.require]: payload.require.join(', ') }),
    },
  }
}

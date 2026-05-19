// Inbound mail processing
// RawEmail → detect NMP (X-NMP-Version header or nmp.md attachment) → parse → write to messages table
// Uses @nothing/nmp parseMarkdown, validatePayload

import { parseMarkdown, validatePayload, NMP_HEADERS, NMP_ATTACHMENT_NAME } from '@nothing/nmp'
import type { RawEmail } from './types.js'

/** Check if a raw email is an NMP message */
export function isNmpEmail(email: RawEmail): boolean {
  return (
    NMP_HEADERS.version in email.headers ||
    email.parts.some(p => p.filename === NMP_ATTACHMENT_NAME)
  )
}

// TODO: processInboundEmail(email: RawEmail) → NmpMessage | VirtualNmpMessage

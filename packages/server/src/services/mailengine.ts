/**
 * Mail Engine API proxy.
 * Communicates with the internal mail server management API at :8080.
 */

const MAIL_ENGINE_URL = process.env.MAIL_ADMIN_URL || 'http://mail:8080'
const MAIL_ENGINE_AUTH = process.env.MAIL_ADMIN_AUTH || ''

async function engineRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (MAIL_ENGINE_AUTH) headers['Authorization'] = MAIL_ENGINE_AUTH

  const res = await fetch(`${MAIL_ENGINE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Mail engine error (${res.status}): ${text}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return {} as T
}

// ─── Domains ───────────────────────────────────────────────────

export async function listDomains(): Promise<any[]> {
  return engineRequest<any[]>('GET', '/api/domain')
}

export async function createDomain(name: string): Promise<void> {
  await engineRequest('POST', `/api/domain/${encodeURIComponent(name)}`)
}

export async function deleteDomain(name: string): Promise<void> {
  await engineRequest('DELETE', `/api/domain/${encodeURIComponent(name)}`)
}

export async function getDomainDnsRecords(name: string): Promise<any> {
  return engineRequest('GET', `/api/domain/${encodeURIComponent(name)}/dns`)
}

// ─── Mailboxes ─────────────────────────────────────────────────

export async function listMailboxes(): Promise<any[]> {
  return engineRequest<any[]>('GET', '/api/principal')
}

export async function createMailbox(account: {
  name: string
  type: string
  secrets: string[]
  emails: string[]
  description?: string
}): Promise<void> {
  await engineRequest('POST', '/api/principal', account)
}

export async function getMailbox(name: string): Promise<any> {
  return engineRequest('GET', `/api/principal/${encodeURIComponent(name)}`)
}

export async function deleteMailbox(name: string): Promise<void> {
  await engineRequest('DELETE', `/api/principal/${encodeURIComponent(name)}`)
}

// ─── DNS Verification ──────────────────────────────────────────

export async function verifyDomainDns(domain: string): Promise<{
  mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean; records: any
}> {
  const dns = await getDomainDnsRecords(domain)
  return {
    mx: !!dns?.mx, spf: !!dns?.spf,
    dkim: !!dns?.dkim, dmarc: !!dns?.dmarc,
    records: dns,
  }
}

// ─── Health ────────────────────────────────────────────────────

export async function mailEngineHealthy(): Promise<boolean> {
  try {
    await fetch(`${MAIL_ENGINE_URL}/healthz`, { signal: AbortSignal.timeout(3000) })
    return true
  } catch {
    return false
  }
}

/**
 * Stalwart Mail Engine integration via REST API.
 * Uses /api/principal for user management (official Stalwart API).
 * Uses /api/settings for domain/config management.
 * JMAP only for domain DNS zone file retrieval.
 */

import { createHash } from 'crypto'

const MAIL_URL = process.env.MAIL_ADMIN_URL || 'http://mail:8080'
const MAIL_USER = process.env.MAIL_ADMIN_USER || 'admin'
const MAIL_PASS = process.env.MAIL_ADMIN_PASS || 'changeme'

// ─── HTTP Helper ──────────────────────────────────────────────

const basicAuth = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64')

async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  const url = `${MAIL_URL}${path}`
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        redirect: 'follow',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
          ...opts.headers,
        },
      })
      return res
    } catch (err) {
      if (i === 2) throw err
      await new Promise(r => setTimeout(r, (i + 1) * 2000))
    }
  }
  throw new Error('api fetch exhausted')
}

async function apiJson(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await api(path, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Stalwart ${res.status}: ${text}`)
  }
  return res.json().catch(() => null)
}

/** Hash password with SHA-512 crypt (Stalwart expects this for secrets) */
function hashPassword(password: string): string {
  // Stalwart accepts plain text passwords prefixed with certain markers,
  // or SHA-512 hashed. For simplicity, send as plain — Stalwart hashes internally.
  return password
}

// ─── Health ───────────────────────────────────────────────────

export async function mailEngineHealthy(): Promise<boolean> {
  try {
    const res = await api('/.well-known/jmap', {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Domains ──────────────────────────────────────────────────

export async function listDomains(): Promise<any[]> {
  // Domains are stored as settings: lookup.default.domain.{name}
  // Use JMAP for domain management as REST settings API is complex
  const res = await api('/jmap/', {
    method: 'POST',
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
      methodCalls: [
        ['x:Domain/query', { filter: {} }, 'q1'],
        ['x:Domain/get', { '#ids': { resultOf: 'q1', name: 'x:Domain/query', path: '/ids' } }, 'g1'],
      ],
    }),
  })
  if (!res.ok) return []
  const data = await res.json()
  for (const [, result, id] of data?.methodResponses || []) {
    if (id === 'g1') return result?.list || []
  }
  return []
}

export async function createDomain(name: string): Promise<any> {
  const res = await api('/jmap/', {
    method: 'POST',
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
      methodCalls: [
        ['x:Domain/set', {
          create: {
            new1: {
              name,
              aliases: {},
              certificateManagement: { '@type': 'Manual' },
              dkimManagement: { '@type': 'Automatic' },
              dnsManagement: { '@type': 'Manual' },
              subAddressing: { '@type': 'Enabled' },
              isEnabled: true,
            },
          },
        }, 'c1'],
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to create domain: ${text}`)
  }
  const data = await res.json()
  for (const [, result, id] of data?.methodResponses || []) {
    if (id === 'c1') {
      if (result?.notCreated) {
        const err = Object.values(result.notCreated)[0] as any
        throw new Error(err?.description || 'Failed to create domain')
      }
      return result
    }
  }
  return null
}

export async function deleteDomain(name: string): Promise<void> {
  const domains = await listDomains()
  const domain = domains.find((d: any) => d.name === name)
  if (!domain) throw new Error('Domain not found')

  await api('/jmap/', {
    method: 'POST',
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
      methodCalls: [['x:Domain/set', { destroy: [domain.id] }, 'd1']],
    }),
  })
}

export async function getDomain(name: string): Promise<any> {
  const domains = await listDomains()
  return domains.find((d: any) => d.name === name) || null
}

// ─── DNS Records ──────────────────────────────────────────────

export async function getDomainDnsRecords(domain: string, serverIp?: string): Promise<{
  mx: { type: string; host: string; value: string; priority: number };
  spf: { type: string; host: string; value: string };
  dkim: { type: string; host: string; value: string } | null;
  dmarc: { type: string; host: string; value: string };
  records: { type: string; host: string; value: string; priority?: number }[];
}> {
  const ip = serverIp || process.env.SERVER_IP || 'YOUR_SERVER_IP'

  const dkimRecords: { type: string; host: string; value: string }[] = []
  try {
    const domainObj = await getDomain(domain)
    if (domainObj?.dnsZoneFile) {
      const zoneFile = domainObj.dnsZoneFile as string
      const dkimRegex = /([a-z0-9-]+\._domainkey\.[^\s]+)\.\s+IN\s+TXT\s+"([^"]+)"/g
      let match
      while ((match = dkimRegex.exec(zoneFile)) !== null) {
        dkimRecords.push({ type: 'TXT', host: match[1], value: match[2] })
      }
    }
  } catch {}

  const mx = { type: 'MX', host: domain, value: `mail.${domain}`, priority: 10 }
  const spf = { type: 'TXT', host: domain, value: `v=spf1 ip4:${ip} mx -all` }
  const dmarc = { type: 'TXT', host: `_dmarc.${domain}`, value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}` }

  const records: { type: string; host: string; value: string; priority?: number }[] = [
    { type: 'A', host: `mail.${domain}`, value: ip },
    mx, spf, dmarc, ...dkimRecords,
  ]

  return { mx, spf, dkim: dkimRecords[0] || null, dmarc, records }
}

export async function verifyDomainDns(domain: string): Promise<{
  mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean;
  required: { type: string; host: string; value: string; priority?: number }[];
}> {
  const { records } = await getDomainDnsRecords(domain)
  let mx = false, spf = false, dkim = false, dmarc = false

  try {
    const { resolve } = await import('dns/promises')

    try {
      const mxRecords = await resolve(domain, 'MX')
      mx = mxRecords.length > 0
    } catch {}

    try {
      const txtRecords = await resolve(domain, 'TXT')
      const flat = txtRecords.map(r => r.join(''))
      spf = flat.some(r => r.includes('v=spf1'))
    } catch {}

    try {
      const dmarcRecords = await resolve(`_dmarc.${domain}`, 'TXT')
      dmarc = dmarcRecords.flat().some(r => r.includes('v=DMARC1'))
    } catch {}

    try {
      const domainObj = await getDomain(domain)
      const zoneFile = domainObj?.dnsZoneFile || ''
      const selectorMatches = zoneFile.match(/([a-z0-9-]+)\._domainkey/g) || []
      for (const match of selectorMatches) {
        const selector = match.replace('._domainkey', '')
        try {
          const dkimRecords = await resolve(`${selector}._domainkey.${domain}`, 'TXT')
          if (dkimRecords.flat().some(r => r.includes('v=DKIM1') || r.includes('p='))) {
            dkim = true
            break
          }
        } catch {}
      }
    } catch {}
  } catch {}

  return { mx, spf, dkim, dmarc, required: records }
}

// ─── Mailboxes (REST API) ─────────────────────────────────────

export async function listMailboxes(): Promise<any[]> {
  const data = await apiJson('/api/principal?types=individual&limit=100')
  return data?.items || []
}

export async function createMailbox(account: {
  name: string
  type: string
  secrets: string[]
  emails: string[]
  description?: string
}): Promise<{ id: string; email: string }> {
  // Single REST call — creates user with password in one step
  const res = await api('/api/principal', {
    method: 'POST',
    body: JSON.stringify({
      type: 'individual',
      name: account.name,
      description: account.description || account.name,
      secrets: account.secrets.map(s => hashPassword(s)),
      emails: account.emails,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const detail = data?.detail || data?.title || `HTTP ${res.status}`
    throw new Error(`Failed to create mailbox: ${detail}`)
  }

  const email = account.emails[0] || `${account.name}@unknown`
  return { id: account.name, email }
}

export async function getMailbox(name: string): Promise<any> {
  try {
    return await apiJson(`/api/principal/${encodeURIComponent(name)}`)
  } catch {
    return null
  }
}

export async function deleteMailbox(name: string): Promise<void> {
  const res = await api(`/api/principal/${encodeURIComponent(name)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error('Failed to delete mailbox')
  }
}

// ─── Aliases ──────────────────────────────────────────────────

export async function addAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const emails = [...(mailbox.emails || []), alias]
  await api(`/api/principal/${encodeURIComponent(mailboxName)}`, {
    method: 'PATCH',
    body: JSON.stringify({ emails }),
  })
}

export async function removeAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const emails = (mailbox.emails || []).filter((e: string) => e !== alias)
  await api(`/api/principal/${encodeURIComponent(mailboxName)}`, {
    method: 'PATCH',
    body: JSON.stringify({ emails }),
  })
}

// ─── Quota ────────────────────────────────────────────────────

export async function setMailboxQuota(mailboxName: string, quotaBytes: number): Promise<void> {
  await api(`/api/principal/${encodeURIComponent(mailboxName)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quota: quotaBytes }),
  })
}

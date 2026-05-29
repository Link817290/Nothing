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

// ─── JMAP Helper ─────────────────────────────────────────────

const ADMIN_USING = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap']

async function jmapCall(methodCalls: any[], using?: string[]): Promise<any> {
  const res = await api('/jmap/', {
    method: 'POST',
    body: JSON.stringify({ using: using || ADMIN_USING, methodCalls }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Stalwart JMAP error (${res.status}): ${text}`)
  }
  return res.json()
}

function getMethodResult(response: any, callId: string): any {
  if (!response?.methodResponses) return null
  for (const [, result, id] of response.methodResponses) {
    if (id === callId) return result
  }
  return null
}

let cachedAccountId: string | null = null
async function getAccountId(): Promise<string> {
  if (cachedAccountId) return cachedAccountId
  const res = await api('/.well-known/jmap')
  if (!res.ok) throw new Error('Failed to get JMAP session')
  const session = await res.json()
  const id = session.primaryAccounts?.['urn:stalwart:jmap']
    || Object.keys(session.accounts || {})[0]
  if (!id) throw new Error('No account found in JMAP session')
  cachedAccountId = id
  return id
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

// ─── Mailboxes (JMAP) ─────────────────────────────────────────

export async function listMailboxes(): Promise<any[]> {
  const accountId = await getAccountId()
  const res = await jmapCall([
    ['Principal/query', { accountId }, 'q1'],
    ['Principal/get', { accountId, '#ids': { resultOf: 'q1', name: 'Principal/query', path: '/ids' } }, 'g1'],
  ], ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:principals'])
  const result = getMethodResult(res, 'g1')
  return (result?.list || []).filter((p: any) => p.type === 'individual' || p.emails?.length > 0)
}

export async function createMailbox(account: {
  name: string
  type: string
  secrets: string[]
  emails: string[]
  description?: string
}): Promise<{ id: string; email: string }> {
  const adminAccountId = await getAccountId()
  const domains = await listDomains()
  const email = account.emails[0] || ''
  const domainName = email.split('@')[1]
  const domain = domains.find((d: any) => d.name === domainName)
  if (!domain?.id) throw new Error(`Domain "${domainName}" not found in Stalwart`)

  // Step 1: Create user
  const createRes = await jmapCall([
    ['x:Account/set', {
      accountId: adminAccountId,
      create: {
        new1: { '@type': 'User', name: account.name, domainId: domain.id, description: account.description || null },
      },
    }, 'c1'],
  ])
  const createResult = getMethodResult(createRes, 'c1')
  if (createResult?.notCreated) {
    const err = Object.values(createResult.notCreated)[0] as any
    throw new Error(err?.description || 'Failed to create mailbox')
  }
  const newId = createResult?.created?.new1?.id
  if (!newId) throw new Error('Failed to get new account ID')

  // Step 2: Set password
  const password = account.secrets[0]
  if (password) {
    const pwRes = await jmapCall([
      ['x:Account/set', {
        accountId: adminAccountId,
        update: { [newId]: { credentials: { '0': { '@type': 'Password', secret: password } } } },
      }, 'p1'],
    ])
    const pwResult = getMethodResult(pwRes, 'p1')
    if (pwResult?.notUpdated) {
      const err = Object.values(pwResult.notUpdated)[0] as any
      throw new Error(`Password rejected by mail server: ${err?.description || 'unknown error'}`)
    }
  }

  return { id: newId, email: `${account.name}@${domainName}` }
}

export async function getMailbox(name: string): Promise<any> {
  const mailboxes = await listMailboxes()
  return mailboxes.find((m: any) => m.name === name) || null
}

export async function deleteMailbox(name: string): Promise<void> {
  const mailbox = await getMailbox(name)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  await jmapCall([
    ['x:Account/set', { accountId, destroy: [mailbox.id] }, 'd1'],
  ])
}

// ─── Aliases ──────────────────────────────────────────────────

export async function addAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  const emails = [...(mailbox.emails || []), alias]
  await jmapCall([
    ['x:Account/set', { accountId, update: { [mailbox.id]: { emails } } }, 'u1'],
  ])
}

export async function removeAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  const emails = (mailbox.emails || []).filter((e: string) => e !== alias)
  await jmapCall([
    ['x:Account/set', { accountId, update: { [mailbox.id]: { emails } } }, 'u1'],
  ])
}

// ─── Quota ────────────────────────────────────────────────────

export async function setMailboxQuota(mailboxName: string, quotaBytes: number): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  await jmapCall([
    ['x:Account/set', { accountId, update: { [mailbox.id]: { quota: quotaBytes } } }, 'u1'],
  ])
}

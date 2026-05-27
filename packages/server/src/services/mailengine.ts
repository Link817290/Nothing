/**
 * Stalwart Mail Engine integration via JMAP management API.
 * Stalwart uses JMAP-style method calls on POST /api
 */

// Stalwart in normal mode uses HTTPS with self-signed cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const MAIL_URL = process.env.MAIL_ADMIN_URL || 'https://mail:443'
const MAIL_USER = process.env.MAIL_ADMIN_USER || 'admin'
const MAIL_PASS = process.env.MAIL_ADMIN_PASS || 'changeme'

const USING = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap']

async function jmapCall(methodCalls: any[]): Promise<any> {
  const auth = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64')
  const res = await fetch(`${MAIL_URL}/jmap/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({ using: USING, methodCalls }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Stalwart error (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data
}

function getMethodResult(response: any, callId: string): any {
  if (!response?.methodResponses) return null
  for (const [, result, id] of response.methodResponses) {
    if (id === callId) return result
  }
  return null
}

// ─── Domains ───────────────────────────────────────────────────

export async function listDomains(): Promise<any[]> {
  const res = await jmapCall([
    ['x:Domain/query', { filter: {} }, 'q1'],
    ['x:Domain/get', { '#ids': { resultOf: 'q1', name: 'x:Domain/query', path: '/ids' } }, 'g1'],
  ])
  const result = getMethodResult(res, 'g1')
  return result?.list || []
}

export async function createDomain(name: string): Promise<any> {
  const res = await jmapCall([
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
  ])
  const result = getMethodResult(res, 'c1')
  if (result?.notCreated) {
    const err = Object.values(result.notCreated)[0] as any
    throw new Error(err?.description || 'Failed to create domain')
  }
  return result
}

export async function deleteDomain(name: string): Promise<void> {
  // First get the domain ID
  const domains = await listDomains()
  const domain = domains.find((d: any) => d.name === name)
  if (!domain) throw new Error('Domain not found')

  await jmapCall([
    ['x:Domain/set', { destroy: [domain.id] }, 'd1'],
  ])
}

export async function getDomain(name: string): Promise<any> {
  const domains = await listDomains()
  return domains.find((d: any) => d.name === name) || null
}

/**
 * Get DNS records that need to be configured for a domain.
 * Returns the records the user needs to add to their DNS provider.
 */
export async function getDomainDnsRecords(domain: string, serverIp?: string): Promise<{
  mx: { type: string; host: string; value: string; priority: number };
  spf: { type: string; host: string; value: string };
  dkim: { type: string; host: string; value: string } | null;
  dmarc: { type: string; host: string; value: string };
  records: { type: string; host: string; value: string; priority?: number }[];
}> {
  const ip = serverIp || process.env.SERVER_IP || 'YOUR_SERVER_IP'

  // Parse DKIM records from Stalwart's dnsZoneFile
  const dkimRecords: { type: string; host: string; value: string }[] = []
  try {
    const domainObj = await getDomain(domain)
    if (domainObj?.dnsZoneFile) {
      const zoneFile = domainObj.dnsZoneFile as string
      // Match DKIM TXT records: selector._domainkey.domain. IN TXT "v=DKIM1; ..."
      const dkimRegex = /([a-z0-9-]+\._domainkey\.[^\s]+)\.\s+IN\s+TXT\s+"([^"]+)"/g
      let match
      while ((match = dkimRegex.exec(zoneFile)) !== null) {
        dkimRecords.push({
          type: 'TXT',
          host: match[1],
          value: match[2],
        })
      }
    }
  } catch {}

  const mx = { type: 'MX', host: domain, value: `mail.${domain}`, priority: 10 }
  const spf = { type: 'TXT', host: domain, value: `v=spf1 ip4:${ip} mx -all` }
  const dmarc = { type: 'TXT', host: `_dmarc.${domain}`, value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}` }

  const records: { type: string; host: string; value: string; priority?: number }[] = [
    { type: 'A', host: `mail.${domain}`, value: ip },
    mx,
    spf,
    dmarc,
    ...dkimRecords,
  ]

  return { mx, spf, dkim: dkimRecords[0] || null, dmarc, records }
}

/**
 * Verify DNS records for a domain by checking actual DNS.
 */
export async function verifyDomainDns(domain: string): Promise<{
  mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean;
  required: { type: string; host: string; value: string; priority?: number }[];
}> {
  const { records } = await getDomainDnsRecords(domain)

  // Simple verification — try to resolve records
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
      dmarc = false // checked separately
    } catch {}

    try {
      const dmarcRecords = await resolve(`_dmarc.${domain}`, 'TXT')
      dmarc = dmarcRecords.flat().some(r => r.includes('v=DMARC1'))
    } catch {}

    // Check DKIM — try to get actual selectors from Stalwart domain config
    try {
      const domainObj = await getDomain(domain)
      const dkimMgmt = domainObj?.dkimManagement
      if (dkimMgmt?.selectorTemplate) {
        // Try common selector patterns from Stalwart
        const selectors = [`v1-ed25519-*`, `v1-rsa-*`]
        // Check dnsZoneFile for actual selector names
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
      }
      if (!dkim) {
        // Fallback: try default selector
        const dkimRecords = await resolve(`default._domainkey.${domain}`, 'TXT')
        dkim = dkimRecords.flat().some(r => r.includes('v=DKIM1') || r.includes('p='))
      }
    } catch {}
  } catch {}

  return { mx, spf, dkim, dmarc, required: records }
}

// ─── Mailboxes ─────────────────────────────────────────────────

export async function listMailboxes(): Promise<any[]> {
  const res = await jmapCall([
    ['x:Principal/query', { filter: { type: 'individual' } }, 'q1'],
    ['x:Principal/get', { '#ids': { resultOf: 'q1', name: 'x:Principal/query', path: '/ids' } }, 'g1'],
  ])
  const result = getMethodResult(res, 'g1')
  return result?.list || []
}

export async function createMailbox(account: {
  name: string
  type: string
  secrets: string[]
  emails: string[]
  description?: string
}): Promise<void> {
  const res = await jmapCall([
    ['x:Principal/set', {
      create: {
        new1: {
          name: account.name,
          type: account.type || 'individual',
          secrets: account.secrets,
          emails: account.emails,
          description: account.description || '',
        },
      },
    }, 'c1'],
  ])
  const result = getMethodResult(res, 'c1')
  if (result?.notCreated) {
    const err = Object.values(result.notCreated)[0] as any
    throw new Error(err?.description || 'Failed to create mailbox')
  }
}

export async function getMailbox(name: string): Promise<any> {
  const mailboxes = await listMailboxes()
  return mailboxes.find((m: any) => m.name === name) || null
}

export async function deleteMailbox(name: string): Promise<void> {
  const mailbox = await getMailbox(name)
  if (!mailbox) throw new Error('Mailbox not found')

  await jmapCall([
    ['x:Principal/set', { destroy: [mailbox.id] }, 'd1'],
  ])
}

// ─── Aliases ───────────────────────────────────────────────────

export async function addAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')

  const emails = [...(mailbox.emails || []), alias]
  await jmapCall([
    ['x:Principal/set', {
      update: { [mailbox.id]: { emails } },
    }, 'u1'],
  ])
}

export async function removeAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')

  const emails = (mailbox.emails || []).filter((e: string) => e !== alias)
  await jmapCall([
    ['x:Principal/set', {
      update: { [mailbox.id]: { emails } },
    }, 'u1'],
  ])
}

// ─── Quota ─────────────────────────────────────────────────────

export async function setMailboxQuota(mailboxName: string, quotaBytes: number): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')

  await jmapCall([
    ['x:Principal/set', {
      update: { [mailbox.id]: { quota: quotaBytes } },
    }, 'u1'],
  ])
}

// ─── Health ────────────────────────────────────────────────────

export async function mailEngineHealthy(): Promise<boolean> {
  try {
    // Try a simple JMAP call to check connectivity
    const auth = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64')
    const res = await fetch(`${MAIL_URL}/.well-known/jmap`, {
      // @ts-ignore
      rejectUnauthorized: false,
      signal: AbortSignal.timeout(5000),
      headers: { 'Authorization': `Basic ${auth}` },
    })
    return res.ok
  } catch {
    return false
  }
}

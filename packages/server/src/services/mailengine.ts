/**
 * Stalwart Mail Engine integration via JMAP management API.
 * Stalwart uses JMAP-style method calls on POST /api
 */

// Stalwart in normal mode uses HTTPS with self-signed cert
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const MAIL_URL = process.env.MAIL_ADMIN_URL || 'https://mail:443'
const MAIL_USER = process.env.MAIL_ADMIN_USER || 'admin'
const MAIL_PASS = process.env.MAIL_ADMIN_PASS || 'changeme'

const ADMIN_USING = ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap']
const PRINCIPAL_USING = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:principals']

/** Follow redirects manually, rewriting hostname back to MAIL_URL */
async function mailFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...init, redirect: 'manual' })
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (location) {
      // Rewrite redirect URL to use our MAIL_URL base (Stalwart may use container hostname)
      const redirectPath = new URL(location).pathname + new URL(location).search
      return fetch(`${MAIL_URL}${redirectPath}`, { ...init, redirect: 'follow' })
    }
  }
  return res
}

async function jmapCall(methodCalls: any[], using?: string[]): Promise<any> {
  const auth = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64')
  const res = await mailFetch(`${MAIL_URL}/jmap/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({ using: using || ADMIN_USING, methodCalls }),
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

/** Get admin accountId from JMAP session */
let cachedAccountId: string | null = null
async function getAccountId(): Promise<string> {
  if (cachedAccountId) return cachedAccountId
  const auth = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64')
  const res = await mailFetch(`${MAIL_URL}/.well-known/jmap`, {
    headers: { 'Authorization': `Basic ${auth}` },
  })
  if (!res.ok) throw new Error('Failed to get JMAP session')
  const session = await res.json()
  // Get primary account for principals
  const principalAccountId = session.primaryAccounts?.['urn:ietf:params:jmap:principals']
    || session.primaryAccounts?.['urn:stalwart:jmap']
    || Object.keys(session.accounts || {})[0]
  if (!principalAccountId) throw new Error('No account found in JMAP session')
  cachedAccountId = principalAccountId
  return principalAccountId
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
  const accountId = await getAccountId()
  const res = await jmapCall([
    ['Principal/query', { accountId }, 'q1'],
    ['Principal/get', { accountId, '#ids': { resultOf: 'q1', name: 'Principal/query', path: '/ids' } }, 'g1'],
  ], PRINCIPAL_USING)
  const result = getMethodResult(res, 'g1')
  const list = result?.list || []
  // Filter to individual accounts (exclude admin, groups, etc.)
  return list.filter((p: any) => p.type === 'individual' || p.emails?.length > 0)
}

export async function createMailbox(account: {
  name: string
  type: string
  secrets: string[]
  emails: string[]
  description?: string
}): Promise<{ id: string; email: string }> {
  const adminAccountId = await getAccountId()
  // Resolve domain ID
  const domains = await listDomains()
  const email = account.emails[0] || ''
  const domainName = email.split('@')[1]
  const domain = domains.find((d: any) => d.name === domainName)
  const domainId = domain?.id || ''
  if (!domainId) throw new Error(`Domain "${domainName}" not found in Stalwart`)

  // Step 1: Create user
  const createRes = await jmapCall([
    ['x:Account/set', {
      accountId: adminAccountId,
      create: {
        new1: {
          '@type': 'User',
          name: account.name,
          domainId,
          description: account.description || null,
        },
      },
    }, 'c1'],
  ], ADMIN_USING)

  const createResult = getMethodResult(createRes, 'c1')
  if (createResult?.notCreated) {
    const err = Object.values(createResult.notCreated)[0] as any
    throw new Error(err?.description || 'Failed to create mailbox')
  }
  const newId = createResult?.created?.new1?.id
  if (!newId) throw new Error('Failed to get new account ID')

  // Step 2: Set password via x:Account/set update with credentials object map
  const password = account.secrets[0]
  if (password) {
    const pwRes = await jmapCall([
      ['x:Account/set', {
        accountId: adminAccountId,
        update: {
          [newId]: {
            credentials: { '0': { '@type': 'Password', secret: password } },
          },
        },
      }, 'p1'],
    ], ADMIN_USING)

    const pwResult = getMethodResult(pwRes, 'p1')
    if (pwResult?.notUpdated) {
      const err = Object.values(pwResult.notUpdated)[0] as any
      console.warn(`[mail] Password set failed for ${account.name}: ${err?.description}`)
    }
  }

  const mailEmail = `${account.name}@${domainName}`
  return { id: newId, email: mailEmail }
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
  ], ADMIN_USING)
}

// ─── Aliases ───────────────────────────────────────────────────

export async function addAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  const emails = [...(mailbox.emails || []), alias]
  await jmapCall([
    ['x:Account/set', { accountId, update: { [mailbox.id]: { emails } } }, 'u1'],
  ], ADMIN_USING)
}

export async function removeAlias(mailboxName: string, alias: string): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  const emails = (mailbox.emails || []).filter((e: string) => e !== alias)
  await jmapCall([
    ['x:Account/set', { accountId, update: { [mailbox.id]: { emails } } }, 'u1'],
  ], ADMIN_USING)
}

// ─── Quota ─────────────────────────────────────────────────────

export async function setMailboxQuota(mailboxName: string, quotaBytes: number): Promise<void> {
  const mailbox = await getMailbox(mailboxName)
  if (!mailbox) throw new Error('Mailbox not found')
  const accountId = await getAccountId()
  await jmapCall([
    ['x:Account/set', { accountId, update: { [mailbox.id]: { quota: quotaBytes } } }, 'u1'],
  ], ADMIN_USING)
}

// ─── Health ────────────────────────────────────────────────────

export async function mailEngineHealthy(): Promise<boolean> {
  try {
    // Try a simple JMAP call to check connectivity
    const auth = Buffer.from(`${MAIL_USER}:${MAIL_PASS}`).toString('base64')
    const res = await mailFetch(`${MAIL_URL}/.well-known/jmap`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Authorization': `Basic ${auth}` },
    })
    return res.ok
  } catch {
    return false
  }
}

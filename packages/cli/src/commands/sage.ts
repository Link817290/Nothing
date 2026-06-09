import { loadConfig } from '../config.js'
import { NothingClient } from '../client.js'

function getClient() {
  const config = loadConfig()
  if (!config.initialized || !config.server_url || !config.token) {
    console.log('  Not initialized. Run "nothing init" first.')
    return null
  }
  return new NothingClient({ serverUrl: config.server_url, token: config.token })
}

export async function sageList(opts?: { favorited?: boolean; keyword?: string }) {
  const client = getClient()
  if (!client) return

  try {
    const result = await client.listSages({
      favorited: opts?.favorited,
      keyword: opts?.keyword,
    })

    if (result.sages.length === 0) {
      console.log('\n  No sages found.\n')
      return
    }

    console.log()
    for (const s of result.sages) {
      const fav = s.favorited ? '★' : '○'
      const pub = s.public ? '🌐' : ''
      console.log(`  ${fav} ${s.name}${s.version ? ' v' + s.version : ''} [${s.id}] ${pub}`)
      if (s.description) console.log(`    ${s.description}`)
      if (s.keywords?.length) console.log(`    Keywords: ${s.keywords.join(', ')}`)
      if (s.author_email) console.log(`    Expert: ${s.author_email}`)
      console.log()
    }
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

export async function sageSearch(keyword: string) {
  const client = getClient()
  if (!client) return

  try {
    const result = await client.searchSages(keyword)

    if (result.sages.length === 0) {
      console.log(`\n  No sages matching "${keyword}".\n`)
      return
    }

    console.log()
    for (const s of result.sages) {
      const fav = s.favorited ? '★' : '○'
      console.log(`  ${fav} ${s.name} [${s.id}]`)
      if (s.description) console.log(`    ${s.description}`)
      if (s.author_email) console.log(`    Expert: ${s.author_email}`)
      console.log()
    }
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

export async function sageFavorite(id: string, favorite: boolean) {
  const client = getClient()
  if (!client) return

  try {
    if (favorite) {
      await client.favoriteSage(id)
      console.log(`  ★ Favorited ${id}`)
    } else {
      await client.unfavoriteSage(id)
      console.log(`  ○ Unfavorited ${id}`)
    }
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

export async function sagePublish(id: string, isPublic: boolean, opts?: { yes?: boolean }) {
  const client = getClient()
  if (!client) return

  if (isPublic && !opts?.yes) {
    const { confirm } = await import('@inquirer/prompts')
    const ok = await confirm({ message: `Publish sage "${id}" to your public profile?`, default: false })
    if (!ok) { console.log('  Cancelled.'); return }
  }

  try {
    await client.publishSage(id, isPublic)
    console.log(isPublic ? `  🌐 Published ${id}` : `  🔒 Unpublished ${id}`)
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

export async function sageBrowse(username: string) {
  const client = getClient()
  if (!client) return

  try {
    const result = await client.browseUserSages(username)

    if (result.sages.length === 0) {
      console.log(`\n  ${username} has no public sages.\n`)
      return
    }

    console.log(`\n  ${username}'s sages:\n`)
    for (const s of result.sages) {
      console.log(`  🌐 ${s.name}${s.version ? ' v' + s.version : ''} [${s.id}]`)
      if (s.description) console.log(`    ${s.description}`)
      if (s.keywords?.length) console.log(`    Keywords: ${s.keywords.join(', ')}`)
      console.log()
    }
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

/**
 * Create a sage — supports both interactive (agent-guided) and non-interactive modes.
 *
 * Non-interactive: nothing sage create --name "PR Review" --description "..." --keywords "review,PR" [--public]
 * Interactive (via agent): nothing sage create --name "PR Review"
 *   → agent sees the output hints and fills in the rest
 */
export async function sageCreate(opts: {
  name: string
  description?: string
  keywords?: string
  version?: string
  requestHint?: string
  deliveryFormat?: string
  deliveryHints?: string
  public?: boolean
  yes?: boolean
}) {
  const client = getClient()
  if (!client) return

  // Build sage_json with all protocol fields
  const keywords = opts.keywords?.split(',').map(k => k.trim()).filter(Boolean) || []
  const deliveryHints = opts.deliveryHints?.split(',').map(h => h.trim()).filter(Boolean) || []

  const sageJson: Record<string, any> = {
    name: opts.name,
    description: opts.description || '',
    version: opts.version || '1.0',
    keywords,
    request_hint: opts.requestHint || '',
    delivery_format: opts.deliveryFormat || '',
    delivery_hints: deliveryHints,
  }

  // Validate completeness — if fields are missing, print hints for agent to fill
  const missing: string[] = []
  if (!opts.description) missing.push('description — what does this sage do?')
  if (!keywords.length) missing.push('keywords — what triggers this sage? (comma-separated)')
  if (!opts.requestHint) missing.push('request_hint — what should the requester provide?')
  if (!opts.deliveryFormat) missing.push('delivery_format — what format is the result? (e.g., markdown, JSON, file)')
  if (!opts.deliveryHints) missing.push('delivery_hints — quality criteria for the delivery (comma-separated)')

  if (missing.length > 0) {
    console.log('\n  ⚠ Sage protocol is incomplete. Fill these to help requesters:\n')
    for (const m of missing) {
      console.log(`    --${m.split(' — ')[0].replace(/_/g, '-')} "${m.split(' — ')[1] || '...'}"`)
    }
    console.log('\n  Tip: your agent can fill these for you. Just describe what you do.\n')

    // Still create with what we have — agent can update later
    if (!opts.description) {
      console.log('  Creating with partial info...\n')
    }
  }

  // Confirm before publishing
  let shouldPublish = opts.public || false
  if (shouldPublish && !opts.yes) {
    const { confirm } = await import('@inquirer/prompts')
    const ok = await confirm({ message: `Publish "${opts.name}" to your public profile?`, default: false })
    if (!ok) shouldPublish = false
  }

  try {
    const result = await client.createSage({
      name: opts.name,
      description: opts.description,
      version: opts.version,
      keywords,
      sage_json: sageJson,
      public: shouldPublish,
    })
    console.log(`  ✓ Sage created: ${result.sage_id}`)
    if (shouldPublish) console.log(`  🌐 Published to your profile`)
    if (missing.length > 0) {
      console.log(`\n  Update with: nothing sage update ${result.sage_id} --description "..." --keywords "..."`)
    }
    console.log()
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

export async function sageUse(id: string, text: string, opts?: { file?: string[]; replyTo?: string }) {
  const client = getClient()
  if (!client) return

  // Find sage — try own first, then public
  let sage: any = null
  try {
    const result = await client.listSages({})
    sage = result.sages?.find((s: any) => s.id === id)
  } catch {}
  if (!sage) {
    try { sage = await client.getPublicSage(id) } catch {}
  }

  if (!sage) {
    console.log(`  ✗ Sage "${id}" not found.`)
    return
  }

  if (!sage.author_email) {
    console.log(`  ✗ Sage has no expert email. Can't send request.`)
    return
  }

  // Read files and encode as base64
  let attachments: { filename: string; content: string; content_type?: string }[] | undefined
  if (opts?.file?.length) {
    const { readFileSync, existsSync } = await import('fs')
    const { basename } = await import('path')
    attachments = []
    for (const filePath of opts.file) {
      if (!existsSync(filePath)) {
        console.log(`  ✗ File not found: ${filePath}`)
        return
      }
      attachments.push({
        filename: basename(filePath),
        content: readFileSync(filePath).toString('base64'),
      })
    }
  }

  const sj = typeof sage.sage_json === 'string' ? JSON.parse(sage.sage_json) : (sage.sage_json || {})

  console.log(`\n  🧙 ${sage.name}`)
  console.log(`  → ${sage.author_email}`)
  if (sj.request_hint) console.log(`  📋 ${sj.request_hint}`)
  console.log()

  try {
    let result: any
    if (opts?.replyTo) {
      // Continue in existing thread
      result = await client.reply(opts.replyTo, { text, attachments })
      console.log(`  ✓ Request sent in thread (reply to ${opts.replyTo})`)
    } else {
      // New thread
      result = await client.send({
        to: sage.author_email,
        text,
        type: 'nmp:task',
        sage_id: id,
        subject: `Sage: ${sage.name}`,
        labels: ['sage', ...(sage.keywords || [])],
        attachments,
      })
      console.log(`  ✓ Request sent to ${sage.author_email}`)
    }
    console.log(`  Message-ID: ${result.message_id}`)
    if (attachments?.length) console.log(`  Attachments: ${attachments.map(a => a.filename).join(', ')}`)
    console.log()
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

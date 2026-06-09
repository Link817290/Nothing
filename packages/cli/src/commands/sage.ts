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

export async function sagePublish(id: string, isPublic: boolean) {
  const client = getClient()
  if (!client) return

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

  try {
    const result = await client.createSage({
      name: opts.name,
      description: opts.description,
      version: opts.version,
      keywords,
      sage_json: sageJson,
      public: opts.public,
    })
    console.log(`  ✓ Sage created: ${result.sage_id}`)
    if (opts.public) console.log(`  🌐 Published to your profile`)
    if (missing.length > 0) {
      console.log(`\n  Update with: nothing sage update ${result.sage_id} --description "..." --keywords "..."`)
    }
    console.log()
  } catch (err: any) {
    console.log(`  ✗ ${err.message}`)
  }
}

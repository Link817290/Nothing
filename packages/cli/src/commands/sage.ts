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

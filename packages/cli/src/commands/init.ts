import { input } from '@inquirer/prompts'
import { loadConfig, saveConfig, paths } from '../config.js'

export async function init() {
  console.log('\n  Welcome to Nothing\n')

  const config = loadConfig()

  if (config.initialized) {
    console.log(`  Already connected: ${config.email || '-'}`)
    console.log(`  Server: ${config.server_url}`)
    console.log(`  Run "nothing reset" to start over.\n`)
    return
  }

  const serverUrl = await input({
    message: 'Server URL',
    default: 'http://localhost:3000',
  })

  const apiKey = await input({
    message: 'API Key',
  })

  if (!apiKey.trim()) {
    console.log('  ✗ API Key is required.\n')
    return
  }

  // Verify connection
  console.log('\n  Verifying...')
  try {
    const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/me`, {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
    })

    if (!res.ok) {
      if (res.status === 401) {
        console.log('  ✗ Invalid API Key.\n')
      } else {
        console.log(`  ✗ Server error (HTTP ${res.status}).\n`)
      }
      return
    }

    const user = await res.json() as { email?: string; name?: string }

    saveConfig({
      server_url: serverUrl.replace(/\/$/, ''),
      token: apiKey.trim(),
      email: user.email,
      initialized: true,
    })

    console.log(`  ✓ Connected\n`)
    console.log(`  Email:  ${user.email || '-'}`)
    console.log(`  Server: ${serverUrl}`)
    console.log(`  Config: ${paths.config}`)
    console.log()
    console.log('  Next steps:')
    console.log('    nothing mcp:install       Configure MCP for Claude Code / Cursor')
    console.log('    nothing send <to> <text>  Send your first message')
    console.log('    nothing inbox             Check your inbox')
    console.log()
  } catch {
    console.log('  ✗ Cannot reach server. Make sure it\'s running.\n')
  }
}

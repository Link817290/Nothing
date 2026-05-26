import { input } from '@inquirer/prompts'
import { loadConfig, saveConfig, paths } from '../config.js'
import { mcpInstall } from './mcp-install.js'

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
    message: 'API Key (get it from your Web dashboard → Settings → API Keys)',
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

    console.log(`  ✓ Connected as ${user.email || '-'}\n`)

    // Auto-install MCP
    console.log('  Setting up MCP for your editors...\n')
    await mcpInstall()

    console.log('  All done! Your AI Agent can now send and receive emails.')
    console.log()
    console.log('  Try:')
    console.log('    nothing inbox             Check your inbox')
    console.log('    nothing send <to> <text>  Send a message')
    console.log()
  } catch {
    console.log('  ✗ Cannot reach server. Make sure it\'s running.\n')
  }
}

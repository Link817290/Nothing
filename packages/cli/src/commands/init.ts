import { input, select, password } from '@inquirer/prompts'
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
    default: 'https://nothingmail.shop',
  })

  const url = serverUrl.replace(/\/$/, '')

  // Check server reachable
  try {
    const res = await fetch(`${url}/health`)
    if (!res.ok) throw new Error()
  } catch {
    console.log('  ✗ Cannot reach server. Check the URL.\n')
    return
  }
  console.log('  ✓ Server connected\n')

  const mode = await select({
    message: 'Do you have an account?',
    choices: [
      { value: 'login', name: 'Yes — I have an API Key' },
      { value: 'register', name: 'No — Register a new account' },
    ],
  })

  if (mode === 'login') {
    await loginFlow(url)
  } else {
    await registerFlow(url)
  }
}

async function loginFlow(url: string) {
  const apiKey = await input({ message: 'API Key' })

  if (!apiKey.trim()) {
    console.log('  ✗ API Key is required.\n')
    return
  }

  console.log('\n  Verifying...')
  try {
    const res = await fetch(`${url}/api/me`, {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
    })

    if (!res.ok) {
      console.log(res.status === 401 ? '  ✗ Invalid API Key.\n' : `  ✗ Server error (${res.status}).\n`)
      return
    }

    const user = await res.json() as { email?: string; name?: string }
    saveConfig({ server_url: url, token: apiKey.trim(), email: user.email, initialized: true })
    await finishSetup(user.email)
  } catch {
    console.log('  ✗ Connection failed.\n')
  }
}

async function registerFlow(url: string) {
  const email = await input({ message: 'Email' })
  const pass = await password({ message: 'Password' })
  const name = await input({ message: 'Display name (optional)', default: '' })

  console.log('\n  Registering...')
  try {
    const res = await fetch(`${url}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, name: name || undefined }),
    })
    const data = await res.json() as any
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

    if (data.needs_verification) {
      // Verification code flow
      console.log(`  ✓ Verification code sent to ${email}\n`)
      const code = await input({ message: 'Verification code (6 digits)' })

      const verifyRes = await fetch(`${url}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() }),
      })
      const verifyData = await verifyRes.json() as any
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed')

      saveConfig({ server_url: url, token: verifyData.api_key, email: verifyData.user?.email || email, initialized: true })
      console.log(`  ✓ Account created\n`)
      if (verifyData.mailbox) console.log(`  Mailbox: ${verifyData.mailbox}`)
      console.log(`  API Key: ${verifyData.api_key}`)
      console.log('  (Save this key — you won\'t see it again)\n')
      await finishSetup(verifyData.user?.email || email)
    } else {
      // First user (admin) — no verification needed
      saveConfig({ server_url: url, token: data.api_key, email: data.user?.email || email, initialized: true })
      console.log(`  ✓ Admin account created\n`)
      if (data.mailbox) console.log(`  Mailbox: ${data.mailbox}`)
      console.log(`  API Key: ${data.api_key}`)
      console.log('  (Save this key — you won\'t see it again)\n')
      await finishSetup(data.user?.email || email)
    }
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}\n`)
  }
}

async function finishSetup(email?: string) {
  console.log(`  Connected as ${email || '-'}\n`)

  console.log('  Setting up MCP for your editors...\n')
  await mcpInstall()

  console.log('  All done! Your AI Agent can now send and receive emails.')
  console.log()
  console.log('  Try:')
  console.log('    nothing inbox             Check your inbox')
  console.log('    nothing send <to> <text>  Send a message')
  console.log()
}

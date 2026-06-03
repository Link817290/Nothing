import { input, select, password } from '@inquirer/prompts'
import { loadConfig, saveConfig, paths } from '../config.js'
import { mcpInstall } from './mcp-install.js'

export async function init(opts?: { server?: string; key?: string; username?: string; password?: string; email?: string }) {
  // Non-interactive login: nothing init -s URL -k API_KEY
  if (opts?.server && opts?.key) {
    const url = opts.server.replace(/\/$/, '')
    try {
      const res = await fetch(`${url}/api/me`, {
        headers: { 'Authorization': `Bearer ${opts.key}` },
      })
      if (!res.ok) { console.log('  ✗ Invalid API Key or server.\n'); return }
      const user = await res.json() as { email?: string; name?: string }
      saveConfig({ server_url: url, token: opts.key, email: user.email, initialized: true })
      await finishSetup(user.email)
    } catch { console.log('  ✗ Connection failed.\n') }
    return
  }

  // Non-interactive register: nothing init -s URL -u username -p password [-e email]
  if (opts?.server && opts?.username && opts?.password) {
    const url = opts.server.replace(/\/$/, '')
    try {
      const res = await fetch(`${url}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: opts.username, password: opts.password, external_email: opts.email }),
      })
      const data = await res.json() as any
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.needs_verification) {
        console.log(`  Verification code sent to ${data.external_email}. Use interactive mode to complete.`)
        return
      }
      saveConfig({ server_url: url, token: data.api_key, email: data.user?.email, initialized: true })
      console.log(`  ✓ Account created: ${data.user?.email}`)
      console.log(`  API Key: ${data.api_key}\n`)
      await finishSetup(data.user?.email)
    } catch (err) { console.log(`  ✗ ${(err as Error).message}\n`) }
    return
  }

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
  let mailDomain: string | null = null
  try {
    const res = await fetch(`${url}/health`)
    if (!res.ok) throw new Error()
  } catch {
    console.log('  ✗ Cannot reach server. Check the URL.\n')
    return
  }
  console.log('  ✓ Server connected\n')

  // Get setup status
  try {
    const res = await fetch(`${url}/api/setup/status`)
    const data = await res.json() as { needs_setup?: boolean; mail_domain?: string }
    mailDomain = data.mail_domain || null
  } catch {}

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
    await registerFlow(url, mailDomain)
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

async function registerFlow(url: string, mailDomain: string | null) {
  const username = await input({
    message: 'Choose a username',
    validate: (v) => {
      const clean = v.toLowerCase().replace(/[^a-z0-9._-]/g, '')
      if (clean.length < 2) return 'Must be at least 2 characters'
      if (!/^[a-z]/.test(clean)) return 'Must start with a letter'
      return true
    },
  })

  if (mailDomain) {
    console.log(`  Your email will be: ${username}@${mailDomain}\n`)
  }

  const pass = await password({
    message: 'Password',
    validate: (v) => {
      if (v.length < 8) return 'At least 8 characters'
      if (!/[A-Z]/.test(v)) return 'Need at least one uppercase letter'
      if (!/[a-z]/.test(v)) return 'Need at least one lowercase letter'
      if (!/[0-9]/.test(v)) return 'Need at least one number'
      return true
    },
  })
  const name = await input({ message: 'Display name (optional)', default: '' })

  // Check if first user (no verification needed)
  let needsVerification = false
  try {
    const res = await fetch(`${url}/api/setup/status`)
    const data = await res.json() as { needs_setup?: boolean }
    needsVerification = !data.needs_setup
  } catch {}

  let externalEmail: string | undefined
  if (needsVerification) {
    externalEmail = await input({ message: 'External email (for verification code)' })
  }

  console.log('\n  Registering...')
  try {
    const res = await fetch(`${url}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: pass,
        name: name || undefined,
        external_email: externalEmail,
      }),
    })
    const data = await res.json() as any
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

    if (data.needs_verification) {
      console.log(`  ✓ Verification code sent to ${data.external_email}\n`)
      const code = await input({ message: 'Verification code (6 digits)' })

      const verifyRes = await fetch(`${url}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_email: externalEmail, code: code.trim() }),
      })
      const verifyData = await verifyRes.json() as any
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed')

      saveConfig({ server_url: url, token: verifyData.api_key, email: verifyData.user?.email, initialized: true })
      console.log(`  ✓ Account created\n`)
      if (verifyData.mailbox) console.log(`  Email: ${verifyData.mailbox}`)
      console.log(`  API Key: ${verifyData.api_key}`)
      console.log('  (Save this key — you won\'t see it again)\n')
      await finishSetup(verifyData.user?.email)
    } else {
      // First user (admin) — no verification
      saveConfig({ server_url: url, token: data.api_key, email: data.user?.email, initialized: true })
      console.log(`  ✓ Admin account created\n`)
      if (data.mailbox) console.log(`  Email: ${data.mailbox}`)
      console.log(`  API Key: ${data.api_key}`)
      console.log('  (Save this key — you won\'t see it again)\n')
      await finishSetup(data.user?.email)
    }
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}\n`)
  }
}

async function finishSetup(email?: string) {
  console.log(`  Connected as ${email || '-'}\n`)

  console.log('  Setting up MCP for your editors...\n')
  await mcpInstall()

  // Auto-install message notifications
  try {
    const { installWatch } = await import('./watch-setup.js')
    if (installWatch()) {
      console.log('  ✓ Message notifications enabled (checks every 5 min)\n')
    }
  } catch {}

  console.log('  All done! Your AI Agent can now send and receive emails.')
  console.log()
  console.log('  Try:')
  console.log('    nothing inbox             Check your inbox')
  console.log('    nothing send <to> <text>  Send a message')
  console.log()
}

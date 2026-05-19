import { input, select, password } from '@inquirer/prompts'
import { loadConfig, saveConfig, paths } from '../config.js'
import { randomBytes } from 'crypto'

const PROVIDERS: Record<string, {
  smtp_host: string; smtp_port: number; imap_host: string; imap_port: number
  guide: string[]
  passwordLabel: string
}> = {
  nothing: {
    smtp_host: 'smtp.nothing.email', smtp_port: 465, imap_host: 'imap.nothing.email', imap_port: 993,
    guide: [
      '1. Register at https://nothing.email',
      '2. Go to Settings → API Keys → Create key',
      '3. Copy the key below',
    ],
    passwordLabel: 'API Key',
  },
  gmail: {
    smtp_host: 'smtp.gmail.com', smtp_port: 465, imap_host: 'imap.gmail.com', imap_port: 993,
    guide: [
      '1. Go to https://myaccount.google.com/security',
      '2. Enable 2-Step Verification (required)',
      '3. Go to https://myaccount.google.com/apppasswords',
      '4. Create an app password for "Nothing"',
      '5. Copy the 16-char password below (spaces don\'t matter)',
    ],
    passwordLabel: 'App password (16 chars)',
  },
  outlook: {
    smtp_host: 'smtp.office365.com', smtp_port: 587, imap_host: 'outlook.office365.com', imap_port: 993,
    guide: [
      '1. Go to https://account.microsoft.com/security',
      '2. Enable 2-Step Verification',
      '3. Create an app password under "Advanced security"',
      '4. Copy the password below',
    ],
    passwordLabel: 'App password',
  },
  qq: {
    smtp_host: 'smtp.qq.com', smtp_port: 465, imap_host: 'imap.qq.com', imap_port: 993,
    guide: [
      '1. 登录 QQ 邮箱 → 设置 → 账户',
      '2. 找到 "POP3/IMAP/SMTP/Exchange/CardDAV" 服务',
      '3. 开启 IMAP/SMTP 服务',
      '4. 按提示发短信获取授权码',
      '5. 将授权码粘贴到下方',
    ],
    passwordLabel: '授权码',
  },
  '163': {
    smtp_host: 'smtp.163.com', smtp_port: 465, imap_host: 'imap.163.com', imap_port: 993,
    guide: [
      '1. 登录 163 邮箱 → 设置 → POP3/SMTP/IMAP',
      '2. 开启 IMAP/SMTP 服务',
      '3. 设置客户端授权密码',
      '4. 将授权密码粘贴到下方',
    ],
    passwordLabel: '客户端授权密码',
  },
}

export async function init() {
  console.log('\n  Welcome to Nothing\n')

  const config = loadConfig()

  if (config.initialized) {
    console.log(`  Already initialized: ${config.email}`)
    console.log(`  Run "nothing start" to start the server\n`)
    return
  }

  const provider = await select({
    message: 'Choose email provider',
    choices: [
      { value: 'local', name: 'Local only  — No email, messages stay on this machine (fastest)' },
      { value: 'nothing', name: 'Nothing     — NMP native, best experience' },
      { value: 'gmail', name: 'Gmail       — Most common, needs App Password' },
      { value: 'outlook', name: 'Outlook     — Microsoft 365' },
      { value: 'qq', name: 'QQ Mail     — 需要授权码' },
      { value: '163', name: '163 Mail    — 需要客户端授权密码' },
      { value: 'custom', name: 'Custom      — Manual SMTP/IMAP configuration' },
    ],
  })

  const token = `ntk_live_${randomBytes(24).toString('base64url')}`

  // Local mode
  if (provider === 'local') {
    const email = await input({ message: 'Your display email (just a label)', default: 'me@local' })

    saveConfig({
      token, email,
      api_host: 'http://localhost:3000',
      provider: 'local',
      initialized: true,
    })

    printDone(email, token)
    return
  }

  // Email mode
  let smtpHost: string, smtpPort: number, imapHost: string, imapPort: number
  let passwordLabel = 'Password'

  if (provider === 'custom') {
    console.log('\n  Manual SMTP/IMAP configuration:\n')
    smtpHost = await input({ message: 'SMTP host' })
    smtpPort = parseInt(await input({ message: 'SMTP port', default: '465' }))
    imapHost = await input({ message: 'IMAP host' })
    imapPort = parseInt(await input({ message: 'IMAP port', default: '993' }))
  } else {
    const preset = PROVIDERS[provider]
    smtpHost = preset.smtp_host
    smtpPort = preset.smtp_port
    imapHost = preset.imap_host
    imapPort = preset.imap_port
    passwordLabel = preset.passwordLabel

    // Show setup guide
    console.log(`\n  ── ${provider.toUpperCase()} Setup Guide ──\n`)
    for (const step of preset.guide) {
      console.log(`  ${step}`)
    }
    console.log()
  }

  const email = await input({ message: 'Email address' })
  const pass = await password({ message: passwordLabel })

  // Test connection
  console.log('\n  Testing connection...')
  let smtpOk = false, imapOk = false
  try {
    const { createTransport } = await import('nodemailer')
    const t = createTransport({
      host: smtpHost, port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: email, pass },
      connectionTimeout: 10000,
    })
    await t.verify()
    t.close()
    smtpOk = true
  } catch (e) {
    console.log(`  SMTP ✗ — ${(e as Error).message}`)
  }

  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({
      host: imapHost, port: imapPort, secure: true,
      auth: { user: email, pass }, logger: false,
    })
    await client.connect()
    await client.logout()
    imapOk = true
  } catch (e) {
    console.log(`  IMAP ✗ — ${(e as Error).message}`)
  }

  if (smtpOk) console.log('  SMTP ✓')
  if (imapOk) console.log('  IMAP ✓')

  if (!smtpOk && !imapOk) {
    console.log('\n  ⚠ Both connections failed. Check your credentials.')
    console.log('  Saving config anyway — you can retry with "nothing init" after fixing.\n')
  } else if (!smtpOk || !imapOk) {
    console.log('\n  ⚠ Partial connection. Saving config — some features may not work.\n')
  } else {
    console.log('')
  }

  saveConfig({
    token, email,
    api_host: 'http://localhost:3000',
    provider,
    smtp_host: smtpHost, smtp_port: smtpPort,
    imap_host: imapHost, imap_port: imapPort,
    smtp_user: email, smtp_pass: pass,
    initialized: true,
  })

  printDone(email, token)
}

function printDone(email: string, token: string) {
  console.log('  ✓ Nothing initialized\n')
  console.log(`  Email:  ${email}`)
  console.log(`  Key:    ${token}`)
  console.log(`  Config: ${paths.config}`)
  console.log(`  DB:     ${paths.db}`)
  console.log()
  console.log('  Next steps:')
  console.log('    nothing start             Start local server')
  console.log('    nothing mcp:install       Configure MCP for Claude Code / Cursor')
  console.log('    nothing send <to> <text>  Send your first message')
  console.log()
}

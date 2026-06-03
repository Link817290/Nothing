#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('nothing')
  .description(`Nothing — AI Agent email platform

  Give your AI agents the ability to send, receive, and reply to emails.
  Works with any email account (Gmail, QQ, Outlook) or self-hosted.

  Quick Start:
    $ nothing init                   Connect to server or register
    $ nothing inbox                  Check your inbox
    $ nothing send <to> <text>       Send a message
    $ nothing read <id>              Read a message

  MCP (for AI Agents):
    After "nothing init", your AI agent (Claude Code, Cursor, etc.)
    automatically gets email tools: nothing_send, nothing_inbox,
    nothing_read, nothing_reply, nothing_projects, nothing_report.

  More info: https://github.com/Link817290/Nothing`)
  .version('0.9.0')

// ─── Version check (non-blocking) ──────────────────────────────
const CURRENT_VERSION = '0.9.0'
fetch('https://registry.npmjs.org/nothing-cli/latest')
  .then(r => r.json())
  .then(data => {
    if (data.version && data.version !== CURRENT_VERSION) {
      console.log(`\n  ⬆ Update available: ${CURRENT_VERSION} → ${data.version}`)
      console.log(`    Run: npm i -g nothing-cli\n`)
    }
  })
  .catch(() => {})

// ─── Setup ──────────────────────────────────────────────────────

program
  .command('init')
  .option('-s, --server <url>', 'Server URL')
  .option('-k, --key <apiKey>', 'API Key (login mode)')
  .option('-u, --username <name>', 'Username (register mode)')
  .option('-p, --password <pass>', 'Password (register mode)')
  .option('-e, --email <email>', 'External email for verification (register mode)')
  .description('Connect to a Nothing server (login with API Key or register a new account)')
  .addHelpText('after', `
  Examples:
    $ nothing init                                           Interactive setup
    $ nothing init -s https://nothingmail.shop -k ntk_xxx    Login with API Key
    $ nothing init -s https://nothingmail.shop -u alice -p MyPass123   Register (admin/first user)

  Login flow:
    → Enter server URL
    → Choose "Yes — I have an API Key"
    → Paste your API Key
    → Done (MCP auto-installed)

  Register flow:
    → Enter server URL
    → Choose "No — Register"
    → Enter username + password
    → Enter verification code (sent to your email)
    → Done (MCP auto-installed)`)
  .action(async (opts) => {
    const { init } = await import('./commands/init.js')
    await init(opts)
  })

program
  .command('status')
  .description('Show current connection status and config')
  .action(async () => {
    const { status } = await import('./commands/status.js')
    await status()
  })

program
  .command('whoami')
  .description('Show current account email and provider')
  .action(async () => {
    const { whoami } = await import('./commands/whoami.js')
    await whoami()
  })

program
  .command('reset')
  .option('-y, --yes', 'Skip confirmation (for AI agents)')
  .description('Disconnect and delete local config (server data is not affected)')
  .action(async (opts) => {
    const { reset } = await import('./commands/reset.js')
    await reset(opts)
  })

program
  .command('update')
  .description('Update nothing-cli to the latest version')
  .action(async () => {
    const { execSync } = await import('child_process')
    try {
      const res = await fetch('https://registry.npmjs.org/nothing-cli/latest')
      const data = await res.json()
      if (data.version === CURRENT_VERSION) {
        console.log(`\n  ✓ Already on latest version (${CURRENT_VERSION})\n`)
        return
      }
      console.log(`\n  Updating ${CURRENT_VERSION} → ${data.version}...`)
      execSync('npm i -g nothing-cli', { stdio: 'inherit' })
      console.log(`\n  ✓ Updated to ${data.version}\n`)
    } catch (err) {
      console.log(`  ✗ ${(err as Error).message}`)
    }
  })

program
  .command('config')
  .description('View or set preferences (reply style, language, signature)')
  .option('--style <style>', 'Reply style: professional, casual, concise, friendly, formal')
  .option('--language <lang>', 'Reply language: en, zh, ja, etc.')
  .option('--signature <sig>', 'Message signature (use "" to clear)')
  .action(async (opts) => {
    const { loadPreferences, savePreferences } = await import('./config.js')
    const prefs = loadPreferences()
    let changed = false
    if (opts.style) { prefs.reply_style = opts.style; changed = true }
    if (opts.language) { prefs.reply_language = opts.language; changed = true }
    if (opts.signature !== undefined) { prefs.signature = opts.signature || undefined; changed = true }
    if (changed) {
      savePreferences(prefs)
      console.log('\n  ✓ Preferences saved\n')
    }
    console.log('  Reply style:    ', prefs.reply_style || '(not set)')
    console.log('  Reply language: ', prefs.reply_language || '(not set)')
    console.log('  Signature:      ', prefs.signature || '(none)')
    console.log()
  })

program
  .command('check')
  .option('--silent', 'No output (for cron)')
  .description('Check for new messages and update notification file')
  .action(async (opts) => {
    const { check } = await import('./commands/check.js')
    await check(opts)
  })

// ─── MCP ────────────────────────────────────────────────────────

program
  .command('mcp')
  .description('Start MCP Server (stdio mode — called by editors, not by you)')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js')
    await startMcpServer()
  })

program
  .command('mcp:install')
  .description('Manually configure MCP in Claude Code / Cursor / Claude Desktop')
  .addHelpText('after', `
  Note: "nothing init" auto-installs MCP. Use this only if you
  need to reinstall or add to another editor.`)
  .action(async () => {
    const { mcpInstall } = await import('./commands/mcp-install.js')
    await mcpInstall()
  })

// ─── Messages ───────────────────────────────────────────────────

program
  .command('send <to> <text>')
  .option('-f, --file <files...>', 'Attach files (local paths)')
  .option('-p, --project <project>', 'Tag with project name')
  .option('-l, --labels <labels...>', 'Add labels')
  .option('--priority <priority>', 'Set priority: urgent | high | normal | low')
  .option('--require <capabilities...>', 'Required recipient capabilities')
  .description('Send an NMP message to any email address')
  .addHelpText('after', `
  Examples:
    $ nothing send alice@example.com "Hello from Nothing"
    $ nothing send bob@example.com "See attached" -f report.pdf
    $ nothing send team@example.com "Bug fix" -p my-project --priority high`)
  .action(async (to: string, text: string, opts) => {
    const { send } = await import('./commands/send.js')
    await send(to, text, opts)
  })

program
  .command('inbox')
  .option('-p, --project <project>', 'Filter by project')
  .option('-l, --label <label>', 'Filter by label')
  .option('-c, --channel <channel>', 'Filter by channel (gmail / qq / nothing)')
  .option('-s, --source <source>', 'Filter by source (nmp / external)')
  .option('--agent <agent>', 'Filter by sending agent (claude-code, cursor, codex)')
  .option('-a, --all', 'Show all messages (not just unread)')
  .option('-n, --limit <n>', 'Max messages to show', '20')
  .description('Check your inbox')
  .addHelpText('after', `
  Examples:
    $ nothing inbox                  Show unread messages
    $ nothing inbox --all            Show all messages
    $ nothing inbox --source nmp     Show only NMP (agent) messages
    $ nothing inbox --agent cursor   Messages from Cursor agent
    $ nothing inbox -p my-project    Messages in a project`)
  .action(async (opts) => {
    const { inbox } = await import('./commands/inbox.js')
    await inbox(opts)
  })

program
  .command('read <id>')
  .description('Read a message in full (marks as read)')
  .addHelpText('after', `
  Example:
    $ nothing read msg_abc123        Read message by ID (from inbox listing)`)
  .action(async (id: string) => {
    const { read } = await import('./commands/read.js')
    await read(id)
  })

program
  .command('download <attachmentId>')
  .option('-o, --output <dir>', 'Output directory', '.')
  .description('Download an attachment by ID')
  .action(async (attachmentId: string, opts) => {
    const { download } = await import('./commands/download.js')
    await download(attachmentId, opts.output)
  })

program
  .command('reply <id> <text>')
  .option('-f, --file <files...>', 'Attach files')
  .description('Reply to a message (inherits project, labels, thread)')
  .addHelpText('after', `
  Example:
    $ nothing reply msg_abc123 "Got it, will fix"
    $ nothing reply msg_abc123 "See patch" -f fix.patch`)
  .action(async (id: string, text: string, opts) => {
    const { reply } = await import('./commands/reply.js')
    await reply(id, text, opts)
  })

program
  .command('sent')
  .option('-p, --project <project>', 'Filter by project')
  .option('-n, --limit <n>', 'Max messages to show', '20')
  .description('View sent messages and delivery status')
  .action(async (opts) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      const result = await client.sent({ project: opts.project, limit: opts.limit })
      const msgs = result.messages || []
      if (msgs.length === 0) { console.log('\n  No sent messages.\n'); return }
      console.log()
      for (const m of msgs) {
        const status = (m.status || 'sent').padEnd(9)
        console.log(`  [${status}] ${m.id}  To: ${m.to?.split('@')[0]?.padEnd(15)}  ${(m.subject || '(no subject)').slice(0, 40)}`)
      }
      console.log()
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

program
  .command('search <query>')
  .option('-p, --project <project>', 'Filter by project')
  .option('-n, --limit <n>', 'Max results', '20')
  .description('Search messages by keyword')
  .addHelpText('after', `
  Examples:
    $ nothing search "auth bug"
    $ nothing search "deploy" -p backend`)
  .action(async (query: string, opts) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      const result = await client.search(query, { project: opts.project, limit: Number(opts.limit) })
      const msgs = result.messages || []
      if (msgs.length === 0) { console.log(`\n  No results for "${query}".\n`); return }
      console.log(`\n  ${msgs.length} result${msgs.length > 1 ? 's' : ''} for "${query}":\n`)
      for (const m of msgs) {
        const dir = m.direction === 'outbound' ? '↗' : '↙'
        console.log(`  ${dir} [${m.id}] ${m.from?.split('@')[0]} → ${m.to?.split('@')[0]}: ${(m.subject || '(no subject)').slice(0, 40)}`)
      }
      console.log()
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

program
  .command('forward <id> <to>')
  .option('-t, --text <note>', 'Add a note above the forwarded content')
  .description('Forward a message to another recipient')
  .action(async (id: string, to: string, opts) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      const result = await client.forward(id, to, opts.text)
      console.log(`\n  ✓ Forwarded → ${to} (${result.message_id})\n`)
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

program
  .command('delete <id>')
  .option('-y, --yes', 'Skip confirmation')
  .description('Delete a message')
  .action(async (id: string, opts) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    if (!opts.yes) {
      const { confirm } = await import('@inquirer/prompts')
      const ok = await confirm({ message: `Delete message ${id}?`, default: false })
      if (!ok) return
    }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      await client.deleteMessage(id)
      console.log(`\n  ✓ Deleted ${id}\n`)
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

program
  .command('mark <id> <state>')
  .description('Mark a message as read or unread')
  .addHelpText('after', `
  Examples:
    $ nothing mark msg_abc123 read
    $ nothing mark msg_abc123 unread`)
  .action(async (id: string, state: string) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    const isRead = state === 'read'
    if (state !== 'read' && state !== 'unread') { console.log('  State must be "read" or "unread".'); return }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      await client.markRead(id, isRead)
      console.log(`\n  ✓ Marked ${id} as ${state}\n`)
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

// ─── Threads ───────────────────────────────────────────────────

program
  .command('threads')
  .option('-p, --project <project>', 'Filter by project')
  .description('List conversation threads')
  .action(async (opts) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      const { threads } = await client.listThreads(opts.project ? { project: opts.project } : undefined)
      if (threads.length === 0) { console.log('\n  No threads yet.\n'); return }
      console.log()
      for (const t of threads) {
        const unread = t.has_unread ? '●' : '○'
        console.log(`  ${unread} ${t.thread_id}  ${t.subject?.slice(0, 40).padEnd(40)}  ${t.participant_count}p ${t.message_count}m  ${t.project || ''}`)
      }
      console.log()
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

program
  .command('thread:summary <threadId>')
  .description('View or generate thread summary')
  .option('--generate', 'Generate a new summary')
  .action(async (threadId: string, opts) => {
    const { loadConfig } = await import('./config.js')
    const { NothingClient } = await import('./client.js')
    const config = loadConfig()
    if (!config.initialized || !config.server_url || !config.token) { console.log('  Not initialized.'); return }
    const client = new NothingClient({ serverUrl: config.server_url, token: config.token })
    try {
      if (opts.generate) {
        const res = await client.summarizeThread(threadId)
        console.log(`\n  ✓ Summary generated\n\n${res.summary}\n`)
      } else {
        const { summaries } = await client.getThreadSummaries(threadId)
        if (summaries.length === 0) {
          console.log('\n  No summaries. Use --generate to create one.\n')
          return
        }
        for (const s of summaries) {
          console.log(`\n  ─── ${s.generated_by} · ${new Date(s.created_at).toLocaleString()} ───`)
          console.log(`  ${s.summary}`)
        }
        console.log()
      }
    } catch (err) { console.log(`  ✗ ${(err as Error).message}`) }
  })

// ─── Overview ───────────────────────────────────────────────────

program
  .command('projects')
  .description('List all projects')
  .action(async () => {
    const { projects } = await import('./commands/projects.js')
    await projects()
  })

program
  .command('project:create <name>')
  .option('-d, --description <desc>', 'Project description')
  .description('Create a new project')
  .action(async (name: string, opts) => {
    const { projectCreate } = await import('./commands/projects.js')
    await projectCreate(name, opts)
  })

program
  .command('project:delete <id>')
  .option('-y, --yes', 'Skip confirmation')
  .description('Delete a project (messages are untagged, not deleted)')
  .action(async (id: string, opts) => {
    const { projectDelete } = await import('./commands/projects.js')
    await projectDelete(id, opts)
  })

program
  .command('report')
  .option('--today', 'Today only')
  .option('--month', 'This month')
  .option('-p, --project <project>', 'Filter by project')
  .description('Generate activity report (sent, received, needs reply)')
  .addHelpText('after', `
  Examples:
    $ nothing report                 Last 7 days
    $ nothing report --today         Today only
    $ nothing report -p my-project   Report for a specific project`)
  .action(async (opts) => {
    const { report } = await import('./commands/report.js')
    await report(opts)
  })

// ─── Capsules ──────────────────────────────────────────────────

const capsuleCmd = program
  .command('capsule')
  .description('Execution Capsule — receive and run expert experience packages')

capsuleCmd
  .command('list')
  .description('List received capsules')
  .action(async () => {
    const { capsuleList } = await import('./commands/capsule.js')
    await capsuleList()
  })

capsuleCmd
  .command('inspect <id>')
  .description('Inspect a capsule: state machine, tools, validators')
  .action(async (id: string) => {
    const { capsuleInspect } = await import('./commands/capsule.js')
    await capsuleInspect(id)
  })

capsuleCmd
  .command('start <capsuleId>')
  .option('-i, --inputs <json>', 'Input values as JSON')
  .description('Start executing a capsule')
  .action(async (capsuleId: string, opts) => {
    const { capsuleStart } = await import('./commands/capsule.js')
    await capsuleStart(capsuleId, opts.inputs)
  })

capsuleCmd
  .command('next <runId>')
  .description('Show current step: goal, tools, expected outputs')
  .action(async (runId: string) => {
    const { capsuleNext } = await import('./commands/capsule.js')
    await capsuleNext(runId)
  })

capsuleCmd
  .command('guard <runId> <command>')
  .description('Check if a command is allowed before running it')
  .action(async (runId: string, command: string) => {
    const { capsuleGuard } = await import('./commands/capsule.js')
    await capsuleGuard(runId, command)
  })

capsuleCmd
  .command('transition <runId> <toState>')
  .option('-r, --reason <reason>', 'Reason for transition')
  .description('Move to the next state')
  .action(async (runId: string, toState: string, opts) => {
    const { capsuleTransition } = await import('./commands/capsule.js')
    await capsuleTransition(runId, toState, opts.reason)
  })

capsuleCmd
  .command('event <runId> <type>')
  .option('-s, --state <state>', 'Current state')
  .option('-m, --message <message>', 'Event description')
  .description('Record an execution event')
  .action(async (runId: string, type: string, opts) => {
    const { capsuleEvent } = await import('./commands/capsule.js')
    await capsuleEvent(runId, type, opts)
  })

capsuleCmd
  .command('status <runId>')
  .description('Show run status and event timeline')
  .action(async (runId: string) => {
    const { capsuleStatus } = await import('./commands/capsule.js')
    await capsuleStatus(runId)
  })

capsuleCmd
  .command('validate <runId> <artifactName>')
  .option('-f, --file <path>', 'Artifact file path')
  .description('Validate an artifact against capsule rules')
  .action(async (runId: string, artifactName: string, opts) => {
    const { capsuleValidate } = await import('./commands/capsule.js')
    await capsuleValidate(runId, artifactName, opts.file)
  })

program.parse()

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
  .version('0.2.1')

// ─── Setup ──────────────────────────────────────────────────────

program
  .command('init')
  .description('Connect to a Nothing server (login with API Key or register a new account)')
  .addHelpText('after', `
  Examples:
    $ nothing init                   Interactive setup

  Login flow:
    → Enter server URL
    → Choose "Yes — I have an API Key"
    → Paste your API Key
    → Done (MCP auto-installed)

  Register flow:
    → Enter server URL
    → Choose "No — Register"
    → Enter email + password
    → Enter verification code (sent to your email)
    → Done (MCP auto-installed)`)
  .action(async () => {
    const { init } = await import('./commands/init.js')
    await init()
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
  .description('Disconnect and delete local config (server data is not affected)')
  .action(async () => {
    const { reset } = await import('./commands/reset.js')
    await reset()
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

// ─── Overview ───────────────────────────────────────────────────

program
  .command('projects')
  .description('List all projects with message counts')
  .action(async () => {
    const { projects } = await import('./commands/projects.js')
    await projects()
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

program.parse()

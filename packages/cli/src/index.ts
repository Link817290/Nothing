import { Command } from 'commander'

const program = new Command()

program
  .name('nothing')
  .description('Nothing — AI Agent email client & MCP Server')
  .version('0.1.0')

// Setup
program
  .command('init')
  .description('Initialize Nothing (choose email provider, create local account)')
  .action(async () => {
    const { init } = await import('./commands/init.js')
    await init()
  })

// MCP
program
  .command('mcp')
  .description('Start MCP Server (stdio mode)')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js')
    await startMcpServer()
  })

program
  .command('mcp:install')
  .description('Auto-configure MCP in Claude Code / Cursor')
  .action(async () => {
    const { mcpInstall } = await import('./commands/mcp-install.js')
    await mcpInstall()
  })

// Server
program
  .command('start')
  .description('Start local Nothing server (background)')
  .action(async () => {
    const { start } = await import('./commands/start.js')
    await start()
  })

program
  .command('stop')
  .description('Stop local Nothing server')
  .action(async () => {
    const { stop } = await import('./commands/stop.js')
    await stop()
  })

program
  .command('status')
  .description('Show local server status')
  .action(async () => {
    const { status } = await import('./commands/status.js')
    await status()
  })

// Auth
program
  .command('login <token>')
  .description('Login with API token')
  .action(async (token: string) => {
    const { login } = await import('./commands/login.js')
    await login(token)
  })

program
  .command('whoami')
  .description('Show current account')
  .action(async () => {
    const { whoami } = await import('./commands/whoami.js')
    await whoami()
  })

// Messaging
program
  .command('send <to> <text>')
  .option('-f, --file <files...>', 'Attach files')
  .option('-p, --project <project>', 'Project name')
  .option('-l, --labels <labels...>', 'Labels')
  .option('--priority <priority>', 'Priority (urgent/normal/low)')
  .option('--require <capabilities...>', 'Required capabilities')
  .description('Send a message')
  .action(async (to: string, text: string, opts) => {
    const { send } = await import('./commands/send.js')
    await send(to, text, opts)
  })

program
  .command('inbox')
  .option('-p, --project <project>', 'Filter by project')
  .option('-l, --label <label>', 'Filter by label')
  .option('-c, --channel <channel>', 'Filter by channel (gmail / qq / nothing / local)')
  .option('-s, --source <source>', 'Filter by source (nmp / external)')
  .option('--agent <agent>', 'Filter by sending agent (exact: claude-code, cursor, codex)')
  .option('-a, --all', 'Show all (not just unread)')
  .option('-n, --limit <n>', 'Max messages', '20')
  .description('List inbox messages')
  .action(async (opts) => {
    const { inbox } = await import('./commands/inbox.js')
    await inbox(opts)
  })

program
  .command('read <id>')
  .description('Read a message')
  .action(async (id: string) => {
    const { read } = await import('./commands/read.js')
    await read(id)
  })

program
  .command('reply <id> <text>')
  .option('-f, --file <files...>', 'Attach files')
  .description('Reply to a message')
  .action(async (id: string, text: string, opts) => {
    const { reply } = await import('./commands/reply.js')
    await reply(id, text, opts)
  })

program
  .command('projects')
  .description('List projects')
  .action(async () => {
    const { projects } = await import('./commands/projects.js')
    await projects()
  })

program
  .command('report')
  .option('--today', 'Today only')
  .option('--month', 'This month')
  .option('-p, --project <project>', 'Filter by project')
  .description('Generate activity report')
  .action(async (opts) => {
    const { report } = await import('./commands/report.js')
    await report(opts)
  })

program
  .command('reset')
  .description('Reset Nothing (delete config, database, stop server)')
  .action(async () => {
    const { reset } = await import('./commands/reset.js')
    await reset()
  })

program.parse()

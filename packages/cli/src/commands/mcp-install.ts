import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'

/** MCP config entry — command + args to launch nothing mcp */
function getMcpConfig() {
  // If globally installed, use "nothing" directly; otherwise use npx
  const useGlobal = isGloballyInstalled()
  return useGlobal
    ? { command: 'nothing', args: ['mcp'] }
    : { command: 'npx', args: ['-y', 'nothing-cli', 'mcp'] }
}

function isGloballyInstalled(): boolean {
  try {
    const result = execSync('nothing --version', { stdio: 'pipe', timeout: 5000 }).toString()
    return result.includes('0.')
  } catch {
    return false
  }
}

interface Target {
  name: string
  path: string
  key: string
}

function getTargets(): Target[] {
  const home = homedir()
  const isWin = process.platform === 'win32'

  const targets: Target[] = [
    // Claude Code CLI — user-level
    {
      name: 'Claude Code',
      path: join(home, '.claude.json'),
      key: 'mcpServers',
    },
    // Cursor IDE — user-level
    {
      name: 'Cursor',
      path: join(home, '.cursor', 'mcp.json'),
      key: 'mcpServers',
    },
    // Claude Desktop app
    {
      name: 'Claude Desktop',
      path: isWin
        ? join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
        : process.platform === 'darwin'
          ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
          : join(home, '.config', 'Claude', 'claude_desktop_config.json'),
      key: 'mcpServers',
    },
  ]

  return targets
}

export async function mcpInstall() {
  console.log('\n  Installing MCP configuration...\n')

  const mcpConfig = getMcpConfig()
  let installed = 0

  for (const target of getTargets()) {
    const result = installTo(target, mcpConfig)
    if (result === 'installed') {
      console.log(`  ✓ ${target.name} — ${target.path}`)
      installed++
    } else if (result === 'skipped') {
      console.log(`  - ${target.name} — not found, skipped`)
    } else {
      console.log(`  ✗ ${target.name} — failed`)
    }
  }

  // Codex — TOML config, handle separately
  installCodexMcp(mcpConfig)

  // Write global instruction so agent always knows about Nothing
  injectGlobalInstruction()

  if (installed === 0) {
    console.log('  No supported editors found.\n')
    console.log('  Manual setup — add to your MCP config:\n')
    console.log('  ' + JSON.stringify({ mcpServers: { nothing: mcpConfig } }, null, 2).split('\n').join('\n  '))
    console.log()
    console.log('  Or use Claude Code CLI:')
    console.log(`    claude mcp add nothing -- ${mcpConfig.command} ${mcpConfig.args.join(' ')}`)
  } else {
    console.log(`\n  Done! ${installed} editor(s) configured.`)
    console.log('  Restart your editor to activate the Nothing MCP tools.\n')
  }
}

const NOTHING_INSTRUCTION = `# Nothing Mail
You have Nothing email tools via MCP. At the start of EVERY conversation:
1. Read ~/.nothing/notifications.json — if unread messages exist, tell the user immediately.
2. When user mentions email, messages, sending, inbox, or contacts — use Nothing tools.
3. Read ~/.nothing/memory.json for user preferences and context from prior sessions.
4. Respect ~/.nothing/preferences.json for reply style, language, and signature.`

function installCodexMcp(mcpConfig: Record<string, unknown>) {
  const codexConfig = join(homedir(), '.codex', 'config.toml')
  if (!existsSync(codexConfig)) return
  try {
    const content = readFileSync(codexConfig, 'utf-8')
    if (content.includes('[mcp_servers.nothing]')) {
      console.log(`  - Codex — already configured`)
      return
    }
    const tomlBlock = `\n[mcp_servers.nothing]\ncommand = "${(mcpConfig as any).command}"\nargs = ${JSON.stringify((mcpConfig as any).args)}\n`
    writeFileSync(codexConfig, content.trimEnd() + '\n' + tomlBlock)
    console.log(`  ✓ Codex — ${codexConfig}`)
  } catch {
    console.log(`  ✗ Codex — failed`)
  }
}

export function injectGlobalInstruction() {
  const home = homedir()
  const targets = [
    join(home, '.claude', 'CLAUDE.md'),           // Claude Code global
    join(home, '.cursor', 'rules', 'nothing.md'), // Cursor global rules
    join(home, '.codex', 'rules', 'nothing.md'),  // Codex global rules
  ]

  for (const target of targets) {
    try {
      const dir = join(target, '..')
      if (!existsSync(dir)) continue // only write if editor dir exists

      if (existsSync(target)) {
        const content = readFileSync(target, 'utf-8')
        if (content.includes('Nothing Mail')) continue // already injected
        // Append to existing file
        writeFileSync(target, content.trimEnd() + '\n\n' + NOTHING_INSTRUCTION + '\n')
      } else {
        writeFileSync(target, NOTHING_INSTRUCTION + '\n')
      }
      console.log(`  ✓ Instruction → ${target}`)
    } catch {}
  }
}

function installTo(target: Target, mcpConfig: Record<string, unknown>): 'installed' | 'skipped' | 'failed' {
  try {
    if (existsSync(target.path)) {
      // Update existing config
      const content = JSON.parse(readFileSync(target.path, 'utf-8'))
      if (!content[target.key]) content[target.key] = {}
      content[target.key].nothing = mcpConfig
      writeFileSync(target.path, JSON.stringify(content, null, 2))
      return 'installed'
    }

    // For Claude Code, create file directly (it's just ~/.claude.json)
    // For others, only create if parent dir exists
    const dir = join(target.path, '..')
    if (target.name === 'Claude Code' || existsSync(dir)) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const config = { [target.key]: { nothing: mcpConfig } }
      writeFileSync(target.path, JSON.stringify(config, null, 2))
      return 'installed'
    }

    return 'skipped'
  } catch {
    return 'failed'
  }
}

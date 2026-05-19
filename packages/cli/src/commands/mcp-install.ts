import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const MCP_CONFIG = {
  nothing: {
    command: 'nothing',
    args: ['mcp'],
  },
}

const TARGETS = [
  {
    name: 'Claude Code',
    path: join(homedir(), '.claude', 'claude_desktop_config.json'),
    key: 'mcpServers',
  },
  {
    name: 'Cursor',
    path: join(homedir(), '.cursor', 'mcp.json'),
    key: 'mcpServers',
  },
]

export async function mcpInstall() {
  console.log('\n  Installing MCP configuration...\n')

  let installed = false

  for (const target of TARGETS) {
    if (!existsSync(target.path)) {
      // Create config file if the parent dir exists
      const dir = join(target.path, '..')
      if (existsSync(dir)) {
        const config = { [target.key]: { ...MCP_CONFIG } }
        writeFileSync(target.path, JSON.stringify(config, null, 2))
        console.log(`  ✓ ${target.name} — created ${target.path}`)
        installed = true
      } else {
        console.log(`  - ${target.name} — not found, skipped`)
      }
      continue
    }

    try {
      const content = JSON.parse(readFileSync(target.path, 'utf-8'))
      if (!content[target.key]) content[target.key] = {}
      content[target.key].nothing = MCP_CONFIG.nothing
      writeFileSync(target.path, JSON.stringify(content, null, 2))
      console.log(`  ✓ ${target.name} — updated ${target.path}`)
      installed = true
    } catch {
      console.log(`  ✗ ${target.name} — failed to update ${target.path}`)
    }
  }

  if (!installed) {
    console.log('\n  No supported editors found. Add manually:')
    console.log()
    console.log('  ' + JSON.stringify({ mcpServers: MCP_CONFIG }, null, 2).split('\n').join('\n  '))
  }

  console.log()
}

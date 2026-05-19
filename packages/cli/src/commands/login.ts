import { loadConfig, saveConfig } from '../config.js'

export async function login(token: string) {
  const config = loadConfig()
  config.token = token
  saveConfig(config)
  console.log(`  ✓ Token saved`)
  console.log(`  Run "nothing whoami" to verify`)
}

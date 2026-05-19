import { loadConfig } from '../config.js'

export async function whoami() {
  const config = loadConfig()
  if (!config.initialized) {
    console.log('  Not initialized. Run "nothing init" first.')
    return
  }
  console.log(`  ${config.email}`)
  console.log(`  Provider: ${config.provider}`)
}

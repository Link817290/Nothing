/** Standalone process entry point — spawned by "nothing start" */
import { startEmbeddedServer } from './server.js'

const app = await startEmbeddedServer()

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await app.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await app.close()
  process.exit(0)
})

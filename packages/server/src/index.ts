import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { loadServerConfig } from './config/index.js'
import { initDb, closeDb } from './repositories/db.js'
import { authRoutes } from './routes/auth.js'
import { accountRoutes } from './routes/accounts.js'
import { messageRoutes } from './routes/messages.js'
import { adminRoutes } from './routes/admin.js'
import { mailEngineRoutes } from './routes/mailengine.js'
import { startImapPolling, stopImapPolling } from './mail/imap.js'

async function main() {
  const config = loadServerConfig()

  // Initialize database
  await initDb(config.databaseUrl)

  // Create Fastify app
  const app = Fastify({ logger: true })

  // Plugins
  await app.register(cors, { origin: true })
  await app.register(jwt, { secret: config.jwtSecret })

  // Health check (public)
  app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }))

  // Setup status (public) — tells frontend if first-time setup is needed
  app.get('/api/setup/status', async () => {
    const { queryOne } = await import('./repositories/db.js')
    const count = await queryOne('SELECT COUNT(*) as c FROM users')
    return {
      needs_setup: parseInt(count?.c) === 0,
      mail_domain: config.mailDomain || null,
    }
  })

  // Routes
  await app.register(authRoutes)
  await app.register(accountRoutes)
  await app.register(messageRoutes)
  await app.register(adminRoutes)
  await app.register(mailEngineRoutes)

  // Start IMAP polling
  startImapPolling(30000)

  // Graceful shutdown
  const shutdown = async () => {
    stopImapPolling()
    closeDb()
    await app.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Start server
  await app.listen({ port: config.port, host: config.host })
  console.log(`Nothing Server running on ${config.host}:${config.port}`)
}

main().catch(err => {
  console.error('Failed to start:', err)
  process.exit(1)
})

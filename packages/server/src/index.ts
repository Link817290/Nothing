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
import { capsuleRoutes } from './routes/capsules.js'
import { startImapPolling, stopImapPolling } from './mail/imap.js'
import { startStalwartPolling, stopStalwartPolling } from './mail/stalwart-sync.js'

async function main() {
  const config = loadServerConfig()

  // Initialize database
  await initDb(config.databaseUrl)

  // Create Fastify app
  const app = Fastify({ logger: true })

  // Plugins
  const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean)
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)  // same-origin / server-to-server
      if (corsOrigins.length === 0) return cb(null, true)  // no restriction configured
      if (corsOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
  })
  await app.register(jwt, { secret: config.jwtSecret })

  // Health check (public)
  app.get('/health', async () => ({ status: 'ok', version: '0.1.0' }))

  // Setup status (public) — tells frontend if first-time setup is needed
  app.get('/api/setup/status', async () => {
    const { queryOne } = await import('./repositories/db.js')
    const count = await queryOne('SELECT COUNT(*) as c FROM users')
    // Get mail domain from Stalwart if available
    let mailDomain: string | null = null
    try {
      const { listDomains, mailEngineHealthy } = await import('./services/mailengine.js')
      if (await mailEngineHealthy()) {
        const domains = await listDomains()
        if (domains?.length > 0) mailDomain = domains[0].name
      }
    } catch {}
    return {
      needs_setup: parseInt(count?.c) === 0,
      mail_domain: mailDomain,
    }
  })

  // Routes
  await app.register(authRoutes)
  await app.register(accountRoutes)
  await app.register(messageRoutes)
  await app.register(adminRoutes)
  await app.register(mailEngineRoutes)
  await app.register(capsuleRoutes)

  // Start polling (non-blocking)
  startImapPolling(30000)
  startStalwartPolling(15000).catch(() => {})

  // Periodic cleanup: expired verification codes
  setInterval(() => {
    import('./services/verification.js').then(m => m.cleanupExpiredCodes()).catch(() => {})
  }, 60 * 60 * 1000) // every hour

  // Graceful shutdown
  const shutdown = async () => {
    stopImapPolling()
    stopStalwartPolling()
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

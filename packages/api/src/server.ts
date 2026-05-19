import Fastify from 'fastify'

const app = Fastify({ logger: true })

// TODO: Register plugins
// TODO: Register routes

app.get('/health', async () => ({ status: 'ok' }))

const start = async () => {
  const port = Number(process.env['PORT'] || 3000)
  const host = process.env['HOST'] || '0.0.0.0'
  await app.listen({ port, host })
}

start()

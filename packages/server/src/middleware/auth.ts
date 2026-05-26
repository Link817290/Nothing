import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyApiKey, type Permission } from '../services/apikeys.js'
import { getUserById } from '../services/auth.js'

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing Authorization header' })
  }

  const token = auth.slice(7)

  if (token.startsWith('ntk_')) {
    const result = await verifyApiKey(token)
    if (!result) return reply.code(401).send({ error: 'Invalid API Key' })
    const user = await getUserById(result.userId)
    if (!user) return reply.code(401).send({ error: 'User not found' })
    if (user.is_banned) return reply.code(403).send({ error: 'Account is banned' })
    ;(req as any).user = {
      id: user.id, email: user.email, name: user.name,
      is_admin: user.is_admin, permissions: result.permissions,
    }
    return
  }

  try {
    await req.jwtVerify()
    const payload = (req as any).user as { id: string }
    const user = await getUserById(payload.id)
    if (!user) return reply.code(401).send({ error: 'User not found' })
    if (user.is_banned) return reply.code(403).send({ error: 'Account is banned' })
    ;(req as any).user = {
      id: user.id, email: user.email, name: user.name,
      is_admin: user.is_admin, permissions: ['read', 'write', 'admin'] as Permission[],
    }
  } catch {
    return reply.code(401).send({ error: 'Invalid token' })
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user
  if (!user?.is_admin) {
    return reply.code(403).send({ error: 'Admin access required' })
  }
}

export function requirePermission(perm: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user
    if (!user?.permissions?.includes(perm) && !user?.is_admin) {
      return reply.code(403).send({ error: `Permission '${perm}' required` })
    }
  }
}

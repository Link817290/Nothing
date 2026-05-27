export interface ServerConfig {
  port: number
  host: string
  jwtSecret: string
  databaseUrl: string
  encryptKey: string
  mailDomain: string  // e.g. 'example.com' — users get user@example.com
}

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

export function loadServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: requireEnv('JWT_SECRET'),
    databaseUrl: requireEnv('DATABASE_URL'),
    encryptKey: requireEnv('ENCRYPT_KEY'),
    mailDomain: process.env.MAIL_DOMAIN || '',
  }
}

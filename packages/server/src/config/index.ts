export interface ServerConfig {
  port: number
  host: string
  jwtSecret: string
  databaseUrl: string
  encryptKey: string
}

export function loadServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    databaseUrl: process.env.DATABASE_URL || 'postgres://nothing:nothing@localhost:5432/nothing',
    encryptKey: process.env.ENCRYPT_KEY || 'change-me-in-production',
  }
}

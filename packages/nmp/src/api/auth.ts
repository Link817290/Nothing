import type { TokenPermission } from '../types.js'
export type { TokenPermission }

/** Account and token types for Nothing API */

/** GET /api/account */
export interface AccountInfo {
  id: string
  handle: string
  email: string
  display_name?: string
  github_username: string
  created_at: string
}

/** GET /api/account/usage */
export interface UsageInfo {
  messages_today: number
  messages_limit: number
  storage_used: number
  storage_limit: number
  tokens_count: number
  tokens_limit: number
}

/** GET /api/account/tokens */
export interface TokenInfo {
  id: string
  name: string
  token_preview: string
  permissions: TokenPermission[]
  last_used?: string
  expires_at?: string
  created_at: string
  revoked: boolean
}

/** POST /api/account/tokens */
export interface CreateTokenRequest {
  name: string
  permissions: TokenPermission[]
  expires_at?: string
}

export interface CreateTokenResponse {
  id: string
  token: string
  name: string
  permissions: TokenPermission[]
}

/** POST /api/account/register */
export interface RegisterRequest {
  handle: string
}

export interface RegisterResponse {
  handle: string
  email: string
  master_token: string
}

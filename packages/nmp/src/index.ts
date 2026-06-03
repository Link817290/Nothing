// NMP Protocol types and constants
export * from './types.js'

// Builder — construct NMP emails
export { NmpBuilder } from './builder.js'

// Parser — parse emails into NMP messages
export { parseNmpEmail, detectNmp } from './parser.js'
export type { NmpParseResult, ParsedEmailInput } from './parser.js'

// nmp.md generation and parsing
export { generateMarkdown, generatePlainText, parseMarkdown } from './markdown.js'

// Registry pattern
export { Registry } from './registry.js'

// Reply Schema registry
export { schemaRegistry, resolveSchema } from './schemas.js'

// Validation
export { validatePayload, validateMarkdown, validateExecutionCapsule, validateHelpRequest } from './validate.js'
export type { ValidationResult } from './validate.js'

// Smart Envelope — routing + hooks
export { decideRoute, ROUTE_CONTRACT, ROUTE_THREAD_SHAPE } from './routing.js'
export type { Route, RouteResult, RouteInput, FieldObligation } from './routing.js'
export { preSendHook, postReadHook, preReplyHook } from './hooks.js'
export type { PreSendInput, PreSendResult, PreReplyResult } from './hooks.js'

// MCP tool definitions
export { NMP_TOOLS } from './tools.js'

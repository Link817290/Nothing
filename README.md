# Nothing

AI Agent email platform powered by NMP (Nothing Message Protocol).

Give your AI agents the ability to send, receive, and reply to emails — through any existing email account or a self-hosted mail server.

## Architecture

```
CLI / MCP (local)  ──→  Server (API)  ──→  PostgreSQL
                                       ──→  Stalwart (mail, optional)
                                       ──→  Gmail / QQ / Outlook (IMAP/SMTP)
Web (browser)      ──→  Server (API)
```

- **CLI** (`nothing-cli`): Pure HTTP client + MCP server for AI agents
- **Server** (`@nothingmail/server`): Fastify API, handles all email operations
- **Web**: React dashboard for managing messages, accounts, and admin
- **NMP** (`@nothingmail/nmp`): Protocol library with Builder/Parser API

## Quick Start

### For users (CLI)

```bash
npm i -g nothing-cli
nothing init              # enter Server URL + API Key → auto-installs MCP
nothing inbox             # check messages
nothing send agent@example.com "Hello from Nothing"
```

### Self-hosted deployment

```bash
git clone https://github.com/Link817290/Nothing.git
cd Nothing/deploy
cp .env.example .env      # edit passwords and domain
docker compose up -d       # starts Server + PostgreSQL + Stalwart + Caddy + Web
```

Open `https://yourdomain.com`, register — first user becomes admin.

### Development

```bash
git clone https://github.com/Link817290/Nothing.git
cd Nothing
pnpm install

# Start PostgreSQL
cd packages/server && docker compose up -d db

# Start Server
DATABASE_URL="postgres://nothing:nothing@localhost:5432/nothing" \
JWT_SECRET="dev" ENCRYPT_KEY="dev" node dist/index.js

# Start Web
cd packages/web && npm run dev
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `nothing init` | Connect to server + auto-install MCP |
| `nothing inbox` | Check inbox (filters: --channel, --source, --agent, --project) |
| `nothing send <to> <text>` | Send a message |
| `nothing read <id>` | Read message detail |
| `nothing reply <id> <text>` | Reply to a message |
| `nothing sent` | Check sent messages |
| `nothing projects` | List projects |
| `nothing report` | Generate activity report |
| `nothing status` | Show connection status |
| `nothing reset` | Reset local config |

## MCP Tools

After `nothing init`, these tools are available to AI agents (Claude Code, Cursor, etc.):

| Tool | Trigger |
|------|---------|
| `nothing_send` | "send to", "email", "notify" |
| `nothing_inbox` | "check mail", "any messages" |
| `nothing_read` | "open that message", "read it" |
| `nothing_reply` | "reply", "respond" |
| `nothing_sent` | "delivery status" |
| `nothing_projects` | "project overview" |
| `nothing_report` | "weekly summary", "report" |

## NMP Protocol

Nothing Message Protocol — an AI-native communication layer on top of standard email.

### 4-Layer Message Structure

```
Layer 1: text/plain          ← Human-readable summary
Layer 2: nmp.md (attachment) ← Agent-readable Markdown
Layer 3: nmp.json (attachment) ← Machine-readable JSON metadata
Layer 4: user attachments    ← Files, images, etc.
```

### Email Headers

```
X-NMP-Version: 1
X-NMP-Type: nmp:chat | nmp:task | nmp:code-review | nmp:report | ...
X-NMP-Agent: claude-code
X-NMP-Project: my-project
X-NMP-Priority: urgent | high | normal | low
X-NMP-Labels: bug, frontend
X-NMP-Conversation-Id: conv_xxx
```

### Using the NMP Library

```bash
npm i @nothingmail/nmp
```

```typescript
import { NmpBuilder, parseNmpEmail } from '@nothingmail/nmp'

// Build an NMP email
const email = NmpBuilder.create()
  .from('agent@example.com')
  .to('user@example.com')
  .subject('Code Review')
  .type('nmp:code-review')
  .agent('claude-code')
  .project('my-app')
  .body('Please review PR #42')
  .build()
// → Returns { from, to, subject, text, headers, attachments } for nodemailer

// Parse an NMP email
const result = parseNmpEmail(parsedEmail)
if (result.isNmp) {
  console.log(result.message.payload.type)   // 'nmp:code-review'
  console.log(result.message.payload.agent)  // 'claude-code'
  console.log(result.message.content)        // markdown content
}
```

### Extensible Types

Types use `namespace:type` format. Built-in types use `nmp:` prefix:

`nmp:chat` · `nmp:task` · `nmp:reply` · `nmp:notification` · `nmp:code-review` · `nmp:report` · `nmp:approval` · `nmp:escalation` · `nmp:error` · `nmp:ack`

Third parties can register custom types like `myapp:deploy-request`.

## Server API

### Auth (public)
- `POST /api/auth/register` — Register (first user becomes admin)
- `POST /api/auth/login` — Login (returns JWT)

### User (requires API Key or JWT)
- `GET /api/me` — Current user info
- `PUT /api/me` — Update profile
- `GET/POST/DELETE /api/keys` — API key management
- `GET/POST/DELETE /api/accounts` — Email account management
- `POST /api/accounts/:id/sync` — Sync emails (async, returns task_id)
- `POST /api/accounts/:id/test` — Test SMTP/IMAP connection
- `GET /api/tasks/:id` — Check task progress

### Messages
- `POST /api/messages/send` — Send message
- `GET /api/messages/inbox` — Inbox (filters: unread, project, channel, source, agent)
- `GET /api/messages/sent` — Sent messages
- `GET /api/messages/:id` — Read message
- `POST /api/messages/:id/reply` — Reply
- `POST /api/messages/:id/forward` — Forward
- `PUT /api/messages/:id/read` — Mark read/unread
- `DELETE /api/messages/:id` — Delete
- `GET /api/messages/search?q=` — Search
- `GET /api/threads/:id` — Thread view
- `GET /api/projects` — Projects
- `GET /api/reports` — Activity report

### Admin
- `GET /api/admin/users` — List users
- `POST /api/admin/users/:id/ban` — Ban user
- `GET/PUT /api/admin/settings` — Server settings
- `GET /api/admin/status` — Server status
- `DELETE /api/admin/messages` — Clear all messages
- `POST /api/admin/reset` — Full reset
- `GET/POST/DELETE /api/admin/domains` — Domain management (Stalwart)
- `GET/POST/DELETE /api/admin/mailboxes` — Mailbox management (Stalwart)

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@nothingmail/nmp` | [![npm](https://img.shields.io/npm/v/@nothingmail/nmp)](https://www.npmjs.com/package/@nothingmail/nmp) | NMP protocol library |
| `nothing-cli` | [![npm](https://img.shields.io/npm/v/nothing-cli)](https://www.npmjs.com/package/nothing-cli) | CLI + MCP server |
| `@nothingmail/server` | private | Server (Docker deploy) |
| `@nothingmail/web` | private | Web dashboard |

## License

MIT

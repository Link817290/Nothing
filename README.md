# Nothing

AI Agent email platform, powered by NMP (Nothing Message Protocol).

Your Agent can send, receive, and reply to emails — through any email account you already have.

## Quick Start

```bash
npm i -g nothing-cli
nothing init          # choose email provider, enter credentials
nothing start         # start local server
nothing mcp:install   # configure Claude Code / Cursor
```

## What it does

- **Send**: Your Agent sends structured NMP messages through Gmail, Outlook, QQ, or Nothing
- **Receive**: IMAP sync pulls emails into a local SQLite database
- **Read**: Agent reads messages with full context (project, labels, threads)
- **Reply**: Agent replies within threads, inheriting project and labels
- **Report**: Weekly activity reports across all projects

## CLI

```bash
nothing send bob@gmail.com "Check this backoff logic" --project backend --file src/session.ts
nothing inbox                        # all unread
nothing inbox --channel gmail        # only Gmail
nothing inbox --from cursor          # only from Cursor
nothing inbox --project backend      # only backend project
nothing read <id>                    # full message
nothing reply <id> "Fixed it"        # reply in thread
nothing projects                     # list all projects
nothing report                       # weekly report
```

## MCP Tools

Configure in Claude Code / Cursor — 7 tools available:

| Tool | Description |
|------|-------------|
| `nothing_send` | Send a message with attachments, project tags, capability requirements |
| `nothing_inbox` | List inbox with filters (channel, source, from, project, label) |
| `nothing_sent` | Sent messages with delivery status tracking |
| `nothing_read` | Read full message content and attachments |
| `nothing_reply` | Reply in thread |
| `nothing_projects` | List all projects with stats |
| `nothing_report` | Generate activity report |

## NMP Protocol

Nothing Message Protocol — an AI-native communication protocol built on standard email.

- **AI-optimized**: Markdown-KV format (60.7% accuracy, highest in benchmarks)
- **Three-layer message**: text/plain (human) + nmp.md (AI) + JSON (machine)
- **Reply Schema**: sender defines expected reply structure
- **Capability negotiation**: agents declare what they can do

See [docs/nmp-spec.md](docs/nmp-spec.md) for the full specification.

## Architecture

```
nothing-cli (npm package)
├── CLI commands (14)
├── MCP Server (7 tools)
├── Embedded Fastify API
├── SQLite database (~/.nothing/data.db)
├── SMTP sending (nodemailer)
└── IMAP polling (imapflow + mailparser)
```

Monorepo with 3 packages:

| Package | Purpose | Published |
|---------|---------|-----------|
| `@nothingmail/nmp` | NMP protocol SDK (types, parser, validator, schemas) | npm |
| `nothing-cli` | CLI + MCP Server + embedded API | npm |
| `packages/api` | Self-hosted backend (Stalwart + PostgreSQL) — future | — |

## License

MIT

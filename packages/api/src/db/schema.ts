// Drizzle ORM schema
// Tables: users, tokens, channels, messages

// users
//   id, handle, display_name, github_id, github_username, created_at

// tokens
//   id, user_id, name, token_hash, permissions[], expires_at, last_used, revoked, created_at

// channels
//   id, user_id, name, type (nothing/smtp/stalwart/local),
//   email, smtp_host, smtp_port, imap_host, imap_port,
//   credentials (encrypted), is_primary, is_active, created_at

// messages
//   id, from_user_id, to_address, subject, content, json_payload,
//   project, labels[], channel_id → channels.id,
//   status (queued/sent/delivered/read/replied/failed),
//   source (nmp/external), thread_id, parent_id,
//   has_attachments, read, created_at, updated_at

# 04 — MCP Server

## 定位

MCP Server 是用户唯一需要安装的东西。它同时是：
- Claude Code / Cursor / Codex 的 MCP Server（Agent 调用）
- 命令行工具（人直接用）

一个安装，两个皮肤。

**核心变化：CLI / MCP 不再直连 SMTP/IMAP，所有操作通过 Nothing API 完成。** CLI 是纯 HTTP 客户端。

## 安装与登录

```bash
# 安装
npm i -g nothing

# 登录（写入 ~/.nothing/config.json）
nothing login ntk_live_xxxxx

# 验证
nothing whoami
# → link@nothing.email
```

## 配置到 Agent

### Claude Code

`~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nothing": {
      "command": "nothing",
      "args": ["mcp"]
    }
  }
}
```

不需要传 token，MCP Server 自动读 `~/.nothing/config.json`。

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "nothing": {
      "command": "nothing",
      "args": ["mcp"]
    }
  }
}
```

### 环境变量覆盖（CI / 无交互环境）

```json
{
  "mcpServers": {
    "nothing": {
      "command": "nothing",
      "args": ["mcp"],
      "env": {
        "NOTHING_TOKEN": "ntk_live_xxxxx"
      }
    }
  }
}
```

## MCP Tools

### 总览

| Tool | 用途 | 对应 CLI | API 端点 |
|------|------|---------|---------|
| `nothing_send` | 发消息 | `nothing send` | `POST /api/messages/send` |
| `nothing_inbox` | 查收件箱 | `nothing inbox` | `GET /api/messages/inbox` |
| `nothing_sent` | 查发件箱 + 投递状态 | `nothing sent` | `GET /api/messages/sent` |
| `nothing_read` | 读一条消息 | `nothing read` | `GET /api/messages/:id` |
| `nothing_reply` | 回复消息 | `nothing reply` | `POST /api/messages/:id/reply` |
| `nothing_projects` | 列出项目 | `nothing projects` | `GET /api/projects` |

6 个 tool，全部通过 HTTP 调用 API。

### nothing_send

发送消息给指定收件人。

```typescript
// MCP Tool 定义
{
  name: "nothing_send",
  description: "发送消息给另一个用户。可以附带文件。",
  inputSchema: {
    type: "object",
    properties: {
      to:      { type: "string", description: "收件人地址，如 bob@nothing.email" },
      text:    { type: "string", description: "消息正文" },
      subject: { type: "string", description: "主题，可选，默认取 text 前 50 字符" },
      files:   { type: "array", items: { type: "string" }, description: "附件文件路径列表" },
      project: { type: "string", description: "所属项目，可选" },
      labels:  { type: "array", items: { type: "string" }, description: "标签列表，可选" },
      ack:     { type: "boolean", description: "是否需要回执，默认 false" }
    },
    required: ["to", "text"]
  }
}
```

Agent 调用示例：

```
用户: 把 src/session.ts 发给 bob，告诉他退避逻辑有问题

Agent 调用:
nothing_send({
  to: "bob@nothing.email",
  text: "这个退避逻辑有问题，第22行应该用指数退避",
  files: ["src/session.ts"],
  project: "backend-refactor"
})

返回: { "success": true, "message_id": "msg_01HX9K2N", "status": "queued" }
```

对应 CLI：

```bash
nothing send bob@nothing.email "这个退避逻辑有问题" --file src/session.ts --project backend-refactor
```

### nothing_inbox

查看收件箱。

```typescript
{
  name: "nothing_inbox",
  description: "查看收件箱消息列表。",
  inputSchema: {
    type: "object",
    properties: {
      unread:  { type: "boolean", description: "只看未读，默认 true" },
      project: { type: "string", description: "按项目过滤" },
      label:   { type: "string", description: "按标签过滤" },
      limit:   { type: "number", description: "返回条数，默认 20" }
    }
  }
}
```

返回：

```json
{
  "messages": [
    {
      "id": "msg_01HX9K2N",
      "from": "bob@nothing.email",
      "subject": "Re: 这个退避逻辑有问题",
      "preview": "你说得对，应该用 2**attempt...",
      "date": "2025-11-26T15:00:00Z",
      "unread": true,
      "has_attachments": false,
      "project": "backend-refactor",
      "labels": ["code-review"],
      "thread_count": 3
    }
  ],
  "total_unread": 5
}
```

所有过滤（project、label、unread）在 API 端用 SQL 索引完成，毫秒级返回。

对应 CLI：

```bash
nothing inbox
nothing inbox --project backend-refactor
nothing inbox --unread --limit 5
```

### nothing_sent

查看发件箱和投递状态。

```typescript
{
  name: "nothing_sent",
  description: "查看已发送的消息及投递状态。",
  inputSchema: {
    type: "object",
    properties: {
      limit:   { type: "number", description: "返回条数，默认 20" },
      project: { type: "string", description: "按项目过滤" }
    }
  }
}
```

返回：

```json
{
  "messages": [
    {
      "id": "msg_01HX9K1M",
      "to": "bob@nothing.email",
      "subject": "这个退避逻辑有问题",
      "preview": "这个退避逻辑有问题，第22行...",
      "date": "2025-11-26T14:32:00Z",
      "status": "replied",
      "has_attachments": true,
      "project": "backend-refactor"
    },
    {
      "id": "msg_01HX9K3P",
      "to": "alice@nothing.email",
      "subject": "Redis 连接池配置",
      "preview": "你们的 Redis 连接池...",
      "date": "2025-11-26T14:00:00Z",
      "status": "delivered",
      "has_attachments": false
    }
  ]
}
```

status 取值：`queued` / `sent` / `delivered` / `failed` / `replied`

投递状态由 API 在 messages 表中实时追踪更新。

对应 CLI：

```bash
nothing sent
nothing sent --project backend-refactor
```

### nothing_read

读取一条消息的完整内容和附件。

```typescript
{
  name: "nothing_read",
  description: "读取一条消息的完整内容，包括附件。",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "消息 ID" }
    },
    required: ["id"]
  }
}
```

返回：

```json
{
  "id": "msg_01HX9K2N",
  "from": "bob@nothing.email",
  "to": "link@nothing.email",
  "subject": "Re: 这个退避逻辑有问题",
  "date": "2025-11-26T15:00:00Z",
  "text": "你说得对，第22行应该用 100 * 2 ** attempt",
  "project": "backend-refactor",
  "labels": ["code-review"],
  "context": {
    "file": "src/session.ts",
    "lines": "20-35"
  },
  "attachments": [
    {
      "filename": "session.ts",
      "size": 1234,
      "url": "https://api.nothing.email/api/messages/msg_01HX9K2N/attachments/session.ts"
    }
  ],
  "thread": [
    { "id": "msg_01HX9K1M", "from": "link@nothing.email", "preview": "这个退避逻辑有问题..." },
    { "id": "msg_01HX9K2N", "from": "bob@nothing.email", "preview": "你说得对..." }
  ],
  "_source": "nothing"
}
```

附件通过 API URL 下载，CLI 自动下载到临时目录供 Agent 读取。

对应 CLI：

```bash
nothing read msg_01HX9K2N
```

### nothing_reply

回复一条消息。

```typescript
{
  name: "nothing_reply",
  description: "回复一条消息。自动处理线程关系。",
  inputSchema: {
    type: "object",
    properties: {
      id:    { type: "string", description: "要回复的消息 ID" },
      text:  { type: "string", description: "回复内容" },
      files: { type: "array", items: { type: "string" }, description: "附件文件路径列表" }
    },
    required: ["id", "text"]
  }
}
```

API 端自动设置 `In-Reply-To` 和 `References` header，自动继承 project 和 labels，自动关联 thread_id。

对应 CLI：

```bash
nothing reply msg_01HX9K2N "好的我改一下"
nothing reply msg_01HX9K2N "改好了，看附件" --file src/session.ts
```

### nothing_projects

列出所有项目。

```typescript
{
  name: "nothing_projects",
  description: "列出所有项目及其消息统计。",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

返回：

```json
{
  "projects": [
    { "name": "backend-refactor", "total": 15, "unread": 3, "last_activity": "2025-11-26T15:00:00Z" },
    { "name": "infrastructure", "total": 8, "unread": 0, "last_activity": "2025-11-25T10:00:00Z" }
  ]
}
```

API 端通过 messages 表的 project 字段 GROUP BY 查询，毫秒级返回。

对应 CLI：

```bash
nothing projects
```

## 内部架构

```
nothing (CLI / MCP 入口)
  │
  ├── nothing mcp        → 启动 MCP Server（stdio 模式）
  ├── nothing send ...   → CLI 命令
  ├── nothing inbox ...  → CLI 命令
  └── nothing login ...  → 写 config
  │
  ├── src/
  │   ├── index.ts           入口，判断 mcp 还是 cli
  │   ├── api.ts             HTTP 客户端，封装所有 API 调用
  │   ├── cli/
  │   │   ├── login.ts       登录，写 config
  │   │   ├── send.ts        发送命令
  │   │   ├── inbox.ts       收件箱命令
  │   │   ├── read.ts        读取命令
  │   │   ├── reply.ts       回复命令
  │   │   ├── projects.ts    项目列表命令
  │   │   └── whoami.ts      查看当前账号
  │   └── mcp/
  │       └── server.ts      MCP Server，注册 6 个 tool
  ├── package.json
  └── tsconfig.json
```

### 核心依赖

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "commander": "^12.x"
  }
}
```

2 个依赖。不再需要 nodemailer 和 imapflow——所有邮件操作通过 API 完成。

## 核心流程

### 发送流程

```
Agent 调用 nothing_send
  ↓
cli/api.ts — HTTP POST /api/messages/send（带 Token 认证）
  ↓
API 端处理：
  ├── 校验 Token 权限（需要 send 权限）
  ├── 检查每日配额（50 条/天）
  ├── 写入 messages 表（status: queued）
  ├── 调用 core/smtp.ts 发送 MIME 邮件
  ├── 更新 messages 表（status: sent / failed）
  └── 返回 message_id + status
  ↓
CLI 返回结果给 Agent
```

### 接收流程（Nothing 内部消息）

Nothing 用户之间的消息不需要经过 IMAP：

```
用户 A 调用 nothing_send 发给用户 B
  ↓
API 端：
  ├── 写入 messages 表（发件方记录 + 收件方记录）
  ├── 调用 Stalwart SMTP 发送（邮件协议层备份）
  └── 收件方 messages 表直接有数据
  ↓
用户 B 调用 nothing_inbox
  ↓
API 端：SELECT * FROM messages WHERE to_user_id = B AND unread = true
  ↓
毫秒级返回
```

### 接收流程（外部邮件）

外部邮箱（Gmail、Outlook）发给 Nothing 用户的邮件：

```
外部邮件 → Stalwart SMTP 接收（25 端口）
  ↓
API 定时轮询 Stalwart IMAP / Stalwart webhook 通知
  ↓
API 端：
  ├── 解析 MIME 邮件
  ├── 有 X-Nothing-Version → 提取 JSON payload
  ├── 没有 → 构造虚拟 JSON（_source: "external"）
  ├── 写入 messages 表
  └── 提取附件 → 存储到本地/对象存储
  ↓
用户调用 nothing_inbox 时正常查到
```

### 认证流程

```
CLI 启动
  ↓
读 ~/.nothing/config.json 中的 token
  ↓
每次 API 请求在 Header 中带上 Token：
  Authorization: Bearer ntk_live_xxxxx
  ↓
API 端验证 Token 有效性 + 权限
```

不再需要 Token exchange 换 SMTP/IMAP 凭证。Token 直接用于 API 认证。

## CLI 输出格式

### nothing inbox

```
  #   From                    Subject                          Date           Status
  1   bob@nothing.email       Re: 退避逻辑有问题                2 分钟前        ● 未读
  2   alice@nothing.email     Redis 连接池配置                  1 小时前        ○ 已读
  3   charlie@nothing.email   部署完成通知                      3 小时前        ○ 已读

  未读: 1 / 共: 3
```

### nothing read 1

```
  From:    bob@nothing.email
  Date:    2025-11-26 15:00
  Subject: Re: 退避逻辑有问题
  Project: backend-refactor
  Labels:  code-review

  你说得对，第22行应该用 100 * 2 ** attempt。
  线性退避在高并发下基本没用。

  Attachments:
    [1] session.ts (1.2 KB) → /tmp/nothing/msg_01HX9K2N/session.ts
```

### nothing send

```
  ✓ 已发送给 bob@nothing.email
  Message-ID: msg_01HX9K2N
  附件: session.ts (1.2 KB)
```

## 错误处理

| 错误 | MCP 返回 | CLI 提示 |
|------|---------|---------|
| Token 无效/过期 | `{ error: "auth_failed", message: "Token 无效，请重新 nothing login" }` | 同左 |
| Token 权限不足 | `{ error: "permission_denied", message: "该 Token 无 send 权限" }` | 同左 |
| 收件人不存在 | `{ error: "recipient_not_found", message: "bob@nothing.email 不存在" }` | 同左 |
| 附件太大 | `{ error: "file_too_large", message: "session.ts 超过 5MB 限制" }` | 同左 |
| 超过每日配额 | `{ error: "quota_exceeded", message: "今日已发 50 条，升级 Pro 增加配额" }` | 同左 |
| API 不可用 | `{ error: "server_error", message: "服务器暂时不可用，请稍后重试" }` | 同左 |

## 本地缓存

`~/.nothing/` 目录结构：

```
~/.nothing/
├── config.json          Token + 用户信息 + API 地址
└── tmp/
    └── msg_01HX9K2N/    CLI 下载的附件临时存储
        └── session.ts
```

不再需要 credentials.json 缓存 SMTP/IMAP 凭证。

临时附件 7 天后自动清理。

## 发布

```bash
# npm 发布
npm publish -g nothing

# 用户安装
npm i -g nothing

# 或 npx 免安装使用
npx nothing inbox
```

package.json 中的 bin 字段：

```json
{
  "name": "nothing",
  "bin": {
    "nothing": "./dist/index.js"
  }
}
```

## 下一步

MCP Server 完成后，需要设计**自定义域名**（下一篇），让付费用户绑定自己的域名。

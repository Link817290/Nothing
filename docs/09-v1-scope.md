# 09 — v1 范围定义

## v1 目标

用户部署 Nothing（或注册官方平台），Agent 能收发 NMP 消息。最小闭环跑通。

## 两种部署模式

| 模式 | 谁用 | 需要什么 | 邮箱地址 |
|------|------|---------|---------|
| **自建模式** | 企业/技术用户 | 自有域名 + Stalwart | `handle@acme.com` |
| **邮箱模式** | 个人开发者 | 任意邮箱账号 | 原有邮箱地址 |

邮箱模式下可选 Nothing / Gmail / Outlook / QQ 等服务商。Nothing 邮箱是预设选项，比第三方邮箱多出 NMP 原生解析、服务端索引和投递状态追踪能力。

两种模式共享同一套代码，区别仅在 mail backend 配置。所有模式之间可互发（底层都是标准邮件 + NMP 协议）。

## 核心架构

API 网关模式：所有客户端（CLI / MCP / Web）统一通过 API 操作，不直连 SMTP/IMAP。

```
Agent / CLI / Web
       │
       ▼
   Nothing API（唯一入口）
       │
       ├── PostgreSQL（主数据源：用户、Token、消息、状态）
       └── Mail Backend（可切换）
           ├── Stalwart（自建模式）
           └── SMTP/IMAP（邮箱模式：Nothing / Gmail / Outlook / ...）
```

## v1 做什么

### NMP 协议 SDK（@nothingmail/nmp）

- 协议类型定义（NmpMessage, NmpType, NmpStatus...）
- nmp.md 生成 + 解析（Markdown-KV 格式）
- 预定义 Reply Schema（code-review, approval, bug-report...）
- 消息合规检查 + 合规等级判断
- MCP tool 定义（纯 JSON，6 个 tools）
- API 请求/响应类型
- 零依赖，独立发布到 npm

### 邮件服务器（仅自建模式）

- Stalwart Docker 部署
- 单域名
- SMTP/IMAP 配置
- SPF / DKIM / DMARC 配置
- TLS 证书（Caddy 自动签发）
- 邮件送达率验证（mail-tester.com ≥ 9/10）

### 账号系统

- 自建模式：GitHub OAuth 注册登录 + handle 选择
- 邮箱模式：Setup 向导中创建本地账号
- Master Token 生成（可重新生成）
- App Token CRUD（创建、吊销、列表）
- 限制：100MB 存储 / 50 条消息每天

### 数据库（PostgreSQL）

核心表：

```
users       — 用户账号（handle、github_id、created_at）
tokens      — API Token（token_hash、permissions、expires_at）
channels    — 渠道配置（name、type、email、smtp/imap 配置、is_primary、is_active）
messages    — 消息记录（from、to、subject、content、json_payload、project、labels、channel_id→channels、status、thread_id）
```

### 消息格式（NMP 协议）

四层结构：
- Part 1: text/plain — 人类可读摘要
- Part 2: nmp.md 附件 — Agent 可读（Markdown-KV，benchmark 准确率最高）
- Part 3: application/json — 程序可解析元数据（不含正文）
- Part 4+: 用户附件

NMP 扩展头：X-NMP-Version, X-NMP-Type, X-NMP-Project, X-NMP-Labels, X-NMP-Priority, X-NMP-Expires, X-NMP-Capabilities, X-NMP-Require, X-NMP-Reply-Schema

4 种消息类型：share / question / reply / notify

### 消息投递状态

6 种状态：queued → sent → delivered → read → replied / failed

由 API 在 messages 表中实时追踪更新。

### MCP Server + CLI

一个 npm 包（nothing-cli），两个皮肤。纯 HTTP 客户端。

```bash
npm i -g nothing-cli
```

MCP Tools（6 个）：
- nothing_send — 发消息
- nothing_inbox — 查收件箱
- nothing_sent — 查发件箱 + 投递状态
- nothing_read — 读消息
- nothing_reply — 回复消息
- nothing_projects — 列出项目

CLI 命令（7 个）：
- nothing login — 登录
- nothing send — 发送
- nothing inbox — 收件箱
- nothing read — 读取
- nothing reply — 回复
- nothing projects — 项目列表
- nothing whoami — 查看当前账号

### 用户面板（Web）

初始化向导 `/setup`：
- Step 1: 选择部署模式（自建 / 邮箱）
- Step 2A: 域名 + DNS 配置（自建模式）
- Step 2B: 邮箱凭证配置（邮箱模式，Nothing/Gmail/Outlook/QQ/自定义）
- Step 3A: GitHub OAuth 配置（自建模式）
- Step 3B: 创建本地账号（邮箱模式）
- Step 4A: 管理员账号（自建模式）
- Step 5: 完成 + CLI/MCP 安装引导

Dashboard 5 个页面：
- Inbox — 收件箱（支持 project/label/unread/channel 过滤，5 种边界状态）
- Sent — 发件箱（含投递状态 + 渠道标签 Via）
- Compose — 写邮件（双栏：正文 + 代码上下文，Reply Schema 选择）
- Tokens — Token 创建、查看、吊销
- Settings — 个人信息、实例信息、用量、危险操作

全局组件：
- Command Palette（⌘K）— 全局搜索 + 快捷导航
- 通知中心 — 按时间分组，5 种通知类型
- Toast — 6 种投递状态 + 操作反馈
- 移动端响应式适配

### 后端 API

```
# 认证
POST   /api/auth/github            GitHub OAuth（自建模式）

# 账号
GET    /api/account                账号信息
GET    /api/account/check-handle   检查 handle 可用性（自建模式）
POST   /api/account/register       创建账号
GET    /api/account/usage          用量查询

# Token
GET    /api/account/tokens         Token 列表
POST   /api/account/tokens         创建 Token
DELETE /api/account/tokens/:id     吊销 Token

# 消息（核心）
POST   /api/messages/send          发送消息
GET    /api/messages/inbox         收件箱列表
GET    /api/messages/sent          发件箱列表
GET    /api/messages/:id           读取消息详情 + 附件
POST   /api/messages/:id/reply     回复消息
GET    /api/messages/:id/attachments/:filename  下载附件

# 项目
GET    /api/projects               项目列表 + 统计

# 渠道（邮箱配置）
GET    /api/channels               渠道列表
POST   /api/channels               添加渠道
PATCH  /api/channels/:id           更新渠道配置
DELETE /api/channels/:id           删除渠道
POST   /api/channels/:id/test      测试渠道连接（SMTP + IMAP）
PATCH  /api/channels/:id/primary   设为默认渠道

# Setup（首次部署）
GET    /api/setup/status           是否已初始化
POST   /api/setup/init             初始化实例配置
POST   /api/setup/verify-dns       验证 DNS 记录
```

### 部署

- 单机混合部署：Docker（Stalwart + PostgreSQL）+ PM2（Fastify API）+ Caddy（反向代理 + 静态文件托管）
- 邮箱模式不需要 Stalwart 和 Caddy，Docker + PM2 即可
- 最简备份：cron pg_dump，每日一次，保留 7 天

### Mail Backend 架构

邮箱模式支持同时配置多个邮箱，自动选路：
- 对方是 @nothing.email → 走 Nothing 邮箱
- 对方是 @gmail.com → 走 Gmail
- 默认走主邮箱

每条消息记录 `channel` 字段（nothing/gmail/outlook/qq/custom/local），UI 显示 Via 标签。

```
api/mail/
├── smtp.ts          统一发件接口（自动选路）
├── imap.ts          统一收件接口（轮询所有已配邮箱）
├── mime.ts          MIME 构造（调用 @nothingmail/nmp）
├── inbound.ts       外部邮件解析
└── backends/
    ├── stalwart.ts  自建模式（连接本地 Stalwart）
    └── external.ts  邮箱模式（连接 Gmail/Outlook SMTP/IMAP）
```

上层 routes/services 不关心邮件通过哪个 backend 发出。

## v1 不做什么

| 功能 | 推到 |
|------|------|
| 自定义域名（付费用户绑自己域名） | v2 |
| 信誉系统 | v2 |
| 管理员后台 | v2 |
| 付费订阅 | v2 |
| 自动备份（S3） | v2 |
| 用量统计图表 | v2 |
| E2E 加密 | v2 |
| Agent 市场 | v3 |
| 群组 | v3 |
| 任务委派工作流 | v3 |
| 联邦化 / 自建节点互发现 | v3 |
| 项目树 | v3 |

## 技术栈

| 层 | 选型 |
|---|---|
| 语言 | TypeScript |
| NMP 协议 SDK | @nothingmail/nmp（零依赖） |
| 邮件服务器 | Stalwart（自建模式）/ Gmail/Outlook（邮箱模式） |
| 后端 | Fastify |
| 前端 | React + Vite（纯 SPA 静态文件） |
| 数据库 | PostgreSQL |
| ORM | Drizzle |
| MCP SDK | @modelcontextprotocol/sdk |
| SMTP（API 内部） | nodemailer |
| IMAP（API 内部） | imapflow |
| CLI | commander |
| 反向代理 | Caddy（自建模式） |
| 进程管理 | PM2 |
| 容器 | Docker Compose |
| 包管理 | pnpm workspace |
| 构建 | tsup |
| 测试 | vitest |

## 开发顺序

```
第 1 步: NMP 协议 SDK（@nothingmail/nmp）           ✅ 已完成
第 2 步: 项目骨架（monorepo + 4 个包）           ✅ 已完成
第 3 步: 数据库 schema + 后端 API（账号、Token）  (2 天)
第 4 步: 后端 API（消息收发、状态追踪）           (2 天)
第 5 步: Mail Backend（stalwart + external）     (1.5 天)
第 6 步: MCP Server + CLI（纯 HTTP 客户端）      (1.5 天)
第 7 步: 前端 — Setup 向导 + Dashboard           (2 天)
第 8 步: 联调测试 + 修 bug                       (1.5 天)

总计: ~11 天（剩余）
```

# 00 — 技术选型总览

## 全局技术栈

| 层 | 选型 | 版本 | 理由 |
|---|---|---|---|
| **语言** | TypeScript | 5.x | 全栈统一，前后端 + CLI + MCP 一套语言 |
| **邮件服务器** | Stalwart | latest | 唯一有 REST API 管账号的开源方案，Rust 编写 |
| **后端 API** | Fastify | 5.x | 性能好，插件生态全，TypeScript 原生支持 |
| **前端** | React + Vite | React 19.x, Vite 6.x | 纯 SPA，构建为静态文件，Caddy 直接托管，零运行时内存占用 |
| **数据库** | PostgreSQL | 16 | 可靠，生态成熟 |
| **ORM** | Drizzle | latest | 轻量，TypeScript 原生，SQL-like |
| **MCP SDK** | @modelcontextprotocol/sdk | 1.x | Anthropic 官方 SDK |
| **SMTP 客户端** | nodemailer | 6.x | Node.js 最成熟的邮件发送库（API 内部使用） |
| **IMAP 客户端** | imapflow | 1.x | 现代 IMAP 库，Promise API（API 内部使用） |
| **CLI 框架** | commander | 12.x | 最主流的 Node.js CLI 框架 |
| **反向代理** | Caddy | 2.x | TLS 证书自动签发和续期 |
| **容器** | Docker Compose | 3.8 | 单机部署，简单可靠 |
| **包管理** | pnpm workspace | latest | monorepo 管理 |

## 核心架构：API 网关模式

所有操作（发消息、收消息、查状态）统一经过 API，CLI/MCP 不直连 SMTP/IMAP。

```
Agent / CLI / Web（所有客户端）
       │
       ▼
   Nothing API（唯一入口）
       │
       ├── PostgreSQL（主数据源：用户、Token、消息、状态）
       └── Stalwart（邮件收发通道：SMTP 发件、接收外部邮件）
```

### 为什么这样设计

| 能力 | CLI 直连 SMTP/IMAP（旧） | API 网关（当前） |
|------|------------------------|----------------|
| 按 project/label 查询 | 扫全部邮件，客户端过滤 | SQL 索引查询，毫秒级 |
| 投递状态追踪 | 无法实现 | messages 表实时更新 |
| 限流/配额 | CLI 绕过 API，管不住 | 统一在 API 层控制 |
| 线程聚合 | IMAP References 解析 | thread_id 直接查 |
| CLI 复杂度 | 需要 nodemailer + imapflow | 只需要 HTTP 请求 |

## 两种部署模式

| 模式 | 邮件后端 | 适合 |
|------|---------|------|
| **自建模式** | Stalwart（自有域名） | 企业/团队，多用户，NMP 原生节点 |
| **邮箱模式** | 任意邮箱 SMTP/IMAP（Nothing / Gmail / Outlook / QQ ...） | 个人开发者，单用户，最快上手 |

两种模式共享同一套代码，区别仅在 mail backend 配置。邮箱模式下 Nothing 邮箱是预设选项之一，比第三方邮箱多出 NMP 原生解析、服务端索引和投递状态追踪能力。

## 项目结构

```
nothing/
├── packages/
│   ├── nmp/              NMP 协议 SDK（发布 @nothing/nmp，零依赖）
│   │   ├── src/
│   │   │   ├── types.ts      协议类型
│   │   │   ├── markdown.ts   nmp.md 生成 + 解析
│   │   │   ├── schemas.ts    预定义 Reply Schema
│   │   │   ├── validate.ts   消息合规检查
│   │   │   ├── tools.ts      MCP tool 定义（纯 JSON）
│   │   │   └── api/
│   │   │       ├── types.ts  API 请求/响应类型
│   │   │       └── auth.ts   认证相关类型
│   │   └── package.json
│   │
│   ├── api/              Fastify 后端（唯一网关）
│   │   ├── routes/
│   │   │   ├── auth.ts       GitHub OAuth + 登录
│   │   │   ├── account.ts    账号信息
│   │   │   ├── tokens.ts     Token CRUD
│   │   │   ├── messages.ts   发送、收件箱、发件箱、读取、回复
│   │   │   └── projects.ts   项目列表
│   │   ├── plugins/
│   │   │   ├── jwt.ts        JWT 认证
│   │   │   └── ratelimit.ts  限流
│   │   ├── services/
│   │   │   ├── account.ts    账号逻辑
│   │   │   └── message.ts    消息逻辑
│   │   ├── mail/
│   │   │   ├── smtp.ts       统一发件接口
│   │   │   ├── imap.ts       统一收件接口
│   │   │   ├── mime.ts       MIME 构造（调用 @nothing/nmp）
│   │   │   ├── inbound.ts    外部邮件解析
│   │   │   └── backends/
│   │   │       ├── stalwart.ts   自建模式后端
│   │   │       └── external.ts   邮箱模式后端（Gmail/Outlook）
│   │   ├── db/
│   │   │   └── schema.ts     Drizzle schema（users, tokens, messages）
│   │   └── server.ts         Fastify 入口
│   │
│   ├── web/              React + Vite 前端（纯 SPA，构建为静态文件）
│   │   ├── src/
│   │   │   ├── main.tsx           入口
│   │   │   ├── router.tsx         路由配置（react-router）
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx       首页 / 注册
│   │   │   │   ├── AuthCallback.tsx  GitHub OAuth 回调
│   │   │   │   ├── Setup.tsx      初始化向导（首次部署）
│   │   │   │   ├── Inbox.tsx      收件箱
│   │   │   │   ├── Sent.tsx       发件箱
│   │   │   │   ├── Tokens.tsx     Token 管理
│   │   │   │   └── Settings.tsx   账号设置
│   │   │   └── components/
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── cli/              CLI + MCP Server（纯 HTTP 客户端）
│       ├── src/
│       │   ├── index.ts       入口，判断 mcp 还是 cli
│       │   ├── api.ts         HTTP 客户端，封装所有 API 调用
│       │   ├── mcp/
│       │   │   └── server.ts  MCP Server，注册 6 个 tool
│       │   └── commands/
│       │       ├── login.ts   登录
│       │       ├── send.ts    发送
│       │       ├── inbox.ts   收件箱
│       │       ├── read.ts    读取
│       │       ├── reply.ts   回复
│       │       ├── projects.ts 项目列表
│       │       └── whoami.ts  查看当前账号
│       └── package.json
│
├── docker-compose.yml     部署配置（Stalwart + PostgreSQL）
├── Caddyfile              反向代理配置
├── ecosystem.config.js    PM2 配置
├── pnpm-workspace.yaml    monorepo 配置
├── package.json
└── tsconfig.json
```

## 包依赖关系

```
nmp（零依赖，独立发布 @nothing/nmp）
 ↑
 ├── api  (nmp + fastify + nodemailer + imapflow + drizzle)
 ├── cli  (nmp + @modelcontextprotocol/sdk + commander)
 └── web  (nmp + react + vite)
```

## 各包核心依赖

### packages/nmp

```json
{
  "dependencies": {
  }
}
```

零依赖。纯 TypeScript 类型 + 字符串操作。

### packages/api

```json
{
  "dependencies": {
    "@nothing/nmp": "workspace:*",
    "fastify": "^5.x",
    "@fastify/jwt": "^9.x",
    "@fastify/cors": "^11.x",
    "@fastify/rate-limit": "^10.x",
    "drizzle-orm": "^0.x",
    "postgres": "^3.x",
    "nodemailer": "^6.x",
    "imapflow": "^1.x"
  }
}
```

### packages/web

```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-router": "^7.x",
    "tailwindcss": "^4.x",
    "@shadcn/ui": "latest"
  },
  "devDependencies": {
    "vite": "^6.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

### packages/cli

```json
{
  "dependencies": {
    "@nothing/nmp": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.x",
    "commander": "^13.x"
  }
}
```

纯 HTTP 客户端，不依赖 nodemailer/imapflow。MCP tool 定义从 @nothing/nmp 导入。

## 开发环境

```bash
# 安装依赖
pnpm install

# 启动基础设施（本地开发用）
docker compose up stalwart postgres -d

# 启动 API（开发模式）
pnpm --filter api dev

# 启动前端（开发模式，Vite dev server）
pnpm --filter web dev

# 测试 CLI
pnpm --filter cli dev -- inbox

# 测试 MCP Server
pnpm --filter cli dev -- mcp
```

## 部署

```bash
# 生产构建（web 输出到 packages/web/dist/ 静态文件）
pnpm build

# 基础设施启动（Stalwart + PostgreSQL）
docker compose up -d

# API 启动（PM2）
pm2 start ecosystem.config.js

# 前端部署（静态文件复制到 Caddy 托管目录）
cp -r packages/web/dist/* /srv/web/

# CLI 发布到 npm
pnpm --filter cli publish
```

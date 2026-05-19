# 08 — 部署与运维

## 整体架构

```
腾讯云香港 VPS (2C2G)
│
├── Docker（基础设施）
│   ├── Stalwart ──── 邮件服务器（SMTP/IMAP）
│   └── PostgreSQL ── 数据库
│
├── PM2（Node.js 进程管理）
│   └── Fastify API ── 后端服务（localhost:3000）
│
├── Caddy（系统服务，apt 安装）
│   ├── nothing.email      → 托管前端静态文件
│   └── api.nothing.email  → 反向代理到 localhost:3000
│
└── 前端静态文件（/srv/web/）
    └── React + Vite 构建产物，无进程，Caddy 直接托管
```

外部访问路径：

```
用户 Agent (MCP Server)
    │
    ├── SMTP (587/465) ──→ Stalwart（Docker）
    ├── IMAP (993) ──────→ Stalwart（Docker）
    ├── HTTPS API ───────→ Caddy → Fastify API（PM2）
    └── HTTPS Web ───────→ Caddy → 静态文件（/srv/web/）
```

## v1 单机部署

### 服务器配置

| 项目 | 配置 |
|------|------|
| VPS | 腾讯云香港轻量应用服务器，2C2G，40GB SSD |
| 系统 | Ubuntu 24.04 |
| 位置 | 香港（国内访问延迟低，无需备案，25 端口不封） |
| 成本 | ~¥24/月（¥288/年） |

### 内存预估

```
Stalwart (Docker)    ~200MB
PostgreSQL (Docker)  ~100MB
Fastify API (PM2)    ~80MB
Caddy (systemd)      ~20MB
系统占用              ~300MB
─────────────────────────────
合计                 ~700MB，剩余 ~1.3GB
```

### 为什么混合部署

| 组件 | 方式 | 理由 |
|------|------|------|
| Stalwart | Docker | 安装配置复杂，Docker 一行搞定 |
| PostgreSQL | Docker | 同上 |
| Fastify API | PM2 | Node.js 进程，PM2 比 Docker 省 ~100MB 内存 |
| Caddy | apt + systemd | 系统级反向代理，apt 安装最稳定 |
| Web 前端 | 静态文件 | 无进程，Caddy 直接托管 |

## Docker Compose（仅基础设施）

```yaml
version: "3.8"

services:
  stalwart:
    image: stalwartlabs/mail-server:latest
    container_name: nothing-mail
    restart: always
    ports:
      - "25:25"
      - "465:465"
      - "587:587"
      - "993:993"
    volumes:
      - ./data/stalwart:/opt/stalwart-mail

  postgres:
    image: postgres:16-alpine
    container_name: nothing-db
    restart: always
    environment:
      - POSTGRES_USER=nothing
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=nothing
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
```

PostgreSQL 只绑定 127.0.0.1，不暴露到公网。

## PM2 管理 API

```bash
# 安装 PM2
npm i -g pm2

# 启动 API
cd /opt/nothing/packages/api
pm2 start dist/server.js --name nothing-api

# 开机自启
pm2 startup
pm2 save

# 常用命令
pm2 status          # 查看状态
pm2 logs nothing-api # 查看日志
pm2 restart nothing-api # 重启
```

### PM2 ecosystem 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nothing-api',
    script: './packages/api/dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://nothing:password@127.0.0.1:5432/nothing',
      STALWART_API: 'http://127.0.0.1:443',
      STALWART_ADMIN_TOKEN: '',
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
      JWT_SECRET: ''
    },
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
```

## Caddy 配置

```bash
# 安装 Caddy（Ubuntu）
sudo apt install -y caddy
```

### Caddyfile

```
nothing.email {
    root * /srv/web
    try_files {path} /index.html
    file_server

    encode gzip
}

api.nothing.email {
    reverse_proxy localhost:3000
}

mail.nothing.email {
    respond "Nothing Mail Server" 200
}
```

Caddy 由 systemd 管理，自动申请和续期 TLS 证书。

## 环境变量

```bash
# .env（docker-compose 用）
DB_PASSWORD=xxx

# ecosystem.config.js 或系统环境变量（PM2 用）
STALWART_ADMIN_TOKEN=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=xxx
```

## 部署流程

### 首次部署

```bash
# 1. 服务器初始化
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 caddy nodejs npm
npm i -g pnpm pm2

# 2. 拉代码
cd /opt
git clone https://github.com/yourname/nothing.git
cd nothing

# 3. 启动基础设施
docker compose up -d

# 4. 构建并启动 API
pnpm install
pnpm --filter api build
pm2 start ecosystem.config.js
pm2 startup && pm2 save

# 5. 构建并部署前端
pnpm --filter web build
sudo mkdir -p /srv/web
sudo cp -r packages/web/dist/* /srv/web/

# 6. 配置 Caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

### 日常更新

```bash
# 更新代码
cd /opt/nothing && git pull

# 改了 API
pnpm --filter api build && pm2 restart nothing-api

# 改了前端
pnpm --filter web build && sudo cp -r packages/web/dist/* /srv/web/

# 改了基础设施配置
docker compose up -d
```

## 数据存储

| 数据 | 存在哪 | 路径 |
|------|--------|------|
| 邮件内容和附件 | Stalwart 本地存储 | `./data/stalwart/` |
| 用户账号、Token | PostgreSQL | `./data/postgres/` |
| TLS 证书 | Caddy 自动管理 | `/var/lib/caddy/` |
| 前端静态文件 | Caddy 托管 | `/srv/web/` |
| API 日志 | PM2 管理 | `~/.pm2/logs/` |

### 备份策略（v2）

v1 不做自动备份。v2 实现：

```bash
#!/bin/bash
# backup.sh — 每天凌晨 3 点 cron 执行

DATE=$(date +%Y%m%d)
BACKUP_DIR=/backup/$DATE

mkdir -p $BACKUP_DIR

# PostgreSQL
docker exec nothing-db pg_dump -U nothing nothing > $BACKUP_DIR/db.sql

# Stalwart 数据
tar czf $BACKUP_DIR/stalwart.tar.gz ./data/stalwart/

# 上传到 S3 / R2
aws s3 sync $BACKUP_DIR s3://nothing-backup/$DATE/

# 保留最近 30 天
find /backup -maxdepth 1 -mtime +30 -exec rm -rf {} \;
```

## 监控

### 需要监控的指标

| 指标 | 告警阈值 |
|------|---------|
| 磁盘使用 | > 80% |
| 内存使用 | > 85% |
| SMTP 队列积压 | > 100 封 |
| IMAP 连接数 | > 500 |
| API 响应时间 | > 2s |
| Stalwart 进程存活 | down |
| PostgreSQL 连接数 | > 80% max |
| TLS 证书过期 | < 7 天 |
| PM2 进程状态 | errored / stopped |

### 方案

v1 用 PM2 自带监控 + Uptime Kuma：

```bash
# PM2 自带监控
pm2 monit              # 实时监控
pm2 status             # 进程状态

# Uptime Kuma（可选，Docker 部署）
docker run -d --restart=always \
  --name nothing-monitor \
  -p 3001:3001 \
  -v ./data/uptime-kuma:/app/data \
  louislam/uptime-kuma:1
```

监控端点：
- `https://nothing.email` — 网站可用性
- `mail.nothing.email:587` — SMTP 可用性
- `mail.nothing.email:993` — IMAP 可用性
- `https://api.nothing.email/health` — API 健康检查

告警通过 Telegram Bot 或邮件通知。

## DNS 配置汇总

```
# A 记录
nothing.email.           A      <服务器IP>
mail.nothing.email.      A      <服务器IP>
api.nothing.email.       A      <服务器IP>

# MX 记录
nothing.email.           MX     10  mail.nothing.email.

# 邮件安全
nothing.email.           TXT    "v=spf1 ip4:<服务器IP> -all"
_dmarc.nothing.email.    TXT    "v=DMARC1; p=reject; rua=mailto:dmarc@nothing.email"
default._domainkey.nothing.email.  TXT  "v=DKIM1; k=rsa; p=..."

# MTA-STS
_mta-sts.nothing.email.  TXT    "v=STSv1; id=20250101"

# PTR（在 VPS 控制面板设置，需提工单）
<服务器IP>                PTR    mail.nothing.email.
```

## 上线检查清单

### 域名和 DNS
- [ ] 域名购买并解析
- [ ] MX 记录生效
- [ ] SPF / DKIM / DMARC 配置并验证
- [ ] PTR 反向解析设置（腾讯云提工单）
- [ ] MTA-STS 配置

### 服务器
- [ ] VPS 购买并初始化
- [ ] Docker 和 Docker Compose 安装
- [ ] Node.js、pnpm、PM2 安装
- [ ] Caddy 安装（apt）
- [ ] 防火墙配置（只开放 25, 80, 443, 465, 587, 993）
- [ ] SSH 密钥登录，禁止密码登录

### 服务部署
- [ ] Stalwart 启动并配置域名（Docker）
- [ ] PostgreSQL 启动并初始化（Docker）
- [ ] API 构建并用 PM2 启动
- [ ] 前端构建并复制到 /srv/web/
- [ ] Caddy 配置并启动，TLS 证书自动签发
- [ ] GitHub OAuth App 创建
- [ ] PM2 开机自启配置

### 验证
- [ ] 邮件送达率测试（mail-tester.com 跑分 ≥ 9/10）
- [ ] 注册流程跑通
- [ ] Token 生成和 exchange 接口正常
- [ ] SMTP 发送测试（发到 Gmail / Outlook）
- [ ] IMAP 接收测试
- [ ] MCP Server 端到端测试
- [ ] CLI 端到端测试

### 监控
- [ ] PM2 进程监控正常
- [ ] Uptime Kuma 部署（可选）
- [ ] 所有端点添加监控
- [ ] 告警通知渠道配置

## 扩展路径

```
v1: 单机混合部署
  1 台 VPS：Docker（Stalwart + PG）+ PM2（API）+ Caddy（Web）
  承载: ~1000 用户

v2: 分离
  邮件服务器 1 台
  API + DB 1 台
  承载: ~10000 用户

v3: 集群
  邮件服务器集群（Stalwart 支持）
  API 多实例 + 负载均衡
  PostgreSQL 主从
  承载: 100000+ 用户
```

每个阶段在用户量逼近上限时再升级，不提前过度设计。

## 成本估算

### v1 起步

| 项目 | 费用 |
|------|------|
| 腾讯云香港轻量 (2C2G) | ¥288/年 |
| 域名 | ~¥65/年 |
| **总计** | **~¥350/年** |

### v2 增长

| 项目 | 月成本 |
|------|--------|
| 邮件服务器 (4C8G) | $40 |
| API 服务器 (2C4G) | $20 |
| PostgreSQL 托管 | $15 |
| S3 备份 (100GB) | $5 |
| **总计** | **~$80/月** |

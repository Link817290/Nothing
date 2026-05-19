# 01 — 邮件服务器选型与部署

## 选型结论：Stalwart Mail Server

| 候选 | REST API 管账号 | 多域名 | 资源占用 | 结论 |
|------|----------------|--------|---------|------|
| **Stalwart** (Rust) | 原生支持 | 支持 | ~100MB 起 | 选这个 |
| Maddy (Go) | 无，只有 CLI | 支持 | ~15MB 起 | API 缺失，排除 |
| docker-mailserver | 无，需外挂脚本 | 支持 | ~512MB 起 | 太重，排除 |

选 Stalwart 的核心原因：**它是唯一提供 REST API 来程序化管理用户账号的开源邮件服务器**。我们的平台需要在用户注册时自动创建邮箱，这是硬需求。

## Stalwart 核心能力

- 单二进制，Rust 编写，内存占用小
- SMTP + IMAP + JMAP + POP3 全协议支持
- 内置 DKIM 签名 / SPF 验证 / DMARC 策略 / DANE / MTA-STS
- REST Management API：创建/删除/修改用户、管理域名、查看队列
- 支持 SQLite / PostgreSQL / MySQL 作为后端存储
- Docker 官方镜像，部署简单

## 部署方案

### 服务器要求

| 阶段 | 用户量 | 配置 | 预估成本 |
|------|--------|------|---------|
| 起步 | < 1000 | 腾讯云香港轻量 2C2G + 40GB SSD | ~¥24/月 |
| 增长 | 1000-10000 | 4C8G + 200GB SSD + PostgreSQL | ~$60/月 |
| 规模 | 10000+ | 集群部署，负载均衡 | 按需 |

### Docker Compose

```yaml
version: "3.8"

services:
  stalwart:
    image: stalwartlabs/mail-server:latest
    container_name: nothing-mail
    restart: always
    ports:
      - "25:25"       # SMTP
      - "465:465"     # SMTP over TLS
      - "587:587"     # SMTP Submission
      - "993:993"     # IMAP over TLS
      - "127.0.0.1:8443:443"  # HTTPS (Management API + JMAP)，仅内网访问
    volumes:
      - ./data/stalwart:/opt/stalwart-mail
    environment:
      - STALWART_ADMIN_PASSWORD=changeme
```

### DNS 记录（以 nothing.email 为例）

```
# MX 记录 — 告诉其他邮件服务器往哪里投递
nothing.email.              MX    10  mail.nothing.email.
mail.nothing.email.           A         <服务器IP>

# SPF — 声明谁有权代表这个域名发邮件
nothing.email.              TXT   "v=spf1 ip4:<服务器IP> -all"

# DKIM — 邮件签名公钥（Stalwart 自动生成，从管理面板复制）
default._domainkey.nothing.email.  TXT   "v=DKIM1; k=rsa; p=MIIBIjANBg..."

# DMARC — 告诉收件方如何处理未通过验证的邮件
_dmarc.nothing.email.       TXT   "v=DMARC1; p=reject; rua=mailto:dmarc@nothing.email"

# MTA-STS — 强制 TLS
_mta-sts.nothing.email.     TXT   "v=STSv1; id=20250101"

# 反向 DNS (PTR) — 在 VPS 控制面板设置
<服务器IP>                   PTR   mail.nothing.email.
```

### 初始化步骤

```bash
# 1. 启动服务
docker compose up -d

# 2. 访问管理面板
# https://<服务器IP>:8443  用户名: admin  密码: 环境变量中设置的

# 3. 通过管理面板或 API 添加域名
curl -X POST https://localhost:8443/api/domain/nothing.email \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json"

# 4. 通过 API 创建第一个用户
curl -X POST https://localhost:8443/api/principal \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "individual",
    "name": "link",
    "secrets": ["auto-generated-password"],
    "emails": ["link@nothing.email"],
    "quota": 104857600
  }'

# 5. 从管理面板复制 DKIM 公钥，添加到 DNS
```

### API 管理用户（核心接口）

```bash
# 创建用户
POST /api/principal
{
  "type": "individual",
  "name": "bob",
  "secrets": ["password123"],
  "emails": ["bob@nothing.email"],
  "quota": 104857600       # 100MB 配额
}

# 删除用户
DELETE /api/principal/bob

# 列出所有用户
GET /api/principal?type=individual&limit=100

# 修改密码
PATCH /api/principal/bob
{
  "secrets": ["new-password"]
}
```

## 安全清单

- [ ] TLS 证书配置（Let's Encrypt 自动续期）
- [ ] 管理 API 端口不暴露到公网（走内网或 VPN）
- [ ] 设置 rate limit 防止滥用
- [ ] 配置 fail2ban 防暴力破解
- [ ] PTR 反向解析记录（否则发出去的邮件容易进垃圾箱）
- [ ] 定期备份 mail-data 目录

## 存储选择

| 阶段 | 后端 | 理由 |
|------|------|------|
| 起步 | SQLite（默认） | 零配置，单文件，够用 |
| 1000+ 用户 | PostgreSQL | 并发性能好，便于备份和监控 |

切换时只需改 Stalwart 配置文件中的 `store` 段，数据可迁移。

## 下一步

邮件服务器跑起来后，需要在上面套一层**账号系统**（下一篇），处理：
- 用户注册 → 调 Stalwart API 创建邮箱
- 生成 MCP Server 用的 Token
- 用量配额管理

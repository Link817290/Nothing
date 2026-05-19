# 05 — 自定义域名（v2）

> 本功能 v1 不做，v2 实现。v1 所有用户使用平台域名。

## 场景

```
免费用户:  link@nothing.email          ← 平台域名
付费用户:  link@acme.com               ← 自己的域名
```

付费用户希望用自己的品牌域名收发消息，但邮件服务器还是跑在我们这里。跟 Google Workspace / Microsoft 365 模式一样。

## 用户操作流程

### 第 1 步：在平台添加域名

```
CLI:
  nothing domain add acme.com

或 Web 面板:
  Dashboard → 域名管理 → 添加域名 → 输入 acme.com
```

平台返回需要配置的 DNS 记录。

### 第 2 步：配置 DNS

用户去自己域名的 DNS 管理面板（Cloudflare / 阿里云 / GoDaddy 等），加 5 条记录：

```
# 1. MX — 邮件投递到我们的服务器
acme.com.                     MX    10  mail.nothing.email.

# 2. SPF — 声明我们的服务器有权代发
acme.com.                     TXT   "v=spf1 include:nothing.email ~all"

# 3. DKIM — 邮件签名验证
nothing._domainkey.acme.com.  CNAME nothing._domainkey.nothing.email.

# 4. DMARC — 防伪造策略
_dmarc.acme.com.              TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@nothing.email"

# 5. 域名验证 — 证明你拥有这个域名
_nothing-verify.acme.com.     TXT   "nothing-verify=nv_a1b2c3d4"
```

### 第 3 步：验证

```
CLI:
  nothing domain verify acme.com

或 Web 面板:
  点击「验证」按钮
```

平台检查所有 DNS 记录是否正确：

```
检查 _nothing-verify TXT    ✓ 域名所有权确认
检查 MX 记录                 ✓ 指向 mail.nothing.email
检查 SPF 记录                ✓ 包含 nothing.email
检查 DKIM CNAME              ✓ 指向正确
检查 DMARC 记录              ✓ 策略已设置

域名 acme.com 验证通过 ✓
```

### 第 4 步：创建邮箱地址

```
nothing domain add-address link@acme.com
nothing domain add-address bob@acme.com
```

用户原来的 `link@nothing.email` 继续有效，新地址 `link@acme.com` 同时可用。两个地址收同一个邮箱。

## 平台侧实现

### 域名验证 API

```
POST   /api/domains                   添加域名
GET    /api/domains/:domain/status    检查 DNS 记录状态
POST   /api/domains/:domain/verify   执行验证
DELETE /api/domains/:domain           移除域名
POST   /api/domains/:domain/address  添加邮箱地址
```

### DNS 检查逻辑

```typescript
async function verifyDomain(domain: string): Promise<VerifyResult> {
  const results = {
    ownership: await checkTXT(`_nothing-verify.${domain}`, expectedToken),
    mx:        await checkMX(domain, "mail.nothing.email"),
    spf:       await checkSPF(domain, "include:nothing.email"),
    dkim:      await checkCNAME(`nothing._domainkey.${domain}`, "nothing._domainkey.nothing.email"),
    dmarc:     await checkTXT(`_dmarc.${domain}`, "v=DMARC1"),
  };

  return {
    verified: Object.values(results).every(r => r.ok),
    details: results,
  };
}
```

### Stalwart 配置

域名验证通过后，调 Stalwart API：

```bash
# 添加域名
POST /api/domain/acme.com

# 为用户添加别名地址
PATCH /api/principal/link
{
  "emails": ["link@nothing.email", "link@acme.com"]
}
```

Stalwart 原生支持多域名，一个用户可以有多个地址。

### DKIM 密钥管理

每个自定义域名需要独立的 DKIM 密钥：

```
平台为 acme.com 生成 DKIM 密钥对
  ↓
私钥存在 Stalwart 配置中（用于签名出站邮件）
  ↓
公钥通过 CNAME 指向我们的 DNS（用于收件方验证）
```

用 CNAME 而不是让用户粘贴公钥 TXT 记录，好处是我们可以轮换密钥而不需要用户改 DNS。

### TLS 证书

自定义域名不需要额外的 TLS 证书。因为：
- SMTP 用的是 mail.nothing.email 的证书（MX 指向我们）
- IMAP 用户连的也是 mail.nothing.email
- 用户的域名只出现在邮件地址里，不出现在连接域名里

## 域名状态

```
pending     → 用户添加了域名，等待 DNS 配置
verifying   → DNS 记录检测中
verified    → 全部通过，可以使用
failed      → 检测失败，显示哪条记录有问题
suspended   → 用户降级到免费套餐，域名暂停
```

### 定期检查

每 24 小时自动重新检查已验证域名的 DNS 记录。如果 MX 或 SPF 记录被改了：

```
发现 DNS 异常
  ↓
标记域名为 warning 状态
  ↓
通知用户（邮件 + 面板提醒）
  ↓
72 小时未修复 → 暂停该域名的邮件收发
```

## CLI 命令

```bash
nothing domain list                    # 列出所有域名
nothing domain add <domain>            # 添加域名，返回 DNS 配置要求
nothing domain verify <domain>         # 检查 DNS 并验证
nothing domain status <domain>         # 查看域名状态和 DNS 记录
nothing domain add-address <address>   # 添加邮箱地址
nothing domain remove <domain>         # 移除域名
```

## 定价

| 套餐 | 自定义域名 |
|------|-----------|
| 免费 | 不支持 |
| Pro ($5/月) | 1 个域名 |
| Team ($15/月) | 3 个域名 |
| Enterprise | 无限 |

## 下一步

自定义域名完成后，需要设计**信誉系统**（下一篇），为每个用户和域名建立信誉评分。

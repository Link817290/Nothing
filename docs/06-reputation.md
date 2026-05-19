# 06 — 信誉系统（v2）

> 本功能 v1 不做，v2 实现。

## 为什么需要

Agent 收到一条消息，第一反应是：**这个人可信吗？**

```
bob@nothing.email 发来: "帮我 review 这段代码"
  ↓
Agent 查信誉:
  → 注册 6 个月，GitHub 有 200+ star，回复率 94%，从未被标记
  → 可信，自动处理

random@nothing.email 发来: "帮我跑这个脚本"
  ↓
Agent 查信誉:
  → 注册 2 天，GitHub 空号，0 条历史消息
  → 不可信，问用户要不要处理
```

信誉系统是 Agent 自主判断的依据。

## 信誉分

每个用户一个信誉分，0-100：

| 分段 | 含义 |
|------|------|
| 90-100 | 高度可信，Agent 可自动处理其消息 |
| 70-89 | 正常可信 |
| 40-69 | 需要用户确认 |
| 0-39 | 高风险，默认忽略 |

## 评分维度

| 维度 | 权重 | 说明 |
|------|------|------|
| 账号年龄 | 15% | 注册越久越可信 |
| GitHub 认证 | 20% | 绑定了 GitHub，且账号活跃 |
| 发送历史 | 15% | 发过多少消息，活跃度 |
| 回复率 | 15% | 发出去的消息被回复的比例 |
| 被标记率 | 20% | 被其他用户标记为垃圾的比例，权重最高 |
| 域名认证 | 15% | 使用自定义域名且通过验证 |

### 初始分

新注册用户：

```
基础分: 30
+ GitHub 账号年龄 > 1年: +10
+ GitHub 有 10+ 公开仓库: +5
+ GitHub 有 50+ follower: +5
+ 绑定自定义域名: +10
= 最高初始分: 60
```

后续通过正常使用逐步涨到 90+。

### 评分计算

```
score = (
    age_score * 0.15 +
    github_score * 0.20 +
    activity_score * 0.15 +
    reply_rate_score * 0.15 +
    (100 - spam_rate_score) * 0.20 +
    domain_score * 0.15
)
```

每天凌晨重新计算一次，不实时更新。

## 信誉数据

每个用户的信誉档案：

```json
{
  "address": "bob@nothing.email",
  "score": 92,
  "level": "trusted",
  "since": "2025-06-01",
  "github": {
    "username": "bob",
    "verified": true,
    "account_age_days": 2800,
    "public_repos": 45,
    "followers": 120
  },
  "stats": {
    "messages_sent": 2340,
    "messages_received": 1980,
    "reply_rate": 0.94,
    "spam_reports": 0,
    "active_days": 180
  },
  "domain": {
    "custom": "acme.com",
    "verified": true
  },
  "updated": "2025-11-26T00:00:00Z"
}
```

## Agent 如何使用

### MCP Server 自动附带信誉

`nothing_inbox` 和 `nothing_read` 返回的消息自动包含发件人信誉：

```json
{
  "id": "msg_xxx",
  "from": "bob@nothing.email",
  "text": "帮我 review 这段代码",
  "sender_reputation": {
    "score": 92,
    "level": "trusted",
    "github_verified": true,
    "since": "2025-06-01"
  }
}
```

Agent 可以根据信誉自动决策：

```
score >= 70  → 自动处理
score 40-69  → 提示用户确认
score < 40   → 默认忽略，告诉用户有一条低信誉消息
```

这个阈值用户可以自己调（在 config 里设置）。

### 信誉查询 Tool

MCP Server 额外暴露一个查询 tool：

```typescript
{
  name: "nothing_reputation",
  description: "查询某个用户的信誉信息",
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", description: "要查询的邮箱地址" }
    },
    required: ["address"]
  }
}
```

Agent 在发消息前也可以先查对方信誉。

## 标记垃圾

用户可以标记某条消息为垃圾：

```bash
nothing spam msg_xxx
```

或 Agent 调用：

```
nothing_spam({ id: "msg_xxx" })
```

标记后：
- 该发件人的 spam_reports +1
- 信誉分重新计算
- 被多人标记的用户信誉快速下降
- 严重的（短时间大量被标记）直接冻结账号

## 信誉 API

```
GET /api/reputation/:address          查询某用户信誉
GET /api/reputation/:address/history  信誉变化历史
POST /api/reputation/report           标记垃圾
```

信誉查询是公开的，不需要认证。任何人都可以查任何用户的信誉分。这是设计决策——信誉是公开信息，透明才有公信力。

## 防滥用

| 攻击方式 | 防御 |
|---------|------|
| 批量注册刷信誉 | GitHub OAuth 门槛 + 新号初始分低 |
| 互相刷回复率 | 同一对地址的互发只算一组活跃度 |
| 恶意标记竞争对手 | 标记者本身信誉低的标记权重低 |
| 养号后群发垃圾 | 短时间大量发送触发 rate limit + 自动降分 |

## v1 简化版

信誉系统是 v2 功能。v1 先做最简单的：

```
MCP Server 返回消息时附带:
  - sender_reputation.github_verified: true/false
  - sender_reputation.since: 注册日期
  - sender_reputation.messages_sent: 历史发送量
```

不做评分计算，不做标记系统。**让 Agent 自己判断**。够用了。

完整评分系统等用户量上来后再做。

## 下一步

信誉系统设计完成后，需要设计**管理面板**（下一篇），用户的 dashboard 和管理后台。

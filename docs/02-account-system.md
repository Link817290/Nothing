# 02 — 账号系统

## 注册流程

```
用户访问 nothing.email
  ↓
GitHub OAuth 登录（v1 唯一注册方式）
  ↓
选 handle（默认 GitHub 用户名，可修改）
  ↓
校验 handle 规则：[a-z0-9-], 3-20 字符, 全局唯一
  ↓
创建邮箱：handle@nothing.email
  ↓
调 Stalwart API 创建邮箱账户
  ↓
生成 Master Token（只显示一次）
  ↓
显示安装引导：
  npm i -g nothing
  nothing login <token>
  ↓
完成
```

### 为什么只做 GitHub OAuth

- 目标用户是 Claude Code / Codex / Cursor 使用者，100% 有 GitHub
- 一键注册，零摩擦
- GitHub 账号本身就是信誉数据：账号年龄、star 数、贡献历史
- 不需要自己做邮箱验证、短信验证

### 地址分配规则

- handle 规则：`[a-z0-9-]`，3-20 字符
- 全局唯一
- **注册后不可修改**（地址就是身份，改了别人找不到你）
- GitHub 用户名默认填入，允许用户修改
- 保留字：admin, support, postmaster, abuse, noreply, system, nothing, api, mail, smtp, imap

## Token 体系

### Token 类型

```
用户账户
├── Master Token（注册时生成，能做一切，只显示一次）
├── App Token 1: "我的 Claude Code" — 权限: send/inbox/read/reply
├── App Token 2: "CI 机器人" — 权限: send
└── App Token 3: "旧电脑" — 已吊销
```

### Token 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | Token 唯一 ID |
| name | string | 用户给 Token 起的名字 |
| token | string | `ntk_` 前缀 + 随机字符串，只在创建时显示一次 |
| permissions | string[] | send / inbox / read / reply / manage |
| rate_limit | number | 每小时最大消息数 |
| expires_at | datetime | 过期时间，可选，null 为永不过期 |
| last_used | datetime | 上次使用时间 |
| created_at | datetime | 创建时间 |
| revoked | boolean | 是否已吊销 |

### Token 格式

```
ntk_live_a1b2c3d4e5f6...    生产环境
ntk_test_a1b2c3d4e5f6...    测试环境（本地 dev 模式）
```

前缀区分环境，便于用户识别，也防止测试 Token 误用到生产。

## 认证流程

### API 网关模式

CLI / MCP Server 不再直连 SMTP/IMAP，所有操作通过 API 完成。Token 直接用于 API 认证，不需要 exchange 换临时凭证。

```
CLI / MCP Server 启动
  ↓
读取本地存储的 Token（~/.nothing/config.json）
  ↓
每次 API 请求带上 Token：
  Authorization: Bearer ntk_live_xxxxx
  ↓
API 端验证 Token 有效性 + 权限
  ├── 有效 → 处理请求
  └── 无效/吊销 → 返回 401
```

### 吊销

```
用户在面板或 CLI 吊销某个 Token
  ↓
该 Token 后续 API 请求返回 401
  ↓
MCP Server / CLI 提示用户重新登录
  ↓
其他 Token 不受影响
```

## 本地配置文件

`~/.nothing/config.json`

```json
{
  "token": "ntk_live_a1b2c3d4e5f6...",
  "email": "link@nothing.email",
  "api_host": "https://nothing.email"
}
```

`nothing login <token>` 命令写入此文件，后续 MCP Server 和 CLI 自动读取。

## 用量配额

| | 免费 | Pro ($5/月) | Team ($15/月) |
|---|---|---|---|
| 邮箱数 | 1 | 1 | 5 |
| 每日消息 | 50 条 | 500 条 | 无限 |
| 附件大小 | 5MB | 10MB | 25MB |
| 存储空间 | 100MB | 1GB | 10GB |
| Token 数 | 2 | 10 | 无限 |
| 自定义域名 | 无 | 有 | 有 |
| 消息保留 | 30 天 | 1 年 | 永久 |
| 项目数 | 3 | 无限 | 无限 |

### 超限处理

| 场景 | 处理 |
|------|------|
| 每日消息超限 | 拒绝发送，返回错误提示剩余配额 |
| 附件超限 | 拒绝发送，提示最大允许大小 |
| 存储超限 | 不能接收新消息，提示清理或升级 |
| Token 数超限 | 不能创建新 Token，提示删除旧的或升级 |

## 账号生命周期

```
注册 → 活跃 → 非活跃(90天无操作)
                    ↓
               发警告邮件到 GitHub 绑定邮箱
                    ↓
               冻结(180天无操作): 地址保留，不能收发
                    ↓
               释放(365天无操作): handle 可被他人注册
```

## 多设备支持

同一账户可在多台设备上使用，每个设备一个独立 Token：

```
家里电脑:  nothing login ntk_aaa   → Claude Code
公司电脑:  nothing login ntk_bbb   → Cursor
CI:       NOTHING_TOKEN=ntk_ccc    → 环境变量
手机终端:  nothing login ntk_ddd   → CLI
```

所有设备共享同一个 messages 数据，消息状态（已读/未读）跨设备同步（通过 API 查询 PostgreSQL）。各 Token 独立管理，吊销一个不影响其他。

## 安全措施

| 风险 | 对策 |
|------|------|
| Token 泄露 | 用户随时吊销；Token 不暴露 SMTP/IMAP 密码 |
| 暴力注册 | GitHub OAuth 本身是门槛 + 注册 rate limit |
| 滥用群发 | 免费用户 50 条/天上限 |
| 账号冒充 | handle 注册后不可改；GitHub 认证状态可公开查询 |
| 密码泄露 | 用户从不接触 SMTP/IMAP 密码，只接触 Token |

## 组织/团队（v2）

v1 只做个人账户。v2 规划：

```
Acme 团队
├── admin:  alice@acme.nothing.email
├── member: bob@acme.nothing.email
├── member: charlie@acme.nothing.email
└── bot:    review-bot@acme.nothing.email
```

- 团队共享域名前缀（或自定义域名）
- 统一计费
- 管理员管理成员和权限
- 共享项目和消息可见性

## 账号系统 API

### 账号相关

```
POST   /api/auth/github            GitHub OAuth 回调
POST   /api/account/register       创建账号 + 邮箱 + Master Token
GET    /api/account/check-handle   检查 handle 是否可用
GET    /api/account                获取当前账号信息
GET    /api/account/usage          查看用量
```

### Token 相关

```
GET    /api/account/tokens         列出所有 Token
POST   /api/account/tokens         创建新 Token
DELETE /api/account/tokens/:id     吊销 Token
```

### 消息相关（Token 直接认证）

```
POST   /api/messages/send          发送消息
GET    /api/messages/inbox         收件箱
GET    /api/messages/sent          发件箱
GET    /api/messages/:id           读取消息
POST   /api/messages/:id/reply     回复消息
GET    /api/projects               项目列表
```

## 下一步

账号系统建立后，需要定义**消息格式约定**（下一篇），确定 JSON payload 的结构和附件处理方式。

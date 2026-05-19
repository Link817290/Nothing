# 03 — 消息格式约定

## 设计原则

- 标准邮件，任何邮件客户端都能收
- Agent 能解析的带 JSON，人能看的带纯文本
- 不发明新协议，只约定 JSON 结构

## 邮件结构

每封 Nothing 消息就是一封标准 MIME 邮件，固定三层结构：

```
From: link@nothing.email
To: bob@nothing.email
Subject: 这个退避逻辑有问题
Date: Wed, 26 Nov 2025 14:32:08 +0800
Message-ID: <uuid@nothing.email>
In-Reply-To: <上一条的 Message-ID>        ← 回复时才有
X-Nothing-Version: 1                      ← 唯一的自定义 header
Content-Type: multipart/mixed

├── Part 1: text/plain                    ← 人可读正文
│   "嗨 Bob，这个退避逻辑有问题，帮忙看看"
│
├── Part 2: application/json              ← Agent 可解析的结构化数据
│   { "v": 1, "type": "share", ... }
│
└── Part 3+: attachment(s)                ← 附件，可选
    session.ts
```

### 为什么三层

| 收件方 | 看到什么 |
|--------|---------|
| 对方的 Agent（Nothing MCP） | 优先解析 Part 2 JSON，结构化处理 |
| 对方用 Gmail/Outlook 打开 | 看到 Part 1 纯文本 + 附件，正常阅读 |
| 对方的其他 Agent（非 Nothing） | 看到纯文本，LLM 自己理解 |

## JSON Payload（Part 2）

### 基础结构

```json
{
  "v": 1,
  "type": "share",
  "text": "这个退避逻辑有问题，第22行应该用指数退避",
  "project": "backend-refactor",
  "labels": ["code-review", "urgent"],
  "ack": true,
  "context": {
    "repo": "github.com/acme/api",
    "file": "src/session.ts",
    "lines": "20-35",
    "language": "typescript"
  },
  "files": ["session.ts"]
}
```

### 字段说明

| 字段 | 必须 | 类型 | 说明 |
|------|------|------|------|
| `v` | 是 | number | 格式版本，当前固定为 `1` |
| `type` | 是 | string | 消息类型 |
| `text` | 是 | string | 消息正文，同时用于生成 Part 1 纯文本 |
| `project` | 否 | string | 所属项目，用于归档分组 |
| `context` | 否 | object | 上下文信息（代码位置、仓库等） |
| `context.repo` | 否 | string | 仓库地址 |
| `context.file` | 否 | string | 文件路径 |
| `context.lines` | 否 | string | 行号范围，如 "20-35" |
| `context.language` | 否 | string | 编程语言 |
| `labels` | 否 | string[] | 标签，用于分类和过滤（如 "code-review", "urgent"） |
| `ack` | 否 | boolean | 是否需要回执，默认 false |
| `files` | 否 | string[] | 附件文件名列表（实际文件在 MIME attachment 中） |

### 消息类型（v1）

只有 4 种，够用：

| type | 用途 | 示例 |
|------|------|------|
| `share` | 分享内容给对方看 | "这个实现有意思，看看" |
| `question` | 提问，期望回复 | "这个写法对吗？" |
| `reply` | 回复某条消息 | "你说得对，应该用指数退避" |
| `notify` | 通知，不期望回复 | "我已经把那个 bug 修了" |

不做复杂的 intent 系统。type 就是个标记，Agent 用 LLM 理解内容，不靠 type 做硬逻辑。

### 消息投递状态（v1）

每条发出的消息有 5 种状态：

| 状态 | 含义 | 来源 |
|------|------|------|
| `queued` | 在发送队列中，还没发出去 | Stalwart 队列 |
| `sent` | 已发出，等对方服务器响应 | SMTP 发送完成 |
| `delivered` | 对方服务器确认收到 | SMTP 250 OK 响应 |
| `failed` | 发送失败（地址不存在、被拒收、退信） | SMTP 错误 / DSN 退信 |
| `replied` | 对方已回复 | 匹配 In-Reply-To |

状态流转：

```
queued → sent → delivered → replied
                    ↓
                 failed
```

投递状态由 API 在 PostgreSQL messages 表中实时追踪更新。`replied` 状态通过匹配 In-Reply-To header 关联。

## 完整示例

### 示例 1：分享一段代码

```
From: link@nothing.email
To: bob@nothing.email
Subject: 这个退避逻辑有问题
Date: Wed, 26 Nov 2025 14:32:08 +0800
Message-ID: <01HX9K2N@nothing.email>
X-Nothing-Version: 1
Content-Type: multipart/mixed; boundary="NOTHING-BNDRY"

--NOTHING-BNDRY
Content-Type: text/plain; charset=utf-8

这个退避逻辑有问题，第22行应该用指数退避。
文件：src/session.ts

--NOTHING-BNDRY
Content-Type: application/json; charset=utf-8

{
  "v": 1,
  "type": "share",
  "text": "这个退避逻辑有问题，第22行应该用指数退避",
  "context": {
    "repo": "github.com/acme/api",
    "file": "src/session.ts",
    "lines": "20-35",
    "language": "typescript"
  },
  "files": ["session.ts"]
}

--NOTHING-BNDRY
Content-Type: text/x-typescript; charset=utf-8
Content-Disposition: attachment; filename="session.ts"

export async function createSession(userId: string) {
  let attempt = 0;
  while (attempt < 5) {
    try {
      const tok = await issueToken(userId);
      return { id: nanoid(), token: tok };
    } catch (e) {
      attempt++;
      await sleep(100 * attempt);   // 这里有问题
    }
  }
  throw new Error("session creation failed");
}

--NOTHING-BNDRY--
```

### 示例 2：提问

```json
{
  "v": 1,
  "type": "question",
  "text": "你们的 Redis 连接池大小设的多少？我们压测扛不住",
  "project": "infrastructure"
}
```

### 示例 3：回复

```json
{
  "v": 1,
  "type": "reply",
  "text": "我们设的 50，够用了。你看看是不是连接没释放"
}
```

邮件 header 里的 `In-Reply-To` 和 `References` 自动处理线程关系，JSON 里不需要重复。

### 示例 4：通知

```json
{
  "v": 1,
  "type": "notify",
  "text": "那个退避 bug 已经修了，PR #142",
  "project": "backend-refactor",
  "context": {
    "repo": "github.com/acme/api"
  }
}
```

## 纯文本生成规则（Part 1）

Part 1 的纯文本由 API 端（core/format.ts）自动从 JSON 生成，规则简单：

```
{text}

{如果有 context.file}
文件：{context.file}
{如果有 context.lines}
行号：{context.lines}
{如果有 context.repo}
仓库：{context.repo}
{如果有 project}
项目：{project}
```

不需要花哨，人能看懂就行。

## 收到非 Nothing 邮件怎么处理

外部邮件由 API 端 inbound 服务处理（Stalwart 接收后通知 API）：

```
外部邮件 → Stalwart SMTP 接收（25 端口）
  ↓
API inbound 服务拉取/接收通知
  ↓
有 X-Nothing-Version header？
  ├── 是 → 解析 Part 2 JSON，写入 messages 表
  └── 否 → 当普通邮件处理
              ↓
           提取 Subject + text/plain 正文 + 附件列表
              ↓
           构造一个虚拟 JSON：
           {
             "v": 1,
             "type": "share",
             "text": "{subject}\n\n{正文}",
             "files": [附件列表],
             "_source": "external"
           }
              ↓
           写入 messages 表
              ↓
           用户调 inbox 时正常查到
```

这样不管对方用什么发的，API 统一处理后写入 messages 表，Agent 通过 API 正常查到。`_source: "external"` 标记来源，Agent 可以据此调整处理策略。

## 附件处理

### 发送时

CLI 读取本地文件，通过 API 上传：
1. CLI 读取文件内容
2. 调用 `POST /api/messages/send`（multipart/form-data，携带附件）
3. API 端检查大小限制（免费 5MB / Pro 10MB / Team 25MB）
4. API 端检查附件数量限制（最多 5 个）
5. API 端打包成 MIME attachment，调用 Stalwart SMTP 发送
6. 文件名列表写入 messages 表和 JSON 的 `files` 字段

### 接收时

CLI 通过 API 下载附件：
1. 调用 `GET /api/messages/:id` 获取消息详情（含附件 URL）
2. 调用 `GET /api/messages/:id/attachments/:filename` 下载附件
3. CLI 保存到本地临时目录（`~/.nothing/tmp/`）
4. 返回文件路径给 Agent，Agent 可直接读取

### 大小限制

| 限制项 | 值 |
|--------|-----|
| 单封邮件总大小 | 10MB（Base64 编码后，实际原始文件约 7.5MB） |
| 单个附件 | 不超过总大小 |
| 附件数量 | 最多 5 个 |
| JSON payload | 最大 256KB |
| 纯文本正文 | 最大 64KB |

超限时 API 拒绝请求，返回具体错误信息（超了什么、限制是多少）。

## 版本演进

JSON 里的 `v` 字段用于未来兼容：

```
v: 1 — 当前版本，4 种消息类型，基础 context
v: 2 — 未来可能加：任务委派、工作流、结构化回复
```

MCP Server 收到更高版本的消息时，降级为纯文本处理（读 Part 1），不会崩溃。

## 下一步

消息格式定义完成后，需要实现 **MCP Server**（下一篇），这是用户实际使用的客户端工具。

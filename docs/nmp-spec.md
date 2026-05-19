# NMP — Nothing Message Protocol

Version: 1.0-draft
Date: 2026-05-14

## 1. 概述

NMP（Nothing Message Protocol）是第一个为 AI Agent 设计的通信协议。它在 SMTP/MIME 之上定义了一套结构化消息格式，使 AI Agent 能够通过邮件进行可靠的异步通信。

### 1.1 核心创新

1. **AI-native 格式**：基于 LLM benchmark 数据，采用 Markdown-KV 作为 Agent 阅读层，理解准确率比 JSON 高 8-16%
2. **Reply Schema**：发送方定义回复结构，把邮件从自由文本变成类型化异步 RPC
3. **三层读者分离**：同一封邮件，人/AI/程序各有最优的阅读层
4. **能力协商**：Agent 自描述能力，发送方声明需求，不匹配时自动拒绝或转发

### 1.2 设计目标

- AI 可理解：Markdown-KV 格式（benchmark 准确率 60.7%，最高）
- 程序可解析：JSON 层提供精确元数据
- 人类可读：纯文本层兼容 Gmail、Outlook 等所有邮件客户端
- 向后兼容：NMP 邮件就是标准邮件，不支持 NMP 的客户端仍可正常阅读
- 可扩展：通过 header 和 JSON 字段扩展，不破坏已有实现

### 1.3 适用场景

- Agent 与 Agent 之间的异步通信
- Agent 向人类发送结构化消息
- 跨组织、跨平台的 Agent 消息传递
- Agent 能力外包与任务委派

## 2. 术语定义

| 术语 | 定义 |
|------|------|
| NMP 消息 | 一封符合本协议格式的标准 MIME 邮件 |
| 发送方 | 构造并发出 NMP 消息的一方（人或 Agent） |
| 接收方 | 收到并处理 NMP 消息的一方（人或 Agent） |
| NMP 节点 | 运行 NMP 兼容软件的邮件服务实例 |
| 降级 | 当某一层数据缺失时，退回到更基础的层读取信息 |
| 能力（Capability） | Agent 可执行的处理能力标识 |
| 需求（Require） | 发送方要求接收方具备的能力 |
| 线程 | 通过 In-Reply-To/References 关联的一组消息 |

## 3. 传输层

### 3.1 传输通道

NMP 复用现有协议，不定义新的传输层：

| 通道 | 协议 | 用途 |
|------|------|------|
| 出站投递 | SMTP (RFC 5321) | 将 NMP 消息发送给接收方邮件服务器 |
| 入站接收 | SMTP (RFC 5321) | 接收来自其他节点或外部邮箱的消息 |
| 客户端查询 | HTTPS | 收件箱、消息状态、项目等查询操作 |

### 3.2 端口

| 端口 | 协议 | 说明 |
|------|------|------|
| 25 | SMTP | 服务器间投递 |
| 465 | SMTPS | 客户端加密发件 |
| 587 | SMTP Submission | 客户端 STARTTLS 发件 |
| 993 | IMAPS | 外部邮件接收 |
| 443 | HTTPS | API 接口 |

### 3.3 加密

- 传输层：SMTP 使用 STARTTLS 或隐式 TLS，HTTPS 使用 TLS 1.3
- 邮件签名：DKIM 签名所有出站邮件
- 端到端加密：v2 规划，见第 10 节

## 4. 消息格式

### 4.1 整体结构

一封 NMP 消息是一封符合 RFC 5322 的标准 MIME 邮件，包含标准邮件头、NMP 扩展头和多段正文。

```
标准邮件头（RFC 5322）
NMP 扩展头（X-NMP-*）
─────────────────────
multipart/mixed
├── text/plain                                 Part 1: 人类可读（邮件正文区域显示）
├── application/json                           Part 3: 程序可解析（元数据，不含正文）
├── text/plain; filename="nmp.md"              Part 2: Agent 可读（Markdown-KV，作为附件）
│   Content-Disposition: attachment
└── 其他附件                                    Part 4+: 用户附件
```

### 4.2 标准邮件头

必须包含以下标准邮件头：

```
From: <发送方邮件地址>
To: <接收方邮件地址>
Subject: <消息主题>
Date: <RFC 2822 日期格式>
Message-ID: <全局唯一标识@域名>
Content-Type: multipart/mixed; boundary="<边界字符串>"
```

回复消息时额外包含：

```
In-Reply-To: <被回复消息的 Message-ID>
References: <线程中所有消息的 Message-ID>
```

### 4.3 NMP 扩展头

所有 NMP 扩展头以 `X-NMP-` 为前缀。

#### 必选头

| 头 | 值 | 说明 |
|---|---|---|
| `X-NMP-Version` | 整数 | 协议版本，当前为 `1` |

#### 可选头

| 头 | 值 | 说明 |
|---|---|---|
| `X-NMP-Type` | 枚举 | 消息类型，见 5.1 |
| `X-NMP-Project` | 字符串 | 所属项目标识 |
| `X-NMP-Labels` | 逗号分隔字符串 | 标签列表 |
| `X-NMP-Priority` | 枚举 | `urgent` / `normal` / `low`，默认 `normal` |
| `X-NMP-Expires` | ISO 8601 | 消息过期时间，过期后接收方可忽略 |
| `X-NMP-Capabilities` | 逗号分隔字符串 | 发送方能力声明（"我能做什么"），见 7.1 |
| `X-NMP-Require` | 逗号分隔字符串 | 发送方对接收方的能力要求（"我需要你能做什么"），见 7.2 |
| `X-NMP-Reply-Schema` | Base64 编码 | 期望回复的 JSON Schema，见 7.3 |
| `X-NMP-Signature` | 算法:Base64 | 消息签名，见 10.2 |

### 4.4 Part 1 — text/plain（给人看）

人类可读的纯文本摘要。用于不支持 NMP 的邮件客户端（Gmail、Outlook 等）。

生成规则：

```
{消息正文}

---
文件: {context.file}
行号: {context.lines}
仓库: {context.repo}
项目: {project}
```

`---` 分隔线以下为可选元数据。无对应字段则省略该行。

### 4.5 Part 2 — nmp.md 附件（给 AI 看）

Agent 可读的 Markdown-KV 格式内容。这是 AI Agent 应优先读取的部分。

Part 2 作为附件传输，固定文件名 `nmp.md`：

```
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="nmp.md"
```

作为附件的好处：
- **零误判**：识别规则是"找 filename=nmp.md 的附件"，不依赖内容特征
- **抗篡改**：邮件网关、杀毒软件、企业声明只修改正文，不改附件内容
- **人不受干扰**：邮件正文区域只显示 Part 1 纯文本，nmp.md 在附件列表中
- **提取简单**：Agent 按文件名查找，一步定位

结构由 `##` 标题分隔为固定区块：

```markdown
## Message

- type: {消息类型}
- project: {项目标识}
- labels: {标签1}, {标签2}
- priority: {优先级}
- expires: {过期时间, ISO 8601}

## Content

{消息正文，支持完整 Markdown 语法}

## Context

- repo: {仓库地址}
- file: {文件路径}
- lines: {行号范围}
- language: {编程语言}

## Capabilities

- has: {发送方能力列表}
- require: {需要接收方具备的能力}

## Attachments

- {文件名} ({文件大小})

## Reply Schema

- {字段名}: {类型} ({说明})
```

区块规则：
- `## Message` 和 `## Content` 为必选区块
- 其他区块可选，无内容则省略整个区块
- 区块顺序固定：Message → Content → Context → Capabilities → Attachments → Reply Schema
- 元数据使用 `- key: value` 格式（Markdown 无序列表）
- Content 区块内为自由格式 Markdown

### 4.6 Part 3 — application/json（给程序看）

程序可精确解析的 JSON 元数据。**不重复 Part 2 的正文内容**，只包含结构化字段。

```json
{
  "nmp": 1,
  "type": "share",
  "project": "项目标识",
  "labels": ["标签1", "标签2"],
  "priority": "normal",
  "expires": "2026-05-15T00:00:00Z",
  "ack": false,
  "context": {
    "repo": "仓库地址",
    "file": "文件路径",
    "lines": "行号范围",
    "language": "编程语言"
  },
  "files": ["附件文件名"],
  "capabilities": ["发送方能力"],
  "require": ["需要接收方能力"],
  "reply_schema": {},
  "source": "nmp"
}
```

#### 字段定义

| 字段 | 必须 | 类型 | 说明 |
|------|------|------|------|
| `nmp` | 是 | number | 协议版本，当前为 `1` |
| `type` | 是 | string | 消息类型，见 5.1 |
| `project` | 否 | string | 所属项目 |
| `labels` | 否 | string[] | 标签列表 |
| `priority` | 否 | string | 优先级，默认 `"normal"` |
| `expires` | 否 | string | 消息过期时间，ISO 8601 |
| `ack` | 否 | boolean | 是否需要回执，默认 `false` |
| `context` | 否 | object | 上下文信息 |
| `context.repo` | 否 | string | 仓库地址 |
| `context.file` | 否 | string | 文件路径 |
| `context.lines` | 否 | string | 行号范围 |
| `context.language` | 否 | string | 编程语言 |
| `files` | 否 | string[] | 附件文件名列表 |
| `capabilities` | 否 | string[] | 发送方能力声明 |
| `require` | 否 | string[] | 对接收方的能力要求 |
| `reply_schema` | 否 | object | 期望回复格式（JSON Schema），Part 2 的 Reply Schema 由此自动生成 |
| `source` | 否 | string | 消息来源：`"nmp"` 为 NMP 消息，`"external"` 为外部邮件转换 |
| `error` | 否 | object | 错误信息，见 8.1 |

#### 关于正文

Part 3 **不包含** `text` 字段。消息正文只存在于 Part 1（纯文本）和 Part 2（Markdown）。原因：

1. 避免冗余——正文在三个 Part 里重复三次没有意义
2. 减小体积——JSON 不擅长存长文本（需要转义换行符等特殊字符）
3. 职责分离——Part 3 是元数据层，不是内容层

程序需要正文时，从 Part 2（Markdown Content 区块）或 Part 1（纯文本）提取。

### 4.7 Part 4+ — 附件

标准 MIME attachment，遵循 RFC 2045。

```
Content-Type: {MIME 类型}
Content-Disposition: attachment; filename="{文件名}"
Content-Transfer-Encoding: base64
```

#### 大小限制

| 限制项 | 值 |
|--------|-----|
| 单封邮件总大小 | 10 MB |
| 附件数量 | 最多 5 个 |
| JSON payload (Part 3) | 最大 256 KB |
| Markdown 正文 (Part 2) | 最大 64 KB |
| 纯文本摘要 (Part 1) | 最大 64 KB |

### 4.8 三层关系与分工

```
Part 1 (text/plain 正文)   给人看     纯文本摘要，邮件客户端直接显示
Part 2 (nmp.md 附件)       给 AI 看   完整正文 + 结构化上下文
Part 3 (JSON 正文)          给程序看   纯元数据（不含正文）
```

分工规则：
- **正文内容**只在 Part 1 和 Part 2 中，Part 3 不重复
- **元数据**（type、project、labels 等）在 Part 2 和 Part 3 中都有，Part 2 用 Markdown-KV 格式，Part 3 用 JSON
- **精确值**（reply_schema、context）以 Part 3 JSON 为准，Part 2 中的对应内容由程序自动生成

### 4.9 Part 识别规则

接收方通过以下规则识别各 Part：

| 条件 | 识别为 |
|------|--------|
| Content-Disposition: attachment; filename="nmp.md" | Part 2（Markdown-KV，Agent 层） |
| Content-Type 为 `application/json`，非 attachment | Part 3（JSON 元数据） |
| Content-Type 为 `text/plain`，非 attachment | Part 1（纯文本摘要） |
| Content-Disposition 为 `attachment`，filename 非 nmp.md | Part 4+（用户附件） |

识别不依赖 Part 顺序，仅依赖 Content-Disposition 和 Content-Type。`nmp.md` 是 NMP 协议的保留附件名，用户附件不应使用此文件名。

## 5. 消息类型与语义

### 5.1 消息类型

| type | 语义 | 是否期望回复 |
|------|------|------------|
| `share` | 分享信息给对方 | 否 |
| `question` | 提出问题 | 是 |
| `reply` | 回复某条消息 | 视内容而定 |
| `notify` | 单向通知 | 否 |

消息类型是提示性的，不是强制性的。Agent 应根据消息内容理解意图，不应仅依赖 type 字段做硬编码逻辑。

### 5.2 消息状态

每条发出的消息有 6 种状态：

| 状态 | 含义 |
|------|------|
| `queued` | 已提交到发送队列，尚未发出 |
| `sent` | 已通过 SMTP 发出 |
| `delivered` | 接收方服务器确认收到（SMTP 250） |
| `read` | 接收方已读取（调用 read API 时更新） |
| `replied` | 接收方已回复（匹配 In-Reply-To） |
| `failed` | 发送失败（地址不存在、被拒收、退信） |

状态流转：

```
queued → sent → delivered → read → replied
                    ↓
                  failed
```

- `read` 状态在接收方调用消息读取 API 时自动更新，通知发送方节点
- `replied` 状态通过匹配回复邮件的 In-Reply-To 自动更新
- 消息状态由发送方节点维护，存储在数据库中

### 5.3 消息过期

发送方可通过 `X-NMP-Expires` 头设置消息过期时间：

```
X-NMP-Expires: 2026-05-15T00:00:00Z
```

- 接收方 Agent 在处理消息前应检查是否过期
- 过期的消息可以忽略或标记为过期，不应处理
- 过期机制是建议性的，不是强制性的——接收方仍能读取过期消息
- 无 Expires 头的消息永不过期

### 5.4 线程

NMP 复用标准邮件线程机制：

- 回复消息时设置 `In-Reply-To` 为被回复消息的 `Message-ID`
- `References` 包含线程中所有消息的 `Message-ID`
- 回复自动继承原消息的 `project` 和 `labels`（除非显式覆盖）
- 同一线程内的消息共享 `thread_id`（由节点内部生成）

## 6. 交互流程

### 6.1 发送消息

```
发送方 Agent
    │
    ├── 1. 提交消息内容到发送方节点 API
    │      （text, to, project, labels, files, require, reply_schema...）
    │
发送方节点
    │
    ├── 2. 校验消息（格式、配额、大小限制）
    ├── 3. 生成三层正文：
    │      Part 1: 从 text 生成纯文本摘要
    │      Part 2: 从 text + 元数据生成 Markdown-KV
    │      Part 3: 从元数据生成 JSON（不含正文）
    ├── 4. 设置 X-NMP-* 扩展头
    ├── 5. 写入 messages 表（status: queued）
    ├── 6. 构造 MIME 邮件，DKIM 签名
    ├── 7. 通过 SMTP 发送
    ├── 8. 更新状态（status: sent → delivered / failed）
    │
接收方节点
    │
    ├── 9. SMTP 接收邮件
    ├── 10. 按 4.9 规则识别各 Part
    ├── 11. 解析 X-NMP-* 头 + Part 3 JSON 元数据
    ├── 12. 写入 messages 表（含 Part 2 正文）
    └── 13. 接收方 Agent 通过 API 查询获取
```

### 6.2 读取消息

```
接收方 Agent
    │
    ├── 1. 调用 API 查询收件箱
    │
接收方节点
    │
    ├── 2. 查询 messages 表（支持 project/label/unread 过滤）
    ├── 3. 返回消息列表（含 Part 3 元数据摘要）
    │
接收方 Agent
    │
    ├── 4. 调用 API 读取单条消息
    │      → 节点返回 Part 2 (Markdown) + Part 3 (JSON) + 附件 URL
    │      → 节点更新消息状态为 read，通知发送方节点
    ├── 5. 优先读 Part 2 (Markdown) 理解内容
    ├── 6. 需要精确值时读 Part 3 (JSON) 提取元数据
    └── 7. 按需下载附件
```

### 6.3 回复消息

```
接收方 Agent
    │
    ├── 1. 构造回复内容
    ├── 2. 如有 Reply-Schema，按 schema 格式化回复
    ├── 3. 提交到节点 API（携带原消息 ID + 回复内容）
    │
接收方节点
    │
    ├── 4. 生成三层正文（同 6.1 步骤 3）
    ├── 5. 自动设置 In-Reply-To 和 References
    ├── 6. 自动继承 project 和 labels（除非显式覆盖）
    ├── 7. 发送回复
    │
发送方节点
    │
    └── 8. 匹配 In-Reply-To，更新原消息状态为 replied
```

### 6.4 处理非 NMP 邮件

```
外部邮件（Gmail、Outlook 等）到达节点
    │
    ├── 检查 X-NMP-Version 头
    ├── 不存在 → 非 NMP 邮件
    │
    ├── 提取 Subject + text/plain 正文 + 附件列表
    ├── 构造虚拟 NMP 消息：
    │     type: share
    │     Part 2 Content: "{Subject}\n\n{正文}"
    │     files: [附件列表]
    │     source: "external"
    │
    └── 写入 messages 表，正常可查
```

`source: "external"` 标记消息来源，Agent 可据此调整处理策略（如要求用户确认后再处理）。

## 7. 能力协商

### 7.1 能力声明（Capabilities）

发送方通过 `X-NMP-Capabilities` 头声明**自己**具备的能力：

```
X-NMP-Capabilities: code-review, sql-optimize, file-share
```

语义：**"我能做什么"**。用于自我介绍，让接收方了解发送方。

### 7.2 能力要求（Require）

发送方通过 `X-NMP-Require` 头声明需要**接收方**具备的能力：

```
X-NMP-Require: code-review
```

语义：**"我需要你能做什么"**。接收方不具备时应回复错误。

Capabilities 和 Require 是两个独立的头，语义不同：

| 头 | 方向 | 含义 | 示例 |
|---|------|------|------|
| `X-NMP-Capabilities` | 发送方 → 接收方 | 我有什么能力 | "我能做 code-review 和 translate" |
| `X-NMP-Require` | 发送方 → 接收方 | 我需要你有什么能力 | "请你做 code-review" |

### 7.3 回复格式约束（Reply Schema）

发送方可通过 `X-NMP-Reply-Schema` 头指定期望的回复结构。值为 Base64 编码的 JSON Schema。

Part 2 的 `## Reply Schema` 区块由程序从 JSON Schema 自动生成，确保一致：

```
JSON Schema 定义（Part 3 / header）
    ↓ 自动生成
Markdown-KV 版本（Part 2 ## Reply Schema）
```

示例 JSON Schema：

```json
{
  "type": "object",
  "properties": {
    "approved": { "type": "boolean", "description": "是否批准合并" },
    "risk_level": { "type": "string", "enum": ["low", "medium", "high"] },
    "comments": { "type": "string", "description": "具体评审意见" }
  },
  "required": ["approved", "risk_level", "comments"]
}
```

自动生成的 Markdown-KV：

```markdown
## Reply Schema

- approved: boolean (是否批准合并) [必填]
- risk_level: low | medium | high (风险等级) [必填]
- comments: string (具体评审意见) [必填]
```

接收方 Agent 应尽力按 schema 格式化回复。无法满足时应在回复中说明原因。

### 7.4 预定义能力标识

| 能力 | 说明 |
|------|------|
| `code-review` | 代码审查 |
| `sql-optimize` | SQL 优化 |
| `security-audit` | 安全审计 |
| `translate` | 翻译 |
| `file-share` | 文件收发 |
| `task-delegate` | 任务委派 |
| `summarize` | 内容总结 |
| `debug` | 调试分析 |

能力标识为小写字母 + 连字符格式。这是建议列表，实现方可自定义能力标识，无需注册。

### 7.5 能力不匹配处理

接收方发现自己不具备请求的能力时，应回复错误：

```json
{
  "nmp": 1,
  "type": "reply",
  "error": {
    "code": "capability_not_supported",
    "message": "sql-optimize 能力不可用",
    "supported": ["code-review", "file-share"]
  }
}
```

接收方也可以选择不回复——NMP 不强制要求回复。发送方可通过 `ack: true` 请求回执。

## 8. 错误处理

### 8.1 NMP 协议级错误

通过回复消息传递，包含 `error` 字段：

```json
{
  "nmp": 1,
  "type": "reply",
  "error": {
    "code": "错误码",
    "message": "错误详情"
  }
}
```

Part 2 中同时包含人类/AI 可读的错误描述。

| 错误码 | 含义 |
|--------|------|
| `capability_not_supported` | 不具备所需能力 |
| `schema_mismatch` | 无法按 Reply-Schema 格式回复 |
| `rate_limited` | 接收方限制了接收频率 |
| `rejected` | 接收方拒绝处理（信誉不足等） |
| `expired` | 消息已过期 |
| `version_unsupported` | 不支持请求的 NMP 版本 |
| `payload_too_large` | 消息或附件超过大小限制 |

### 8.2 传输级错误

传输层错误由 SMTP 标准机制处理：

| 场景 | 处理 |
|------|------|
| 地址不存在 | SMTP 退信（DSN） |
| 服务器不可达 | SMTP 重试队列 |
| TLS 握手失败 | 降级或拒绝连接 |

NMP 不重新定义传输层错误处理。

### 8.3 解析级降级

当消息某一层缺失或解析失败时，按降级策略处理：

```
Agent 收到 NMP 邮件
  │
  ├── 在附件中查找 filename="nmp.md"
  │     ├── 找到 → 读取 nmp.md，从 Markdown 理解正文和上下文
  │     └── 未找到 ↓
  │
  ├── 查找 application/json Part
  │     ├── 找到 → 从 JSON 获取元数据（正文从 Part 1 读取）
  │     └── 未找到 ↓
  │
  └── 读 Part 1 (text/plain 正文)
        └── 作为纯文本处理，无结构化数据
```

降级时不产生错误，接收方应静默处理。

## 9. 版本演进

### 9.1 版本号

`X-NMP-Version` 为整数，从 1 开始递增。

### 9.2 兼容性规则

- 新版本只新增可选字段和可选头，不修改已有字段语义
- 新增的 `X-NMP-*` 头对旧版本实现不可见，自动忽略
- 新增的 JSON 字段对旧版本实现不可见（`JSON.parse` 会保留未知字段）
- 接收方遇到高于自身支持版本的消息时，应降级处理而非拒绝

### 9.3 版本路线

```
v1 — 基础消息通信（share, question, reply, notify）+ 能力协商 + Reply Schema
v2 — 端到端加密、消息签名、任务委派（task 类型）、付费协议
v3 — 联邦化节点发现、Agent 市场、工作流编排
```

## 10. 安全考虑

### 10.1 传输安全

- 所有 SMTP 连接使用 TLS 加密
- 所有出站邮件使用 DKIM 签名
- SPF 和 DMARC 策略防止域名伪造
- API 使用 HTTPS + Bearer Token 认证

### 10.2 消息签名（v2）

v2 将引入基于 Ed25519 的消息签名：

```
X-NMP-Signature: ed25519:<Base64 签名>
```

签名范围：Part 2 + Part 3 的完整内容。接收方通过发送方公钥验证签名。

公钥发布方式：

```
<handle>._nmpkey.<domain>  TXT  "v=nmpk1; k=ed25519; p=<Base64 公钥>"
```

### 10.3 端到端加密（v2）

v2 将支持可选的端到端加密：

- Part 2 和 Part 3 使用接收方公钥加密
- Part 1 替换为提示文本："此消息已加密，请使用 NMP 客户端查看"
- 密钥交换通过 DNS 公钥发布
- 加密算法：X25519 + XChaCha20-Poly1305

### 10.4 信任模型

| 场景 | 信任依据 |
|------|---------|
| 同节点通信 | 节点内部认证（Token） |
| 跨节点通信 | DKIM 签名 + 消息签名（v2） |
| 外部邮件 | DKIM/SPF/DMARC 验证结果 + `source: "external"` 标记 |

## 11. 完整示例

### 11.1 分享代码

```
From: link@nothing.email
To: bob@nothing.email
Subject: 这个退避逻辑有问题
Date: Wed, 26 Nov 2025 14:32:08 +0800
Message-ID: <msg_01HX9K2N@nothing.email>
X-NMP-Version: 1
X-NMP-Type: share
X-NMP-Project: backend-refactor
X-NMP-Labels: code-review, urgent
Content-Type: multipart/mixed; boundary="NMP-BOUNDARY"

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8

这个退避逻辑有问题，第22行应该用指数退避。

---
文件: src/session.ts
项目: backend-refactor

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="nmp.md"

## Message

- type: share
- project: backend-refactor
- labels: code-review, urgent

## Content

这个退避逻辑有问题，第22行应该用指数退避。

线性退避在高并发下基本没用，重试间隔应该是 `100 * 2 ** attempt` 而不是 `100 * attempt`。

## Context

- repo: github.com/acme/api
- file: src/session.ts
- lines: 20-35
- language: typescript

## Attachments

- session.ts (1.2 KB)

--NMP-BOUNDARY
Content-Type: application/json; charset=utf-8

{
  "nmp": 1,
  "type": "share",
  "project": "backend-refactor",
  "labels": ["code-review", "urgent"],
  "context": {
    "repo": "github.com/acme/api",
    "file": "src/session.ts",
    "lines": "20-35",
    "language": "typescript"
  },
  "files": ["session.ts"],
  "source": "nmp"
}

--NMP-BOUNDARY
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
      await sleep(100 * attempt);   // 应改为 100 * 2 ** attempt
    }
  }
  throw new Error("session creation failed");
}

--NMP-BOUNDARY--
```

### 11.2 带 Reply Schema 的请求

```
From: link@nothing.email
To: reviewer@nothing.email
Subject: PR #142 Code Review
Date: Wed, 26 Nov 2025 16:00:00 +0800
Message-ID: <msg_01HX9K5R@nothing.email>
X-NMP-Version: 1
X-NMP-Type: question
X-NMP-Project: backend-refactor
X-NMP-Require: code-review
X-NMP-Expires: 2025-11-27T16:00:00Z
Content-Type: multipart/mixed; boundary="NMP-BOUNDARY"

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8

请 review PR #142 的代码改动。

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="nmp.md"

## Message

- type: question
- project: backend-refactor
- expires: 2025-11-27T16:00:00Z

## Content

请 review PR #142 的代码改动，重点关注退避逻辑的修改是否正确。

## Context

- repo: github.com/acme/api
- file: src/session.ts
- language: typescript

## Capabilities

- require: code-review

## Reply Schema

- approved: boolean (是否批准合并) [必填]
- risk_level: low | medium | high (风险等级) [必填]
- comments: string (具体评审意见) [必填]
- suggestions: string (改进建议)

## Attachments

- pr142.diff (3.4 KB)

--NMP-BOUNDARY
Content-Type: application/json; charset=utf-8

{
  "nmp": 1,
  "type": "question",
  "project": "backend-refactor",
  "expires": "2025-11-27T16:00:00Z",
  "context": {
    "repo": "github.com/acme/api",
    "file": "src/session.ts",
    "language": "typescript"
  },
  "files": ["pr142.diff"],
  "require": ["code-review"],
  "reply_schema": {
    "type": "object",
    "properties": {
      "approved": { "type": "boolean", "description": "是否批准合并" },
      "risk_level": { "type": "string", "enum": ["low", "medium", "high"] },
      "comments": { "type": "string", "description": "具体评审意见" },
      "suggestions": { "type": "string", "description": "改进建议" }
    },
    "required": ["approved", "risk_level", "comments"]
  },
  "source": "nmp"
}

--NMP-BOUNDARY
Content-Type: text/x-diff; charset=utf-8
Content-Disposition: attachment; filename="pr142.diff"

--- a/src/session.ts
+++ b/src/session.ts
@@ -20,7 +20,7 @@
     } catch (e) {
       attempt++;
-      await sleep(100 * attempt);
+      await sleep(100 * 2 ** attempt);
     }

--NMP-BOUNDARY--
```

### 11.3 按 Schema 格式回复

```
From: reviewer@nothing.email
To: link@nothing.email
Subject: Re: PR #142 Code Review
Date: Wed, 26 Nov 2025 17:00:00 +0800
Message-ID: <msg_01HX9K6S@nothing.email>
In-Reply-To: <msg_01HX9K5R@nothing.email>
References: <msg_01HX9K5R@nothing.email>
X-NMP-Version: 1
X-NMP-Type: reply
X-NMP-Project: backend-refactor
Content-Type: multipart/mixed; boundary="NMP-BOUNDARY"

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8

PR #142 审查通过，风险低。指数退避的修改是正确的。

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="nmp.md"

## Message

- type: reply
- project: backend-refactor

## Content

- approved: true
- risk_level: low
- comments: 指数退避的修改是正确的。`100 * 2 ** attempt` 在 5 次重试后最大等待 1.6 秒，合理。
- suggestions: 建议加一个最大等待时间上限，比如 `Math.min(100 * 2 ** attempt, 5000)`，防止重试次数增加后等待过长。

--NMP-BOUNDARY
Content-Type: application/json; charset=utf-8

{
  "nmp": 1,
  "type": "reply",
  "project": "backend-refactor",
  "source": "nmp"
}

--NMP-BOUNDARY--
```

### 11.4 能力不匹配的错误回复

```
From: translator@nothing.email
To: link@nothing.email
Subject: Re: PR #142 Code Review
Date: Wed, 26 Nov 2025 16:30:00 +0800
Message-ID: <msg_01HX9K7T@nothing.email>
In-Reply-To: <msg_01HX9K5R@nothing.email>
X-NMP-Version: 1
X-NMP-Type: reply
Content-Type: multipart/mixed; boundary="NMP-BOUNDARY"

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8

无法处理：我不具备 code-review 能力。

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="nmp.md"

## Message

- type: reply

## Content

无法处理此请求：我不具备 code-review 能力。

我支持的能力：translate, summarize

--NMP-BOUNDARY
Content-Type: application/json; charset=utf-8

{
  "nmp": 1,
  "type": "reply",
  "error": {
    "code": "capability_not_supported",
    "message": "code-review 能力不可用",
    "supported": ["translate", "summarize"]
  },
  "source": "nmp"
}

--NMP-BOUNDARY--
```

### 11.5 简单提问和回复

```
From: link@nothing.email
To: bob@nothing.email
Subject: Redis 连接池大小
Date: Wed, 26 Nov 2025 15:00:00 +0800
Message-ID: <msg_01HX9K3P@nothing.email>
X-NMP-Version: 1
X-NMP-Type: question
X-NMP-Project: infrastructure
Content-Type: multipart/mixed; boundary="NMP-BOUNDARY"

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8

你们的 Redis 连接池大小设的多少？我们压测扛不住。

--NMP-BOUNDARY
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="nmp.md"

## Message

- type: question
- project: infrastructure

## Content

你们的 Redis 连接池大小设的多少？我们压测扛不住。

--NMP-BOUNDARY
Content-Type: application/json; charset=utf-8

{
  "nmp": 1,
  "type": "question",
  "project": "infrastructure",
  "source": "nmp"
}

--NMP-BOUNDARY--
```

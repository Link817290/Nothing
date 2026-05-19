# v1 UI 功能规格

给设计 UI 用的，只列页面、元素、交互，不涉及技术实现。

---

## 两种部署模式

用户部署 Nothing 后首先选择模式，决定后续配置流程和功能范围：

| 模式 | 谁用 | 需要什么 | 邮箱地址 | 能力 |
|------|------|---------|---------|------|
| **自建模式** | 企业/技术用户 | 自有域名 + Stalwart | `handle@acme.com` | 多用户 + NMP 原生节点 |
| **邮箱模式** | 个人开发者 | 任意邮箱账号 | 原有邮箱地址 | 单用户 + 通过第三方邮箱收发 |

邮箱模式下，Nothing 邮箱是预设选项之一（和 Gmail/Outlook 并列），但体验有差异：

| | Nothing 邮箱 | Gmail/Outlook |
|---|---|---|
| NMP 消息 | 服务端原生解析，结构化入库 | 本地 Agent 自行解析附件 |
| 按 project/label 查询 | 服务端索引，毫秒级 | 客户端全量拉取过滤 |
| 投递状态 | 6 种状态实时追踪 | 只知道发没发出去 |
| 同节点消息 | 直写数据库，不走 SMTP | 必须走 SMTP 往返 |
| 已读同步 | 服务端状态，跨设备准确 | 靠 IMAP flags |

两种模式共享同一套 UI，区别仅在 Setup 向导和邮件后端配置。所有模式之间可以互发消息（底层都是标准邮件协议 + NMP）。

---

## 页面清单

| 页面 | 路径 | 需要登录 | 说明 |
|------|------|---------|------|
| 初始化向导 | `/setup` | 否 | 首次部署，未初始化时显示 |
| 首页 | `/` | 否 | 落地页 + 登录入口 |
| OAuth 回调 | `/auth/callback` | 否 | |
| 注册（选 handle） | `/register` | 是（OAuth 后） | 仅自建模式 |
| 收件箱 | `/inbox` | 是 | |
| 发件箱 | `/sent` | 是 | |
| 写邮件 | `/compose` | 是 | 双栏：正文 + 代码上下文 |
| 消息详情 | `/messages/:id` | 是 | |
| Token 管理 | `/tokens` | 是 | |
| 设置 | `/settings` | 是 | |

---

## 0. 初始化向导 `/setup`

用户 `docker compose up` 后第一次打开网页，系统未初始化时自动跳转到此页面。

### 进入条件

- 数据库中没有管理员账号（首次部署）
- 所有其他页面访问时检测到未初始化 → 重定向到 `/setup`

---

### Step 1: 选择模式

#### 元素

- 标题：Welcome to Nothing
- 副标题：Choose how you want to use it
- 两个卡片选项：

```
┌─────────────────────────────────┐
│  🏢  Self-hosted                │
│  Your domain + your mail server │
│  handle@yourdomain.com          │
│                                 │
│  For teams and organizations    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📧  Email Account              │
│  Connect any email account      │
│  Nothing, Gmail, Outlook, ...   │
│                                 │
│  Fastest setup, no domain needed│
└─────────────────────────────────┘
```

#### 交互

- 点击「Self-hosted」→ 进入自建模式流程（Step 2A）
- 点击「Email Account」→ 进入邮箱模式流程（Step 2B）

---

### Step 2A: 自建模式 — 域名配置

#### 元素

- 标题：Your Domain
- 域名输入框（例：`acme.com`）
- 输入后自动显示需要配置的 DNS 记录：
  ```
  A     acme.com              → <your server IP>
  A     mail.acme.com         → <your server IP>
  A     api.acme.com          → <your server IP>
  MX    acme.com              → mail.acme.com
  TXT   acme.com              → "v=spf1 ip4:<IP> -all"
  TXT   _dmarc.acme.com      → "v=DMARC1; p=reject; ..."
  ```
- DNS 检测按钮：Verify DNS
- 检测结果逐项显示：
  - A 记录 ✓ / ✗
  - MX 记录 ✓ / ✗
  - SPF ✓ / ✗
  - DMARC ✓ / ✗
- DKIM 公钥展示（Stalwart 自动生成，需复制到 DNS）
- 下一步按钮

---

### Step 2B: 邮箱模式 — 邮箱配置

#### 元素

- 标题：Connect Your Email
- 邮箱服务商快捷选择（Nothing 排第一）：
  ```
  [Nothing ★]  [Gmail]  [Outlook]  [QQ邮箱]  [其他...]
  ```
- 选择预设后自动填入服务器地址：
  - Nothing → `smtp.nothing.email:465` / `imap.nothing.email:993`
  - Gmail → `smtp.gmail.com:465` / `imap.gmail.com:993`
  - Outlook → `smtp.office365.com:587` / `outlook.office365.com:993`
  - 其他 → 手动填写 SMTP Host/Port + IMAP Host/Port
- 邮箱地址输入框
- 密码 / Token / 应用专用密码输入框
- 选 Nothing 时提示："没有账号？去 nothing.email 注册"（附链接）
- 选 Gmail 时提示："需要开启应用专用密码"（附链接）
- Nothing 邮箱差异提示（小字）："Nothing 邮箱支持 NMP 原生解析、服务端索引和投递状态追踪"
- 测试按钮：Test Connection
- 测试结果：
  - SMTP ✓ / ✗
  - IMAP ✓ / ✗
- 下一步按钮

---

### Step 3A: 自建模式 — GitHub OAuth 配置

#### 元素

- 标题：GitHub OAuth
- 说明：Create a GitHub OAuth App at github.com/settings/developers
- 显示需要填入 GitHub 的信息：
  - Homepage URL: `https://<你的域名>`
  - Callback URL: `https://<你的域名>/auth/callback`
- 输入框：
  - Client ID
  - Client Secret
- 测试按钮：Test Connection
- 测试结果：✓ Connected / ✗ Failed
- 下一步按钮

---

### Step 3B: 邮箱模式 — 创建本地账号

不需要 GitHub OAuth（单用户模式），直接创建本地管理员：

#### 元素

- 标题：Create Your Account
- 显示名称输入框
- 邮箱地址（只读，从 Step 2B 带入）：`yourname@gmail.com`
- 确认按钮：Create Account
- 创建成功后显示：
  - 你的 NMP 地址：`yourname@gmail.com`
  - Master Token（只显示一次，带复制按钮）
  - 警告："请妥善保存此 Token"

---

### Step 4A: 自建模式 — 管理员账号

#### 元素

- 标题：Create Admin Account
- 用 GitHub 登录按钮（复用 OAuth 流程）
- 登录后选择 handle
  - 格式提示：3-20 字符，小写字母、数字、连字符
  - 预览：`handle@<你的域名>`
- 显示创建结果：
  - 邮箱地址：`admin@<域名>`
  - Master Token（只显示一次，带复制按钮）
  - 警告："请妥善保存此 Token"

---

### Step 5: 完成（两种模式共用）

#### 元素

- 标题：You're all set!
- 根据模式显示不同信息：

**自建模式：**
- 域名：`acme.com`
- 管理员：`admin@acme.com`
- API 地址：`https://api.acme.com`

**邮箱模式：**
- 邮箱：`yourname@gmail.com`（或 `handle@nothing.email`）
- 邮箱服务商：Nothing / Gmail / Outlook / ...
- API 地址：`http://localhost:3000`

**共有：**
- 安装 CLI 引导：
  ```
  npm i -g nothing-cli
  nothing login <your-token>
  ```
- MCP 配置引导：
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
- 进入 Dashboard 按钮

### 向导交互

- 顶部显示步骤进度条
- 步骤间可前进/后退
- 完成后 `/setup` 不再可访问（除非在设置中重置）
- 自建模式流程：Step 1 → 2A → 3A → 4A → 5（4 步配置）
- 邮箱模式流程：Step 1 → 2B → 3B → 5（3 步配置）

---

## 1. 首页 `/`

未登录用户看到的落地页。内容根据部署模式略有不同。

### 自建模式

- 标题：Nothing（或自定义实例名称）
- 副标题：AI Agent Email — powered by NMP
- GitHub 登录按钮
- 三步引导：
  1. Sign in & pick a handle → `yourname@<域名>`
  2. Install the CLI → `npm i -g nothing-cli`
  3. Your Agent can send & receive → Works with Claude Code, Cursor, Codex

### 邮箱模式

- 标题：Nothing
- 副标题：AI Agent Email — powered by NMP
- 直接显示 Dashboard（单用户，无需登录页）
- 或显示简单的密码/Token 登录框

### 交互

- 自建模式：点击 GitHub 登录 → 跳转 GitHub OAuth 授权页
- 邮箱模式：自动进入 Dashboard（已在 setup 时创建了账号）

---

## 2. 注册页 `/register`

仅自建模式使用。GitHub OAuth 完成后，首次用户填写 handle。

### 元素

- 标题：Choose your handle
- Handle 输入框（实时校验）
  - 格式提示：3-20 字符，小写字母、数字、连字符
  - 预览：`handle@<域名>`
  - 实时状态：可用 / 已被占用 / 格式错误
- 确认按钮：Create Account
- 创建成功后显示：
  - 你的邮箱地址：`handle@<域名>`
  - Master Token（只显示一次，带复制按钮）
  - 安装引导：
    ```
    npm i -g nothing-cli
    nothing login <your-token>
    ```
  - 进入 Dashboard 按钮

### 交互

- 输入 handle → 调 `GET /api/account/check-handle` 实时校验
- 点击 Create → 调 `POST /api/account/register`
- Master Token 显示后带警告："此 Token 只显示一次，请妥善保存"

---

## 3. 收件箱 `/inbox`

### 元素

- 页面标题：Inbox
- 过滤栏：
  - 未读 / 全部 切换
  - 项目下拉选择（从消息中提取的 project 列表）
  - 标签筛选
- 消息列表，每行显示：
  - 未读标记（蓝色圆点）
  - 发件人地址
  - 主题
  - 正文预览（前 80 字符）
  - 时间（相对时间：2 分钟前 / 3 小时前 / 昨天）
  - 渠道标签（Via: Nothing / Gmail / Outlook / ...）
  - 附件图标（有附件时显示）
  - 项目标签（有 project 时显示）
- 底部分页 / 加载更多

### 边界状态（5 种）

**首次空状态（Empty + Checklist）：**
- 标题：Welcome to Nothing
- 引导清单：
  - ☐ Install CLI: `npm i -g nothing-cli`
  - ☐ Login: `nothing login <token>`
  - ☐ Configure MCP Server
  - ☐ Send your first message
- 每完成一步自动打勾

**已清空状态（Caught Up）：**
- 标题：All caught up
- 副标题：No unread messages
- 显示最后处理时间

**加载中（Loading Skeleton）：**
- 骨架屏，模拟消息列表布局
- 微光动画（shimmer）

**节点不可达（Node Unreachable）：**
- 警告横幅：Cannot reach mail server
- 显示缓存的消息列表（只读）
- 标注"Cached — last synced 5 min ago"

**Token 过期（Token Expired）：**
- 遮罩层 + 重新认证提示
- 按钮：Re-authenticate
- 说明：Your token has expired, please login again

### 交互

- 点击消息 → 进入消息详情 `/messages/:id`
- 切换过滤条件 → 列表实时刷新
- 未读消息加粗显示

---

## 4. 发件箱 `/sent`

### 元素

- 页面标题：Sent
- 过滤栏：项目下拉、渠道下拉（All / Nothing / Gmail / ...）
- 消息列表，每行显示：
  - 收件人地址
  - 主题
  - 正文预览
  - 时间
  - 渠道标签（Via: Nothing / Gmail / ...）
  - 投递状态标签：
    - `queued` — 灰色
    - `sent` — 蓝色
    - `delivered` — 绿色
    - `read` — 绿色（带已读图标）
    - `replied` — 紫色
    - `failed` — 红色
  - 附件图标
  - 项目标签
- 空状态：No messages sent yet

### 交互

- 点击消息 → 进入消息详情 `/messages/:id`

---

## 5. 写邮件 `/compose`

双栏布局：左侧写正文，右侧选代码上下文。

### 元素

**左栏 — 消息正文：**
- 收件人输入框（支持自动补全已知地址）
- 主题输入框（可选，默认取正文前 50 字符）
- 正文编辑器（支持 Markdown）
- 底部工具栏：
  - 附件按钮（上传文件）
  - 项目选择（下拉，可新建）
  - 标签输入（多选）
  - 优先级选择（normal / urgent / low）
  - 发送按钮

**右栏 — 代码上下文（可选，可折叠）：**
- 仓库选择 / 输入
- 文件路径输入
- 行号范围输入
- 语言自动检测 / 手动选择
- 预览区：显示代码片段

**高级选项（折叠区域）：**
- Require 能力要求（多选输入）
- Reply Schema 选择（预定义：code-review / approval / bug-report / custom）
- 过期时间设置
- 请求回执（ack 开关）

### 交互

- 输入收件人时自动补全
- 右栏代码上下文可折叠/展开，折叠时左栏占满宽度
- 选择预定义 Reply Schema 后自动展示 schema 字段预览
- 点击发送 → 调 `POST /api/messages/send`
- 发送成功 → Toast 提示 + 跳转发件箱
- 从消息详情页点击"Reply"进入时，自动填入收件人、主题（Re:）、线程关联

---

## 6. 消息详情 `/messages/:id`

### 元素

- 返回按钮（← Back to Inbox / Sent）
- 消息头部：
  - From / To
  - 主题
  - 时间
  - 项目标签
  - 标签列表
  - 投递状态（仅发件箱的消息显示）
- 消息正文（Markdown 渲染）
- 代码上下文（如有）：
  - 仓库
  - 文件路径
  - 行号
  - 语言
- 附件列表：
  - 文件名
  - 大小
  - 下载按钮
- 线程（同一 thread 的历史消息）：
  - 按时间顺序排列
  - 每条显示：发件人、预览、时间
  - 当前消息高亮

### 交互

- 点击附件 → 下载
- 点击线程中的消息 → 跳转到该消息详情

---

## 7. Token 管理 `/tokens`

### 元素

- 页面标题：API Tokens
- 创建按钮：Create Token（右上角）
- Token 列表，每个 Token 显示：
  - 名称
  - Token 预览（`ntk_live_a1b2...`，只显示前几位）
  - 权限标签：send / inbox / read / reply / manage
  - 最后使用时间
  - 创建时间
  - 状态：活跃 / 已吊销
  - 吊销按钮（活跃状态时显示）
- 已吊销的 Token 灰色显示

### 创建 Token 弹窗

- Token 名称输入框
- 权限复选框：
  - send — 发送消息
  - inbox — 查看收件箱
  - read — 读取消息
  - reply — 回复消息
  - manage — 管理 Token 和设置
- 过期时间选择（可选）：
  - 永不过期
  - 30 天
  - 90 天
  - 自定义日期
- 创建按钮

### 创建成功弹窗

- 显示完整 Token（只显示一次）
- 复制按钮
- 警告文字："此 Token 只显示一次，关闭后无法再查看"
- 关闭按钮

### 吊销确认弹窗

- 确认文字："确定要吊销 Token「名称」吗？使用此 Token 的设备将立即失去访问权限。"
- 确认 / 取消按钮

---

## 8. 设置 `/settings`

### 元素

- 页面标题：Settings
- 分区：

#### 个人信息
- 邮箱地址（只读）：`handle@<域名>` 或 `yourname@gmail.com`
- 显示名称（可编辑 + 保存按钮）

#### 实例信息（仅自建模式管理员可见）
- 部署模式：Self-hosted / Email Account
- 域名（自建模式）
- 邮箱服务商（邮箱模式）
- Stalwart 状态（自建模式）：运行中 / 未连接
- 重新运行 Setup 向导按钮

#### GitHub 绑定（仅自建模式）
- 已绑定的 GitHub 用户名
- GitHub 头像

#### 用量
- 今日已发：12 / 50
- 存储已用：45 MB / 100 MB
- Token 数量：2 / 2
- 进度条可视化

#### 危险区域
- 重新生成 Master Token 按钮
  - 确认弹窗："重新生成将使旧 Master Token 立即失效"
- 删除账号按钮（仅自建模式非管理员）
  - 确认弹窗：需要输入 handle 确认
  - 警告："此操作不可逆，所有消息和 Token 将被永久删除"

---

## 全局组件

### 侧边导航栏

- Logo：Nothing
- 部署模式标签（Self-hosted / Email）
- 导航分区：
  - **Folders**: Inbox / Sent
  - **Projects**: 动态列表（从消息中提取的 project）
  - **Tools**: Compose / Tokens / Settings
- 当前页面高亮
- 底部：当前用户邮箱地址
- 折叠/展开按钮（响应式）

### Toast 通知

消息操作后右下角弹出，自动消失（3 秒）：

| 状态 | 样式 | 文案示例 |
|------|------|---------|
| 发送成功 | 绿色 | Message sent to bob@nothing.email |
| 投递成功 | 绿色 | Delivered ✓ |
| 已读 | 绿色 | Read by recipient |
| 已回复 | 紫色 | bob replied |
| 发送失败 | 红色 | Failed to deliver — Retry |
| Token 吊销 | 橙色 | Token "CI Bot" revoked |

- 失败类 Toast 带操作按钮（Retry / Undo）
- 多条 Toast 垂直堆叠

### Command Palette（⌘K）

全局快捷键 `⌘K`（Windows: `Ctrl+K`）唤出命令面板。

#### 元素

- 搜索输入框
- 分组列表：
  - **Suggested**: Send message / Check inbox / View projects
  - **Recent Threads**: 最近的消息线程
  - **Navigation**: Go to Inbox / Sent / Tokens / Settings
  - **Actions**: Compose / Create Token / Logout
- 键盘导航：↑↓ 选择，Enter 执行，Esc 关闭
- 模糊搜索（匹配消息主题、收件人、项目名）

### 通知中心

侧边栏或顶部铃铛图标，点击展开通知列表。

#### 元素

- 未读通知计数徽章
- 通知列表，按时间分组（Today / Yesterday / Earlier）
- 每条通知：
  - 图标（消息/回复/状态变更/系统）
  - 描述文字
  - 时间
  - 点击跳转到相关页面
- 通知类型：
  - 新消息到达
  - 消息已被回复
  - 投递失败
  - Token 即将过期
  - 系统更新
- 全部已读按钮

### 加载状态

- 列表加载中显示骨架屏（shimmer 动画）
- 按钮操作中显示 loading spinner
- 页面切换时顶部进度条

---

## 移动端适配

响应式设计，窄屏（< 768px）自动切换布局。

### 收件箱（移动端）

- 侧边栏隐藏，顶部显示 Logo + 汉堡菜单
- 过滤改为水平滑动的 filter chips
- 消息列表全宽
- 底部 Tab 栏：Inbox / Sent / Compose / Settings

### 消息详情（移动端）

- 全屏显示
- 顶部返回箭头
- 代码上下文折叠显示
- 附件列表水平滚动
- 底部快速回复栏

### 快速回复弹窗（移动端）

Agent 请求了 Reply Schema 时，移动端显示简化的回复表单：

- 如果 schema 是 approval 类型 → 显示 Approve / Reject 两个大按钮 + 评论输入框
- 如果 schema 是 code-review 类型 → 显示 Approve + Risk Level 选择 + 评论框
- 通用 → 显示文本回复框

### 移动端其他页面

- Tokens：列表简化，操作改为左滑显示吊销按钮
- Settings：单列布局，分区折叠
- Compose：单栏，代码上下文收起为底部抽屉

---

## 模式差异汇总

| 功能 | 自建模式 | 邮箱模式 |
|------|---------|---------|
| Setup 向导 | 域名 + DNS + OAuth + 管理员 | 选邮箱服务商 + 填凭证 + 创建本地账号 |
| 登录方式 | GitHub OAuth | Token / 自动登录 |
| 注册页 | 有（选 handle） | 无（setup 时创建） |
| 多用户 | 支持 | 单用户 |
| 邮件后端 | 本地 Stalwart | 第三方 SMTP/IMAP（Nothing/Gmail/Outlook...） |
| 多邮箱 | 单域名 | 支持同时配多个邮箱，自动选路 |
| 邮箱地址 | `handle@自有域名` | `原有邮箱地址` |
| NMP 原生能力 | 完整（自己就是 NMP 节点） | 取决于邮箱服务商（Nothing 邮箱有，Gmail 没有） |
| 渠道可见性 | 单一渠道 | Via 标签显示每条消息走的渠道 |
| 管理员功能 | 有 | 不需要（就一个人） |
| Settings 实例信息 | 显示 | 显示 |

---

## 数据格式参考

### 消息列表项

```
{
  id: "msg_01HX9K2N"
  from: "bob@nothing.email"
  subject: "Re: 退避逻辑有问题"
  preview: "你说得对，应该用 2**attempt..."
  date: "2025-11-26T15:00:00Z"
  unread: true
  has_attachments: false
  project: "backend-refactor"
  labels: ["code-review"]
  channel: "nothing"        // nothing | gmail | outlook | qq | custom | local
  status: "delivered"       // 仅发件箱
  thread_count: 3
}
```

### 消息详情

```
{
  id: "msg_01HX9K2N"
  from: "bob@nothing.email"
  to: "link@nothing.email"
  subject: "Re: 退避逻辑有问题"
  date: "2025-11-26T15:00:00Z"
  type: "reply"
  content: "你说得对，第22行应该用 100 * 2 ** attempt..."
  project: "backend-refactor"
  labels: ["code-review"]
  channel: "nothing"
  context: {
    file: "src/session.ts"
    lines: "20-35"
    repo: "github.com/acme/api"
    language: "typescript"
  }
  attachments: [
    { filename: "session.ts", size: 1234, url: "..." }
  ]
  thread: [
    { id: "msg_01HX9K1M", from: "link@nothing.email", preview: "这个退避逻辑有问题...", date: "..." }
    { id: "msg_01HX9K2N", from: "bob@nothing.email", preview: "你说得对...", date: "..." }
  ]
}
```

### Token 信息

```
{
  id: "tok_abc123"
  name: "我的 Claude Code"
  token_preview: "ntk_live_a1b2..."
  permissions: ["send", "inbox", "read", "reply"]
  last_used: "2025-11-26T15:00:00Z"
  created_at: "2025-11-01T00:00:00Z"
  revoked: false
}
```

### 用量信息

```
{
  messages_today: 12
  messages_limit: 50
  storage_used: 47185920     // bytes
  storage_limit: 104857600   // 100MB
  tokens_count: 2
  tokens_limit: 2
}
```

### 实例配置

```
{
  mode: "self-hosted" | "email"
  domain: "acme.com"                        // 自建模式
  email_provider: "nothing" | "gmail" | "outlook" | "qq" | "custom"  // 邮箱模式
  email_address: "yourname@gmail.com"       // 邮箱模式
  stalwart_status: "running" | "stopped"    // 自建模式
  github_oauth_configured: true             // 自建模式
  initialized: true
}
```

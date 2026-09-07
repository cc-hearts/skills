# GitHub Release 现代发布模版终极指南 (Release Templates Guide)

不同类型的软件项目（Web 应用、类库/SDK、命令行工具、内部微服务等）有着截然不同的用户群体和交付诉求。本指南收录了 5 种行业主流的标准 Release 模版范式。

---

## 1. 🚀 `product` 模版：面向产品与 SaaS 终端用户

### 适用场景
- Web 应用、SaaS 平台、移动 App、桌面客户端、交互式界面。
- **受众**：产品用户、客户、业务团队、运营人员。
- **核心重点**：突出“给用户带来的核心价值与直观体验变化”，语调生动友好，带适量 emoji，屏蔽晦涩的技术细节。

### 结构范例
```markdown
# [Product Name] v2.4.0

> 🚀 **版本亮点**：全新支持实时协同画布与智能组件一键排版，让团队协作效率提升 50%！

### ✨ 核心亮点 (Highlights)
- **实时多人协同编辑**：现在你可以与团队成员在同一个画布上实时查看光标位置并同步修改。
- **智能排版系统**：新增智能对齐和网格吸附引擎，复杂界面排版不再耗费精力。

### 🌟 新增功能 (What's New)
- **深色模式增强**：优化了在高对比度显示器下的暗黑背景与边框颜色呈现。
- **一键导出 PDF/SVG**：支持以无损矢量格式导出整个项目看板。

### 🛠️ 体验优化与 Bug 修复 (Improvements & Fixes)
- 优化了百万级大量节点下的画布缩放流畅度，帧率稳定在 60fps。
- 修复了 Safari 浏览器下偶现的复制快捷键失效问题 (#342)。
- 修复了网络断开重连后偶发的数据丢失问题。

### 👥 社区致谢 (Contributors)
非常感谢以下社区贡献者对本版本的支持：
- 感谢 @developer_a 提交的键盘快捷键补丁！
- 感谢 @designer_b 提供的暗黑配色方案优化！

---
**Full Changelog**: https://github.com/org/repo/compare/v2.3.0...v2.4.0
```

---

## 2. 📦 `sdk` 模版：面向开源库、框架与开发者 SDK

### 适用场景
- npm/PyPI/Go/Rust/Maven 开源类库、API SDK、开发框架。
- **受众**：下游开发者、架构师、技术团队。
- **核心重点**：**破坏性变更与迁移步骤必须置顶**，提供直观的 API 代码调用对比范例，强调性能提升与 Bug 修复。

### 结构范例
```markdown
# [Library Name] v3.0.0

### 🚨 破坏性变更与迁移指南 (Breaking Changes & Migration)
> [!WARNING]
> 从 v2.x 升级至 v3.0.0 包含以下破坏性变更，升级前请务必阅读迁移说明：
- **移除过时的回调函数支持**：所有异步 API 全面迁移至 Promise/Async-Await。
  ```ts
  // ❌ v2.x 方式 (已移除)
  client.fetchUser(id, (err, user) => { ... });

  // ✅ v3.0 推荐方式
  const user = await client.fetchUser(id);
  ```
- **配置项重命名**：`max_retry` 已重命名为 `maxRetries`。

### 🚀 新特性 (Features)
- **流式响应原生支持**：
  ```ts
  const stream = await client.streamEvents({ timeout: 5000 });
  for await (const event of stream) {
    console.log(event);
  }
  ```
- **TypeScript 严格类型推断**：新增泛型支持，推导更精确。

### 🐛 Bug 修复 (Bug Fixes)
- 修复在并发请求过高时导致的连接池泄露问题 (#182)
- 修复 Windows 环境下路径转义错误问题 (#195)

### ⚡ 性能优化 (Performance)
- 序列化引擎重构，JSON 编解码性能提升 35%。
- 打包体积从 45KB 压缩至 28KB（减少约 38%）。

### 🔗 完整对比 (Full Changelog)
- Compare: https://github.com/org/repo/compare/v2.9.0...v3.0.0
```

---

## 3. ⚡ `cli` 模版：面向命令行工具、DevOps 与系统服务

### 适用场景
- CLI 命令行工具、Docker 容器镜像、Kube 插件、基础设施组件。
- **受众**：运维工程师、DevOps、系统管理员、终端极客。
- **核心重点**：一键安装/升级命令放在第一屏，突出 CLI 参数（Flags）的变动与废弃，附带编译产物的 SHA-256 校验和。

### 结构范例
```markdown
# [Tool Name] v1.5.0

### 📥 快速安装与升级 (Quick Install & Upgrade)
```bash
# macOS (Homebrew)
brew update && brew upgrade mytool

# Linux / Shell 一键安装
curl -fsSL https://get.mytool.dev | sh

# Docker 镜像拉取
docker pull myorg/mytool:v1.5.0
```

### ⚡ 关键更新 (Highlights)
- 支持多线程并发备份与增量同步。
- 引入新的 `--output=json` 和 `--output=yaml` 结构化输出支持。

### 🔧 参数与配置变更 (Flags & Configuration)
- **[新增]** `--timeout-ms`：允许自定义网络探测超时时间。
- **[弃用]** `--insecure-skip-verify`：由于安全规范已标记弃用，请改用证书认证。

### 🐛 问题修复 (Bug Fixes)
- 修复 Linux ARM64 架构下信号中断（SIGINT）未能正常释放锁的问题。
- 修复由于环境变量解析异常导致的崩溃 (#88)。

### 🔐 校验和 (Artifacts & Checksums)
| 操作系统与架构 | 文件包 | SHA-256 校验和 |
| :--- | :--- | :--- |
| macOS (Apple Silicon) | `mytool-v1.5.0-darwin-arm64.tar.gz` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| macOS (Intel) | `mytool-v1.5.0-darwin-amd64.tar.gz` | `ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb` |
| Linux (x86_64) | `mytool-v1.5.0-linux-amd64.tar.gz` | `8277e0910d750195b448797616e091ad70a485c99ac7f600e69dec752f1df63c` |

---
**Full Changelog**: https://github.com/org/repo/compare/v1.4.2...v1.5.0
```

---

## 4. 📋 `standard` 模版：遵循 Keep-a-Changelog 与 SemVer 规范

### 适用场景
- 标准开源项目、讲究工程严谨性的基础库、自动化 CI/CD 发版流水线。
- **受众**：任何阅读 Changelog 的技术人员与自动化解析脚本。
- **核心重点**：严格按照 `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security` 六大维度归类，无主观煽情词汇。

### 结构范例
```markdown
# [Project Name] v2.1.0 (2026-09-08)

### Added
- 支持在请求头上配置 `X-Request-Id` 以进行分布式链路追踪 (#102)
- 为所有公共方法补充完整的类型注释

### Changed
- 将默认网络重试次数从 5 次缩减至 3 次
- 优化内部事件循环调度策略

### Deprecated
- `Config.useOldParser` 将在下一个大版本中被移除

### Removed
- 移除对 Node.js 14 寿命终结版本的支持

### Fixed
- 修复在边缘网络抖动时的内存泄露缺陷 (#115)
- 修复配置文件空行解析异常

### Security
- 升级依赖库 `json-parse-safe` 至 3.1.0 以修复潜在的原型污染风险 (CVE-XXXX)
```

---

## 5. 🎯 `minimal` 模版：极简轻量版

### 适用场景
- Patch 小版本发布（如 `v1.0.1` ➔ `v1.0.2`）、日常高频发版、热修复（Hotfix）。
- **受众**：只关心本次修了什么具体 Issue 或 PR 的用户。
- **核心重点**：一行简明概括 + PR 与提交列表 + 对比链接，干净利落。

### 结构范例
```markdown
## What's Changed in v1.0.2

本次发布主要包含日常问题修复与稳定性改进：

- fix(auth): 修复 Token 过期后偶发重定向循环问题 by @user1 in #45
- fix(ui): 修复按钮在移动端点击响应延迟 by @user2 in #48
- docs: 修正 README 中的环境变量配置示例 by @user3 in #49

**Full Changelog**: https://github.com/org/repo/compare/v1.0.1...v1.0.2
```

---

## 💡 模版选择速查表

| 项目类型 / 场景 | 推荐使用的模版参数 | 核心关注点 |
| :--- | :--- | :--- |
| SaaS 网页应用 / 移动客户端 / 桌面端 | `--template product` | 核心体验、功能亮点、视觉变化、致谢 |
| 开源类库 / 前后端框架 / 开发者 SDK | `--template sdk` | 破坏性变更置顶、代码调用示例、性能与类型 |
| 命令行 / Docker / 基础设施组件 | `--template cli` | 一键安装更新命令、参数改动、校验和 |
| 遵循 Keep-a-Changelog 的严谨开源工程 | `--template standard` | Added / Changed / Removed / Fixed 六分法 |
| 日常修复 / 热修复 / Patch 小版本 | `--template minimal` | 极简提交与 PR 列表、Compare 链接 |

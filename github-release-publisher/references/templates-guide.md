# GitHub Release 现代发布模版终极指南 (Release Templates Guide)

不同类型的软件项目（Web 应用、类库/SDK、命令行工具、内部微服务等）有着截然不同的用户群体和交付诉求。本指南收录了 6 种行业主流的标准 Release 模版范式以及 Monorepo 多包发版规则。

---

## 1. 🇨🇳/🇺🇸 `bilingual` 模版：面向开源社区与双语生态（推荐 / 默认）

### 适用场景
- Ant Design、Vue、Element Plus 等主流开源库与组件生态项目。
- **受众**：国内外开源开发者、下游集成方。
- **核心重点**：中英双语精准对齐（`英文改动 — 中文说明`），分类清晰（Features, Bug Fixes, Maintenance），无空洞营销词汇，文末附带完整的 `What's Changed` 与 PR 链接。

### 结构范例
```markdown
# @antdv-next/x@1.2.4

## 🚀 Features

- feat(docs): use createMirrorRedirect from docs-plugins — 文档站接入 `@antdv-next/docs-plugins` 提供的 `createMirrorRedirect` 方案，支持时区与语言评分、探活检测及国内镜像站智能重定向。 (#217)
- feat(ci): integrate pkg.pr.new preview package publishing — 集成 `pkg.pr.new` 自动化预览包发布流程，每个 PR 均会自动发布免本地编译的临时安装包，方便实时验证变更。 (#218)
- feat(ci): upload coverage reports to Codecov — 接入 Codecov 自动上报单元测试覆盖率报告。 (#218)

## 🐛 Bug Fixes

- fix(mermaid): preserve progressive renders and invalidate stale results — 修复 Mermaid 组件在持续流式输出时图表长时间空白与异步竞态覆盖问题；渲染耗时超过节流间隔时允许渐进帧平滑上屏，新结果提交后废弃晚到的旧结果，并在切换视图、清空内容或组件卸载时及时失效在途渲染。 (#213)
- fix(docs): import createMirrorRedirect via deep path to keep vite out of client bundle — 修复误将构建期 Vite 依赖打入文档客户端入口 bundle 导致线上站点白屏的问题，改为深路径导入零依赖的浏览器安全模块。 (#219)
- fix(docs): set demo headerMode to section for multi-section anchor hierarchy — 修复文档中多层级锚点的展示层级。 (e450cf5)

## 🛠️ Maintenance & Refactor

- chore(x-markdown): bump marked from 12.x to 16.x and migrate renderers to token API — 将 `marked` 升级至 `^16.2.1`（对齐上游），迁移 `html`/`link`/`paragraph`/`code` 渲染器到 marked v13+ Token 对象 API，保持行内 token 解析与 LaTeX 扩展完全兼容。 (#214)
- chore: fix vitest config import warning and route tests through local vp — 修复 `vitest.config.ts` 未带扩展名引发的 Vite `configLoader: 'native'` 警告，并将测试规范收敛至项目本地 Vite+ 工具链，规避全局 CLI 导致的 jsdom 报错。 (#220)
- chore: update upstream sync cursor — 同步上游代码游标。 (#210)

--------

## What's Changed

- fix(docs): set demo headerMode to section for multi-section anchor hierarchy in e450cf5
- chore: update upstream sync cursor in #210 https://github.com/antdv-next/x/pull/210
- fix(mermaid): preserve progressive renders and invalidate stale results in #213 https://github.com/antdv-next/x/pull/213
- chore(x-markdown): bump marked from 12.x to 16.x and migrate renderers to token API in #214 https://github.com/antdv-next/x/pull/214
- feat(docs): use createMirrorRedirect from docs-plugins in #217 https://github.com/antdv-next/x/pull/217
- ci: integrate pkg.pr.new preview publishing and Codecov in #218 https://github.com/antdv-next/x/pull/218
- fix(docs): import createMirrorRedirect via deep path to keep vite out of client bundle in #219 https://github.com/antdv-next/x/pull/219
- chore: fix vitest config import warning and route tests through local vp in #220 https://github.com/antdv-next/x/pull/220

--------

**Full Changelog**: https://github.com/antdv-next/x/compare/@antdv-next/x@1.2.3...@antdv-next/x@1.2.4
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

## 3. 🚀 `product` 模版：面向产品与 SaaS 终端用户

### 适用场景
- Web 应用、SaaS 平台、移动 App、桌面客户端、交互式界面。
- **受众**：产品用户、客户、业务团队、运营人员。
- **核心重点**：突出“给用户带来的核心价值与直观体验变化”，语调生动友好，带适量 emoji，屏蔽晦涩的技术细节。

---

## 4. ⚡ `cli` 模版：面向命令行工具、DevOps 与系统服务

### 适用场景
- CLI 命令行工具、Docker 容器镜像、Kube 插件、基础设施组件。
- **受众**：运维工程师、DevOps、系统管理员、终端极客。
- **核心重点**：一键安装/升级命令放在第一屏，突出 CLI 参数（Flags）的变动与废弃，附带编译产物的 SHA-256 校验和。

---

## 5. 📋 `standard` 模版：遵循 Keep-a-Changelog 与 SemVer 规范

### 适用场景
- 标准开源项目、讲究工程严谨性的基础库、自动化 CI/CD 发版流水线。
- **受众**：任何阅读 Changelog 的技术人员与自动化解析脚本。
- **核心重点**：严格按照 `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security` 六大维度归类，无主观煽情词汇。

---

## 6. 🎯 `minimal` 模版：极简轻量版

### 适用场景
- Patch 小版本发布（如 `v1.0.1` ➔ `v1.0.2`）、日常高频发版、热修复（Hotfix）。
- **受众**：只关心本次修了什么具体 Issue 或 PR 的用户。
- **核心重点**：一行简明概括 + PR 与提交列表 + 对比链接，干净利落。

---

## 🛡️ Monorepo 多包发版与 `--latest` 保护原则

在 Monorepo 仓库（如 pnpm workspace、Lerna、Nx）中，多包独立发版是常见场景：

1. **Scoped Tags 严格隔离**：
   - 必须通过作用域前缀隔离（如 `@scope/pkg@1.0.0`），脚本计算上一版本时仅在同前缀的 Tag 集合中检索。
2. **`--latest` 徽标保护**：
   - **主核心包**（如 `@antdv-next/x`、`vue`、`react`）发布时更新 `Latest` 徽标。
   - **次级子包**（如 `@antdv-next/x-markdown`、`@antdv-next/x-sdk` 等衍生包）发布时，**必须显式指定 `--latest=false`**，避免次级包在 GitHub Release 页面抢占仓库主包的 `Latest` 徽标！
3. **子目录过滤 (`--path`)**：
   - 发布特定子包时，只抓取对该子包所在目录生效的代码改动，避免将整个仓库其他不相关的提交混入。

# Agent Skills Collection

精选的高质量 AI 智能体技能库（Skills Collection），专为 **Codex**、**Claude Code**、**Antigravity**、**Cline** 等现代 AI 编程助手设计，提供高标准、工程化、开箱即用的专业能力。

---

## 📦 Skills 概览

| 技能名称 (Skill) | 核心定位 | 适用阶段 | 核心特色 |
| :--- | :--- | :--- | :--- |
| [`code-simplifier`](./code-simplifier/) | **代码精简与反过度兼容专家** | 重构 / 提交前清理 | 严禁无底线兼容回退；存疑/废弃字段**强制停步向用户确认**，杜绝技术债固化。 |
| [`github-pr-creator`](./github-pr-creator/) | **标准 PR 生成与分支对齐 (GitHub & Gitee)** | 特性开发完成 / 准备提 PR | 基于 antdv-next 官方模版，类似 Code Review 确认目标分支与托管平台，智能勾选分类、关联 Issue (#123 或 #Ixxxx) 并输出双语 Changelog。 |
| [`github-release-publisher`](./github-release-publisher/) | **GitHub Release 自动化发布** | 版本发版 / 交付 | 智能分析 Git 提交与 PR，内置 5 大现代模版（Product、SDK、CLI、Standard、Minimal）。 |
| [`production-template-design`](./production-template-design/) | **生产级产品模板与原型设计** | 前期原型 / UI 开发 | 拒绝空洞原型，提供支持 shadcn 语义 Token、深浅主题、响应式交互的生产级界面。 |
| [`qa-flow-review`](./qa-flow-review/) | **QA 视角端到端回归走查** | 开发完成 / 提测前 | 梳理变更影响面、发现遗漏的测试场景，输出高风险排查清单与潜在 Bug 预警。 |

---

## 🚀 安装指南 (Installation)

本仓库提供**全平台一键通用安装脚本**，使用软链接（Symbolic Link）将 skills 挂载到各大环境。不论你在本仓库中对 Prompt 还是规则脚本做出任何修改，所有工具都会**实时同步生效**。

### 🌟 方式一：一键全平台挂载（最推荐）

运行根目录下的安装脚本，将自动批量挂载到 Codex、Claude Code、Antigravity/Gemini：

```bash
# 1. 预览挂载操作
./scripts/install-all.sh --dry-run

# 2. 正式执行一键挂载
./scripts/install-all.sh

# 3. （可选）为某个具体项目一键挂载技能并注入 Cursor Rules
./scripts/install-all.sh --project /path/to/my-project
```

---

### 方式二：手动挂载到指定平台

<details>
<summary>点击展开手动挂载命令（Codex / Claude Code / Antigravity / Cursor）</summary>

#### 1. OpenAI Codex CLI
Codex 会自动读取 `~/.codex/skills/` 下的技能定义文件（`openai.yaml` 和 `SKILL.md`）：
```bash
mkdir -p ~/.codex/skills
for skill in /Users/carl/Desktop/carl-github/skills/*/; do
  skill_name=$(basename "$skill")
  [ "$skill_name" != ".git" ] && [ "$skill_name" != "scripts" ] && ln -sfn "$skill" ~/.codex/skills/"$skill_name"
done
```

#### 2. Claude Code
Claude Code 会自动识别 `~/.claude/skills/` 目录中的 `SKILL.md`：
```bash
mkdir -p ~/.claude/skills
for skill in /Users/carl/Desktop/carl-github/skills/*/; do
  skill_name=$(basename "$skill")
  [ "$skill_name" != ".git" ] && [ "$skill_name" != "scripts" ] && ln -sfn "$skill" ~/.claude/skills/"$skill_name"
done
```

#### 3. Antigravity / Gemini CLI
```bash
mkdir -p ~/.gemini/config/skills
for skill in /Users/carl/Desktop/carl-github/skills/*/; do
  skill_name=$(basename "$skill")
  [ "$skill_name" != ".git" ] && [ "$skill_name" != "scripts" ] && ln -sfn "$skill" ~/.gemini/config/skills/"$skill_name"
done
```

#### 4. Cursor IDE
将对应技能的 `rules/cursor.mdc` 软链接或复制到项目的 `.cursor/rules/` 目录下即可：
```bash
mkdir -p .cursor/rules
ln -sfn /Users/carl/Desktop/carl-github/skills/code-simplifier/rules/cursor.mdc .cursor/rules/code-simplifier.mdc
```

#### 5. Windsurf / Cline / Roo Code / Copilot
将对应技能目录下的 `rules/generic-agent-rule.md` 引用或添加到各自的 Rules / System Prompt 文件（如 `.windsurfrules`、`.clinerules`、`.github/copilot-instructions.md`）中。

</details>

---

## 💡 使用说明与实战指令 (How to Use)

安装完成后，在不同 AI 编程助手内可通过快捷前缀或自然语言即刻唤醒技能：

### 1. `code-simplifier` (全平台代码精简与反过度兼容)
- **多平台触发方式**：
  - **Codex**: `$code-simplifier`
  - **Claude Code**: `/simplify` 或 “使用 code-simplifier 精简代码”
  - **Cursor**: Composer 中 `@code-simplifier` 或配合 `.cursor/rules` 自动触发
  - **Antigravity / Gemini**: `$code-simplifier` 或自然语言直接调用
  - **Windsurf / Cline / Copilot**: 引用规则或提示词唤起
- **支持语言**：TypeScript/JavaScript、Python、Go、Java/Kotlin、Rust 等。
- **推荐 Prompt**：
  > “使用 code-simplifier 帮我精简刚修改的代码。严格遵守 Stop-and-Clarify 规则，如果遇到不确定或历史废弃字段，立刻停下来向我确认，不要自作主张写 fallback 兼容。”
- **预期行为**：
  - 严格遵守 4 步执行流：扫描范围 ➔ 坏味道与兜底嗅探 ➔ 停步确认 ➔ 完整重构。
  - 用卫语句（Guard Clauses）消除多层嵌套。
  - 遇到可疑的废弃字段或属性时，**打断并输出标准化提问卡片**，让开发者做决定，杜绝盲目兜底技术债。
  - 参考内部跨语言指南：[anti-patterns.md](./code-simplifier/references/anti-patterns.md)。

---

### 2. `github-release-publisher` (GitHub 多模版现代发版说明)
- **多平台触发方式**：
  - **Codex**: `$github-release-publisher`
  - **Claude Code / Antigravity**: 自然语言调用或直接执行脚本
  - **Cursor**: Composer 中 `@github-release-publisher` 或使用 `.cursor/rules`
- **支持的 5 大现代 Release 模版**：
  1. `product`（默认）：面向 SaaS/终端产品，突出功能亮点、体验优化与社区致谢。
  2. `sdk`：面向开源库与框架，**破坏性变更置顶**、附带新 API 代码调用范例。
  3. `cli`：面向命令行工具与 DevOps，提供一键安装升级命令与 SHA-256 校验和。
  4. `standard`：遵循 Keep-a-Changelog 与 SemVer 语义化规范。
  5. `minimal`：极简轻量，针对日常 Patch 小修复。
- **推荐 Prompt**：
  > “使用 github-release-publisher 检查从上个版本 tag 至今的所有提交和 PR，采用 sdk 模版帮我生成一份面向开发者的 GitHub Release 发布草稿。”
- **预期行为**：
  - 自动运行 `generate_release_notes.js` 并智能提取项目名与 Git 历史。
  - 根据选定模版输出结构严谨、排版专业的 Release 说明，绝无任何硬编码业务占位符。
  - 详细指南见：[templates-guide.md](./github-release-publisher/references/templates-guide.md)。

---

### 3. `production-template-design` (生产级原型与组件模板设计)
- **触发方式**：
  - **Codex**: `$production-template-design`
- **推荐 Prompt**：
  > “使用 $production-template-design 为当前项目设计一个带真实数据流与交互状态（Loading、Empty、Error）的用户权限管理页面，要求适配 shadcn 语义 Token 和深浅主题。”
- **预期行为**：
  - 产出可直接运行的高质量代码，而非简陋的静态线框。
  - 具备完整的交互原型与响应式设计。

---

### 4. `qa-flow-review` (QA 视角全流程审计与回归审查)
- **触发方式**：
  - **Codex**: `$qa-flow-review`
- **推荐 Prompt**：
  > “我已经完成了当前功能的编码，请使用 $qa-flow-review 从测试角度审查改动，列出受影响的端到端业务流，并指出可能遗漏的边界测试用例和回归风险。”
- **预期行为**：
  - 输出改动代码的影响链路图（Impacted Flow Map）。
  - 提供详尽的高风险复测清单（Checklist），标明哪些需要重点手工验证、哪些需要补写单测。

---

### 5. `github-pr-creator` (基于 antdv-next 规范的 GitHub & Gitee PR 生成器)
- **多平台触发方式**：
  - **Codex**: `$github-pr-creator`
  - **Claude Code / Antigravity**: 自然语言输入或直接调用脚本
  - **Cursor**: Composer 中 `@github-pr-creator` 或自动应用 `.cursor/rules`
- **支持平台**：**GitHub** 与 **Gitee（码云）**，自动通过远程仓库链接识别，或通过 `--platform <gh|gitee>` 指定。
- **推荐 Prompt**：
  > “使用 github-pr-creator 分析当前分支代码，确认目标分支后，按照 antdv-next 官方模版生成一份标准的 PR 说明草稿。”
- **预期行为**：
  - **类似 Code Review 的目标分支与平台选择流程**：自动识别当前分支与平台（GitHub/Gitee），若未指定目标分支则主动询问合并基准（默认 `main` 或 `next`）。
  - **智能勾选分类**：分析修改的文件与提交，自动在 `### 🤔 本次变更属于 ...` 打勾（如新功能、Bug 修复、TS 类型、组件样式、测试用例等）。
  - **双平台 Issue 兼容提取**：自动从分支名或 commit 提取并填充 `### 🔗 相关 Issue`（GitHub 支持 `#123`，Gitee 完美支持 `#I8M7KZ` 等带 `I` 字母前缀的 Issue）。
  - **自动生成双语 Changelog**：输出中英双语表格（🇺🇸 English & 🇨🇳 Chinese），描述对组件使用者的直接影响。
  - **平台特化交付物**：
    - **GitHub 模式**：输出规范 PR 标题与 `gh pr create` 命令。
    - **Gitee 模式**：输出带分支预选参数的**网页直达创建链接**（`https://gitee.com/.../pulls/new?source=...&target=...`）及格式化好的 Markdown 草稿。

---

## 🛠️ 结构规范与新增 Skill 指南

如果你需要在此仓库中新增或维护自定义 Skill，每个 Skill 建议包含以下标准结构：

```text
skills/<skill-name>/
├── SKILL.md             # [必须] 技能主体指令，包含标准 YAML Frontmatter 与核心工作流（全平台通用事实标准）
├── agents/              # [适配] 供 Codex CLI 识别的入口配置（openai.yaml）
│   └── openai.yaml
├── rules/               # [适配] 供 Cursor / Windsurf / Cline / Copilot 等识别的规则文件
│   ├── cursor.mdc
│   └── generic-agent-rule.md
├── scripts/             # [可选] 供 Agent 调用的可执行脚本（Node/Python/Shell）
└── references/          # [可选] 详细的参考文档、跨语言反模式或检查清单（按需渐进加载，节省 Token）
```

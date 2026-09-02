# Agent Skills Collection

精选的高质量 AI 智能体技能库（Skills Collection），专为 **Codex**、**Claude Code**、**Antigravity**、**Cline** 等现代 AI 编程助手设计，提供高标准、工程化、开箱即用的专业能力。

---

## 📦 Skills 概览

| 技能名称 (Skill) | 核心定位 | 适用阶段 | 核心特色 |
| :--- | :--- | :--- | :--- |
| [`code-simplifier`](./code-simplifier/) | **代码精简与反过度兼容专家** | 重构 / 提交前清理 | 严禁无底线兼容回退；存疑/废弃字段**强制停步向用户确认**，杜绝技术债固化。 |
| [`github-release-publisher`](./github-release-publisher/) | **GitHub Release 自动化发布** | 版本发版 / 交付 | 智能分析 Git 提交与 PR，自动化生成结构化、用户友好的发版说明与更新日志。 |
| [`production-template-design`](./production-template-design/) | **生产级产品模板与原型设计** | 前期原型 / UI 开发 | 拒绝空洞原型，提供支持 shadcn 语义 Token、深浅主题、响应式交互的生产级界面。 |
| [`qa-flow-review`](./qa-flow-review/) | **QA 视角端到端回归走查** | 开发完成 / 提测前 | 梳理变更影响面、发现遗漏的测试场景，输出高风险排查清单与潜在 Bug 预警。 |

---

## 🚀 安装指南 (Installation)

推荐使用**软链接（Symbolic Link）**方式安装。这样你在本仓库中对 Prompt 或脚本的任何更新，所有接入工具都会**实时生效**，无需重复复制。

### 方式一：安装到 Codex CLI（全局生效，推荐）

Codex 会自动读取 `~/.codex/skills/` 下的技能定义文件（`openai.yaml` 和 `SKILL.md`）：

```bash
# 1. 确保目录存在
mkdir -p ~/.codex/skills

# 2. 一键批量软链接所有 skills 到全局目录
for skill in /Users/carl/Desktop/carl-github/skills/*/; do
  skill_name=$(basename "$skill")
  if [ "$skill_name" != ".git" ]; then
    ln -sfn "$skill" ~/.codex/skills/"$skill_name"
    echo "✓ 已挂载到 Codex: $skill_name"
  fi
done
```

> **验证安装**：运行 `ls -l ~/.codex/skills`，若能看到各 skill 的软链接箭头即表示安装成功。

---

### 方式二：安装到 Claude Code（全局生效）

Claude Code 会自动识别 `~/.claude/skills/` 目录中的技能：

```bash
# 1. 确保目录存在
mkdir -p ~/.claude/skills

# 2. 一键软链接
for skill in /Users/carl/Desktop/carl-github/skills/*/; do
  skill_name=$(basename "$skill")
  if [ "$skill_name" != ".git" ]; then
    ln -sfn "$skill" ~/.claude/skills/"$skill_name"
    echo "✓ 已挂载到 Claude Code: $skill_name"
  fi
done
```

---

### 方式三：安装到 Antigravity / Gemini CLI

- **全局生效**（推荐）：
  ```bash
  mkdir -p ~/.gemini/config/skills
  for skill in /Users/carl/Desktop/carl-github/skills/*/; do
    skill_name=$(basename "$skill")
    [ "$skill_name" != ".git" ] && ln -sfn "$skill" ~/.gemini/config/skills/"$skill_name"
  done
  ```
- **单项目生效**（在某个具体仓库的根目录下执行）：
  ```bash
  mkdir -p .agents/skills
  ln -sfn /Users/carl/Desktop/carl-github/skills/code-simplifier .agents/skills/code-simplifier
  ```

---

## 💡 使用说明与实战指令 (How to Use)

安装完成后，在不同的 AI 编程助手中直接通过自然语言或带有 `$` 的快捷指令调用。

### 1. `code-simplifier` (代码精简与重构)
- **触发方式**：
  - **Codex**: `$code-simplifier`
  - **Claude / Antigravity**: 直接要求精简代码或调用该 skill
- **推荐 Prompt**：
  > “使用 $code-simplifier 帮我精简刚修改的文件。严格遵守 Stop-and-Clarify 规则，如果遇到不确定或历史废弃字段，立刻停下来向我确认，不要自作主张写 fallback 兼容。”
- **预期行为**：
  - 用卫语句（Guard Clauses）压平嵌套。
  - 清理多余临时变量与死逻辑。
  - 一旦发现 `data?.newProp ?? data?.oldProp` 这类可疑的链式兼容，立即停步向你确认是否可以彻底废弃旧字段。

---

### 2. `github-release-publisher` (GitHub 发版说明)
- **触发方式**：
  - **Codex**: `$github-release-publisher`
- **推荐 Prompt**：
  > “使用 $github-release-publisher 检查从上个版本 tag 至今的所有提交和 PR，帮我生成一份面向终端用户的 GitHub Release 发布草稿。”
- **预期行为**：
  - 自动运行内置的 `generate_release_notes.ts` 抓取变更。
  - 输出包含 **Highlights (核心亮点)**、**Breaking Changes (破坏性变更)**、**Upgrade Notes (升级指南)** 与分类清晰的 **Changelog**。

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

## 🛠️ 结构规范与新增 Skill 指南

如果你需要在此仓库中新增或维护自定义 Skill，每个 Skill 建议包含以下标准结构：

```text
skills/<skill-name>/
├── SKILL.md             # [必须] 技能主体指令，包含 YAML Frontmatter (name, description) 与核心操作步骤
├── agents/              # [推荐] 供 Codex 等识别的入口配置
│   └── openai.yaml      # 定义 display_name, default_prompt 与 allow_implicit_invocation
├── scripts/             # [可选] 供 Agent 调用的可执行脚本（Node/Python/Shell）
└── references/          # [可选] 详细的参考文档、规范或检查清单（按需渐进加载，节省 Token）
```

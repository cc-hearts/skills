# GitHub 与 Gitee（码云）PR 兼容性与差异参考指南

本指南梳理了 GitHub 与 Gitee 在 Pull Request（合并请求）创建、Issue 关联、模版支持及自动化调用方面的异同点与最佳实践。

---

## 1. 核心差异速查表

| 对比维度 | GitHub | Gitee (码云) |
| :--- | :--- | :--- |
| **平台概念** | Pull Request (PR) | Pull Request (PR) / 合并请求 |
| **默认分支惯例** | `main` | `master` 或 `main` |
| **网页提 PR 快捷链接** | `https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1` | `https://gitee.com/<owner>/<repo>/pulls/new?source=<head>&target=<base>` |
| **Issue 编号格式** | `#123`（纯数字） | `#I8M7KZ`（大写 `I` 开头 5~8 位字母数字）或 `#123` |
| **Issue 关联关键字** | `close #123`, `fix #123`, `resolve #123` | `close #I8M7KZ`, `fix #I8M7KZ`, `关闭 #I8M7KZ` |
| **模版文件存放位置** | `.github/PULL_REQUEST_TEMPLATE.md` | `.gitee/PULL_REQUEST_TEMPLATE.md` 或 `.github/PULL_REQUEST_TEMPLATE.md`（兼容） |
| **官方 CLI 工具** | GitHub CLI (`gh pr create`) | 社区生态脚本或直接使用带参数的 Web URL |

---

## 2. Issue 语法兼容细节

### GitHub 语法
- 支持使用 `#<ID>` 进行关联，例如 `#1024`。
- 在 PR 合并时自动关闭 Issue 的关键字：
  - `close #1024` / `closes #1024`
  - `fix #1024` / `fixes #1024`
  - `resolve #1024` / `resolves #1024`

### Gitee（码云）语法
- Gitee 平台为全局唯一 Issue ID，通常以大写 `I` 开头，后跟数字和字母组合（例如：`#I8M7KZ`、`#I5ABCD`）。
- 同时在部分自建或老项目中支持纯数字 `#123`。
- 自动关联与关闭语法：
  - `fix #I8M7KZ`
  - `close #I8M7KZ`
  - `关联 Issue: #I8M7KZ`

---

## 3. 网页提 PR 深度链接参数

### GitHub Web 快捷创建
在 GitHub 中，可以通过在 URL 路径中指定 base 与 head 分支：
```text
https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1
```

### Gitee Web 快捷创建
在 Gitee 中，可以通过 URL 的 Query 参数预设源分支与目标分支：
```text
https://gitee.com/<owner>/<repo>/pulls/new?source=<head>&target=<base>
```
用户在终端点击该链接后，浏览器会直接打开已经选好分支的“新建 Pull Request”页面，只需将生成的 Markdown 粘贴并点击提交即可。

---

## 4. 模版文件位置兼容策略

- 针对开源项目，GitHub 优先识别 `.github/PULL_REQUEST_TEMPLATE.md`。
- Gitee 原生支持 `.gitee/PULL_REQUEST_TEMPLATE.md`，同时**具备对 `.github/PULL_REQUEST_TEMPLATE.md` 的向下兼容支持**。
- 因此，采用 **antdv-next** 的标准模版结构可以在两个平台上实现零摩擦复用。

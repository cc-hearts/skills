#!/usr/bin/env node

const { existsSync, statSync, writeFileSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve } = require("path");

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function runGit(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

function tryRunGit(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return undefined;
  }

  return result.stdout.trim();
}

function detectPlatform(repo) {
  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  if (origin) {
    if (origin.includes("gitee.com")) {
      return "gitee";
    }
    if (origin.includes("github.com")) {
      return "github";
    }
  }
  return "github";
}

function extractOwnerRepo(repo) {
  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  if (!origin) return undefined;

  // matches git@github.com:owner/repo.git or https://github.com/owner/repo.git
  // or git@gitee.com:owner/repo.git or https://gitee.com/owner/repo.git
  const match = origin.match(/(?:[:/])([^/:]+\/[^/.]+)(?:\.git)?$/);
  return match ? match[1] : undefined;
}

function detectCurrentBranch(repo) {
  const branch = tryRunGit(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return branch && branch !== "HEAD" ? branch : undefined;
}

function detectDefaultBaseBranch(repo) {
  // 1. Try remote HEAD
  const remoteHead = tryRunGit(repo, ["symbolic-ref", "refs/remotes/origin/HEAD"]);
  if (remoteHead) {
    const match = remoteHead.match(/refs\/remotes\/origin\/(.+)$/);
    if (match) return match[1];
  }

  // 2. Try common branches
  for (const candidate of ["main", "next", "master", "dev"]) {
    const hasBranch = tryRunGit(repo, ["rev-parse", "--verify", candidate]);
    if (hasBranch) return candidate;
  }

  return "main";
}

function extractIssues(branchName, commitSubjects) {
  const issues = new Set();
  const allText = [branchName, ...commitSubjects].join(" ");

  // 1. Gitee 风格 Issue: #I5ABCD 或 #I8M7KZ
  const giteeMatches = allText.match(/(?:#|issue-|issues\/)(I[0-9A-Za-z]+)/gi);
  if (giteeMatches) {
    for (const m of giteeMatches) {
      const id = m.replace(/^(?:#|issue-|issues\/)/i, "");
      if (id) issues.add(`#${id}`);
    }
  }

  // 2. 标准/GitHub 风格 Issue: #1234
  const githubMatches = allText.match(/(?:#|issue-|issues\/)(\d+)/gi);
  if (githubMatches) {
    for (const m of githubMatches) {
      const num = m.replace(/[^\d]/g, "");
      if (num) issues.add(`#${num}`);
    }
  }

  return Array.from(issues);
}

function analyzeChangeCategories(commits, changedFiles) {
  const categories = new Set();
  const allSubjects = commits.map((c) => c.subject.toLowerCase()).join(" ");
  const allFiles = changedFiles.join(" ").toLowerCase();

  // Test Case
  if (allFiles.includes(".test.") || allFiles.includes(".spec.") || allFiles.includes("__tests__") || allSubjects.includes("test:")) {
    categories.add("test");
  }
  // Workflow / CI
  if (allFiles.includes(".github/workflows") || allFiles.includes(".gitee/") || allSubjects.includes("ci:") || allSubjects.includes("workflow:")) {
    categories.add("workflow");
  }
  // TypeScript definition
  if (allFiles.includes(".d.ts") || allFiles.includes("/types/") || allSubjects.includes("types:") || allSubjects.includes("typings:")) {
    categories.add("types");
  }
  // Component style
  if (allFiles.includes(".less") || allFiles.includes(".css") || allFiles.includes(".scss") || allFiles.includes("/style/")) {
    categories.add("style");
  }
  // Docs / Site
  if (allFiles.includes("/docs/") || allFiles.includes("readme") || allFiles.includes("/site/") || allSubjects.includes("docs:")) {
    categories.add("docs");
  }
  // Demo
  if (allFiles.includes("/demo/") || allFiles.includes("/examples/") || allSubjects.includes("demo:")) {
    categories.add("demo");
  }
  // i18n
  if (allFiles.includes("/locale/") || allFiles.includes("i18n") || allSubjects.includes("i18n:")) {
    categories.add("i18n");
  }
  // Accessibility
  if (allSubjects.includes("a11y:") || allSubjects.includes("aria") || allSubjects.includes("accessibility")) {
    categories.add("a11y");
  }
  // Performance
  if (allSubjects.includes("perf:") || allSubjects.includes("optimize:")) {
    categories.add("perf");
  }
  // Bundle size
  if (allSubjects.includes("bundle") || allSubjects.includes("size:")) {
    categories.add("bundle");
  }
  // Refactor
  if (allSubjects.includes("refactor:")) {
    categories.add("refactor");
  }
  // Bug fix
  if (allSubjects.includes("fix:") || allSubjects.includes("fix(") || allSubjects.includes("bugfix:")) {
    categories.add("fix");
  }
  // New feature / enhancement
  if (allSubjects.includes("feat:") || allSubjects.includes("feat(") || allSubjects.includes("feature:")) {
    categories.add("feat");
  }
  // Code style
  if (allSubjects.includes("style:") || allSubjects.includes("format:") || allSubjects.includes("lint:")) {
    categories.add("codestyle");
  }

  // Default fallback
  if (categories.size === 0) {
    categories.add("enhancement");
  }

  return categories;
}

function renderCheckboxListCN(categories) {
  const items = [
    { key: "feat", label: "🆕 新功能" },
    { key: "fix", label: "🐞 Bug 修复" },
    { key: "docs", label: "📝 站点 / 文档改进" },
    { key: "demo", label: "📽️ Demo 改进" },
    { key: "style", label: "💄 组件样式改进" },
    { key: "types", label: "🤖 TypeScript 类型定义改进" },
    { key: "bundle", label: "📦 包体积优化" },
    { key: "perf", label: "⚡️ 性能优化" },
    { key: "enhancement", label: "⭐️ 功能增强" },
    { key: "i18n", label: "🌐 国际化" },
    { key: "refactor", label: "🛠 重构" },
    { key: "codestyle", label: "🎨 代码风格优化" },
    { key: "test", label: "✅ 测试用例" },
    { key: "merge", label: "🔀 分支合并" },
    { key: "workflow", label: "⏩ 工作流" },
    { key: "a11y", label: "⌨️ 无障碍改进" },
    { key: "other", label: "❓ 其他（请说明）" },
  ];

  return items
    .map((item) => {
      const checked = categories.has(item.key) ? "x" : " ";
      return `- [${checked}] ${item.label}`;
    })
    .join("\n");
}

function renderCheckboxListEN(categories) {
  const items = [
    { key: "feat", label: "🆕 New feature" },
    { key: "fix", label: "🐞 Bug fix" },
    { key: "docs", label: "📝 Site / documentation improvement" },
    { key: "demo", label: "📽️ Demo improvement" },
    { key: "style", label: "💄 Component style improvement" },
    { key: "types", label: "🤖 TypeScript definition improvement" },
    { key: "bundle", label: "📦 Bundle size optimization" },
    { key: "perf", label: "⚡️ Performance optimization" },
    { key: "enhancement", label: "⭐️ Feature enhancement" },
    { key: "i18n", label: "🌐 Internationalization" },
    { key: "refactor", label: "🛠 Refactoring" },
    { key: "codestyle", label: "🎨 Code style optimization" },
    { key: "test", label: "✅ Test Case" },
    { key: "merge", label: "🔀 Branch merge" },
    { key: "workflow", label: "⏩ Workflow" },
    { key: "a11y", label: "⌨️ Accessibility improvement" },
    { key: "other", label: "❓ Other (about what?)" },
  ];

  return items
    .map((item) => {
      const checked = categories.has(item.key) ? "x" : " ";
      return `- [${checked}] ${item.label}`;
    })
    .join("\n");
}

function generatePrTitle(commits, categories) {
  if (commits.length === 1) {
    return commits[0].subject;
  }
  const first = commits[0]?.subject || "update";
  if (/^[a-z]+(?:\([^)]+\))?:/.test(first)) {
    return first;
  }
  const prefix = categories.has("fix") ? "fix" : categories.has("feat") ? "feat" : "refactor";
  return `${prefix}: ${first}`;
}

function parseArgs(argv) {
  const parsed = {
    repo: ".",
    base: "",
    head: "",
    lang: "cn",
    platform: "",
    output: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const val = argv[i + 1];

    switch (arg) {
      case "--repo":
        parsed.repo = val;
        i += 1;
        break;
      case "--base":
        parsed.base = val;
        i += 1;
        break;
      case "--head":
        parsed.head = val;
        i += 1;
        break;
      case "--lang":
        parsed.lang = val.toLowerCase();
        i += 1;
        break;
      case "--platform":
        parsed.platform = val.toLowerCase();
        i += 1;
        break;
      case "--output":
        parsed.output = val;
        i += 1;
        break;
      case "-h":
      case "--help":
        console.log(`用法: node generate_pr_draft.js [选项]

选项:
  --repo <path>         Git 仓库路径 (默认: 当前目录)
  --platform <gh|gitee> 目标托管平台 (默认: 自动探测 github 或 gitee)
  --base <branch>       目标合并基准分支 (如: main, next, master)
  --head <branch>       当前待提交特性分支 (默认: 自动探测当前分支)
  --lang <cn|en>        模版语言偏好 (默认: cn)
  --output <path>       将 PR 草稿保存到指定文件
  -h, --help            显示本帮助
`);
        process.exit(0);
      default:
        fail(`未知参数: ${arg}`);
    }
  }

  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo);

  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    fail(`仓库路径不存在: ${repo}`);
  }

  const platform = args.platform || detectPlatform(repo);
  const head = args.head || detectCurrentBranch(repo);
  if (!head) {
    fail("未能自动检测到当前分支，请使用 --head 指定");
  }

  const base = args.base || detectDefaultBaseBranch(repo);

  if (base === head) {
    fail(`目标分支 (${base}) 与当前分支 (${head}) 相同！请确认您要合并到哪个目标分支。`);
  }

  // 获取提交列表
  const rawLog = tryRunGit(repo, ["log", "--no-merges", "--pretty=format:%h%x09%s", `${base}..${head}`]);
  const commits = rawLog
    ? rawLog
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => {
          const [sha, ...rest] = l.split("\t");
          return { sha, subject: rest.join("\t").trim() };
        })
    : [];

  // 获取文件变更列表
  const rawFiles = tryRunGit(repo, ["diff", "--name-only", `${base}...${head}`]);
  const changedFiles = rawFiles ? rawFiles.split(/\r?\n/).filter(Boolean) : [];

  const categories = analyzeChangeCategories(commits, changedFiles);
  const issues = extractIssues(head, commits.map((c) => c.subject));
  const issueText = issues.length > 0 ? issues.map((i) => `fix ${i}`).join(", ") : "- 相关 Issue: 无 (或请补充例如: fix #xxxx)";

  // 生成提炼总结
  const commitSummaries = commits.map((c) => `- ${c.subject} (${c.sha})`).join("\n");
  const prTitle = generatePrTitle(commits, categories);

  const isCN = args.lang === "cn";
  const checkboxBlock = isCN ? renderCheckboxListCN(categories) : renderCheckboxListEN(categories);

  const headerLink = isCN
    ? "[English template / 英文模板](https://github.com/antdv-next/antdv-next/blob/main/.github/PULL_REQUEST_TEMPLATE.md)"
    : "[中文版模板 / Chinese template](https://github.com/antdv-next/antdv-next/blob/main/.github/PULL_REQUEST_TEMPLATE_CN.md)";

  const isGitee = platform === "gitee";
  const platformName = isGitee ? "Gitee (码云)" : "GitHub";
  const ownerRepo = extractOwnerRepo(repo);

  let webPrUrl = "";
  if (ownerRepo) {
    if (isGitee) {
      webPrUrl = `https://gitee.com/${ownerRepo}/pulls/new?source=${encodeURIComponent(head)}&target=${encodeURIComponent(base)}`;
    } else {
      webPrUrl = `https://github.com/${ownerRepo}/compare/${base}...${head}?expand=1`;
    }
  }

  const body = [
    `<!--`,
    `托管平台: ${platformName}`,
    `PR 目标分支: ${base} <- ${head}`,
    `自动检测改动文件数: ${changedFiles.length} 个，提交数: ${commits.length} 个`,
    `-->`,
    "",
    headerLink,
    "",
    isCN ? "### 🤔 本次变更属于 ..." : "### 🤔 This is a ...",
    "",
    checkboxBlock,
    "",
    isCN ? "### 🔗 相关 Issue" : "### 🔗 Related Issues",
    "",
    issueText,
    "",
    isCN ? "### 💡 背景与方案" : "### 💡 Background and Solution",
    "",
    isCN ? `#### 1. 背景与原因\n- 分支 \`${head}\` 合并入 \`${base}\`。\n- 主要解决以下问题或需求：\n${commitSummaries || "- 业务优化与常规改进"}` : `#### 1. Background\n- Merging \`${head}\` into \`${base}\`.\n- Summary of commits:\n${commitSummaries || "- Routine updates and improvements"}`,
    "",
    isCN ? "#### 2. 实现方案\n- 请在此简要列出关键设计或 API 改动（若涉及 UI 交互，建议附带截图/GIF）。" : "#### 2. Implementation\n- Describe the key solution approach or API changes if applicable.",
    "",
    isCN ? "### 📝 变更日志" : "### 📝 Change Log",
    "",
    "| 语言 / Language | 变更日志 / Changelog |",
    "| ---- | -------- |",
    `| 🇺🇸 English | ${prTitle.replace(/^[a-z]+(\([^)]+\))?:\s*/, "")} |`,
    `| 🇨🇳 中文 | ${commits[0]?.subject || "常规更新与改进"} |`,
    "",
  ].join("\n");

  const ghCommand = `gh pr create --base "${base}" --head "${head}" --title "${prTitle}" --body "${body.replace(/"/g, '\\"')}"`;

  const outputLines = [
    `=======================================================`,
    `  🌐 托管平台: [${platformName}]`,
    `  📋 PR 推荐标题 (Title): ${prTitle}`,
    `  🎯 分支合并流: [${head}]  ----->  [${base}]`,
  ];

  if (webPrUrl) {
    outputLines.push(`  🔗 网页直达创建 PR 链接:\n     ${webPrUrl}`);
  }
  outputLines.push(`=======================================================`);
  outputLines.push("");
  outputLines.push(body);
  outputLines.push("");
  outputLines.push(`=======================================================`);
  if (isGitee) {
    outputLines.push(`  🚀 Gitee 提交建议:`);
    outputLines.push(`     1. 点击上方直达链接，在浏览器中预填分支直接创建；`);
    outputLines.push(`     2. 或使用上述 Markdown 内容粘贴至 Gitee Web 页面即可。`);
  } else {
    outputLines.push(`  🚀 GitHub CLI 一键提 PR 命令:`);
    outputLines.push(`  ${ghCommand}`);
  }
  outputLines.push(`=======================================================`);

  const outputContent = outputLines.join("\n");

  if (args.output) {
    writeFileSync(args.output, outputContent, "utf8");
    console.log(`✓ PR 草稿已保存至: ${args.output}`);
    return;
  }

  console.log(outputContent);
}

main();

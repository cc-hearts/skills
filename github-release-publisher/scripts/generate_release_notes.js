#!/usr/bin/env node

const { existsSync, statSync, writeFileSync, readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve, basename } = require("path");

function fail(message) {
  console.error(message);
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

function existingTag(repo, tag) {
  const result = spawnSync("git", ["-C", repo, "rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function listTags(repo) {
  const output = runGit(repo, ["tag", "--sort=-v:refname"]);
  return output.split(/\r?\n/).filter(Boolean);
}

function discoverPreviousTag(repo, version) {
  for (const tag of listTags(repo)) {
    if (tag !== version) {
      return tag;
    }
  }
  return undefined;
}

function commitRange(previousTag, currentRef) {
  return previousTag ? `${previousTag}..${currentRef}` : currentRef;
}

function loadCommits(repo, rangeSpec) {
  const raw = runGit(repo, ["log", "--no-merges", "--pretty=format:%h%x09%s", rangeSpec]);

  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, ...rest] = line.split("\t");
      return {
        sha,
        subject: rest.join("\t").trim(),
      };
    });
}

function cleanSubject(subject) {
  const stripped = subject.trim().replace(/^\w+(?:\([^)]+\))?!?:\s*/, "");
  if (!stripped) {
    return "";
  }

  const normalized = `${stripped[0].toUpperCase()}${stripped.slice(1)}`;
  return /\.$/.test(normalized) ? normalized : `${normalized}.`;
}

function classify(subject) {
  const normalized = subject.toLowerCase();

  if (
    normalized.includes("breaking change") ||
    /^(break:|breaking:|feat!|fix!)/.test(normalized) ||
    /^[a-z]+(\([^)]+\))?!:/.test(subject)
  ) {
    return "breaking";
  }
  if (/^(feat:|feat\(|feature:|add:|added:)/.test(normalized)) {
    return "features";
  }
  if (/^(fix:|fix\(|bugfix:|hotfix:|repair:)/.test(normalized)) {
    return "fixes";
  }
  if (/^(perf:|perf\(|optimize:|speed:)/.test(normalized)) {
    return "performance";
  }
  if (/^(docs:|docs\(|readme:)/.test(normalized)) {
    return "docs_dx";
  }
  if (/^(chore:|build:|ci:|test:|scripts:)/.test(normalized)) {
    return "tooling";
  }
  return "internal";
}

function groupCommits(commits) {
  const grouped = {
    breaking: [],
    features: [],
    fixes: [],
    performance: [],
    docs_dx: [],
    tooling: [],
    internal: [],
  };

  for (const commit of commits) {
    const cleaned = cleanSubject(commit.subject);
    if (!cleaned) {
      continue;
    }
    grouped[classify(commit.subject)].push(cleaned);
  }

  return grouped;
}

function detectProjectName(repo) {
  const pkgPath = resolve(repo, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.name) {
        return pkg.name;
      }
    } catch {
      // ignore
    }
  }

  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  if (origin) {
    const match = origin.match(/(?:git@github\.com:|https:\/\/github\.com\/)[^/]+\/([^/.]+)(?:\.git)?$/);
    if (match) {
      return match[1];
    }
  }

  return basename(repo);
}

function guessCompareUrl(repo, previousTag, version) {
  if (!previousTag) {
    return undefined;
  }

  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  if (!origin) {
    return undefined;
  }
  const match = origin.match(/(?:git@github\.com:|https:\/\/github\.com\/)[^/]+\/([^/.]+)(?:\.git)?$/);

  if (!match) {
    return undefined;
  }

  return `https://github.com/${match[1]}/compare/${previousTag}...${version}`;
}

function topHighlights(grouped, limit = 3) {
  const highlights = [];

  for (const category of ["breaking", "features", "fixes", "performance"]) {
    for (const item of grouped[category]) {
      highlights.push(item);
      if (highlights.length >= limit) {
        return highlights;
      }
    }
  }

  return highlights;
}

function renderSection(title, items) {
  if (!items || items.length === 0) {
    return [];
  }

  return [`### ${title}`, ...items.map((item) => `- ${item}`), ""];
}

// 1. Product / App Template (面向终端用户 / SaaS 应用)
function renderProduct(projectName, version, previousTag, grouped, compareUrl) {
  const highlights = topHighlights(grouped, 3);
  const headline = highlights[0] || `Key updates and enhancements in this release.`;

  return [
    `# ${projectName} ${version}`,
    "",
    `> 🚀 **Highlights**: ${headline}`,
    "",
    ...renderSection("✨ Highlights", highlights),
    ...renderSection("🌟 What's New", grouped.features),
    ...renderSection("🛠️ Improvements & Bug Fixes", [...grouped.fixes, ...grouped.performance]),
    ...renderSection("📚 Documentation", grouped.docs_dx),
    "### 👥 Contributors",
    "Heartfelt thanks to all contributors who helped make this release possible!",
    "",
    "---",
    compareUrl
      ? `**Full Changelog**: ${compareUrl}`
      : previousTag
        ? `**Full Changelog**: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

// 2. SDK / Library Template (面向开发者 / 开源类库 / 框架)
function renderSdk(projectName, version, previousTag, grouped, compareUrl) {
  const breakingSection =
    grouped.breaking.length > 0
      ? [
          "### 🚨 Breaking Changes & Migration Guide",
          "> [!WARNING]",
          `> This release contains breaking changes. Please review the migration steps below:`,
          ...grouped.breaking.map((b) => `- ${b}`),
          "",
        ]
      : [];

  return [
    `# ${projectName} ${version}`,
    "",
    ...breakingSection,
    ...renderSection("🚀 New Features", grouped.features),
    ...renderSection("🐛 Bug Fixes", grouped.fixes),
    ...renderSection("⚡ Performance Improvements", grouped.performance),
    ...renderSection("📝 Documentation & Types", grouped.docs_dx),
    ...renderSection("📦 Maintenance & Internal", [...grouped.tooling, ...grouped.internal]),
    "### 🔗 Full Changelog",
    compareUrl
      ? `- Compare: ${compareUrl}`
      : previousTag
        ? `- Compare: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

// 3. CLI / Tooling Template (面向命令行工具 / DevOps / 基础设施)
function renderCli(projectName, version, previousTag, grouped, compareUrl) {
  const pkgLower = projectName.toLowerCase();

  return [
    `# ${projectName} ${version}`,
    "",
    "### 📥 Quick Install & Upgrade",
    "```bash",
    `# Via Package Manager`,
    `npm install -g ${pkgLower}@${version}`,
    "",
    `# Or download binaries directly from GitHub Release Assets below`,
    "```",
    "",
    ...renderSection("⚡ Highlights", topHighlights(grouped, 3)),
    ...renderSection("🚀 Command Line & Features", grouped.features),
    ...renderSection("🔧 Configuration & Flags", grouped.breaking),
    ...renderSection("🐛 Fixes", grouped.fixes),
    "### 🔐 Artifacts & Checksums",
    "| Architecture / OS | Package | SHA-256 Checksum |",
    "| :--- | :--- | :--- |",
    `| macOS (Apple Silicon) | \`${pkgLower}-${version}-darwin-arm64.tar.gz\` | \`TODO_SHA256\` |`,
    `| Linux (x86_64) | \`${pkgLower}-${version}-linux-amd64.tar.gz\` | \`TODO_SHA256\` |`,
    "",
    "### 🔗 Full Changelog",
    compareUrl
      ? `- Compare: ${compareUrl}`
      : previousTag
        ? `- Compare: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

// 4. Standard Keep-a-Changelog Template
function renderStandard(projectName, version, previousTag, grouped, compareUrl) {
  const dateStr = new Date().toISOString().slice(0, 10);

  return [
    `# ${projectName} ${version} (${dateStr})`,
    "",
    ...renderSection("Added", grouped.features),
    ...renderSection("Changed", grouped.performance),
    ...renderSection("Deprecated", []),
    ...renderSection("Removed", grouped.breaking),
    ...renderSection("Fixed", grouped.fixes),
    ...renderSection("Security", []),
    "### Full Changelog",
    compareUrl
      ? `- Compare: ${compareUrl}`
      : previousTag
        ? `- Compare: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

// 5. Minimal Template (极简轻量版)
function renderMinimal(projectName, version, previousTag, commits, compareUrl) {
  return [
    `## What's Changed in ${projectName} ${version}`,
    "",
    ...commits.map((c) => `- ${cleanSubject(c.subject)} (${c.sha})`),
    "",
    compareUrl
      ? `**Full Changelog**: ${compareUrl}`
      : previousTag
        ? `**Full Changelog**: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

// Generic fallback
function renderGeneric(projectName, version, previousTag, grouped, compareUrl) {
  return [
    `## ${projectName} ${version}`,
    "",
    `This release includes updates for ${projectName}.`,
    "",
    ...renderSection("Highlights", topHighlights(grouped)),
    ...renderSection("Features", grouped.features),
    ...renderSection("Fixes", grouped.fixes),
    ...renderSection("Performance", grouped.performance),
    ...renderSection("Docs / DX", grouped.docs_dx),
    ...renderSection("Internal", [...grouped.tooling, ...grouped.internal]),
    "### Full Changelog",
    compareUrl
      ? `- Compare: ${compareUrl}`
      : previousTag
        ? `- Compare: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

function printHelp() {
  process.stdout.write(`Generate a polished GitHub Release markdown draft from git history.

Required:
  --repo <path>            Path to the git repository
  --version <version>      Version or tag being released, for example v1.0.0

Optional:
  --previous-tag <tag>     Previous released tag; auto-discovered when omitted
  --current-ref <ref>      Git ref for the release target; defaults to HEAD
  --template <name>        product | sdk | cli | standard | minimal | generic
  --project-name <name>    Display name (auto-detected from package.json or repo if omitted)
  --output <path>          Write markdown draft to a file
  --help                   Show this message
`);
}

function parseArgs(argv) {
  const parsed = {
    repo: "",
    version: "",
    currentRef: "HEAD",
    template: "product",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    switch (arg) {
      case "--repo":
        parsed.repo = value;
        i += 1;
        break;
      case "--version":
        parsed.version = value;
        i += 1;
        break;
      case "--previous-tag":
        parsed.previousTag = value;
        i += 1;
        break;
      case "--current-ref":
        parsed.currentRef = value;
        i += 1;
        break;
      case "--template":
        parsed.template = value;
        i += 1;
        break;
      case "--project-name":
        parsed.projectName = value;
        i += 1;
        break;
      case "--output":
        parsed.output = value;
        i += 1;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.repo) {
    fail("Missing required argument: --repo");
  }
  if (!parsed.version) {
    fail("Missing required argument: --version");
  }

  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo);

  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    fail(`Repository path does not exist: ${repo}`);
  }

  const projectName = args.projectName || detectProjectName(repo);
  const previousTag = args.previousTag ?? discoverPreviousTag(repo, args.version);

  if (previousTag && !existingTag(repo, previousTag)) {
    fail(`Previous tag not found: ${previousTag}`);
  }

  const rangeSpec = commitRange(previousTag, args.currentRef);
  const commits = loadCommits(repo, rangeSpec);
  const grouped = groupCommits(commits);
  const compareUrl = guessCompareUrl(repo, previousTag, args.version);

  let body;
  switch (args.template) {
    case "sdk":
      body = renderSdk(projectName, args.version, previousTag, grouped, compareUrl);
      break;
    case "cli":
      body = renderCli(projectName, args.version, previousTag, grouped, compareUrl);
      break;
    case "standard":
      body = renderStandard(projectName, args.version, previousTag, grouped, compareUrl);
      break;
    case "minimal":
      body = renderMinimal(projectName, args.version, previousTag, commits, compareUrl);
      break;
    case "product":
      body = renderProduct(projectName, args.version, previousTag, grouped, compareUrl);
      break;
    case "generic":
    default:
      body = renderGeneric(projectName, args.version, previousTag, grouped, compareUrl);
      break;
  }

  if (args.output) {
    writeFileSync(args.output, body, "utf8");
    return;
  }

  process.stdout.write(`${body}\n`);
}

main();

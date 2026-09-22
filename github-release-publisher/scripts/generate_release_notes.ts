#!/usr/bin/env node

declare function require(name: string): any;
declare const process: {
  argv: string[];
  exit(code?: number): never;
  stdout: { write(text: string): void };
};

const { existsSync, statSync, writeFileSync, readFileSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve, basename } = require("path");

type Category = "breaking" | "features" | "fixes" | "performance" | "docs_dx" | "tooling" | "internal";

type Commit = {
  sha: string;
  subject: string;
};

type CategorizedItem = {
  cleaned: string;
  original: string;
  sha: string;
};

type GroupedCommits = Record<Category, CategorizedItem[]>;

type Template = "bilingual" | "sdk" | "product" | "cli" | "standard" | "minimal" | "generic";

type ParsedArgs = {
  repo: string;
  version: string;
  previousTag?: string;
  currentRef: string;
  template: Template;
  projectName?: string;
  path?: string;
  includePrerelease: boolean;
  highlights: boolean;
  latest: "auto" | "true" | "false";
  ghCmd: boolean;
  publish: boolean;
  output?: string;
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function runGit(repo: string, args: string[]): string {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

function tryRunGit(repo: string, args: string[]): string | undefined {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return undefined;
  }

  return result.stdout.trim();
}

function tryReadPackageJson(repo: string): Record<string, any> | undefined {
  const pkgPath = resolve(repo, "package.json");
  if (existsSync(pkgPath)) {
    try {
      return JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      // ignore
    }
  }
  return undefined;
}

function existingTag(repo: string, tag: string): boolean {
  const result = spawnSync("git", ["-C", repo, "rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function listTags(repo: string): string[] {
  const output = runGit(repo, ["tag", "--sort=-v:refname"]);
  return output.split(/\r?\n/).filter(Boolean);
}

function extractTagPrefix(tag: string): string {
  const lastAt = tag.lastIndexOf("@");
  if (lastAt > 0) {
    return tag.slice(0, lastAt + 1); // e.g. "@antdv-next/x-markdown@" or "core@"
  }
  const match = tag.match(/^([a-zA-Z_-]+)/);
  return match ? match[1] : ""; // e.g. "v" or ""
}

function extractPackageName(tag: string): string {
  const lastAt = tag.lastIndexOf("@");
  if (lastAt > 0) {
    const pkgFull = tag.slice(0, lastAt);
    const slash = pkgFull.indexOf("/");
    return slash >= 0 ? pkgFull.slice(slash + 1) : pkgFull;
  }
  return tag;
}

function isPrerelease(tag: string): boolean {
  const lastAt = tag.lastIndexOf("@");
  const ver = lastAt > 0 ? tag.slice(lastAt + 1) : tag;
  return /-(?:alpha|beta|rc|canary|next|dev|preview)\b/i.test(ver);
}

function discoverPreviousTag(repo: string, version: string, includePrerelease = false): string | undefined {
  const prefix = extractTagPrefix(version);
  const versionIsPrerelease = isPrerelease(version);
  const tags = listTags(repo);

  for (const tag of tags) {
    if (tag === version) {
      continue;
    }
    if (!versionIsPrerelease && !includePrerelease && isPrerelease(tag)) {
      continue;
    }
    if (prefix) {
      if (tag.startsWith(prefix)) {
        return tag;
      }
    } else {
      if (!tag.includes("@")) {
        return tag;
      }
    }
  }

  // Fallback to any previous tag if prefix match found nothing
  for (const tag of tags) {
    if (tag !== version) {
      if (!versionIsPrerelease && !includePrerelease && isPrerelease(tag)) {
        continue;
      }
      return tag;
    }
  }
  return undefined;
}

function commitRange(previousTag: string | undefined, currentRef: string): string {
  return previousTag ? `${previousTag}..${currentRef}` : currentRef;
}

function loadCommits(repo: string, rangeSpec: string, pathFilter?: string): Commit[] {
  const args = ["log", "--no-merges", "--pretty=format:%h%x09%s", rangeSpec];
  if (pathFilter) {
    args.push("--", pathFilter);
  }
  const raw = runGit(repo, args);

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

function cleanSubject(subject: string): string {
  const stripped = subject.trim().replace(/^\w+(?:\([^)]+\))?!?:\s*/, "");
  if (!stripped) {
    return "";
  }

  const normalized = `${stripped[0].toUpperCase()}${stripped.slice(1)}`;
  return /\.$/.test(normalized) ? normalized : `${normalized}.`;
}

function classify(subject: string): Category {
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

function groupCommits(commits: Commit[]): GroupedCommits {
  const grouped: GroupedCommits = {
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
    grouped[classify(commit.subject)].push({
      cleaned,
      original: commit.subject,
      sha: commit.sha,
    });
  }

  return grouped;
}

function parseGithubRepo(origin: string | undefined): { owner: string; repo: string; full: string } | undefined {
  if (!origin) {
    return undefined;
  }
  const match = origin.match(/(?:github\.com[:/])([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      full: `${match[1]}/${match[2]}`,
    };
  }
  return undefined;
}

function detectProjectName(repo: string, version?: string): string {
  if (version) {
    const lastAt = version.lastIndexOf("@");
    if (lastAt > 0) {
      return version.slice(0, lastAt);
    }
  }

  const pkg = tryReadPackageJson(repo);
  if (pkg && pkg.name) {
    return pkg.name;
  }

  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  const gh = parseGithubRepo(origin);
  if (gh) {
    return gh.repo;
  }

  return basename(repo);
}

function guessCompareUrl(repo: string, previousTag: string | undefined, version: string): string | undefined {
  if (!previousTag) {
    return undefined;
  }

  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  const gh = parseGithubRepo(origin);
  if (!gh) {
    return undefined;
  }

  return `https://github.com/${gh.full}/compare/${previousTag}...${version}`;
}

function topHighlights(grouped: GroupedCommits, limit = 3): string[] {
  const highlights: string[] = [];

  for (const category of ["breaking", "features", "fixes", "performance"] as const) {
    for (const item of grouped[category]) {
      highlights.push(item.cleaned);
      if (highlights.length >= limit) {
        return highlights;
      }
    }
  }

  return highlights;
}

function renderSection(title: string, items: Array<CategorizedItem | string>): string[] {
  if (!items || items.length === 0) {
    return [];
  }

  return [
    `### ${title}`,
    ...items.map((item) => (typeof item === "string" ? `- ${item}` : `- ${item.original || item.cleaned}`)),
    "",
  ];
}

// 1. Product / App Template
function renderProduct(
  _projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
  options: { highlights?: boolean } = {},
): string {
  const highlights = topHighlights(grouped, 3);
  const headline = highlights[0] || `Key updates and enhancements in this release.`;

  const sections = [`# ${version}`, ""];
  if (options.highlights !== false) {
    sections.push(`> 🚀 **Highlights**: ${headline}`, "");
    sections.push(...renderSection("✨ Highlights", highlights));
  }

  sections.push(
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
  );

  return sections.join("\n");
}

// 2. SDK / Library Template
function renderSdk(
  _projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
  options: { highlights?: boolean } = {},
): string {
  const breakingSection =
    grouped.breaking.length > 0
      ? [
          "### 🚨 Breaking Changes & Migration Guide",
          "> [!WARNING]",
          `> This release contains breaking changes. Please review the migration steps below:`,
          ...grouped.breaking.map((b) => `- ${b.original || b.cleaned}`),
          "",
        ]
      : [];

  const sections = [`# ${version}`, ""];
  if (options.highlights && grouped.features.length > 0) {
    sections.push(...renderSection("✨ Highlights", topHighlights(grouped, 3)));
  }

  sections.push(
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
  );

  return sections.join("\n");
}

// 3. Bilingual Template
function renderBilingual(
  _projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
  commits: Commit[],
  _options: { highlights?: boolean } = {},
): string {
  const sections = [`# ${version}`, ""];

  if (grouped.breaking.length > 0) {
    sections.push(
      "## 🚨 破坏性变更 (Breaking Changes)",
      "> [!WARNING]",
      "> 本版本包含破坏性变更，升级前请仔细查阅：",
      ...grouped.breaking.map((b) => `- ${b.original || b.cleaned}`),
      "",
    );
  }

  if (grouped.features.length > 0) {
    sections.push("## 🚀 Features", ...grouped.features.map((f) => `- ${f.original || f.cleaned}`), "");
  }

  if (grouped.fixes.length > 0) {
    sections.push("## 🐛 Bug Fixes", ...grouped.fixes.map((f) => `- ${f.original || f.cleaned}`), "");
  }

  if (grouped.performance.length > 0) {
    sections.push("## ⚡ Performance", ...grouped.performance.map((p) => `- ${p.original || p.cleaned}`), "");
  }

  const maintenance = [...grouped.tooling, ...grouped.internal];
  if (maintenance.length > 0) {
    sections.push(
      "## 🛠️ Maintenance & Refactor",
      ...maintenance.map((m) => `- ${m.original || m.cleaned}`),
      "",
    );
  }

  if (grouped.docs_dx.length > 0) {
    sections.push("## 📚 Documentation", ...grouped.docs_dx.map((d) => `- ${d.original || d.cleaned}`), "");
  }

  sections.push("--------", "", "## What's Changed", "");
  for (const c of commits) {
    sections.push(`- ${c.subject} (${c.sha})`);
  }

  sections.push(
    "",
    "--------",
    "",
    compareUrl
      ? `**Full Changelog**: ${compareUrl}`
      : previousTag
        ? `**Full Changelog**: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  );

  return sections.join("\n");
}

// 4. CLI Template
function renderCli(
  projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
): string {
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

// 5. Standard Keep-a-Changelog Template
function renderStandard(
  projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
): string {
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

// 6. Minimal Template
function renderMinimal(
  projectName: string,
  version: string,
  previousTag: string | undefined,
  commits: Commit[],
  compareUrl: string | undefined,
): string {
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

// 7. Generic Fallback
function renderGeneric(
  projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
): string {
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

function isSubPackage(repo: string, _projectName: string, version: string): boolean {
  if (version && version.includes("@")) {
    const pkgName = extractPackageName(version);
    if (pkgName === "x" || pkgName === "core") {
      return false;
    }
    const rootPkg = tryReadPackageJson(repo);
    if (rootPkg && rootPkg.name && version.startsWith(`${rootPkg.name}@`)) {
      return false;
    }
    if (
      pkgName.includes("-") ||
      pkgName.includes("plugin") ||
      pkgName.includes("adapter") ||
      pkgName.includes("skill") ||
      pkgName.includes("card")
    ) {
      return true;
    }
  }
  return false;
}

function printHelp(): void {
  process.stdout.write(`Generate a polished GitHub Release markdown draft or gh release command from git history.

Required:
  --repo <path>            Path to the git repository
  --version <version>      Version or tag being released, for example v1.0.0 or @scope/pkg@1.0.0

Optional:
  --previous-tag <tag>     Previous released tag (auto-discovered based on tag prefix/scope if omitted)
  --current-ref <ref>      Git ref for the release target; defaults to HEAD
  --template <name>        bilingual | sdk | product | cli | standard | minimal | generic (default: bilingual)
  --project-name <name>    Display name (auto-detected from package.json, tag, or repo if omitted)
  --path <subpath>         Filter commits to a specific subdirectory (useful for monorepos)
  --include-prerelease     Include prerelease tags (alpha/beta/rc) when auto-discovering previous tag
  --no-highlights          Omit the marketing Highlights section
  --gh-cmd                 Output a ready-to-run "gh release create" shell command
  --latest <auto|true|false> Explicitly control whether to mark as latest release (default: auto)
  --publish                Execute "gh release create" directly
  --output <path>          Write markdown draft to a file
  --help                   Show this message
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    repo: "",
    version: "",
    currentRef: "HEAD",
    template: "bilingual",
    highlights: true,
    latest: "auto",
    includePrerelease: false,
    ghCmd: false,
    publish: false,
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
        parsed.template = value as Template;
        i += 1;
        break;
      case "--project-name":
        parsed.projectName = value;
        i += 1;
        break;
      case "--path":
        parsed.path = value;
        i += 1;
        break;
      case "--include-prerelease":
        parsed.includePrerelease = true;
        break;
      case "--no-highlights":
        parsed.highlights = false;
        break;
      case "--gh-cmd":
        parsed.ghCmd = true;
        break;
      case "--latest":
        parsed.latest = value as "auto" | "true" | "false";
        i += 1;
        break;
      case "--publish":
        parsed.publish = true;
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

function buildGhCommand(repo: string, version: string, title: string, body: string, latestOption: string): string {
  const flags = [`"${version}"`, `--title "${title}"`];
  if (latestOption === "false") {
    flags.push("--latest=false");
  } else if (latestOption === "true") {
    flags.push("--latest=true");
  }

  return `gh release create ${flags.join(" ")} --notes-file - << 'EOF'\n${body}\nEOF`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo);

  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    fail(`Repository path does not exist: ${repo}`);
  }

  const projectName = args.projectName || detectProjectName(repo, args.version);
  const previousTag = args.previousTag ?? discoverPreviousTag(repo, args.version, args.includePrerelease);

  if (previousTag && !existingTag(repo, previousTag)) {
    fail(`Previous tag not found: ${previousTag}`);
  }

  const rangeSpec = commitRange(previousTag, args.currentRef);
  const commits = loadCommits(repo, rangeSpec, args.path);
  const grouped = groupCommits(commits);
  const compareUrl = guessCompareUrl(repo, previousTag, args.version);

  let body: string;
  const options = { highlights: args.highlights };

  switch (args.template) {
    case "bilingual":
      body = renderBilingual(projectName, args.version, previousTag, grouped, compareUrl, commits, options);
      break;
    case "sdk":
      body = renderSdk(projectName, args.version, previousTag, grouped, compareUrl, options);
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
      body = renderProduct(projectName, args.version, previousTag, grouped, compareUrl, options);
      break;
    case "generic":
    default:
      body = renderGeneric(projectName, args.version, previousTag, grouped, compareUrl);
      break;
  }

  let latestChoice: string = args.latest;
  if (latestChoice === "auto") {
    latestChoice = isSubPackage(repo, projectName, args.version) ? "false" : "auto";
  }

  if (args.output) {
    writeFileSync(args.output, body, "utf8");
    console.log(`Release notes written to ${args.output}`);
    return;
  }

  if (args.ghCmd) {
    const title = args.version;
    const cmd = buildGhCommand(repo, args.version, title, body, latestChoice);
    process.stdout.write(`${cmd}\n`);
    return;
  }

  if (args.publish) {
    const title = args.version;
    const ghArgs = ["release", "create", args.version, "--title", title, "--notes", body];
    if (latestChoice === "false") {
      ghArgs.push("--latest=false");
    } else if (latestChoice === "true") {
      ghArgs.push("--latest=true");
    }

    console.log(`Publishing release ${args.version}...`);
    const res = spawnSync("gh", ghArgs, { cwd: repo, stdio: "inherit" });
    if (res.status !== 0) {
      fail("Failed to publish release with gh CLI");
    }
    return;
  }

  process.stdout.write(`${body}\n`);
}

main();

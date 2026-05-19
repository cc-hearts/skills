#!/usr/bin/env node

declare function require(name: string): any;
declare const process: {
  argv: string[];
  exit(code?: number): never;
  stdout: { write(text: string): void };
};

const { existsSync, statSync, writeFileSync } = require("fs");
const { spawnSync } = require("child_process");
const { resolve } = require("path");

type Category = "features" | "fixes" | "performance" | "docs_dx" | "internal";

type Commit = {
  sha: string;
  subject: string;
};

type GroupedCommits = Record<Category, string[]>;

type Template = "generic" | "memory-report";

type ParsedArgs = {
  repo: string;
  version: string;
  previousTag?: string;
  currentRef: string;
  template: Template;
  projectName: string;
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

function discoverPreviousTag(repo: string, version: string): string | undefined {
  for (const tag of listTags(repo)) {
    if (tag !== version) {
      return tag;
    }
  }
  return undefined;
}

function commitRange(previousTag: string | undefined, currentRef: string): string {
  return previousTag ? `${previousTag}..${currentRef}` : currentRef;
}

function loadCommits(repo: string, rangeSpec: string): Commit[] {
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

  if (/^(feat:|feat\(|feature:|add:|added:)/.test(normalized)) {
    return "features";
  }
  if (/^(fix:|fix\(|bugfix:|hotfix:|repair:)/.test(normalized)) {
    return "fixes";
  }
  if (/^(perf:|perf\(|optimize:|speed:)/.test(normalized)) {
    return "performance";
  }
  if (/^(docs:|docs\(|chore:|build:|ci:|test:)/.test(normalized)) {
    return "docs_dx";
  }
  return "internal";
}

function groupCommits(commits: Commit[]): GroupedCommits {
  const grouped: GroupedCommits = {
    features: [],
    fixes: [],
    performance: [],
    docs_dx: [],
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

function guessCompareUrl(repo: string, previousTag: string | undefined, version: string): string | undefined {
  if (!previousTag) {
    return undefined;
  }

  const origin = tryRunGit(repo, ["remote", "get-url", "origin"]);
  if (!origin) {
    return undefined;
  }
  const match = origin.match(/(?:git@github\.com:|https:\/\/github\.com\/)([^/]+\/[^/.]+)(?:\.git)?$/);

  if (!match) {
    return undefined;
  }

  return `https://github.com/${match[1]}/compare/${previousTag}...${version}`;
}

function topHighlights(grouped: GroupedCommits, limit = 3): string[] {
  const highlights: string[] = [];

  for (const category of ["features", "fixes", "performance"] as const) {
    for (const item of grouped[category]) {
      highlights.push(item);
      if (highlights.length >= limit) {
        return highlights;
      }
    }
  }

  return highlights;
}

function renderSection(title: string, items: string[]): string[] {
  if (items.length === 0) {
    return [];
  }

  return [`### ${title}`, ...items.map((item) => `- ${item}`), ""];
}

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
    ...renderSection("Internal", grouped.internal),
    "### Full Changelog",
    compareUrl
      ? `- Compare: ${compareUrl}`
      : previousTag
        ? `- Compare: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

function renderMemoryReport(
  projectName: string,
  version: string,
  previousTag: string | undefined,
  grouped: GroupedCommits,
  compareUrl: string | undefined,
): string {
  return [
    `## ${projectName} ${version}`,
    "",
    `This release improves the ${projectName} workflow and report output quality.`,
    "",
    ...renderSection("Highlights", topHighlights(grouped)),
    "### Report Quality Notes",
    "- Data coverage: TODO",
    "- Prompt or extraction logic: TODO",
    "- Evaluation or scoring changes: TODO",
    "",
    "### Upgrade Notes",
    "- Required action: None.",
    "- Optional follow-up: Review report output diffs before broad rollout.",
    "",
    ...renderSection("Features", grouped.features),
    ...renderSection("Fixes", grouped.fixes),
    ...renderSection("Docs / DX", grouped.docs_dx),
    ...renderSection("Internal", grouped.internal),
    "### Full Changelog",
    compareUrl
      ? `- Compare: ${compareUrl}`
      : previousTag
        ? `- Compare: ${previousTag}...${version}`
        : "- Initial release or compare link unavailable.",
    "",
  ].join("\n");
}

function printHelp(): void {
  process.stdout.write(`Generate a GitHub Release markdown draft from git history.

Required:
  --repo <path>            Path to the git repository
  --version <version>      Version or tag being released, for example v0.4.0

Optional:
  --previous-tag <tag>     Previous released tag; auto-discovered when omitted
  --current-ref <ref>      Git ref for the release target; defaults to HEAD
  --template <name>        generic | memory-report
  --project-name <name>    Display name for the release title
  --output <path>          Write markdown draft to a file
  --help                   Show this message
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    repo: "",
    version: "",
    currentRef: "HEAD",
    template: "generic",
    projectName: "Memory Report",
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
        if (value !== "generic" && value !== "memory-report") {
          fail(`Invalid template: ${value}`);
        }
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

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo);

  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    fail(`Repository path does not exist: ${repo}`);
  }

  const previousTag = args.previousTag ?? discoverPreviousTag(repo, args.version);

  if (previousTag && !existingTag(repo, previousTag)) {
    fail(`Previous tag not found: ${previousTag}`);
  }

  const rangeSpec = commitRange(previousTag, args.currentRef);
  const commits = loadCommits(repo, rangeSpec);
  const grouped = groupCommits(commits);
  const compareUrl = guessCompareUrl(repo, previousTag, args.version);

  const body =
    args.template === "memory-report"
      ? renderMemoryReport(args.projectName, args.version, previousTag, grouped, compareUrl)
      : renderGeneric(args.projectName, args.version, previousTag, grouped, compareUrl);

  if (args.output) {
    writeFileSync(args.output, body, "utf8");
    return;
  }

  process.stdout.write(`${body}\n`);
}

main();

---
name: github-release-publisher
description: Draft and publish GitHub Releases for software repositories, including release planning, version framing, release note drafting, changelog grouping, preflight checks, and post-release summaries. Use when Codex needs to prepare a GitHub Release, write release notes from git history or merged PRs, create a reusable release template, or standardize how a project announces new versions. Especially useful for projects that want concise, user-facing release notes with clear highlights, upgrade notes, and links to full changelogs.
---

# GitHub Release Publisher

Use this skill to turn repository history into a polished GitHub Release draft.

Default to a lightweight workflow:
1. Inspect the repository state and last released tag.
2. Identify the release scope and audience.
3. Draft release notes in a reader-friendly structure.
4. Validate links, artifacts, and upgrade guidance before publishing.

## Quick Start

When the repository is available locally:

1. Find the previous release tag with `git tag --sort=-v:refname`.
2. Generate a first draft with:

```bash
node /Users/carl/.codex/skills/github-release-publisher/scripts/generate_release_notes.ts \
  --repo /path/to/repo \
  --version v0.4.0 \
  --template memory-report
```

3. Refine the draft for the actual audience:
   - End users: lead with user-visible improvements and upgrade notes.
   - Developers: add implementation notes, migrations, or breaking changes.
   - Internal stakeholders: add rollout status, data quality notes, and known gaps.

If the repository is not available locally, draft from the PR list, changelog fragments, or user-provided scope.

## Workflow

### 1. Build Release Context

Collect the minimum context needed before writing:

- Current version or intended version tag
- Previous release tag
- Commit range or PR range
- Target audience
- Release assets, if any
- Any breaking changes, migrations, or operational cautions

Prefer exact dates, versions, and links. If a detail is unknown, mark it as `TODO` instead of inventing it.

### 2. Choose a Note Shape

Use this order unless the project already has a strong house style:

1. Title and one-sentence summary
2. Highlights
3. Upgrade notes or breaking changes
4. What's changed
5. Validation or artifact notes
6. Full changelog / compare link

Keep the top short. Put dense implementation detail lower in the note.

### 3. Draft With Reader-Friendly Grouping

Group changes by meaning, not by commit chronology.

Preferred groups:

- `Highlights`
- `Breaking Changes` or `Upgrade Notes`
- `Features`
- `Fixes`
- `Performance`
- `Docs / DX`
- `Internal`

Collapse noisy commits like formatting, merge commits, and one-off maintenance unless they matter to the reader.

### 4. Tailor for Memory Report Projects

For a Memory Report release, bias toward outcome-oriented notes:

- What new report capability was added
- What memory insight or metric changed
- What users should expect in report output
- Whether data sources, prompt logic, or evaluation logic changed
- Any limits, backfills, or interpretation caveats

Use the `memory-report` template whenever the release is about analytics/report quality rather than a generic library release.

### 5. Validate Before Publish

Check:

- Version tag matches the release title
- Compare link points to the correct tag range
- Asset names and checksums are correct, if applicable
- Breaking changes are not buried
- Dates, report periods, and metric names are accurate
- Links render correctly in GitHub Markdown

## Memory Report Template

Use this structure for your project unless the repository already has a better established pattern:

```md
## Memory Report <VERSION>

This release improves the Memory Report workflow for <AUDIENCE OR USE CASE>.

### Highlights
- Added:
- Improved:
- Fixed:

### Report Quality Notes
- Data coverage:
- Prompt or extraction logic:
- Evaluation or scoring changes:

### Upgrade Notes
- Required action:
- Optional follow-up:

### What's Changed
- Features:
- Fixes:
- Internal:

### Full Changelog
- Compare: <COMPARE_URL>
```

If there are no breaking changes, replace `Upgrade Notes` with `Operational Notes` or remove the section.

## Using the Draft Script

The bundled script creates a categorized markdown draft from git history.

Prefer running it directly with modern Node.js. If the target environment does not support running `.ts` files directly, compile it first with `tsc generate_release_notes.ts` and run the emitted JavaScript.

Example:

```bash
node /Users/carl/.codex/skills/github-release-publisher/scripts/generate_release_notes.ts \
  --repo /path/to/repo \
  --version v0.4.0 \
  --previous-tag v0.3.0 \
  --current-ref HEAD \
  --template memory-report
```

Useful flags:

- `--template generic|memory-report`
- `--project-name "Memory Report"`
- `--output /tmp/release-notes.md`

Read [references/release-patterns.md](references/release-patterns.md) when you need style guidance from common open source release patterns.
Read [references/release-yml-template.md](references/release-yml-template.md) when the repository should also adopt GitHub auto-generated release note categories.

## Style Rules

Write for the release reader, not for git archaeology.

- Prefer verbs like `Added`, `Improved`, `Fixed`, `Deprecated`
- Convert commit jargon into user-facing language
- Mention migrations early
- Keep bullets parallel and concise
- Avoid large raw commit dumps in the main body

Do not overuse marketing language. Clarity beats hype.

## Fallbacks

If there are no tags yet:

- Treat the release as an initial release
- Summarize the current project capabilities
- Note that the compare range is unavailable

If commits are poorly named:

- Cluster them manually by file area, PR title, or user-visible behavior
- Prefer accurate manual grouping over misleading automated categories

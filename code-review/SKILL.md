---
name: code-review
description: Defect-first code review of a diff, branch, commit, PR, or path set with selectable intensity (quick/standard/deep) and selectable participating models. Runs standalone with one model or with multiple models plus cross-verification, writes a reviews/<id>/ workspace (task definition, per-model findings, verification results, merged report), and reports only findings that survive an independent confidence rubric. Use when the user asks for a code review, PR review, pre-commit or pre-PR check, or a second opinion on code changes.
---

# Code Review (Cross-Model, Verified)

## Overview

Run a defect-first code review of a change set and produce one merged, evidence-backed report. This skill unifies the strengths of Claude Code's review methodology (independent review angles, per-finding confidence scoring with a strict filter, an explicit false-positive taxonomy) and Codex's review methodology (P0–P3 severity, "introduced by this change" filtering, empirical verification, a machine-readable findings schema).

Hard invariants:

- **Read-only.** Never modify the reviewed source, create commits, or push. Fixes are out of scope.
- **Prefer no findings over weak findings.** A short, verified report beats a long speculative one.
- Every finding must survive the confidence rubric ([references/review-protocol.md](references/review-protocol.md)) before it appears in the report.

## Non-Goals

- No auto-fix loop — hand confirmed findings to `auto-cr-loop` when the user wants fixes.
- No build/typecheck/lint gate — CI owns that; never flag what a linter/compiler would catch.
- No style nits, no general quality advice unless a repo rule explicitly requires it.
- No re-litigating decisions recorded in `AGENTS.md`, `CLAUDE.md`, or `memory/` entries that mark behavior as deliberate.
- Not a QA flow map (use `qa-flow-review`) or a refactor pass (use `code-simplifier`).

## What This Skill Produces

- A `reviews/<id>/` workspace: `task.md`, `task.json`, `findings/<model>.json` + `.md`, `verification/<verifier>-on-<author>.json`, `dispatch/` (raw outputs and handoff files), `scratch/`, `report.md`, `report.json`.
- A merged report with three buckets: **CONFIRMED** (fix these) / **DISPUTED** (human judgment) / **UNVERIFIED** (single-source, unconfirmed).
- Findings ordered by severity as `[P0]–[P3]` with `path:line` anchors that overlap the diff.
- Explicit statements of dispatch failures, single-model caveats, and what could not be verified.

## Quick Invocation Across Platforms

| Environment | Trigger | Example |
|---|---|---|
| Claude Code | `/code-review` or natural language | `/code-review deep` |
| OpenAI Codex CLI | `$code-review` | `使用 $code-review 审查当前改动，deep 强度，claude 交叉验证` |
| Cursor | `@code-review` or the rule file | `.cursor/rules/code-review.mdc` |
| Antigravity / Gemini | natural language | "调用 code-review 审查未提交改动" |
| Other agents | natural language / rule file | use `rules/generic-agent-rule.md` |

In Claude Code this personal skill replaces the bundled `/code-review`; the bundled alias `/review` is unaffected. `--fix` is intentionally not implemented — hand confirmed findings to `auto-cr-loop`.

## Step 0 — Configure This Run

Ask once, with defaults marked `*`. Inline arguments pre-answer the card; `--yes` or non-interactive runs accept the defaults.

1. **Target**: uncommitted* / branch vs base / commit / PR number / paths
2. **Intensity**: quick / standard* / deep
3. **Models**: current model* / codex CLI (`codex-cli[:<model-slug>]`) / claude CLI / seedmux pane / manual handoff — multi-select; 2+ models enables cross-verification
4. **Workspace**: `reviews/<id>/`* or report-only (no files)

When `CODE_REVIEW_NESTED=1` is set: do not ask, do not create a workspace — run one single-pass review and return the canonical findings JSON directly (recursion guard for nested dispatch).

Persist the answers in `reviews/.state.json` for reuse.

## Workflow

### 1. Resolve the target and the exact diff range

- Resolve the comparison ref rigorously: use the branch's configured upstream when it exists and is ahead (`git rev-parse --abbrev-ref --symbolic-full-name @{u}`), else the requested base branch, else the local branch. If the base ref is missing locally, try `origin/<base>` before failing.
- Always compare through the merge base: `git merge-base HEAD <ref>`, then `git diff <merge-base-sha>`. Never diff against a raw branch tip.
- Include uncommitted changes when present (staged + unstaged + untracked, excluding ignored paths).
- Record every resolved SHA and the exact diff command in `task.json`.
- Empty diff → report "No changes to review" and stop; do not create a workspace.

### 2. Read rules and memory

Read, in precedence order, only the rule files at the repo root and in directories the diff touches:
`AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursor/rules/*.mdc` → `.github/copilot-instructions.md`, plus `memory/**` entries that mark decisions as deliberate (never re-litigate those).

Record path + hash for each. A rule can only be cited when you can quote the exact rule and the exact line that breaks it. Never fabricate a citation.

### 3. Create the workspace

`reviews/<yyyyMMdd-HHmm>-<slug>/` (slug = branch name sanitized, ≤ 40 chars) with `task.md`, `task.json`, `schemas/` (copies of the skill's JSON Schema files, so dispatchers always have a stable path), and empty `findings/`, `verification/`, `dispatch/`, `scratch/`.

Before any dispatch, ensure `reviews/` is ignored (`git check-ignore -q reviews`, otherwise append to `.git/info/exclude`) so an uncommitted-target review can never review its own workspace. Never edit a tracked `.gitignore` without consent. Add `reviews/**` to every dispatched prompt's exclusion list and record it in `report.json.coverage.excluded_paths`.

### 4. Run review passes

Run the dimensions required by the intensity ladder, dispatching each selected model through the adapter decision tree ([references/dispatch.md](references/dispatch.md)). Every pass receives `task.md` and returns the canonical findings schema → `findings/<model>.json` (+ a human-readable `.md`).

Claude runtime: parallel dimension subagents when the Task tool is available; otherwise run dimensions sequentially in one context and state "single-pass review" in the report. Codex and other runtimes: sequential passes in one context.

### 5. Normalize and filter

- Normalize confidence to integer 0–100 (a model returning 0.0–1.0 is multiplied by 100; keep the original in `meta.model_scale_original`).
- Apply the rubric and false-positive taxonomy ([references/review-protocol.md](references/review-protocol.md)). Findings below 80 go to `filtered` — counted, not reported.
- Enforce: imperative title ≤ 80 chars, one paragraph per finding, line range ≤ 5–10 lines and overlapping the diff.
- Prose (non-schema) output may be normalized, but is marked `normalized_from: "prose"` and can never reach CONFIRMED on its own.

### 6. Cross-verify (when 2+ models)

Every finding from author A is examined by a verifier ≠ A, which independently inspects the code and must supply evidence:

- `confirmed` — name the trigger inputs/state and the wrong result; quote the line.
- `uncertain` — real mechanism, trigger uncertain; say what would confirm it.
- `rejected` — quote the line that proves it wrong or already guarded.

Write `verification/<verifier>-on-<author>.json`.

### 7. Merge

Dedupe by (file, overlapping line range, category), merge claims, tag provenance (`both` / per-model). Bucket:

- **CONFIRMED** — confidence ≥ 80 AND verified by a different model, an independent context, or an empirical repro.
- **DISPUTED** — at least one against-verdict with evidence.
- **UNVERIFIED** — everything else (single-source, including prose-normalized).

### 8. Report

Write `report.md` + `report.json` (templates in [references/workspace-format.md](references/workspace-format.md)) and present findings in chat: findings first, severity-ordered, one paragraph each, no emojis, no praise padding. Report dispatch failures and single-model caveats explicitly.

### 9. Wrap up

Update `reviews/.state.json` (`last_review_id`, `last_config`). Offer: re-run after fixes (`--resume <id>`), hand confirmed findings to `auto-cr-loop` for fixes, or stop. On re-review, mark findings whose cited lines no longer exist as `stale`; never re-report findings the user dismissed.

## Intensity Ladder

| | quick | standard (default) | deep |
|---|---|---|---|
| Dimensions | D1 bug-scan only | D1 + D2 rules + D5 comments + D6 error-handling (+ D7 if tests changed) | D1–D8 as applicable (+ D9 only when requested) |
| Context | diff only | diff + rule files + call sites for suspect findings | full: blame/history, prior PR comments on touched files, call sites, tests, memory |
| Verification | rubric filter only | per-finding self-check incl. call site / test; cross-model when 2+ models | independent verification with evidence; executable probe for P0/P1 when a harness exists; disagreement pass |
| Claude parallelism | none | 4 dimension subagents | ≤ 6 concurrent dimensions + parallel verification |
| Other runtimes | none | sequential dimensions | sequential (a claude-CLI verifier may be used if present) |
| Cost / time order | 1× / 30–90 s | 4–6× / 2–5 min | 10–20× / 8–20 min (× model count) |

## Models and Dispatch (summary)

Model vocabulary: `current` (in-process) | `codex-cli[:<model-slug>]` | `claude-cli` | `seedmux:<agent>` | `manual:<name>`. Roles are assigned by runtime, not hardcoded (inside Codex, codex is the in-process author and claude is CLI-dispatched).

Adapter ladder per model: strict CLI (schema-enforced) → prose CLI → seedmux pane → manual handoff file → drop the model and record the failure. Never claim cross-verification that did not happen. Full commands, the handoff format, and the resume protocol: [references/dispatch.md](references/dispatch.md).

## Confidence and Severity Contract (summary)

- Confidence: integer 0–100. The five rubric anchors (0 / 25 / 50 / 75 / 100) and the ≥ 80 bar are in [references/review-protocol.md](references/review-protocol.md).
- Severity: `[P0]` universal blocker (no assumptions) / `[P1]` urgent, next cycle / `[P2]` normal, fix eventually / `[P3]` low, nice to have.

## Writing Rules

- Findings first, ordered by severity; correctness findings outrank cleanup when anything must be cut.
- One paragraph per finding; state the concrete failure scenario (inputs/state → wrong result).
- `path/file:line` anchors: the smallest range that contains the defect, always overlapping the diff.
- Matter-of-fact tone. No emojis, no "great job", no accusatory language.
- If nothing survives: say exactly that — "No findings. Checked for bugs, repo-rule compliance, error handling, and comment accuracy." — and list residual risks and test gaps.
- Machine field values are always English; report prose follows the language of the user's request.

## References

- [references/review-protocol.md](references/review-protocol.md) — dimensions D1–D9, full rubric, false-positive taxonomy, checklists
- [references/workspace-format.md](references/workspace-format.md) — workspace contract, JSON schemas, dedupe/bucket rules, report template
- [references/dispatch.md](references/dispatch.md) — adapter decision tree, exact commands, manual handoff, resume
- [schemas/](schemas/) — static JSON Schema files for schema-enforced dispatch

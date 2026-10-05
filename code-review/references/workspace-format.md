# Workspace Format

The `reviews/<id>/` workspace is the protocol's persistence layer: tool-agnostic, resumable, and human-auditable. Every model writes the same shapes, so merging never depends on which tool produced a pass.

## 1. Directory Contract

```text
reviews/<yyyyMMdd-HHmm>-<slug>/
├── task.md              # Human-readable task: goal, target, diff command, intensity, models, rubric digest, exclusions
├── task.json            # Machine-readable record of the same + resolved SHAs, rules, limits (see §2)
├── schemas/             # Copies of the skill's canonical JSON Schema files (stable path for dispatch)
├── findings/
│   ├── <model>.json     # Canonical findings from one model pass (see §3)
│   └── <model>.md       # Human-readable rendering of the same pass
├── verification/
│   └── <verifier>-on-<author>.json   # Per-finding verdicts (see §4)
├── dispatch/
│   ├── <model>.raw.txt  # Verbatim output when not schema-clean
│   ├── <model>.handoff.md   # Manual handoff instructions (when used)
│   └── <model>.result.json  # External result returned by a human (when used)
├── scratch/             # Temporary probes/repros; may be deleted before finishing
├── report.md            # The merged report (see §6)
└── report.json          # Machine summary (see §5)
```

Location: `<repo-root>/reviews/` by default (`--out-dir` overrides). Outside a git repo, `<cwd>/reviews/`. `reviews/.state.json` holds `last_review_id` and `last_config` for reuse.

Hygiene: `reviews/` must be ignored before any dispatch — see SKILL.md Step 3. Never modify a tracked `.gitignore` without explicit consent; `.git/info/exclude` is the default.

## 2. task.json

```json
{
  "schema_version": "1.0",
  "review_id": "20261005-1140-auth-refresh",
  "created_at": "2026-10-05T11:40:12+08:00",
  "intensity": "standard",
  "target": {
    "kind": "uncommitted | base | commit | pr | paths",
    "repo_root": "/abs/path/to/repo",
    "base_ref": "origin/main",
    "head_ref": "feature/auth-refresh",
    "merge_base_sha": "1d54823877c4de72b2316a64032a54afc404e619",
    "commit_sha": null,
    "pr_number": null,
    "paths": [],
    "resolution_note": "upstream ahead of local branch; used upstream"
  },
  "diff": {
    "command": "git diff 1d548238...",
    "files_changed": 7, "insertions": 210, "deletions": 40,
    "truncated": false, "chunks": []
  },
  "models": [
    { "id": "claude", "display": "claude (current session)", "adapter": "in-process", "cli_model": null, "role": ["author", "verifier"] },
    { "id": "codex", "display": "codex-cli", "adapter": "codex-cli", "cli_model": null, "role": ["author", "verifier"] }
  ],
  "cross_verification": true,
  "dimensions": ["D1", "D2", "D5", "D6"],
  "rubric": { "threshold": 80, "anchors": ["0: false positive / pre-existing", "25: somewhat", "50: moderate", "75: highly confident", "100: absolutely certain"] },
  "repo_rules": [ { "path": "AGENTS.md", "sha256": "..." } ],
  "memory_entries": [ { "path": "memory/decisions.md", "note": "deliberate: X" } ],
  "workspace": "/abs/path/to/repo/reviews/20261005-1140-auth-refresh",
  "limits": { "max_budget_usd": 2.0, "timeout_seconds": 900, "max_models": 3 },
  "dispatch_plan": [ { "model": "codex", "adapter": "codex-cli", "status": "pending" } ]
}
```

`dispatch_plan[].status` ∈ `pending | running | done | failed | awaiting-handoff | abandoned`.

## 3. findings/<model>.json (canonical, identical shape from every adapter)

```json
{
  "schema_version": "1.0",
  "review_id": "20261005-1140-auth-refresh",
  "model": "codex",
  "model_display": "codex-cli",
  "pass": "author | verifier",
  "generated_at": "2026-10-05T11:52:03+08:00",
  "source": { "adapter": "codex-cli", "raw_output": "dispatch/codex.raw.txt", "normalized_from": "json | prose", "normalized_by": null },
  "findings": [
    {
      "id": "codex-1",
      "title": "Guard against nil session before refresh",
      "body": "One markdown paragraph: the demonstrable scenario and why the behavior is wrong.",
      "category": "bug",
      "priority": 1,
      "confidence": 88,
      "confidence_scale": "0-100",
      "code_location": {
        "absolute_file_path": "/abs/path/auth/session.go",
        "relative_file_path": "auth/session.go",
        "line_range": { "start": 42, "end": 45 },
        "overlaps_diff": true
      },
      "evidence": ["read call site auth/handler.go:88", "go test ./auth -run TestRefresh → panic"],
      "introduced_by_change": true,
      "actionable": true,
      "suggested_fix": null,
      "tags": ["nil-deref"]
    }
  ],
  "overall": { "correctness": "patch is correct | patch is incorrect", "explanation": "...", "confidence": 82 },
  "meta": { "model_scale_original": "0.0-1.0", "duration_seconds": 134, "cost_usd": null, "dropped_findings": [ { "title": "...", "confidence": 64, "reason": "below-threshold" } ] }
}
```

Rules:
- `category` enum: `bug | security | regression | error-handling | silent-failure | data-loss | race-condition | api-contract | perf | types | tests | comments | guidelines | simplification | style-nits`. `style-nits` is recorded but always filtered.
- `title` ≤ 80 chars, imperative. `body` one paragraph. `line_range` ≤ 5–10 lines and must overlap the diff (`overlaps_diff: false` findings are filtered).
- Max 32 findings per pass; empty array when nothing qualifies.
- Confidence is an integer 0–100. A model returning 0.0–1.0 is converted with `round(x * 100)`; keep the original scale in `meta.model_scale_original`. If a value is ambiguous (e.g. `88` claimed as 0.0–1.0), clamp and set `confidence_scale: "0-100 (coerced)"`.
- `overall.correctness` accepts the two canonical strings; normalize booleans (`false` → `"patch is incorrect"`, `true` → `"patch is correct"`).

## 4. verification/<verifier>-on-<author>.json

```json
{
  "schema_version": "1.0",
  "review_id": "...",
  "verifier_model": "claude",
  "author_model": "codex",
  "method": "different-model | independent-context | empirical | self",
  "generated_at": "...",
  "results": [
    { "finding_ref": "codex-1", "verdict": "confirmed | rejected | uncertain", "confidence": 92,
      "evidence": ["ran go test ./auth -run TestRefresh, observed panic at session.go:44"],
      "counter_evidence": [], "notes": "≤1 paragraph" }
  ],
  "summary": { "confirmed": 1, "rejected": 0, "uncertain": 0 }
}
```

Verdict definitions are in [review-protocol.md](review-protocol.md) §5.

## 5. report.json

```json
{
  "schema_version": "1.0",
  "review_id": "...",
  "generated_at": "...",
  "target": { "kind": "base", "base_ref": "origin/main", "head_ref": "feature/x", "merge_base_sha": "1d548238..." },
  "intensity": "standard",
  "models": [ { "id": "claude", "role": ["author", "verifier"] }, { "id": "codex", "role": ["author", "verifier"] } ],
  "cross_verification": true,
  "overall": { "correctness": "patch is correct", "explanation": "...", "confidence": 85 },
  "counts": { "total": 5, "confirmed": 3, "disputed": 1, "unverified": 1, "filtered": 7 },
  "by_priority": { "P0": 0, "P1": 1, "P2": 2, "P3": 0 },
  "buckets": {
    "confirmed": [
      { "id": "m-1", "title": "...", "body": "...", "category": "bug", "priority": 1, "confidence": 92,
        "code_location": { }, "provenance": ["claude", "codex"], "sources": ["codex-1", "claude-2"],
        "verification": { "by": ["claude"], "method": "different-model", "evidence": ["..."] } }
    ],
    "disputed": [ { "finding": { }, "for": ["codex"], "against": ["claude"], "dissent_summary": "...", "verifier_evidence": ["..."] } ],
    "unverified": [ { } ]
  },
  "dispatch_failures": [ { "model": "gemini", "reason": "cli-not-found", "fallback": "manual-handoff" } ],
  "coverage": { "chunks_processed": 1, "chunks_total": 1, "excluded_paths": ["reviews/**"] },
  "test_gaps": ["..."],
  "residual_risks": ["..."],
  "artifacts": { "task_md": "task.md", "report_md": "report.md", "findings_dir": "findings/", "verification_dir": "verification/" }
}
```

## 6. Merge Rules

**Dedupe.** Two findings are the same defect when: same file, overlapping line ranges, and same category (or categories that denote the same mechanism, e.g. `bug` + `regression`). Merge them: keep the higher confidence, union the evidence, union `sources`, and set `provenance` to the models that reported it.

Worked example: `codex-1` (auth/session.go:42–45, `bug`, 88) and `claude-2` (auth/session.go:43–46, `bug`, 92) → one CONFIRMED finding, confidence 92, `provenance: ["claude","codex"]`, `sources: ["codex-1","claude-2"]`. A third finding at auth/session.go:200 (different range) stays separate.

**Bucketing.**

- **CONFIRMED** — confidence ≥ 80 AND at least one of: verified by a different model (`different-model`), verified in an independent context (`independent-context`), or backed by an empirical probe (`empirical`). Findings normalized from prose can never satisfy this alone.
- **DISPUTED** — at least one against-verdict with evidence (or the single report's own confidence < 80 while a verifier confirms it). Include who is for, who is against, and the evidence on both sides.
- **UNVERIFIED** — single-source, prose-normalized, `normalization_failed`, or otherwise unverified. Listed last, never presented as actionable.

**Ordering.** P0 → P3, then confidence descending. Correctness outranks cleanup when anything must be cut.

## 7. report.md Template

```markdown
# Code Review — <target description>

- Review ID: <id> · Intensity: <intensity> · Models: <a, b> · Cross-verification: yes/no
- Range: `<diff command>` (merge-base `<sha>`)
- Rules consulted: `AGENTS.md`, ... · Excluded: `reviews/**`

## Findings

### [P1] Guard against nil session before refresh — auth/session.go:42-45
<one paragraph: scenario → wrong result.>
- Confidence: 92 · Category: bug · Sources: codex, claude
- Verification: confirmed by claude (ran `go test ./auth -run TestRefresh`, panic at :44)

## Disputed

### <title> — path:line
For: codex — <claim>. Against: claude — <evidence>. Needs human judgment.

## Unverified
- <title> — path:line (codex only, no independent confirmation)

## Dispatch Notes
- <model>: <status, failures, fallback used>.  Single-model runs state: "single-model; self-verified".

## Residual Risks / Test Gaps
- ...
```

No-findings wording: `No findings. Checked for bugs, repo-rule compliance, error handling, and comment accuracy.` followed by residual risks and test gaps.

**Presentation rules.** Findings first; no emojis; no praise padding; one paragraph per finding; `path:line` anchors; correctness before cleanup; state plainly what was not verified.

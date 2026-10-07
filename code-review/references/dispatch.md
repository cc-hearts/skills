# Dispatch

How a review pass reaches each model. The protocol is software-independent: every adapter is optional, probed at runtime, and degrades to the next one. A review never fails because a tool is missing — it drops that model, records why, and finishes with what it has.

## 1. Probing and Shim Resolution

```bash
# Strip Seedmux shims (~/.seedmux/shims) so `command -v` finds real binaries
CLEAN_PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "$HOME/.seedmux/shims" | paste -sd: -)
PATH="$CLEAN_PATH" command -v codex claude gemini 2>/dev/null
PATH="$CLEAN_PATH" codex --version 2>/dev/null
PATH="$CLEAN_PATH" claude --version 2>/dev/null
```

Model vocabulary: `current` (in-process) | `codex-cli[:<model-slug>]` | `claude-cli` | `seedmux:<agent>` | `manual:<name>`.

**Schema file resolution.** Dispatchers that need a real schema file path always use the workspace copies: `SCHEMAS="$WS/schemas"` (written at workspace creation from the skill's own `schemas/`). If a workspace predates the copies or they are missing, resolve the skill directory in order — the path this SKILL.md was read from → `~/.claude/skills/code-review/schemas/` → `~/.codex/skills/code-review/schemas/` → `~/.gemini/config/skills/code-review/schemas/` — and if none resolve, reconstruct the schema from [workspace-format.md](workspace-format.md) and write it to `$WS/schemas/`.

Roles are assigned by runtime, not hardcoded: inside Claude Code, `current` = claude (author) and codex-cli is dispatched; inside Codex, `current` = codex (author) and claude-cli is dispatched. When ≥ 2 models run, each one verifies the others' findings.

Every dispatched model receives `dispatch/<model>.prompt.md`, assembled from: the task (goal, target, exact diff command, merge-base SHA), the rules and memory digest, the required output schema, the rubric and false-positive taxonomy, and the exclusion list (`reviews/**`, `scratch/`, ignored paths). Models must not modify tracked files; scratch output goes only to `reviews/<id>/scratch/`.

## 2. Adapter Decision Tree

Per model, try in order until one succeeds. Record the outcome in `task.json.dispatch_plan[].status` and `report.json.dispatch_failures[]`.

### A. In-process (`current`) — always available

- Claude runtime: parallel dimension subagents when the Task tool exists; otherwise run every required dimension sequentially in one context and state "single-pass review" in the report.
- Codex / Cursor / other runtimes: sequential passes in one context.
- Write the result yourself as `findings/<model>.json` (adapter `in-process`).

### B. codex-cli — prefer schema-enforced

```bash
codex exec \
  -C "$REPO" -s read-only --skip-git-repo-check --ephemeral \
  --output-schema "$SCHEMAS/findings.schema.json" \
  -o "$WS/dispatch/codex.last.json" \
  - < "$WS/dispatch/codex.prompt.md" \
  > "$WS/dispatch/codex.events.jsonl" 2> "$WS/dispatch/codex.log"
cp "$WS/dispatch/codex.last.json" "$WS/findings/codex.json"   # validate, then keep
```

- Different model: add `-m <model-slug>` (any slug the user's Codex provider exposes; the local catalog is `~/.codex/magpie-models.json`, e.g. `commandcode/gpt-5.6-sol`).
- Prose fallback (no schema support / schema run failed): `codex review --base "<base>" "<custom instructions>" > "$WS/dispatch/codex.raw.txt"`. Note `codex review` has no `--output-schema`; `--uncommitted` also includes untracked files — safe only after the `reviews/` exclude from SKILL.md Step 3.
- Deep intensity needing executable probes: swap `-s read-only` → `-s workspace-write` and instruct scratch-only writes under `reviews/<id>/scratch/`; afterwards run `git status --porcelain` and record any unexpected write as a dispatch failure.
- **Schema enforcement is best-effort.** On providers without structured-output support, `--output-schema` still returns prose with a fenced JSON block (observed with codex-cli 0.150.1 + a local OpenAI-compatible proxy). Always validate the output and run §4 normalization when needed — that path is common, not exceptional.
- Codex has no budget flag: enforce a wall-clock cap (default 900 s) with the available timeout mechanism (`timeout`/`gtimeout` if present; otherwise the agent's own command timeout). `--ephemeral` avoids session litter.

### C. claude-cli — nested, never the slash command

```bash
claude -p "$(cat "$WS/dispatch/claude.prompt.md")" \
  --disable-slash-commands --no-session-persistence \
  --output-format json \
  --json-schema "$(jq -c . "$SCHEMAS/findings.schema.json")" \
  --allowedTools "Read" "Grep" "Glob" "Bash(git log:*)" "Bash(git diff:*)" "Bash(git show:*)" \
  --disallowedTools "Write" "Edit" "NotebookEdit" "Task" \
  --max-budget-usd "${BUDGET:-2}" \
  --append-system-prompt "You are a read-only code reviewer. Return only the requested JSON. Do not invoke skills or slash commands." \
  > "$WS/dispatch/claude.envelope.json" 2> "$WS/dispatch/claude.log"
```

- **`--json-schema` takes an inline JSON string** (codex's `--output-schema` takes a file path — do not mix these up). Build the inline form with `jq -c`.
- Extract the payload defensively: `envelope.structured_output` first, else parse `envelope.result`; record `total_cost_usd` when present.
- **Use draft-07 schemas with this validator.** `claude --json-schema` validates the schema locally, and a `2020-12` `$schema` URI is rejected (`no schema with key or ref …`). The skill's `schemas/` files are draft-07 (`http://json-schema.org/draft-07/schema#`) for this reason — keep custom schemas draft-07 too. With draft-07 the output is strictly enforced (`structured_output`), unlike codex's best-effort path.
- **Never dispatch `claude -p "/code-review …"`** — that re-enters this skill recursively. Dispatch a self-contained prompt; `--disable-slash-commands` is the backstop; export `CODE_REVIEW_NESTED=1` for the child so the skill short-circuits to single-pass JSON if it is somehow entered.

### D. seedmux pane — only when `$SEEDMUX_STATE_SOCK` is set

```bash
SMX="$HOME/.seedmux/bin/smx-team"          # not on PATH
"$SMX" panes --json --agent codex           # find or reuse a pane
"$SMX" assign --to "$PANE_ID" --task-file "$WS/dispatch/codex.handoff.md"
"$SMX" show "$TASK_ID"                      # status; do not poll in a tight loop
"$SMX" capture "$PANE_ID" -n 200 > "$WS/dispatch/codex.raw.txt"
```

Instruct the pane (via the task file) to write the canonical JSON to `$WS/dispatch/codex.result.json` directly; otherwise capture the prose and normalize it (§4).

### E. manual handoff — always available

Write `dispatch/<model>.handoff.md`:

```markdown
# Code Review Handoff — <review_id> — target model: <model>
Read the task and diff range below. Return ONLY a JSON object matching the schema.
Do not modify any file. Save your answer to:
<absolute workspace path>/dispatch/<model>.result.json
---
## Schema
<full findings schema, fenced>
## Task
<contents of task.md>
```

Print a one-screen version in chat. The review pauses in a resumable state: `dispatch_plan[].status = "awaiting-handoff"`, and `report.md` is written provisionally, marked `INCOMPLETE — awaiting <model>`.

**Resume protocol** (`--resume <id>` or "continue the review in `reviews/<id>/`"):

1. Re-read `dispatch_plan`; for each `awaiting-handoff` entry look for, in order: `dispatch/<model>.result.json`, `dispatch/<model>.raw.txt`, `<model>.result.json` in the workspace root (humans drop files in odd places).
2. Validate against the schema; on failure run exactly one repair pass (ask the model to fix its own output, or normalize per §4). Still invalid → quarantine into UNVERIFIED with `normalization_failed`.
3. If the user pasted the result into chat instead of a file, write it verbatim to `dispatch/<model>.result.json` first (record `source: "pasted"`), then continue.
4. Continue from SKILL.md Step 5.
5. `--resume <id> --drop <model>` marks the entry `abandoned` and finishes with what exists.

**Failure ladder (per model).** strict CLI → prose CLI → seedmux pane → manual handoff → drop the model, record `dispatch_failures[]`, continue, and state prominently in the report that the result is single-model. Never claim cross-verification that did not happen.

## 3. Cost and Concurrency Guards

- Default is single-model. Confirm before deep + multi-model (cost multiplies by model count).
- `--max-budget-usd` on every claude-cli dispatch (default 2); wall-clock cap on every codex-cli dispatch (default 900 s).
- Cap concurrent CLI dispatches at 3.
- Record per-dispatch duration and cost in `task.json.dispatch_plan` and surface totals in `report.json`.

## 4. Normalizing Non-Schema Output

For any non-schema-clean output (a schema run that returned prose, the `codex review` fallback, a seedmux capture, pasted text):

1. Keep the raw file in `dispatch/`.
2. Extract the JSON: take the last fenced ```` ```json ```` block; if none, take the first balanced `{...}` containing `"findings"`. The surrounding verdict prose is not part of the payload — drop it.
3. Coerce known drift: `overall.correctness` given as a boolean (`false` → `"patch is incorrect"`, `true` → `"patch is correct"`); confidence on a 0.0–1.0 scale multiplied by 100; missing optional fields filled with `null` / `[]`.
4. Validate with `jq` against `$SCHEMAS/findings.schema.json` where a validator is available (`ajv`, `check-jsonschema`); otherwise assert structurally: required keys present, confidence an integer 0–100, `line_range` overlapping the diff.
5. Set `source.normalized_from = "prose"`, `source.normalized_by = "<the model that normalized it>"`.
6. Prose-normalized findings can never reach CONFIRMED on their own — only a different-model verification or an empirical repro promotes them.
7. Never silently drop unparseable output: attach a `normalization_failed` note, keep the raw file, and surface a short excerpt in `report.md`.

## 5. Large Diffs

Over 50 changed files or ~2000 changed lines: chunk by top-level directory, run the dimensions per chunk, dedupe across chunks, and set `diff.truncated = true` with `coverage.chunks_processed / chunks_total`. Findings outside processed chunks are forbidden. For an oversized single file, prefer having the model read the file itself over pasting the full diff.

## 6. Workspace Hygiene Checklist (before dispatch)

- [ ] `reviews/` is ignored (`git check-ignore -q reviews` or appended to `.git/info/exclude`)
- [ ] Only `current` runs in a non-git directory without warnings (`--skip-git-repo-check` for codex)
- [ ] The prompt's exclusion list includes `reviews/**`, `scratch/`
- [ ] Timeout and budget set for the adapter
- [ ] `git status --porcelain` captured before dispatch (to detect unexpected writes afterwards)

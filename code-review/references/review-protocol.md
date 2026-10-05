# Review Protocol

The methodology behind every review pass: what to look for, how to score confidence, and what must never be reported. The orchestrator applies this protocol after every model's pass, and every dispatched model receives the relevant parts inside its prompt.

## 1. Review Dimensions

| ID | Dimension | Runs at | Notes |
|---|---|---|---|
| D1 | Bug scan (angles A–E below) | quick, standard, deep | The core; always runs |
| D2 | Repo-rule compliance | standard, deep | Only when a rule can be quoted exactly |
| D3 | History / blame context | deep | Why the code is the way it is |
| D4 | Prior reviews on the same files | deep | Needs `gh` / network; skip silently if unavailable |
| D5 | Comment accuracy | standard, deep | Do comments match the code after the change? |
| D6 | Error handling / silent failures | standard, deep | See §6 checklist |
| D7 | Tests coverage / quality | standard (if tests changed), deep | See §7 checklist |
| D8 | Types / invariants | deep | Only when types were added or changed |
| D9 | Reuse / simplification / efficiency / altitude | deep, only when requested | Opt-in; overlaps `code-simplifier` |
| D4+ | Concurrency, security, data-loss angles | folded into D1 | Reported under their own `category` |

### D1 — Bug scan

**Angle A — line-by-line diff scan.** Read every hunk; then read the enclosing function — bugs in unchanged lines of a touched function are in scope. Look for: inverted or wrong conditions, off-by-one, null/undefined dereference, missing `await`, falsy-zero treated as missing, wrong-variable copy-paste, errors swallowed in `catch`, unescaped regex metacharacters.

**Angle B — removed-behavior audit.** For every deleted or replaced line, name the invariant it enforced and search the change for where that invariant is re-established. A removed guard that never reappears is a finding candidate.

**Angle C — cross-file tracer.** Grep callers and callees for: new preconditions, changed return shapes, newly thrown exceptions, timing/ordering dependencies, changed defaults. A change is only a bug when the affected path is provably reachable — identify the other code that is affected.

**Angle D — language pitfalls.** JS/TS: `==` coercion, closure-captured loop variable, `this` binding, falsy-zero. Python: mutable default arguments, late-binding closures, bare `except`. Go: nil map writes, range-variable capture. SQL: injection, N+1. General: timezone/DST drift, float equality, integer overflow.

**Angle E — wrapper/proxy correctness.** Wrapper types must route to the wrapped instance, not back through a registry/session/global; check the wrapper forwards every method callers use.

**Empirical probing.** When the repo has a runnable test harness, prefer running a probe (existing test, one-liner script, scratch test under `reviews/<id>/scratch/`) over reasoning alone. Report the command and its observed output as evidence. Scratch files must never touch tracked paths outside `scratch/`.

### D2 — Repo-rule compliance

Read the rule files listed in SKILL.md Step 2. A violation is reportable only when you can quote the exact rule and the exact line that breaks it, and name the rule file. No style preferences, no "spirit of the doc" inferences. If the code explicitly silences the rule (lint-ignore with a reason), it is not a finding.

### D3 — History / blame context

Read `git blame` / `git log -p` for the modified code. Flag only when the change breaks something the history shows was deliberate (e.g. re-introducing a fixed bug, contradicting a documented incident). Respect `memory/` entries — a decision recorded as deliberate is not a bug.

### D4 — Prior reviews

When `gh` and network are available, look at previous PRs/comments touching the same files for guidance that also applies here (e.g. "we don't do X in this module"). Cite the PR/comment. Skip this dimension silently when the tooling is unavailable — never guess.

### D5 — Comment accuracy

Comments must describe the code as it now behaves: stale comments, comments that contradict the new logic, docstrings whose parameter list no longer matches, TODO/FIXME that the change made obsolete or that it should have addressed.

### D6 — Error handling / silent failures

Hunt for (see §6): empty catch blocks, catch-and-continue, broad catches that hide unrelated errors, returning null/undefined/default on error without logging, optional chaining that silently skips failed operations, fallback chains that mask the real problem, unjustified fallback-to-mock outside tests, retry logic that exhausts attempts without informing anyone, error messages that are not actionable.

### D7 — Tests

When test files changed (or a fix was applied): do the tests actually assert the new behavior? Look for happy-path-only coverage, missing edge/error cases, tests that would still pass if the fix were reverted (failing-first check), setup/teardown asymmetry, snapshot tests that were blindly updated.

### D8 — Types / invariants

For new or changed types: are invariants expressed in the type (not just documented), are illegal states representable but unguarded, are exhaustive switches actually exhaustive, do constructors validate?

### D9 — Reuse / simplification / efficiency / altitude (opt-in)

Flag new code that re-implements an existing helper (name the helper), redundant or derivable state, copy-paste with slight variation, deep nesting, dead code, repeated I/O or computation, sequential independent operations, blocking work added to startup/hot paths. Altitude: does the change fix the root cause at the right depth rather than patching a symptom? Prefer the simpler general fix over accumulating special cases. Always name the concrete cost, not "could be cleaner".

## 2. Confidence Rubric (0–100)

Score every candidate finding with one of these anchors; **findings below 80 are filtered out** (counted in `filtered`, not reported):

- **0** — Not confident at all. A false positive that doesn't stand up to light scrutiny, or a pre-existing issue.
- **25** — Somewhat confident. Might be real, might be a false positive; could not verify. If stylistic, it is not explicitly called out in the relevant rule file.
- **50** — Moderately confident. Verified real, but might be a nitpick or rarely hit in practice; low importance relative to the rest of the change.
- **75** — Highly confident. Double-checked; very likely a real issue that will be hit in practice; the current approach is insufficient; important and directly impacts functionality — or explicitly covered by a repo rule.
- **100** — Absolutely certain. Double-checked and confirmed definitely real, will happen frequently in practice; evidence directly confirms it.

Correctness findings always outrank cleanup findings when anything must be cut.

## 3. Severity (P0–P3)

- **[P0]** Drop everything to fix. Blocking release, operations, or major usage. Only for universal issues that do not depend on any assumptions about the inputs.
- **[P1]** Urgent. Should be addressed in the next cycle.
- **[P2]** Normal. To be fixed eventually.
- **[P3]** Low. Nice to have.

## 4. False-Positive Taxonomy — Never Report

- Pre-existing issues (not introduced by this change).
- Something that looks like a bug but is not actually a bug.
- Pedantic nitpicks a senior engineer would not call out.
- Anything a linter, typechecker, or compiler would catch (imports, types, formatting, broken tests). Assume CI runs these — do not run them yourself as part of review.
- General code quality advice (missing tests, "could be documented better", general security hardening) unless a repo rule explicitly requires it.
- Issues a rule file raises but the code explicitly silences (lint-ignore with reason).
- Intentionally changed behavior; the broader change makes it clearly deliberate.
- Real issues on lines the change did not modify (unless the touched function made them newly reachable — then say exactly how).
- Speculative concerns: "this might disrupt somewhere else" is only a finding when you can name the code that is provably affected.
- Style nits that do not obscure meaning or violate a documented standard.
- Findings that require unstated assumptions about inputs the code does not promise.

When nothing qualifies: report no findings. Never invent one to fill the report.

## 5. Verification Verdicts

A verifier (a different model, an independent context, or an empirical probe) returns exactly one verdict per finding:

- **confirmed** — you can name the inputs/state that trigger it and the wrong output or crash. Quote the line.
- **uncertain** — the mechanism is real but the trigger is uncertain (timing, environment, config). State what would confirm it.
- **rejected** — factually wrong (the code doesn't say that) or guarded elsewhere. Quote the line that proves it. Pure style with no observable effect also rejects.

Recall-biased rule (deep intensity): do not reject a candidate merely for being "speculative" when the state is realistic — concurrency races, nil/undefined on a rare-but-reachable path, falsy-zero treated as missing, off-by-one on a boundary the code does not exclude, retry storms / partial failures, a regex or allowlist that lost an anchor. These are `uncertain`, not `rejected`.

## 6. Silent-Failure Checklist (D6)

For every error handling location, ask:

- Is the error logged with appropriate severity and context (operation, ids, state)? Would this log help debug the issue six months from now?
- Does the user get clear, actionable feedback — what went wrong and what to do — without exposing internals inappropriately?
- Does the catch catch only expected error types? List the unexpected errors it could hide.
- Is the fallback explicit and justified, or does it mask the underlying problem? Fallback to a mock/stub/fake outside tests is architectural smell.
- Should the error propagate instead of being caught here? Does catching here skip cleanup?
- Retry logic: does exhaustion inform anyone?

## 7. Comment and Type Checklists

**Comments (D5):** stale statements, contradictions with new logic, outdated parameter docs, obsolete TODO/FIXME, comments that describe removed behavior.

**Types (D8):** invariants in the type vs only in docs, representable illegal states, non-exhaustive switches, unvalidated constructors, `any`/`unknown`/`interface{}` used to paper over a mismatched shape.

## 8. Repo-Rule Attribution

- Cite the smallest supporting line range of the rule file, and quote it.
- Verify the rule literally says what the finding claims — no paraphrase drift.
- Never fabricate a citation. If no rule supports it, drop the "rule violation" framing and report it (or not) on its own merits.

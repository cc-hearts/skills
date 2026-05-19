---
name: qa-flow-review
description: Use this skill when the user has finished implementing code and wants a QA-oriented pass that analyzes the code changes, maps the affected end-to-end flows, identifies missing test coverage, runs practical verification where possible, and reports likely bugs, regressions, and untested risk areas.
---

# QA Flow Review

## Overview

This skill helps Codex act like a practical QA partner after code changes are complete. It is for situations where the main problem is not "write more code" but "make sure the whole flow still works, find what we forgot to test, and tell us where bugs are likely hiding."

Use it when the user wants any of the following:

- analyze a completed feature for missed flows
- review changed code from a QA or regression perspective
- build a retest checklist after a fix
- verify whether an end-to-end flow is actually covered
- run targeted checks and summarize what was and was not validated

## What This Skill Produces

The output should be a QA result, not a generic code summary. Prefer producing:

- impacted flow map
- risk-based test checklist
- executed verification steps
- findings with severity and reproduction steps
- explicit gaps: what could not be tested and why

Do not claim a flow was verified unless you actually inspected or executed something that supports that claim.

## Workflow

## 1. Build Change Context

Start by identifying what changed and what those changes can affect.

Check, when available:

- changed files and diff
- touched routes, pages, handlers, jobs, services, schemas, migrations, configs, feature flags
- data writes, state transitions, permission checks, validation rules
- external integrations such as APIs, queues, storage, email, analytics, cron jobs

If the repo is large, do not read everything. Follow the change surface outward from the edited files into the flows they trigger.

## 2. Convert Code Changes Into User Flows

Translate the code into concrete flows a QA person would test.

For each changed area, map:

- entry point: page, API, CLI, webhook, job, scheduler
- actor: guest, authenticated user, admin, system process
- preconditions: data setup, flags, permissions, prior state
- main path: happy path from trigger to expected outcome
- side effects: DB writes, cache invalidation, notifications, downstream calls
- alternate paths: validation failure, empty state, retry, duplicate submission, timeout, partial failure

Prefer end-to-end flow language over implementation language. Example: "user edits profile and sees updated name after refresh" is better than "PATCH /profile returns 200."

## 3. Build A Risk-Based Test Matrix

For every impacted flow, cover at least these categories when relevant:

- happy path
- validation and bad input
- permission or role boundaries
- loading, empty, and error states
- retry, refresh, back button, duplicate click, idempotency
- cross-page or cross-service side effects
- data persistence after reload or refetch
- regression risk to nearby existing behavior

Raise priority for:

- auth, billing, payments, destructive actions
- migrations or schema changes
- branching logic and feature flags
- async jobs, race conditions, eventual consistency
- fixes for production bugs or previously flaky areas

## 4. Choose The Strongest Available Verification

Use the best validation available in the current environment instead of stopping at static analysis.

Preferred order:

1. existing automated tests that directly cover the changed behavior
2. targeted local commands such as unit, integration, API, or e2e tests
3. browser-based verification for local web flows
4. manual reasoning only when execution is blocked

When a local frontend or app is runnable and the target is obvious, use the browser plugin or browser tools to exercise the flow. For API or service changes, use existing test commands or direct requests when safe and practical.

If execution is blocked, say exactly what blocked it:

- missing env vars
- app does not start
- no test data
- external dependency unavailable
- no runnable test harness

## 5. Hunt For Missed Bugs

Actively look for classes of issues that developers often miss after implementing a feature:

- success toast appears but data did not persist
- UI updates optimistically but server state disagrees
- one path validates input but another path bypasses it
- button works once but breaks on retry or double submit
- happy path works for one role but not another
- API contract changed and one caller was not updated
- schema changed but seed, fixture, serializer, or migration path is incomplete
- filtering, sorting, pagination, or totals become inconsistent after the change
- empty state, null state, or first-time user path breaks
- fix works in one entry point but not in another equivalent flow

## 6. Report Like QA

Present results in a structured QA report.

Use this shape:

### Scope

- what code or flows were reviewed

### Tested

- each verification step you actually performed
- command, route, page, or scenario
- result: pass, fail, blocked

### Findings

- severity
- short title
- why it is a bug or regression risk
- reproduction steps if reproducible
- affected files or flow

### Missing Coverage

- important scenarios not verified yet
- exact reason they remain untested

### Recommended Retest List

- concise next-pass checklist ordered by risk

## Review Heuristics

Use these heuristics to avoid shallow QA:

- If backend logic changed, check whether the frontend or callers still match.
- If frontend logic changed, check reload, navigation away/back, stale data, and duplicate interactions.
- If DB or schema changed, check create, read, update, delete, seed/fixture, serialization, and backward compatibility.
- If permissions changed, test at least one allowed and one denied actor.
- If a bug fix references one scenario, search for sibling scenarios that use similar logic.
- If tests exist, inspect whether they only assert the happy path and miss stateful regressions.

## Output Style

Be concrete and evidence-based.

- Prefer "I ran X and observed Y" over "this seems fine."
- Separate confirmed bugs from suspected risks.
- Keep findings first when the user asked for a review.
- Explicitly label assumptions.
- If no bug is found, still list residual risks and untested paths.

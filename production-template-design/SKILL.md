---
name: production-template-design
description: Design, implement, refine, and verify production-grade web product templates, feature prototypes, SaaS and AI interfaces with interactive flows, shadcn-compatible semantic tokens, responsive behavior, and light/dark themes. Use when creating a starter template, product prototype, AI chat landing page, product-first marketing page, application shell, or when upgrading an existing template that looks generic, flat, inconsistent, or unfinished.
---

# Production Template Design

Build templates that are credible starting points for real products, not static marketing mockups.

The default outcome is a polished, runnable interface with meaningful interactions, responsive layouts, theme support, and browser verification. Preserve the repository's stack and established design system. Do not migrate frameworks or invent a parallel component vocabulary without a concrete reason.

## Required Reading

Load only what the task needs:

- New project or major page: read [references/discovery.md](references/discovery.md), [references/workflow.md](references/workflow.md), and [references/visual-system.md](references/visual-system.md).
- Feature or app-flow prototype: also read [references/prototype-mode.md](references/prototype-mode.md).
- Existing design refinement: read [references/redesign-audit.md](references/redesign-audit.md) and the relevant parts of [references/visual-system.md](references/visual-system.md).
- Before delivery: always read [references/review-checklist.md](references/review-checklist.md).
- For a shadcn-style project with no existing token file, use [assets/shadcn-zinc.css](assets/shadcn-zinc.css) as a starting point, then adapt it to the project.

If `baoyu-design`, `ui-ux-pro-max`, or `redesign-existing-projects` are available, use them as supporting capabilities. This skill owns the production-template workflow and acceptance gates. User requirements and an existing bound design system always override suggestions from a design database.

## Priority Order

Resolve conflicts in this order:

1. Explicit user decisions
2. Existing bound design system and brand assets
3. Existing product and repository conventions
4. Accessibility and functional correctness
5. This skill's defaults
6. External recommendation databases
7. Designer preference

Never let a generated palette, trendy layout, or generic best practice override a confirmed brand direction.

## Workflow

### 1. Establish Context

Inspect the repository before designing:

- framework, build tooling, styling method, and icon library
- existing routes, components, tokens, themes, and responsive conventions
- current product screens and reusable application shells
- available brand assets, screenshots, Figma files, and design systems
- dirty worktree state and files that must not be overwritten

For a new or ambiguous project, ask one focused question round using [references/discovery.md](references/discovery.md). Confirm scope, conversion goal, visual direction, fidelity, variations, theme support, references, and output location.

Do not ask again for decisions the user just supplied. Do not begin a high-fidelity design with no product context unless the user explicitly accepts a from-scratch direction.

### 2. Write the Design Contract

Before implementation, state the contract in a short working note or user update:

- product and audience
- primary user action
- one-sentence design thesis
- information architecture
- visual tokens and component constraints
- interaction depth
- responsive and theme requirements
- verification viewports

A useful thesis is specific enough to reject weak choices. Example:

> Product is the evidence: let visitors operate the AI workspace instead of decorating the page with abstract AI imagery.

### 3. Choose the Delivery Mode

Choose one acceptance mode before implementation. If the user does not name one, infer it from the request and state the assumption.

- `landing`: optimize for product comprehension, trust, and one dominant conversion action.
- `prototype`: optimize for a user completing a feature flow across screens and states. Read [references/prototype-mode.md](references/prototype-mode.md).
- `production-template`: optimize for reusable architecture, realistic states, responsive behavior, theming, and a credible engineering starting point.

A deliverable may combine modes, but one mode must own the acceptance criteria. A landing page with a product demo is still `landing` unless the user asks to validate the underlying feature workflow.

### 4. Build the System Before Sections

Define semantic tokens first. Components consume tokens; components do not invent local palettes.

At minimum define:

- background, foreground, surface, elevated surface
- primary and primary foreground
- secondary, muted, and muted foreground
- border, input, and focus ring
- success, warning, destructive
- stable inverse surface tokens
- radius, spacing, container, header height, and shadows

Important theme rule:

- Semantic foreground/background tokens may invert between themes.
- A deliberately dark product surface must use stable tokens such as `--surface-inverse`, not `--foreground`. Otherwise it becomes white in dark mode.

Use the repository's icon library. Use familiar icons for familiar actions and label unfamiliar icon-only controls with tooltips and accessible names.

### 5. Design the Product Story

Prefer this product-first sequence for SaaS and AI templates, adapting it to the actual goal:

1. Brand and literal product name
2. Clear value proposition and primary action
3. Real product surface or interactive demo
4. Core workflows and capabilities
5. Architecture or implementation readiness
6. Version, plan, or adoption path
7. Objection handling
8. Final action

Every section must answer a user question. Remove sections that exist only to make the page longer.

Do not default to equal card grids, generic icon cards, abstract AI gradients, oversized marketing heroes, or fabricated social proof. For operational products, favor restrained surfaces, clear hierarchy, and real interface states.

### 6. Implement Meaningful Interactions

A production template should demonstrate its primary workflow. Build the interactions users naturally expect, not decorative motion.

Examples for AI products:

- create, search, and switch conversations
- model or mode selection
- prompt suggestions and composer behavior
- loading, streaming, success, empty, error, and retry states
- file or tool entry points
- response feedback
- theme switching and responsive navigation

Interactions need keyboard support, visible focus, hover/pressed feedback, realistic state transitions, and reduced-motion handling.

Do not claim an integration works when the prototype only simulates it. Label generated content as AI output and include an appropriate accuracy disclaimer when relevant.

### 7. Refine With a Production Audit

For an existing page, do not rewrite first. Diagnose the weak point and make a focused change.

Check for:

- semantic tokens that invert unexpectedly
- abrupt white or dark sections with no tonal bridge
- generic card towers and nested cards
- over-centered composition
- inconsistent alignment between parallel elements
- copy that describes features without showing the product
- empty surfaces with no meaningful structure
- controls that are decorative or dead
- mobile layouts that merely shrink desktop UI

Use [references/redesign-audit.md](references/redesign-audit.md) for the full pass.

### 8. Verify Before Delivery

Always run the repository's existing checks first. Then verify the rendered result over HTTP.

Minimum browser matrix:

- 1440 x 1000 desktop
- 768 x 1024 tablet when layout risk is significant
- 390 x 844 mobile
- light theme
- dark theme

Check:

- no console or runtime errors
- no document or component horizontal overflow
- all local assets load
- important controls work
- interactive state persists when required
- product surfaces remain intentional in both themes
- headings, buttons, labels, and code do not clip
- touch targets are usable on mobile
- reduced-motion behavior is safe

Use the harness browser when available. Otherwise run [scripts/verify-page.mjs](scripts/verify-page.mjs) in an environment with Playwright installed:

```bash
node scripts/verify-page.mjs http://localhost:4311/project/page.html --output-dir /tmp/template-review
```

Do not mark visual verification complete if only static source checks were performed. State what was and was not inspected.

## Output Rules

- Keep deliverables in the user-approved project folder.
- Preserve existing functionality and unrelated user changes.
- Keep assets local when practical.
- Use semantic HTML and canonical markup.
- Split substantial prototypes by coherent ownership boundaries.
- Do not add filler sections, fake customer logos, invented metrics, or unsupported pricing.
- Do not use visible instructional copy to explain obvious UI controls.
- Record assumptions and unresolved product facts instead of presenting them as confirmed.

## Completion Standard

A task is complete only when:

- the primary workflow is demonstrable
- the design follows an explicit system
- the page works at the target viewports
- light and dark themes are intentionally designed
- browser errors and overflow are resolved
- the user receives the runnable URL and relevant file paths

Summarize the result briefly. Mention meaningful caveats and verification gaps.

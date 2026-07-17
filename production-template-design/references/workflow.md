# Production Design Workflow

Use these phases as review gates. Do not move to visual polish while an earlier gate is unresolved.

## Phase 0: Repository Scan

Actions:

- inspect files, package metadata, routes, components, tokens, and assets
- detect existing design systems and project-local skills
- inspect current changes before editing
- identify the runnable entry point and test commands

Exit criteria:

- stack and ownership boundaries are understood
- existing visual vocabulary is documented
- no user changes will be overwritten

## Phase 1: Design Contract

Produce:

- product and audience statement
- primary action
- design thesis
- required sections or screens
- interaction list
- theme and viewport matrix
- assumptions and missing facts

Exit criteria:

- each major design choice can be traced to a requirement
- unsupported content is marked or omitted

## Phase 2: Foundation

Implement:

- semantic tokens
- typography scale
- spacing and container system
- responsive breakpoints
- focus, hover, active, disabled, and loading conventions
- stable inverse surfaces

Exit criteria:

- light and dark theme tokens are coherent
- one component does not invent a new palette
- fixed-format UI has stable dimensions

## Phase 3: Product Surface

Build the core experience before supporting marketing sections.

For AI chat, this often includes:

- app shell and responsive navigation
- conversation state
- message states
- composer behavior
- model/tool controls
- feedback and error states

Exit criteria:

- the primary workflow can be demonstrated
- the product surface reveals the actual product category

## Phase 4: Page Narrative

Connect the product experience to the landing-page narrative.

Each section should answer one question:

- What is it?
- What can I do with it?
- How does it work?
- Is it ready for my use case?
- What should I do next?

Exit criteria:

- there is one dominant CTA
- section order supports that action
- no section is present only as filler

## Phase 5: Refinement

Audit:

- hierarchy, alignment, whitespace, surface transitions
- dark/light invariance
- repetitive card patterns
- typography and line lengths
- motion purpose and reduced motion
- icon consistency and accessible names
- mobile ergonomics

Exit criteria:

- emphasis survives both themes
- transitions between page bands feel intentional
- primary content remains scannable

## Phase 6: Verification

Run:

- syntax, lint, type, and project tests
- desktop and mobile browser checks
- theme checks
- key interaction checks
- overflow and broken-asset checks
- screenshots for review

Exit criteria:

- no known runtime errors
- no unexplained overflow
- key interactions pass
- unverified visual or integration risks are explicitly reported

## Phase 7: Delivery

Provide:

- live local URL
- file paths
- concise list of meaningful changes
- tests and viewports checked
- remaining assumptions or blocked checks

Keep the summary shorter than the artifact deserves. The user should review the product, not a long narration of the process.

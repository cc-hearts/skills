# Prototype Mode

Use `prototype` when the user wants to explore or validate a product feature, workflow, or app shell rather than only present a product on a landing page.

A prototype is a runnable model of user decisions and system responses. It does not need a real backend, but it must make simulated behavior explicit and preserve the shape of a real integration.

## Prototype Contract

Before implementation, define:

- actor and role
- user goal
- entry point
- preconditions
- primary happy path
- alternate paths
- terminal success state
- failure and recovery states
- persistence expectations after refresh or navigation
- screens and ownership boundaries

Use this compact flow format:

```text
Entry -> Action -> System response -> Next decision -> Success
                         |-> Empty / validation error
                         |-> Loading / timeout
                         |-> Permission / unavailable
```

Do not begin with a component list. Begin with the user trying to complete a task.

## State Inventory

For each async or editable surface, list the states that are meaningful for the product:

- first-use or empty
- idle
- focused or editing
- validation error
- submitting or loading
- partial or streaming result
- success
- recoverable error
- retrying
- permission denied
- stale or offline when relevant
- destructive confirmation when relevant

Do not add every theoretical state. Add the states a real user can encounter and the states needed to judge the interaction.

## Screen And Component Boundaries

Keep one state owner for a workflow. Extract presentational components around it.

Good boundaries:

- app shell and navigation
- list or search surface
- detail or editor surface
- composer or form
- result renderer
- status and feedback component
- modal, drawer, or command menu

Avoid splitting tightly coupled state across unrelated files. Keep state transitions easy to trace.

## Interaction Matrix

Before delivery, verify at least:

| Flow | Trigger | Expected state | Alternate state | Persistence |
| --- | --- | --- | --- | --- |
| create | click or submit | new item visible | validation error | reload if required |
| edit | change and save | updated detail | save failure | refresh |
| search | type query | filtered list | no results | URL or local state if required |
| async action | submit | loading then result | retryable error | refresh if required |
| navigation | select item | correct screen | back or cancel | deep link if required |

Adapt the matrix to the actual feature. Do not claim a flow works without exercising it.

## AI Feature Defaults

For AI features, include only the states relevant to the requested workflow, but usually cover:

- empty workspace or no conversation
- prompt or file input
- model/tool selection
- disabled send state
- streaming or generation state
- partial answer rendering
- retry or regenerate
- feedback
- AI disclosure and accuracy caveat
- context loss or unavailable tool behavior

Simulated responses should use realistic delays and state transitions. Never present a fake external integration as connected. Use copy such as `Demo response` in code or working notes when the distinction could matter, not as noisy UI decoration.

## Feature Prototypes Versus Landing Pages

Feature prototypes prioritize task completion over persuasion:

- build the app surface before supporting copy
- model navigation, state, and recovery before decorative polish
- use realistic data shape without inventing business claims
- validate repeat use, refresh, back navigation, and duplicate actions
- test empty, loading, success, and error states

Landing pages prioritize comprehension and conversion:

- show the product early
- keep one dominant CTA
- use supporting sections to answer objections
- minimize secondary interaction depth

A page can combine both modes, but state which mode owns the acceptance criteria.

## Prototype Exit Criteria

A feature prototype is ready for review when:

- a user can complete the primary flow from a clear entry point
- at least one alternate or error path is represented
- state changes are visible and coherent
- repeat actions do not duplicate or corrupt the UI
- navigation away and back behaves intentionally
- refresh behavior matches the stated persistence expectation
- responsive and theme requirements are checked
- simulated integrations are clearly documented

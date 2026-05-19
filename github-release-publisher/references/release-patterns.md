# Release Patterns

Use this file when deciding how to shape release notes.

## Common Patterns In Strong Open Source Releases

Most good GitHub Releases follow a small set of patterns:

1. Start with one short summary sentence.
2. Put the most important user-visible changes near the top.
3. Separate upgrade or breaking notes from ordinary changes.
4. Group the rest into categories instead of dumping commit history.
5. End with a compare link or full changelog link.

## Patterns Worth Reusing

### 1. Manual editorial top + generated tail

This is common in polished projects:

- A short handwritten summary at the top
- A few grouped bullets for major changes
- A generated `What's Changed` or `Full Changelog` section at the bottom

Use this when the project is user-facing and you want both quality and completeness.

### 2. `What's Changed` with categories

Many projects keep the body simple:

- `Features`
- `Bug Fixes`
- `Performance`
- `Documentation`

Use this when commit quality is already decent or when the release is frequent.

### 3. Explicit upgrade guidance

Mature libraries often isolate:

- breaking changes
- deprecations
- required migrations
- environment/version bumps

Use this whenever the release can break consumers or change output meaning.

### 4. Compare links and contributor credit

Generated GitHub Releases often end with:

- compare links
- PR references
- contributor acknowledgements

Keep these, but do not let them dominate the top of the note.

## Suggested Structure For Memory Report

For Memory Report, use a hybrid:

1. One-sentence summary
2. `Highlights`
3. `Report Quality Notes`
4. `Upgrade Notes`
5. `What's Changed`
6. `Full Changelog`

This works well because your audience likely cares about both product behavior and data/report trustworthiness.

## Mapping Raw Changes To Reader Language

Translate commits like this:

- `feat: add retention bucket rollups` -> `Added retention bucket rollups in generated reports.`
- `fix: handle null memories in serializer` -> `Fixed missing-memory rows from causing report serialization failures.`
- `refactor: split prompt builder` -> `Improved prompt generation maintainability.`

If a change is purely internal and not reader-visible, place it under `Internal` or omit it.

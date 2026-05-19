# `.github/release.yml` Template

Use this when the repository wants GitHub's auto-generated release notes to group PRs consistently.

Example:

```yaml
changelog:
  exclude:
    labels:
      - ignore-for-release
      - duplicate
      - invalid
      - question
  categories:
    - title: Highlights
      labels:
        - release:highlight
        - feature
    - title: Fixes
      labels:
        - bug
        - fix
    - title: Performance
      labels:
        - performance
        - perf
    - title: Docs / DX
      labels:
        - documentation
        - docs
        - developer-experience
    - title: Internal
      labels:
        - chore
        - ci
        - refactor
```

## Recommendations

- Keep category names aligned with the release note sections you actually publish.
- Add a dedicated highlight label such as `release:highlight` so the top section can be curated.
- Exclude labels for noise like duplicates, invalid issues, and items that should not appear in public notes.
- If the project uses conventional commits but weak PR labels, improve label hygiene before relying heavily on auto-generated notes.

## Memory Report Mapping

For Memory Report, a good label set is:

- `feature`
- `bug`
- `report-quality`
- `prompting`
- `data-pipeline`
- `release:highlight`

Then either:

- map `report-quality`, `prompting`, and `data-pipeline` into `Highlights`, or
- keep them as a separate `Report Quality` category if releases are detailed and technical.

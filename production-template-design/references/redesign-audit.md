# Redesign Audit

Use this for focused upgrades to an existing template. Diagnose first; make the smallest coherent redesign that resolves the issue.

## 1. Identify The Actual Failure

Classify the problem:

- hierarchy: important content has no visual priority
- surface: a section is too flat, too bright, too dark, or theme-dependent
- transition: adjacent sections do not connect
- composition: generic equal cards, excessive centering, or weak alignment
- interaction: dead controls, missing states, or unclear feedback
- content: generic claims, unsupported facts, or no relationship to the product
- responsive: desktop composition simply shrinks and becomes cramped

State the failure in one sentence before editing.

## 2. Check Theme Invariance

For each emphasized surface, inspect computed colors in light and dark themes.

Common defect:

```css
.featured { background: var(--foreground); }
```

This produces a dark surface in light mode and a white surface in dark mode. Use stable tokens instead:

```css
.featured {
  background: var(--surface-inverse);
  color: var(--surface-inverse-foreground);
}
```

## 3. Replace Generic Structure

Instead of equal pricing or feature cards, consider:

- one dominant production surface plus a lightweight starter path
- asymmetric product/workbench split
- rows with shared baselines
- a configuration or manifest surface that proves implementation readiness
- full-width comparison bands
- progressive disclosure for secondary details

Do not add decoration without information value.

## 4. Improve Transitions

Connect neighboring sections with at least one shared device:

- same tonal background
- a continuing vertical alignment
- border or baseline rhythm
- content that answers the previous section's final question
- controlled overlap where it clarifies hierarchy

Avoid a random dark or white block that feels pasted into the page.

## 5. Retest

After the change:

- compare before/after in the affected viewport
- test light and dark computed colors
- check component and document overflow
- verify the CTA and linked interactions
- inspect mobile stacking and text clipping
- rerun console and runtime checks

Do not broaden the redesign into unrelated sections unless the local fix exposes a systemic issue.

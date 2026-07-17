# Visual System Rules

These defaults target quiet, credible SaaS and AI product templates. A bound product design system overrides them.

## Product-First Composition

- Make the product name and category visible in the first viewport.
- Show a real product state early. Use an interactive surface when interaction is central to the product.
- Keep marketing copy outside the product frame.
- Avoid generic abstract AI imagery when the interface itself communicates the value more clearly.
- Let the following section or product surface remain visible enough to establish continuity.

## Surfaces

- Use full-width page bands for sections.
- Use cards only for repeated items, framed tools, and modal surfaces.
- Do not put a card inside another card.
- Avoid abrupt pure-white or off-black blocks unless they carry a deliberate product state.
- Bridge sections through shared backgrounds, borders, alignment, or continued content rhythm.
- Use low radii for operational tools: generally 4-8px.
- Use restrained shadows and a consistent light direction.

## Theme Semantics

Use two categories of tokens:

1. Adaptive semantic tokens that invert between themes:
   - background / foreground
   - card / card-foreground
   - primary / primary-foreground
   - muted / muted-foreground
   - border / input / ring

2. Stable presentation tokens that must not invert:
   - inverse product surface
   - code editor surface
   - brand media treatment
   - semantic status colors

Never use `--foreground` as the background of a deliberately dark panel. It becomes light when the theme changes.

## Typography

- Use the repository's type system first.
- Match scale to context: product UI is compact; true hero copy may be larger.
- Do not scale font size continuously with viewport width.
- Keep letter spacing at zero unless an established brand system requires otherwise.
- Use balanced wrapping for headings and pretty wrapping for body copy.
- Keep reading lines around 55-70 characters.
- For Chinese interfaces, use an appropriate CJK system stack and 1.7-1.8 body line height.

## Components

- Use icons for familiar tools and icon-plus-text for important commands.
- Use segmented controls for modes, selects or menus for option sets, checkboxes/toggles for binary state, and inputs for values.
- Icon-only buttons require accessible names and tooltips when the icon is not universally obvious.
- Keep mobile touch targets at least 44px when the control is intended for interaction.
- Define stable dimensions for toolbars, boards, composers, counters, and other fixed-format UI.

## Color

- Start from brand or design-system colors.
- Use semantic status colors sparingly.
- Avoid AI-purple gradients, decorative glowing orbs, and palettes dominated by a single chromatic hue.
- Monochrome neutral systems are acceptable when intentionally requested; use semantic status colors to preserve meaning.
- Do not introduce a generated palette when it conflicts with a confirmed brand direction.

## Motion

- Use motion to explain state change, continuity, loading, or hierarchy.
- Prefer 150-300ms interaction transitions.
- Use longer entrance motion only for a small number of high-impact moments.
- Animate opacity and transform rather than layout dimensions.
- Respect `prefers-reduced-motion`.

## Content

- Use literal product and offer names in major headings.
- Put value propositions in supporting copy, not abstract slogans.
- Do not invent metrics, customers, testimonials, pricing, or integrations.
- Label prototype behavior honestly.
- Avoid visible instructions that explain obvious controls.

# Production Template Review Checklist

Complete this before delivery. Report blocked checks explicitly.

## Product And Content

- [ ] Product name and literal category appear early.
- [ ] One primary CTA is visually dominant.
- [ ] The primary workflow is demonstrated, not only described.
- [ ] No filler sections, fake logos, invented metrics, or unsupported pricing.
- [ ] AI output is labeled and important-information disclaimers are present when relevant.

## Visual System

- [ ] Components consume semantic tokens.
- [ ] Stable dark/inverse surfaces do not invert between themes.
- [ ] Adjacent page bands transition intentionally.
- [ ] No nested cards or excessive generic card grids.
- [ ] Typography matches the density and context of each surface.
- [ ] Icon style and stroke weight are consistent.
- [ ] Shadows, radii, and borders are restrained and consistent.

## Interaction

- [ ] Hover, pressed, focus, disabled, and loading states exist where relevant.
- [ ] Keyboard navigation reaches important actions.
- [ ] Icon-only controls have accessible names.
- [ ] Important interactions work after repeat use, not only once.
- [ ] Empty, error, retry, and first-use states are covered when relevant.
- [ ] Reduced-motion preferences are respected.

## Responsive

- [ ] No horizontal document overflow at 1440, 768, and 390px.
- [ ] No clipped headings, labels, buttons, code, or input text.
- [ ] Mobile layouts recompose instead of merely shrinking.
- [ ] Mobile touch targets are usable.
- [ ] Fixed-format product surfaces have stable dimensions.

## Theme

- [ ] Light theme reviewed in a real browser.
- [ ] Dark theme reviewed in a real browser.
- [ ] Text contrast remains readable.
- [ ] Borders and elevated surfaces remain distinguishable.
- [ ] Brand and status colors retain their intended meaning.

## Technical Verification

- [ ] Existing lint, type, and test commands pass.
- [ ] Browser console has no unexplained errors.
- [ ] Local assets load without 404 responses.
- [ ] Key navigation and CTA actions work.
- [ ] Key product interactions work.
- [ ] Screenshots were captured at desktop and mobile sizes.
- [ ] Any visual inspection limitation is disclosed.

## Delivery

- [ ] Live local URL provided.
- [ ] Relevant file paths provided.
- [ ] Meaningful changes summarized briefly.
- [ ] Remaining assumptions and verification gaps stated.

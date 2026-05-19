/**
 * Barberbook · Pari design system color helper.
 *
 * Token-driven: every entry resolves to a CSS variable defined in
 * src/index.css, so flipping the theme (class="dark" on <html>) flips
 * every callsite at once. Hex strings only appear where a solid color
 * is genuinely needed (toast gutters, gradient stops).
 *
 * `C` names are kept stable for existing call-sites; semantic accent
 * stays under `accent*` but now points at the warm clay, not coral.
 */
export const C = {
  // Surfaces
  bg:          'var(--paper-3)',
  surface:     'var(--paper-2)',
  surfaceAlt:  'var(--paper)',

  // Ink
  text:        'var(--ink)',
  textStrong:  'var(--ink)',
  muted:       'var(--ink-60)',
  hint:        'var(--ink-40)',

  // Borders
  border:      'var(--ink-15)',
  borderMed:   'var(--ink-25)',

  // Accent (clay — warm seppia accent)
  accent:      'var(--clay)',
  accentDeep:  'var(--clay-deep)',
  accentLight: 'var(--clay-soft)',

  // Semantic
  green:       'var(--sage)',
  greenSoft:   'var(--sage-soft)',
  red:         'var(--rust)',
  redSoft:     'var(--rust-soft)',
} as const

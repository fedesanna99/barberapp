/**
 * CutBook · Modern Minimal palette.
 *
 * One coral accent, near-black ink on white. Semantic aliases (`text`,
 * `muted`, …) keep the old `C.*` call sites compiling; tone-specific colors
 * (success / danger) map to the Phosphor green / red. Hex strings are
 * exposed for places that need solid colors (toast gutters, shadows).
 */
export const C = {
  // Surfaces
  bg:          'var(--carta)',       // #FFFFFF
  surface:     'var(--carta-2)',     // #FAFAFA
  surfaceAlt:  'var(--carta-3)',     // #F5F5F5

  // Ink
  text:        'var(--inchiostro)',     // #0A0A0A
  textStrong:  'var(--inchiostro)',
  muted:       'var(--inchiostro-60)',
  hint:        'var(--inchiostro-40)',

  // Borders
  border:      'var(--inchiostro-12)',  // hairline
  borderMed:   'var(--inchiostro-20)',  // strong hairline

  // Accent (coral)
  accent:      '#FF5C39',
  accentDeep:  '#E63E1B',
  accentLight: '#FFE7E0',

  // Semantic
  green:       '#16A34A',
  greenSoft:   '#DCFCE7',
  red:         '#DC2626',
  redSoft:     '#FEE2E2',
} as const

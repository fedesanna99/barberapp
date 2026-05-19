/**
 * Italian-locale formatting helpers used everywhere in the UI so we
 * never get a "$" / "." mixed in by accident.
 */

const NBSP = ' '        // non-breaking space
const THINSP = ' '      // narrow non-breaking space (€ 22)
const MIDDOT = ` ${'·'} `    // inline metadata separator

const DAYS_IT_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const DAYS_IT_LONG  = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MONTHS_IT_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export const DOT = MIDDOT

export function formatRating(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(digits).replace('.', ',')
}

export function formatKm(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return '—'
  if (km < 1) return `${Math.round(km * 1000)}${NBSP}m`
  return `${km.toFixed(1).replace('.', ',')}${NBSP}km`
}

export function formatPrice(eur: number | null | undefined): string {
  if (eur == null || Number.isNaN(eur)) return '—'
  // € + thin nbsp + integer for whole euros, two decimals only when needed
  const value = Number.isInteger(eur) ? String(eur) : eur.toFixed(2).replace('.', ',')
  return `€${THINSP}${value}`
}

export function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0'
  return n.toLocaleString('it-IT')
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function formatTimeSlot(slot: string | null | undefined): string {
  // already "HH:MM" — pass-through with sanity
  if (!slot) return '—'
  const [h, m] = slot.split(':')
  if (!h || !m) return slot
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return `${DAYS_IT_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_IT_SHORT[date.getMonth()]}`
}

export function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return `${DAYS_IT_LONG[date.getDay()]} ${date.getDate()} ${MONTHS_IT_SHORT[date.getMonth()]}`
}

export function joinMeta(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(MIDDOT)
}

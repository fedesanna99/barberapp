// Lightweight email check — practical, not RFC-strict. Catches typos like
// "mario@gmail" or "mario gmail.com" without false-positives on common
// real-world addresses. Server-side (Supabase Auth) is the final authority.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

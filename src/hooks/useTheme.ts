import { useEffect, useState, useCallback } from 'react'

// Theme model:
//   - 'light' / 'dark' = explicit user preference (sticky)
//   - 'system' = follow the OS via prefers-color-scheme
//
// Implementation pins the *resolved* theme as a class on <html> so all CSS
// variables in index.css (which are scoped under :root and :root.dark) flip
// in a single repaint. localStorage holds the *preference*, not the resolved
// value, so flipping the OS while on 'system' updates the app live.

export type ThemePref     = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'cutbook:theme'

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref
}

function apply(resolved: ResolvedTheme): void {
  const root = document.documentElement
  if (resolved === 'dark') root.classList.add('dark')
  else                     root.classList.remove('dark')
  // Sync the browser meta theme-color so status bars / chrome match.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = resolved === 'dark' ? '#0E0E10' : '#FFFFFF'
}

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readPref()))

  // Apply resolved theme to <html> whenever it changes (mount + pref change).
  useEffect(() => { apply(resolved) }, [resolved])

  // When pref is 'system', track OS-level changes live without reload.
  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolved(systemTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const setTheme = useCallback((next: ThemePref) => {
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    setPrefState(next)
    setResolved(resolve(next))
  }, [])

  return { theme: pref, resolved, setTheme }
}

// Bootstrap helper: apply the theme synchronously at module load BEFORE React
// mounts. Prevents a "flash of wrong theme" on first paint.
export function bootstrapTheme(): void {
  apply(resolve(readPref()))
}

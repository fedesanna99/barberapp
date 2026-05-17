import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin, IS_DEMO } from '../lib/supabase'
import type { AppLog } from '../types/supabase'

export type { AppLog }

// ── Demo in-memory log store ───────────────────────────────────────────────

let demoStore: AppLog[] = []
const demoSubs = new Set<(logs: AppLog[]) => void>()

function demoNotify() {
  demoSubs.forEach(fn => fn([...demoStore]))
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAdminLogs() {
  const [logs, setLogs]       = useState<AppLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEMO || !supabaseAdmin) {
      setLogs([...demoStore])
      setLoading(false)
      demoSubs.add(setLogs)
      return () => { demoSubs.delete(setLogs) }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    setError(null)

    const { data, error: e } = await supabaseAdmin!
      .from('app_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (e) {
      setError(e.message)
    } else {
      setLogs(data ?? [])
    }
    setLoading(false)
  }

  async function clearLogs() {
    if (IS_DEMO || !supabaseAdmin) {
      demoStore = []
      demoNotify()
      return { error: null }
    }

    const { error: e } = await supabaseAdmin.from('app_logs').delete().neq('id', '')
    if (e) return { error: e.message }

    setLogs([])
    return { error: null }
  }

  return { logs, loading, error, clearLogs, reload: load }
}

// ── Utility: write a log entry (fire-and-forget) ──────────────────────────

export async function writeLog(
  action: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: { userId?: string; userEmail?: string; metadata?: Record<string, unknown> },
) {
  if (IS_DEMO) {
    const entry: AppLog = {
      id:         crypto.randomUUID(),
      level,
      action,
      message,
      user_id:    extra?.userId    ?? null,
      user_email: extra?.userEmail ?? null,
      metadata:   extra?.metadata  ?? null,
      created_at: new Date().toISOString(),
    }
    demoStore = [entry, ...demoStore]
    demoNotify()
    return
  }

  await supabase.from('app_logs').insert({
    action, message, level,
    user_id:    extra?.userId    ?? null,
    user_email: extra?.userEmail ?? null,
    metadata:   extra?.metadata  ?? null,
  })
}

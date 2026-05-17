import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin, IS_DEMO } from '../lib/supabase'
import { DEMO_LOGS } from '../lib/demoData'
import type { AppLog } from '../types/supabase'

export type { AppLog }

export function useAdminLogs() {
  const [logs, setLogs]       = useState<AppLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)

    if (IS_DEMO || !supabaseAdmin) {
      await new Promise(r => setTimeout(r, 300))
      setLogs(DEMO_LOGS as unknown as AppLog[])
      setLoading(false)
      return
    }

    const { data, error: e } = await supabaseAdmin
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
      setLogs([])
      return { error: null }
    }

    const { error: e } = await supabaseAdmin.from('app_logs').delete().neq('id', '')
    if (e) return { error: e.message }

    setLogs([])
    return { error: null }
  }

  return { logs, loading, error, clearLogs, reload: load }
}

// Utility: write a log entry (fire-and-forget, safe to call anywhere)
export async function writeLog(
  action: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: { userId?: string; userEmail?: string; metadata?: Record<string, unknown> },
) {
  if (IS_DEMO) return
  await supabase.from('app_logs').insert({
    action, message, level,
    user_id:    extra?.userId    ?? null,
    user_email: extra?.userEmail ?? null,
    metadata:   extra?.metadata  ?? null,
  })
}

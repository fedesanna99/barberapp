import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin, IS_DEMO } from '../lib/supabase'
import { DEMO_ADMIN_USERS } from '../lib/demoData'
import type { UserRole } from '../types/supabase'

export interface AdminUser {
  id: string
  email: string
  display_name: string
  role: UserRole
  created_at: string
}

export function useAdminUsers() {
  const [users, setUsers]     = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)

    if (IS_DEMO || !supabaseAdmin) {
      await new Promise(r => setTimeout(r, 400))
      setUsers(DEMO_ADMIN_USERS as AdminUser[])
      setLoading(false)
      return
    }

    const [{ data: authData, error: authErr }, { data: profiles, error: profErr }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers(),
      supabase.from('profiles').select('id, role, display_name'),
    ])

    if (authErr || profErr) {
      setError((authErr ?? profErr)!.message)
      setLoading(false)
      return
    }

    const mapped: AdminUser[] = (authData?.users ?? []).map(u => {
      const prof = profiles?.find(p => p.id === u.id)
      return {
        id:           u.id,
        email:        u.email ?? '',
        display_name: prof?.display_name ?? u.email ?? '',
        role:         (prof?.role as UserRole) ?? 'client',
        created_at:   u.created_at,
      }
    })

    setUsers(mapped)
    setLoading(false)
  }

  async function createUser(email: string, password: string, displayName: string, role: UserRole) {
    if (IS_DEMO || !supabaseAdmin) {
      const newUser: AdminUser = {
        id: `demo-${Date.now()}`, email, display_name: displayName, role,
        created_at: new Date().toISOString(),
      }
      setUsers(prev => [newUser, ...prev])
      return { error: null }
    }

    const { data, error: e } = await supabaseAdmin.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    })
    if (e) return { error: e.message }

    if (data.user && (role !== 'client')) {
      await supabaseAdmin
        .from('profiles')
        .update({ role, display_name: displayName })
        .eq('id', data.user.id)
    }

    await load()
    return { error: null }
  }

  async function deleteUser(userId: string) {
    if (IS_DEMO || !supabaseAdmin) {
      setUsers(prev => prev.filter(u => u.id !== userId))
      return { error: null }
    }

    const { error: e } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (e) return { error: e.message }

    setUsers(prev => prev.filter(u => u.id !== userId))
    return { error: null }
  }

  async function changeRole(userId: string, role: UserRole) {
    if (IS_DEMO || !supabaseAdmin) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      return { error: null }
    }

    const { error: e } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (e) return { error: e.message }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    return { error: null }
  }

  async function sendPasswordReset(email: string) {
    if (IS_DEMO) return { error: null }

    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: e?.message ?? null }
  }

  return { users, loading, error, createUser, deleteUser, changeRole, sendPasswordReset, reload: load }
}

import { useState, useEffect } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { DEMO_ADMIN_USERS } from '../lib/demoData'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'
import type { UserRole } from '../types/supabase'

export interface AdminUser {
  id: string
  email: string
  display_name: string
  role: UserRole
  // Task 9 — orthogonal flag, the source of truth for admin perms.
  is_admin: boolean
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

    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 400))
      setUsers(DEMO_ADMIN_USERS as AdminUser[])
      setLoading(false)
      return
    }

    // get_admin_users() is SECURITY DEFINER — accesses auth.users server-side.
    // If migration 029 hasn't been applied yet, the RPC doesn't exist; surface
    // a useful message instead of the raw PostgREST 404.
    try {
      const { data, error: e } = await supabase.rpc('get_admin_users')
      if (e) {
        const isMissing = /function.*does not exist|404/i.test(e.message)
        setError(isMissing
          ? 'Admin DB non inizializzato. Applica le migration più recenti (in particolare 029_is_admin_and_notifications.sql) e ricarica.'
          : e.message)
      } else {
        setUsers((data ?? []) as AdminUser[])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto nel caricamento utenti.')
    }
    setLoading(false)
  }

  async function createUser(email: string, password: string, displayName: string, role: UserRole) {
    const cleanDisplayName = limitText(displayName.trim(), TEXT_LIMITS.profileName)
    if (IS_DEMO) {
      const newUser: AdminUser = {
        id: `demo-${Date.now()}`, email, display_name: cleanDisplayName, role,
        is_admin: false,
        created_at: new Date().toISOString(),
      }
      setUsers(prev => [newUser, ...prev])
      return { error: null }
    }

    const { data, error: e } = await supabase.functions.invoke('admin-create-user', {
      body: { email, password, displayName: cleanDisplayName, role },
    })
    if (e) return { error: e.message }
    if (data?.error) return { error: data.error }

    await load()
    return { error: null }
  }

  async function deleteUser(userId: string) {
    if (IS_DEMO) {
      setUsers(prev => prev.filter(u => u.id !== userId))
      return { error: null }
    }

    // admin_delete_user() is SECURITY DEFINER — deletes from auth.users server-side
    const { error: e } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
    if (e) return { error: e.message }

    setUsers(prev => prev.filter(u => u.id !== userId))
    return { error: null }
  }

  async function changeRole(userId: string, role: UserRole) {
    if (IS_DEMO) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      return { error: null }
    }

    // admin_update_any_profile RLS policy allows this with the anon key
    const { error: e } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    if (e) return { error: e.message }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    return { error: null }
  }

  // Task 9 — toggle the orthogonal admin flag. Admin perms are no longer
  // expressed via `role` but via this boolean (a user can be barber AND admin).
  async function setIsAdmin(userId: string, value: boolean) {
    if (IS_DEMO) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: value } : u))
      return { error: null }
    }
    const { error: e } = await supabase
      .from('profiles')
      .update({ is_admin: value })
      .eq('id', userId)
    if (e) return { error: e.message }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: value } : u))
    return { error: null }
  }

  async function sendPasswordReset(email: string) {
    if (IS_DEMO) return { error: null }

    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: e?.message ?? null }
  }

  return { users, loading, error, createUser, deleteUser, changeRole, setIsAdmin, sendPasswordReset, reload: load }
}

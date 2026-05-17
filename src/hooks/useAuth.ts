import { useEffect, useState, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Barber } from '../types/supabase'

type ProfileWithBarber = Profile & { barbers: Barber | null }

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileWithBarber | null>(null)
  const [loading, setLoading] = useState(true)
  // Prevents onAuthStateChange from resolving loading before getSession() completes.
  // Without this, INITIAL_SESSION fires with null before the stored session is read,
  // causing a login-screen flash on every page reload or tab switch.
  const sessionResolved = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      sessionResolved.current = true
      setSession(data.session)
      if (data.session) {
        fetchProfile(data.session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        // Skip refetch on token refresh: profile hasn't changed and a failed
        // refetch would temporarily null the profile, wiping the user's role.
        if (event !== 'TOKEN_REFRESHED') fetchProfile(session.user.id)
      } else {
        setProfile(null)
        if (sessionResolved.current) setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*, barbers(*)')
      .eq('id', userId)
      .single()
    // Only overwrite profile on success; a failed/null fetch must not clear
    // an already-loaded profile (e.g. transient network error on tab switch).
    if (data) setProfile(data as unknown as ProfileWithBarber)
    setLoading(false)
  }

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut()

  const isBarber = profile?.role === 'barber'
  const isAdmin  = profile?.role === 'admin'

  return { session, profile, isBarber, isAdmin, loading, signInWithGoogle, signOut }
}

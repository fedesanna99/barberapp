import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { Profile } from '../types/supabase'

const DEMO_PROFILE: Profile = {
  id: 'demo',
  role: 'client',
  display_name: 'Andrea G.',
  avatar_url: null,
  bio: null,
  lat: null,
  lng: null,
  created_at: '',
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile>(DEMO_PROFILE)

  useEffect(() => {
    if (IS_DEMO || !userId) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => { if (data) setProfile(data as Profile) })
  }, [userId])

  async function updateAvatarUrl(url: string) {
    const prevUrl = profile.avatar_url
    setProfile(prev => ({ ...prev, avatar_url: url }))
    if (IS_DEMO || !userId) return
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    if (error) {
      setProfile(prev => ({ ...prev, avatar_url: prevUrl }))
      throw new Error(error.message)
    }
  }

  return { profile, updateAvatarUrl }
}

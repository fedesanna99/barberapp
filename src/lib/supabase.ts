import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL          ?? 'https://placeholder.supabase.co'
const supabaseKey     = import.meta.env.VITE_SUPABASE_ANON_KEY     ?? 'placeholder-anon-key'
const serviceRoleKey  = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? ''

// True when real credentials are missing — auth calls fall back to demo simulation.
export const IS_DEMO = !import.meta.env.VITE_SUPABASE_URL

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// Admin client using service role key — bypasses RLS for admin panel operations.
// Only available when VITE_SUPABASE_SERVICE_ROLE_KEY is set.
export const supabaseAdmin = serviceRoleKey
  ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL      || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// True when real credentials are missing — auth calls fall back to demo simulation.
export const IS_DEMO = !import.meta.env.VITE_SUPABASE_URL

// Task 20 — auth options made explicit (they match the SDK defaults but
// declaring them documents the contract):
//  • persistSession: stores the session in localStorage so a page reload
//    keeps the user logged in.
//  • autoRefreshToken: silently rotates the JWT before it expires.
//  • detectSessionInUrl: handles the OAuth/magic-link callback hash.
// The companion fix lives in useAuth.ts: an `initializing` flag (loading)
// so route guards never redirect to /login while getSession() is still
// resolving — historically this caused a one-frame logout flash on reload.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
})

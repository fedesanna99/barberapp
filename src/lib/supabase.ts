import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL      || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// True when real credentials are missing — auth calls fall back to demo simulation.
export const IS_DEMO = !import.meta.env.VITE_SUPABASE_URL

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

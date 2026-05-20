/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_HCAPTCHA_SITE_KEY?: string
  readonly VITE_MAPTILER_KEY?: string
  // Task 5 — maintenance mode (build-time gate); see src/screens/Maintenance.tsx.
  readonly VITE_MAINTENANCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

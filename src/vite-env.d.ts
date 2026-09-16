/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ALLOWED_DOMAIN?: string
  readonly VITE_RPS_EMAIL?: string
  readonly VITE_RPS_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

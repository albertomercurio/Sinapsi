import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Fail loudly in development; a production build without config is useless.
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)')
}

/**
 * The only backend the browser talks to (Supabase, EU region). The CSP in
 * vite.config.ts restricts connect-src to this origin.
 */
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', key ?? 'missing', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    // Email links are verified explicitly at /auth/confirm (token_hash), never via URL fragments.
    detectSessionInUrl: false,
  },
})

export type { Database }

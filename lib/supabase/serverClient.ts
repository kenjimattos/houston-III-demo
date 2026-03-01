/**
 * Supabase Server Client (Internal Use Only)
 *
 * Este client usa credenciais de servidor e bypassa RLS.
 *
 * ⚠️ IMPORTANTE: Use APENAS em API routes do Next.js (server-side)
 * NUNCA exponha este client no frontend!
 *
 * Quando usar:
 * - API routes que já fazem autorização manual (via JWT claims)
 * - Operações que precisam acesso total ao banco
 *
 * Quando NÃO usar:
 * - Componentes React (use services/supabaseClient.ts)
 * - Queries diretas do frontend
 */

import { createClient } from '@supabase/supabase-js'

// Validar que temos as env vars necessárias
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Client Supabase com credenciais de servidor
 *
 * BYPASSA RLS - use com cuidado!
 */
const serverClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Helper para obter client de servidor (BYPASSA RLS)
 */
export function getServerClient() {
  return serverClient
}

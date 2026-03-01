/**
 * Supabase Client for Browser (SSR-compatible)
 *
 * IMPORTANTE: Este client usa @supabase/ssr para compatibilidade com API routes
 * A sessão é armazenada em cookies HTTP, não em localStorage/sessionStorage
 *
 * PERSISTÊNCIA:
 * - Por padrão, @supabase/ssr cria cookies com Max-Age que persistem
 * - Para controlar "lembrar de mim", usamos localStorage para sinalização
 * - E forçamos logout ao fechar navegador via beforeunload se rememberMe = false
 */

import { createBrowserClient } from '@supabase/ssr'

// Chave no localStorage para sinalizar persistência
const REMEMBER_ME_KEY = 'houston_remember_me'

/**
 * Configura se a sessão deve persistir
 * Chamado pelo authService.ts durante login
 */
export function setSessionPersistence(persist: boolean) {
  if (persist) {
    localStorage.setItem(REMEMBER_ME_KEY, 'true')
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY)
  }
}

/**
 * Verifica se deve persistir sessão
 */
function shouldPersistSession(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
}

// Criar cliente para browser
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Se o navegador está fechando e NÃO deve persistir, fazer logout
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async () => {
    if (!shouldPersistSession()) {
      // Fazer logout silencioso
      await supabase.auth.signOut({ scope: 'local' })
    }
  })
}

export function getSupabaseClient() {
  return supabase
}

// Função para limpar sessão (logout)
export async function clearSupabaseStorage() {
  await supabase.auth.signOut()
  localStorage.removeItem(REMEMBER_ME_KEY)
}

/**
 * JWT Helper - Extract custom claims from Supabase JWT
 *
 * This helper extracts claims added by the custom_access_token_hook
 * on the houston schema. The hook is called automatically during login.
 *
 * Claims included in JWT:
 * - user_role: Highest role of the user (administrador, escalista, etc)
 * - permissions: Array of permission strings
 * - roles: Array of all roles the user has
 * - grupo_ids: Array of group UUIDs (BACKEND SECURITY - critical for multi-tenant isolation)
 *
 * Claims NOT in JWT (filtered in frontend for UX):
 * - hospital_ids: Filtered in frontend as URL params
 * - setor_ids: Filtered in frontend as URL params
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface JWTClaims {
  /** User ID (UUID) */
  sub: string
  /** User email */
  email: string
  /** Highest role (administrador, escalista, etc) */
  user_role: string
  /** Array of permission strings (e.g., ['vagas.select', 'vagas.insert']) */
  permissions: string[]
  /** Array of all roles user has */
  roles: string[]
  /** Array of group UUIDs - CRITICAL for backend security (multi-tenant isolation) */
  grupo_ids: string[]
}

/**
 * Extracts JWT claims from authenticated user
 *
 * SECURITY: Uses anon key + JWT validation by Supabase (no service key needed)
 *
 * @returns JWTClaims or null if not authenticated
 */
export async function getJWTClaims(): Promise<JWTClaims | null> {
  console.log('[JWT Helper] Iniciando getJWTClaims...')
  const cookieStore = await cookies()

  const allCookies = cookieStore.getAll()
  console.log('[JWT Helper] Cookies disponíveis:', allCookies.map(c => c.name).join(', '))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ← Uses anon key (secure)
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore set cookies (cookies already set by middleware)
          }
        }
      }
    }
  )

  // Validate JWT and return user with claims
  console.log('[JWT Helper] Chamando supabase.auth.getUser()...')
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    console.error('[JWT Helper] Auth error:', error?.message || 'No user')
    console.error('[JWT Helper] Error details:', error)
    return null
  }

  console.log('[JWT Helper] User autenticado:', user.id, user.email)

  // Custom claims from custom_access_token_hook are in the raw JWT token
  // We need to decode the access token to get them
  console.log('[JWT Helper] Buscando session...')
  const session = await supabase.auth.getSession()

  if (!session.data.session?.access_token) {
    console.error('[JWT Helper] No access token in session')
    console.error('[JWT Helper] Session data:', session.data)
    return null
  }

  console.log('[JWT Helper] Access token encontrado, decodificando...')

  // Decode JWT (it's a base64 encoded JSON in 3 parts: header.payload.signature)
  const token = session.data.session.access_token
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.error('[JWT Helper] Invalid JWT format')
    return null
  }

  // Decode payload (second part)
  const payload = JSON.parse(atob(parts[1]))
  console.log('[JWT Helper] JWT payload decodificado:', {
    user_role: payload.user_role,
    permissions_length: Array.isArray(payload.permissions) ? payload.permissions.length : 0,
    roles_length: Array.isArray(payload.roles) ? payload.roles.length : 0,
    grupo_ids_length: Array.isArray(payload.grupo_ids) ? payload.grupo_ids.length : 0,
    has_grupo_ids: 'grupo_ids' in payload
  })

  return {
    sub: user.id,
    email: user.email!,
    user_role: payload.user_role || '',
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    grupo_ids: Array.isArray(payload.grupo_ids) ? payload.grupo_ids : []
  }
}

/**
 * Checks if user has a specific permission
 *
 * Administrador role bypasses all permission checks
 *
 * @param claims - JWT claims from getJWTClaims()
 * @param permission - Permission string (e.g., 'vagas.select')
 * @returns true if user has permission or is administrador
 */
export function hasPermission(claims: JWTClaims, permission: string): boolean {
  // Admin bypass
  if (claims.user_role === 'administrador') {
    return true
  }

  return claims.permissions.includes(permission)
}

/**
 * Checks if user has a specific role
 *
 * @param claims - JWT claims from getJWTClaims()
 * @param role - Role name (e.g., 'escalista')
 * @returns true if user has the role
 */
export function hasRole(claims: JWTClaims, role: string): boolean {
  return claims.roles.includes(role) || claims.user_role === role
}

/**
 * Checks if user is administrador
 *
 * @param claims - JWT claims from getJWTClaims()
 * @returns true if user is administrador
 */
export function isAdmin(claims: JWTClaims): boolean {
  return claims.user_role === 'administrador'
}

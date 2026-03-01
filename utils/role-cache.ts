/**
 * Cache para role do usuário - evita múltiplas consultas
 */

import { UserRoleType } from "@/types/user-roles-shared";
import { supabase } from "@/services/supabaseClient";

// Cache simples em memória
let roleCache: {
  role: UserRoleType | null;
  timestamp: number;
  expiresIn: number; // 5 minutos
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtém a role do usuário diretamente do token JWT (mais rápido)
 */
export const getUserRoleFromToken = async (): Promise<UserRoleType | null> => {
  try {
    // 🚀 Pega diretamente do token armazenado localmente
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return null;

    // Decodifica o token JWT para pegar a role
    const tokenPayload = JSON.parse(atob(session.access_token.split(".")[1]));

    // A role pode estar em diferentes lugares do token
    return (
      tokenPayload.user_role ||
      tokenPayload.role ||
      tokenPayload.user_metadata?.role ||
      tokenPayload.app_metadata?.role ||
      null
    );
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return null;
  }
};

/**
 * Obtém a role do usuário com cache otimizado usando token
 */
export const getCachedUserRole = async (): Promise<UserRoleType | null> => {
  // 🚀 Primeiro tenta pegar direto do token (mais rápido)
  const tokenRole = await getUserRoleFromToken();
  if (tokenRole) {
    return tokenRole;
  }

  // Verifica se o cache é válido
  if (roleCache && Date.now() - roleCache.timestamp < CACHE_DURATION) {
    return roleCache.role;
  }

  try {
    // 🚀 Fallback: sessão local
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let userRole: UserRoleType | null = null;

    if (session?.user?.user_metadata?.role) {
      userRole = session.user.user_metadata.role as UserRoleType;
    } else {
      // Último fallback para claims
      const { data } = await supabase.auth.getClaims();
      userRole = (data?.claims["user_role"] as UserRoleType) || null;
    }

    // Atualiza o cache
    roleCache = {
      role: userRole,
      timestamp: Date.now(),
      expiresIn: CACHE_DURATION,
    };

    return userRole;
  } catch (error) {
    console.error("Erro ao obter role do usuário:", error);
    return null;
  }
};

/**
 * Limpa o cache da role (usar após logout ou mudança de role)
 */
export const clearRoleCache = (): void => {
  roleCache = null;
};

/**
 * Verifica rapidamente se pode gerenciar um escalista usando token JWT
 */
export const canManageEscalistaFast = async (
  escalistaRole: UserRoleType
): Promise<boolean> => {
  // 🚀 Primeiro tenta pegar direto do token (mais rápido)
  const userRole = await getUserRoleFromToken();

  if (!userRole) {
    // Fallback para cache
    const cachedRole = await getCachedUserRole();
    if (!cachedRole) return false;
    return checkHierarchy(cachedRole, escalistaRole);
  }

  return checkHierarchy(userRole, escalistaRole);
};

/**
 * Função auxiliar para verificar hierarquia
 */
const checkHierarchy = (
  userRole: UserRoleType,
  escalistaRole: UserRoleType
): boolean => {
  // Hierarquia simples
  const hierarchy = {
    escalista: 0,
    coordenador: 1,
    gestor: 2,
    moderador: 3,
    administrador: 4,
  };

  const userHierarchy = hierarchy[userRole] ?? 0;
  const escalistaHierarchy = hierarchy[escalistaRole] ?? 0;

  return userHierarchy > escalistaHierarchy;
};

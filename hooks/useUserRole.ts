/**
 * Hook para Gestão de Roles de Usuários
 *
 * Hook personalizado que utiliza o userRoleService para buscar e gerenciar
 * roles de usuários da tabela houston.user_roles. Fornece estado reativo
 * e funções para operações CRUD de roles.
 */

import { useState, useEffect, useCallback } from "react";
import {
  UserRoleService,
  UserRole,
  UserRoleType,
} from "@/services/userRoleService";

// Interface para retorno do hook principal
export interface UseUserRoleReturn {
  // Estados principais
  userRole: UserRole | null; // Role atual do usuário
  loading: boolean; // Estado de carregamento
  error: string | null; // Mensagem de erro

  // Funções de operação
  refetch: () => Promise<void>; // Recarregar role do usuário
  updateRole: (newRole: UserRoleType) => Promise<boolean>; // Atualizar role
  clearError: () => void; // Limpar mensagem de erro
}

// Interface para retorno do hook de múltiplas roles
export interface UseUserRolesReturn {
  // Estados principais
  userRoles: UserRole[]; // Array de roles do usuário
  loading: boolean; // Estado de carregamento
  error: string | null; // Mensagem de erro

  // Funções de operação
  refetch: () => Promise<void>; // Recarregar roles do usuário
  clearError: () => void; // Limpar mensagem de erro
}

/**
 * Hook para buscar a role principal de um usuário
 *
 * Busca a role do usuário da tabela houston.user_roles e fornece
 * funções para atualizá-la. Ideal para uso em formulários onde
 * é necessário popular o cargo padrão do usuário.
 *
 * @param userId - ID do usuário (opcional, se não fornecido não faz busca)
 * @param autoFetch - Se deve buscar automaticamente ao montar (default: true)
 * @returns Objeto com role, estado de loading, erro e funções de operação
 *
 * @example
 * ```typescript
 * const { userRole, loading, error, refetch, updateRole } = useUserRole(userId);
 *
 * // Role padrão para popular formulário
 * const defaultRole = userRole?.role || "escalista";
 *
 * // Atualizar role
 * const handleRoleChange = async (newRole) => {
 *   const success = await updateRole(newRole);
 *   if (success) {
 *     console.log("Role atualizada com sucesso!");
 *   }
 * };
 * ```
 */
export function useUserRole(
  userId?: string,
  autoFetch: boolean = true
): UseUserRoleReturn {
  // Estados principais
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Função para buscar a role do usuário
   */
  const fetchUserRole = useCallback(async () => {
    if (!userId) {
      setUserRole(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("result.data ");
      const result = await UserRoleService.getUserRole(userId);

      if (!result.success) {
        setError(result.error || "Erro ao buscar role do usuário");
        setUserRole(null);
        return;
      }
      console.log("result.data ", result.data);
      // Se não encontrou role (usuário novo), definir como null
      setUserRole(result.data || null);
    } catch (err) {
      console.error("Erro inesperado ao buscar role:", err);
      setError("Erro inesperado ao buscar role do usuário");
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Função para atualizar a role do usuário
   */
  const updateRoleHandler = useCallback(
    async (newRole: UserRoleType): Promise<boolean> => {
      if (!userId) {
        setError("ID do usuário é necessário para atualizar role");
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await UserRoleService.updateUserRole(userId, newRole);

        if (!result.success) {
          setError(result.error || "Erro ao atualizar role");
          return false;
        }

        // Atualizar estado local com nova role
        setUserRole(result.data || null);
        return true;
      } catch (err) {
        console.error("Erro inesperado ao atualizar role:", err);
        setError("Erro inesperado ao atualizar role");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Função para limpar mensagem de erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Efeito para buscar role automaticamente quando userId mudar
   */
  useEffect(() => {
    if (autoFetch) {
      fetchUserRole();
    }
  }, [fetchUserRole, autoFetch]);

  return {
    userRole,
    loading,
    error,
    refetch: fetchUserRole,
    updateRole: updateRoleHandler,
    clearError,
  };
}

/**
 * Hook para buscar todas as roles de um usuário
 *
 * Para casos onde um usuário pode ter múltiplas roles.
 * Útil para dashboards administrativos ou relatórios.
 *
 * @param userId - ID do usuário
 * @param autoFetch - Se deve buscar automaticamente ao montar (default: true)
 * @returns Objeto com array de roles, estado de loading, erro e funções
 *
 * @example
 * ```typescript
 * const { userRoles, loading, error, refetch } = useUserRoles(userId);
 *
 * // Verificar se usuário tem role específica
 * const isAdmin = userRoles.some(role => role.role === "administrador");
 * ```
 */
export function useUserRoles(
  userId?: string,
  autoFetch: boolean = true
): UseUserRolesReturn {
  // Estados principais
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Função para buscar todas as roles do usuário
   */
  const fetchUserRoles = useCallback(async () => {
    if (!userId) {
      setUserRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await UserRoleService.getUserRoles(userId);

      if (!result.success) {
        setError(result.error || "Erro ao buscar roles do usuário");
        setUserRoles([]);
        return;
      }

      setUserRoles(result.data || []);
    } catch (err) {
      console.error("Erro inesperado ao buscar roles:", err);
      setError("Erro inesperado ao buscar roles do usuário");
      setUserRoles([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Função para limpar mensagem de erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Efeito para buscar roles automaticamente quando userId mudar
   */
  useEffect(() => {
    if (autoFetch) {
      fetchUserRoles();
    }
  }, [fetchUserRoles, autoFetch]);

  return {
    userRoles,
    loading,
    error,
    refetch: fetchUserRoles,
    clearError,
  };
}

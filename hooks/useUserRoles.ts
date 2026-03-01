/**
 * Hook para Gerenciamento de Roles de Usuários
 *
 * Hook otimizado que retorna todas as informações de roles do usuário
 * diretamente da tabela houston.user_roles, eliminando a necessidade
 * de múltiplas chamadas à API de search.
 *
 * Substitui chamadas como:
 * `/api/users/search?by=assignments&user_id=${userId}`
 *
 * Por uma abordagem mais eficiente usando o service layer diretamente.
 */

import { useState, useEffect, useCallback } from "react";
import { UserRoleService } from "@/services/userRoleService";
import { UserAssignment } from "@/types/user-roles-shared";

interface UseUserRolesReturn {
  /** Array com todas as roles/atribuições do usuário */
  userRoles: UserAssignment[];
  /** Estado de carregamento */
  loading: boolean;
  /** Mensagem de erro, se houver */
  error: string | null;
  /** Função para recarregar as roles */
  refetch: () => Promise<void>;
  /** Verifica se o usuário tem uma role específica */
  hasRole: (role: string) => boolean;
  /** Retorna todas as roles do usuário como array de strings */
  getAllRoles: () => string[];
  /** Retorna todos os grupos associados ao usuário */
  getAllGroups: () => string[];
  /** Retorna todos os hospitais associados ao usuário */
  getAllHospitals: () => string[];
  /** Retorna todos os setores associados ao usuário */
  getAllSetores: () => string[];
}

interface UseUserRolesProps {
  /** ID do usuário para buscar as roles */
  userId?: string;
  /** Se deve carregar automaticamente quando o hook for montado */
  autoLoad?: boolean;
  /** Se deve carregar quando o userId mudar */
  loadOnUserChange?: boolean;
}

/**
 * Hook para gerenciar roles de usuários
 *
 * @param userId - ID do usuário
 * @param autoLoad - Se deve carregar automaticamente (padrão: true)
 * @param loadOnUserChange - Se deve recarregar quando userId mudar (padrão: true)
 */
export const useUserRoles = ({
  userId,
  autoLoad = true,
  loadOnUserChange = true,
}: UseUserRolesProps = {}): UseUserRolesReturn => {
  const [userRoles, setUserRoles] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega as roles do usuário
   */
  const loadUserRoles = useCallback(async () => {
    if (!userId) {
      setUserRoles([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await UserRoleService.getUserRoles(userId);

      if (result.success && result.data) {
        // Transformar os dados para o formato UserAssignment
        const assignments: UserAssignment[] = result.data.map((role) => ({
          role: role.role,
          grupo_ids: role.grupo_ids || [],
          hospital_ids: role.hospital_ids || [],
          setor_ids: role.setor_ids || [],
        }));

        setUserRoles(assignments);
      } else {
        setError(result.error || "Erro ao carregar roles do usuário");
        setUserRoles([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      setUserRoles([]);
      console.error("Erro ao carregar roles do usuário:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Função pública para recarregar as roles
   */
  const refetch = useCallback(async () => {
    await loadUserRoles();
  }, [loadUserRoles]);

  /**
   * Verifica se o usuário tem uma role específica
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return userRoles.some((assignment) => assignment.role === role);
    },
    [userRoles]
  );

  /**
   * Retorna todas as roles do usuário como array de strings
   */
  const getAllRoles = useCallback((): string[] => {
    return userRoles.map((assignment) => assignment.role);
  }, [userRoles]);

  /**
   * Retorna todos os grupos associados ao usuário
   */
  const getAllGroups = useCallback((): string[] => {
    const allGroups: string[] = [];
    userRoles.forEach((assignment) => {
      allGroups.push(...assignment.grupo_ids);
    });
    return [...new Set(allGroups)]; // Remove duplicatas
  }, [userRoles]);

  /**
   * Retorna todos os hospitais associados ao usuário
   */
  const getAllHospitals = useCallback((): string[] => {
    const allHospitals: string[] = [];
    userRoles.forEach((assignment) => {
      allHospitals.push(...assignment.hospital_ids);
    });
    return [...new Set(allHospitals)]; // Remove duplicatas
  }, [userRoles]);

  /**
   * Retorna todos os setores associados ao usuário
   */
  const getAllSetores = useCallback((): string[] => {
    const allSetores: string[] = [];
    userRoles.forEach((assignment) => {
      allSetores.push(...assignment.setor_ids);
    });
    return [...new Set(allSetores)]; // Remove duplicatas
  }, [userRoles]);

  // Efeito para carregar automaticamente
  useEffect(() => {
    if (autoLoad && userId) {
      loadUserRoles();
    }
  }, [autoLoad, userId, loadUserRoles, loadOnUserChange]);

  return {
    userRoles,
    loading,
    error,
    refetch,
    hasRole,
    getAllRoles,
    getAllGroups,
    getAllHospitals,
    getAllSetores,
  };
};

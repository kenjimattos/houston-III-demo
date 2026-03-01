/**
 * Hook para Gestão de Associações de Usuários
 *
 * Hooks personalizados para gerenciar associações de usuários com grupos e hospitais
 * usando os serviços UserGroupService e UserHospitalService.
 */

import { useState, useCallback } from "react";
import { UserGroupService } from "@/services/userGroupService";
import { UserHospitalService } from "@/services/userHospitalService";
import { UserSetorService } from "@/services/userSetorService";

// Interface para operações de associação
export interface UseUserAssociationsReturn {
  loading: boolean;
  error: string | null;
  addToGroup: (
    userId: string,
    role: string,
    groupId: string
  ) => Promise<boolean>;
  removeFromGroup: (
    userId: string,
    role: string,
    groupId: string
  ) => Promise<boolean>;
  addToHospital: (
    userId: string,
    role: string,
    hospitalId: string
  ) => Promise<boolean>;
  removeFromHospital: (
    userId: string,
    role: string,
    hospitalId: string
  ) => Promise<boolean>;
  addToSetor: (
    userId: string,
    role: string,
    setorId: string
  ) => Promise<boolean>;
  removeFromSetor: (
    userId: string,
    role: string,
    setorId: string
  ) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook para gerenciar associações de usuários com grupos e hospitais
 *
 * Fornece funções para adicionar/remover usuários de grupos e hospitais
 * com tratamento de loading e erro unificado.
 *
 * @returns Objeto com funções de associação e estados
 *
 * @example
 * ```typescript
 * const {
 *   loading,
 *   error,
 *   addToGroup,
 *   removeFromGroup,
 *   addToHospital,
 *   removeFromHospital,
 *   clearError
 * } = useUserAssociations();
 *
 * // Adicionar usuário a um grupo
 * const handleAddToGroup = async () => {
 *   const success = await addToGroup(userId, "escalista", groupId);
 *   if (success) {
 *     console.log("Usuário adicionado ao grupo!");
 *   }
 * };
 * ```
 */
export function useUserAssociations(): UseUserAssociationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Adiciona um usuário a um grupo
   */
  const addToGroup = useCallback(
    async (userId: string, role: string, groupId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await UserGroupService.addUserToGroup({
          user_id: userId,
          role,
          grupo_id: groupId,
        });

        if (!result.success) {
          setError(result.error || "Erro ao adicionar usuário ao grupo");
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado";
        setError(errorMessage);
        console.error("Erro ao adicionar usuário ao grupo:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Remove um usuário de um grupo
   */
  const removeFromGroup = useCallback(
    async (userId: string, role: string, groupId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await UserGroupService.removeUserFromGroup(
          userId,
          role,
          groupId
        );

        if (!result.success) {
          setError(result.error || "Erro ao remover usuário do grupo");
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado";
        setError(errorMessage);
        console.error("Erro ao remover usuário do grupo:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Adiciona um usuário a um hospital
   */
  const addToHospital = useCallback(
    async (
      userId: string,
      role: string,
      hospitalId: string
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await UserHospitalService.addUserToHospital({
          user_id: userId,
          role,
          hospital_id: hospitalId,
        });

        if (!result.success) {
          setError(result.error || "Erro ao adicionar usuário ao hospital");
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado";
        setError(errorMessage);
        console.error("Erro ao adicionar usuário ao hospital:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Remove um usuário de um hospital
   */
  const removeFromHospital = useCallback(
    async (
      userId: string,
      role: string,
      hospitalId: string
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await UserHospitalService.removeUserFromHospital(
          userId,
          role,
          hospitalId
        );

        if (!result.success) {
          setError(result.error || "Erro ao remover usuário do hospital");
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado";
        setError(errorMessage);
        console.error("Erro ao remover usuário do hospital:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Adiciona um usuário a um setor
   */
  const addToSetor = useCallback(
    async (userId: string, role: string, setorId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await UserSetorService.addUserToSetor({
          user_id: userId,
          role,
          setor_id: setorId,
        });

        if (!result.success) {
          setError(result.error || "Erro ao adicionar usuário ao setor");
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado";
        setError(errorMessage);
        console.error("Erro ao adicionar usuário ao setor:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Remove um usuário de um setor
   */
  const removeFromSetor = useCallback(
    async (userId: string, role: string, setorId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await UserSetorService.removeUserFromSetor(
          userId,
          role,
          setorId
        );

        if (!result.success) {
          setError(result.error || "Erro ao remover usuário do setor");
          return false;
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado";
        setError(errorMessage);
        console.error("Erro ao remover usuário do setor:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Limpa mensagem de erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    addToGroup,
    removeFromGroup,
    addToHospital,
    removeFromHospital,
    addToSetor,
    removeFromSetor,
    clearError,
  };
}

// Hook específico para grupos
export function useUserGroups() {
  const { loading, error, addToGroup, removeFromGroup, clearError } =
    useUserAssociations();

  return {
    loading,
    error,
    addUserToGroup: addToGroup,
    removeUserFromGroup: removeFromGroup,
    clearError,
  };
}

// Hook específico para hospitais
export function useUserHospitals() {
  const { loading, error, addToHospital, removeFromHospital, clearError } =
    useUserAssociations();

  return {
    loading,
    error,
    addUserToHospital: addToHospital,
    removeUserFromHospital: removeFromHospital,
    clearError,
  };
}

// Hook específico para setores
export function useUserSetors() {
  const { loading, error, addToSetor, removeFromSetor, clearError } =
    useUserAssociations();

  return {
    loading,
    error,
    addUserToSetor: addToSetor,
    removeUserFromSetor: removeFromSetor,
    clearError,
  };
}

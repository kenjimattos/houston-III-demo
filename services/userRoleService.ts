/**
 * Serviço para Gestão de Roles de Usuários
 *
 * Serviço dedicado para operações relacionadas à tabela houston.user_roles,
 * incluindo busca, atualização e gestão de roles de usuários.
 */

import { getSupabaseClient } from "./supabaseClient";

// Tipos para roles válidas
export type UserRoleType =
  | "administrador"
  | "moderador"
  | "gestor"
  | "coordenador"
  | "escalista";

// Interface para dados da tabela houston.user_roles
export interface UserRole {
  user_id: string;
  role: UserRoleType;
  grupo_ids?: string[];
  hospital_ids?: string[];
  setor_ids?: string[];
}

// Interface para resposta de busca
export interface UserRoleResponse {
  success: boolean;
  data?: UserRole;
  error?: string;
}

// Interface para resposta de atualização
export interface UpdateUserRoleResponse {
  success: boolean;
  data?: UserRole;
  error?: string;
}

export class UserRoleService {
  /**
   * Busca a role de um usuário específico na tabela houston.user_roles
   *
   * @param userId - ID do usuário para buscar a role
   * @returns Promise com a role do usuário ou erro
   */
  static async getUserRole(userId: string): Promise<UserRoleResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "ID do usuário é obrigatório",
        };
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .schema("houston")
        .from("user_roles")
        .select("user_id, role, grupo_ids, hospital_ids, setor_ids")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Se não encontrar o usuário, não é necessariamente um erro
        if (error.code === "PGRST116") {
          return {
            success: true,
            data: undefined, // Usuário sem role definida
          };
        }

        console.error("Erro ao buscar role do usuário:", error);
        return {
          success: false,
          error: `Erro ao buscar role: ${error.message}`,
        };
      }

      return {
        success: true,
        data: data as UserRole,
      };
    } catch (error) {
      console.error("Erro inesperado ao buscar role do usuário:", error);
      return {
        success: false,
        error: "Erro inesperado ao buscar role do usuário",
      };
    }
  }

  /**
   * Atualiza a role de um usuário na tabela houston.user_roles
   *
   * @param userId - ID do usuário
   * @param role - Nova role a ser atribuída
   * @returns Promise com resultado da operação
   */
  static async updateUserRole(
    userId: string,
    role: UserRoleType
  ): Promise<UpdateUserRoleResponse> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "ID do usuário é obrigatório",
        };
      }

      if (!role) {
        return {
          success: false,
          error: "Role é obrigatória",
        };
      }

      // Validar se a role é válida
      const validRoles: UserRoleType[] = [
        "administrador",
        "moderador",
        "gestor",
        "coordenador",
        "escalista",
      ];
      if (!validRoles.includes(role)) {
        return {
          success: false,
          error: `Role inválida. Valores aceitos: ${validRoles.join(", ")}`,
        };
      }

      const supabase = getSupabaseClient();

      // Primeiro, verificar se o usuário já tem uma entrada na tabela
      const { data: existingUser } = await supabase
        .schema("houston")
        .from("user_roles")
        .select("user_id, role")
        .eq("user_id", userId)
        .single();

      let data, error;

      if (existingUser) {
        // Atualizar role existente
        const result = await supabase
          .schema("houston")
          .from("user_roles")
          .update({
            role,
          })
          .eq("user_id", userId)
          .select("user_id, role, grupo_ids, hospital_ids, setor_ids")
          .single();

        data = result.data;
        error = result.error;
      } else {
        // Criar nova entrada
        const result = await supabase
          .schema("houston")
          .from("user_roles")
          .insert({
            user_id: userId,
            role,
            grupo_ids: [],
            hospital_ids: [],
            setor_ids: [],
          })
          .select("user_id, role, grupo_ids, hospital_ids, setor_ids")
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error("Erro ao atualizar role do usuário:", error);
        return {
          success: false,
          error: `Erro ao atualizar role: ${error.message}`,
        };
      }

      return {
        success: true,
        data: data as UserRole,
      };
    } catch (error) {
      console.error("Erro inesperado ao atualizar role:", error);
      return {
        success: false,
        error: "Erro inesperado ao atualizar role",
      };
    }
  }

  /**
   * Busca todas as roles de um usuário (para casos onde há múltiplas roles)
   *
   * @param userId - ID do usuário
   * @returns Promise com array de roles do usuário
   */
  static async getUserRoles(userId: string): Promise<{
    success: boolean;
    data?: UserRole[];
    error?: string;
  }> {
    try {
      if (!userId) {
        return {
          success: false,
          error: "ID do usuário é obrigatório",
        };
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .schema("houston")
        .from("user_roles")
        .select("user_id, role, grupo_ids, hospital_ids, setor_ids")
        .eq("user_id", userId);
    

      if (error) {
        console.error("Erro ao buscar roles do usuário:", error);
        return {
          success: false,
          error: `Erro ao buscar roles: ${error.message}`,
        };
      }

      return {
        success: true,
        data: (data || []) as UserRole[],
      };
    } catch (error) {
      console.error("Erro inesperado ao buscar roles do usuário:", error);
      return {
        success: false,
        error: "Erro inesperado ao buscar roles do usuário",
      };
    }
  }

  /**
   * Utilitário para verificar se uma role é válida
   *
   * @param role - Role a ser validada
   * @returns true se a role for válida
   */
  static isValidUserRole(role: string): role is UserRoleType {
    const validRoles: UserRoleType[] = [
      "administrador",
      "moderador",
      "gestor",
      "coordenador",
      "escalista",
    ];
    return validRoles.includes(role as UserRoleType);
  }

  /**
   * Utilitário para obter todas as roles disponíveis
   *
   * @returns Array com todas as roles válidas
   */
  static getAvailableRoles(): UserRoleType[] {
    return ["administrador", "moderador", "gestor", "coordenador", "escalista"];
  }

  /**
   * Utilitário para obter o nome de exibição de uma role
   *
   * @param role - Role para obter o nome
   * @returns Nome de exibição da role
   */
  static getRoleDisplayName(role: UserRoleType): string {
    const roleNames: Record<UserRoleType, string> = {
      administrador: "Administrador",
      moderador: "Moderador",
      gestor: "Gestor",
      coordenador: "Coordenador",
      escalista: "Escalista",
    };

    return roleNames[role] || role;
  }
}

/**
 * Serviço para Busca de Usuários
 *
 * Serviço responsável por todas as operações de busca e consulta de usuários:
 * - Buscar usuários por grupo
 * - Buscar usuários por hospital
 * - Buscar usuários por role
 * - Obter todas as atribuições de um usuário
 *
 * Utiliza métodos estáticos para consistência com os outros serviços.
 */

import { UserAssignment } from "@/types/user-roles-shared";
import { getServerClient } from "@/lib/supabase/serverClient";

// Cliente Supabase admin para operações de usuários
const supabaseAdmin = getServerClient();

// Interfaces
interface UserSearchParams {
  searchBy: "group" | "hospital" | "role" | "assignments";
  groupId?: string;
  hospitalId?: string;
  role?: string;
  userId?: string;
}

interface UserSearchResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface UserWithAssignments {
  id: string;
  email: string;
  name?: string;
  roles?: UserAssignment[];
}

/**
 * Serviço para busca de usuários
 */
export class UserSearchService {
  /**
   * Busca usuários baseado em diferentes critérios
   *
   * @param params Parâmetros de busca
   * @returns Resultado da busca
   */
  static async searchUsers(
    params: UserSearchParams
  ): Promise<UserSearchResult> {
    try {
      const { searchBy, groupId, hospitalId, role, userId } = params;

      switch (searchBy) {
        case "group":
          return await this.getUsersByGroup(groupId!);

        case "hospital":
          return await this.getUsersByHospital(hospitalId!);

        case "role":
          return await this.getUsersByRole(role!);

        case "assignments":
          return await this.getUserAssignments(userId!);

        default:
          return {
            success: false,
            error: `Tipo de busca não suportado: ${searchBy}`,
          };
      }
    } catch (error) {
      console.error("Erro inesperado na busca de usuários:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Busca usuários por grupo
   */
  static async getUsersByGroup(groupId: string): Promise<UserSearchResult> {
    if (!groupId) {
      return { success: false, error: "grupo_id é obrigatório" };
    }

    const { data: userRoles, error } = await supabaseAdmin
      .schema("houston")
      .from("user_roles")
      .select(
        `
        user_id,
        role,
        grupo_ids,
        hospital_ids,
        setor_ids
      `
      )
      .contains("grupo_ids", [groupId]);

    if (error) {
      console.error("Erro ao buscar usuários por grupo:", error);
      return {
        success: false,
        error: `Erro ao buscar usuários: ${error.message}`,
      };
    }

    // Buscar informações dos usuários
    const userIds = userRoles?.map((ur: any) => ur.user_id) || [];
    const users = await this.getUsersInfo(userIds);

    return {
      success: true,
      data: {
        users: users.success ? users.data : [],
        roles: userRoles || [],
      },
    };
  }

  /**
   * Busca usuários por hospital
   */
  static async getUsersByHospital(
    hospitalId: string
  ): Promise<UserSearchResult> {
    if (!hospitalId) {
      return { success: false, error: "hospital_id é obrigatório" };
    }

    const { data: userRoles, error } = await supabaseAdmin
      .schema("houston")
      .from("user_roles")
      .select(
        `
        user_id,
        role,
        grupo_ids,
        hospital_ids,
        setor_ids
      `
      )
      .contains("hospital_ids", [hospitalId]);

    if (error) {
      console.error("Erro ao buscar usuários por hospital:", error);
      return {
        success: false,
        error: `Erro ao buscar usuários: ${error.message}`,
      };
    }

    // Buscar informações dos usuários
    const userIds = userRoles?.map((ur: any) => ur.user_id) || [];
    const users = await this.getUsersInfo(userIds);

    return {
      success: true,
      data: {
        users: users.success ? users.data : [],
        roles: userRoles || [],
      },
    };
  }

  /**
   * Busca usuários por role
   */
  static async getUsersByRole(role: string): Promise<UserSearchResult> {
    if (!role) {
      return { success: false, error: "role é obrigatório" };
    }

    const { data: userRoles, error } = await supabaseAdmin
      .schema("houston")
      .from("user_roles")
      .select(
        `
        user_id,
        role,
        grupo_ids,
        hospital_ids,
        setor_ids
      `
      )
      .eq("role", role);

    if (error) {
      console.error("Erro ao buscar usuários por role:", error);
      return {
        success: false,
        error: `Erro ao buscar usuários: ${error.message}`,
      };
    }

    // Buscar informações dos usuários
    const userIds = userRoles?.map((ur: any) => ur.user_id) || [];
    const users = await this.getUsersInfo(userIds);

    return {
      success: true,
      data: {
        users: users.success ? users.data : [],
        roles: userRoles || [],
      },
    };
  }

  /**
   * Obtém todas as atribuições de um usuário
   */
  static async getUserAssignments(userId: string): Promise<UserSearchResult> {
    if (!userId) {
      return { success: false, error: "user_id é obrigatório" };
    }

    const { data: userRoles, error } = await supabaseAdmin
      .schema("houston")
      .from("user_roles")
      .select(
        `
        user_id,
        role,
        grupo_ids,
        hospital_ids,
        setor_ids
      `
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao buscar atribuições do usuário:", error);
      return {
        success: false,
        error: `Erro ao buscar atribuições: ${error.message}`,
      };
    }

    // Transformar para formato esperado
    const assignments: UserAssignment[] =
      userRoles?.map((role: any) => ({
        role: role.role,
        grupo_ids: role.grupo_ids || [],
        hospital_ids: role.hospital_ids || [],
        setor_ids: role.setor_ids || [],
      })) || [];

    return {
      success: true,
      data: {
        roles: assignments,
      },
    };
  }

  /**
   * Busca informações básicas dos usuários
   */
  private static async getUsersInfo(
    userIds: string[]
  ): Promise<UserSearchResult> {
    if (userIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        id,
        email,
        user_metadata
      `
      )
      .in("id", userIds);

    if (error) {
      console.error("Erro ao buscar informações dos usuários:", error);
      return {
        success: false,
        error: `Erro ao buscar informações dos usuários: ${error.message}`,
      };
    }

    const formattedUsers =
      users?.map((user: any) => ({
        id: user.id,
        email: user.email,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email,
      })) || [];

    return {
      success: true,
      data: formattedUsers,
    };
  }
}

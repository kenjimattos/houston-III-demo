// Cliente admin apenas quando necessário
import { getSupabaseClient } from "./supabaseClient";

const supabaseClient = getSupabaseClient();
export interface AddToGroupPayload {
  user_id: string;
  role: string;
  grupo_id: string;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface Group {
  id: string;
  name: string;
  responsavel?: string;
  telefone?: string;
  email?: string;
  // createDate?: string;
}

class UserGroupService {
  /**
   * Adiciona um usuário a um grupo específico para uma role específica
   */
  static async addUserToGroup(
    payload: AddToGroupPayload
  ): Promise<ServiceResponse> {
    try {
      // Validações obrigatórias
      if (!payload.user_id) {
        return { success: false, error: "user_id é obrigatório" };
      }

      if (!payload.role) {
        return { success: false, error: "role é obrigatório" };
      }

      if (!payload.grupo_id) {
        return { success: false, error: "grupo_id é obrigatório" };
      }

      // Verificar se a role existe para o usuário
      const { data: existingRole } = await supabaseClient
        .schema("houston")
        .from("user_roles")
        .select("*")
        .eq("user_id", payload.user_id)
        .eq("role", payload.role)
        .single();

      if (!existingRole) {
        // Usuário não tem essa role, criar uma nova com o grupo
        const { data, error } = await supabaseClient
          .schema("houston")
          .from("user_roles")
          .insert([
            {
              user_id: payload.user_id,
              role: payload.role,
              grupo_ids: [payload.grupo_id],
              hospital_ids: [],
              setor_ids: [],
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar user role com grupo:", error);
          return {
            success: false,
            error: `Erro ao criar user role: ${error.message}`,
          };
        }

        return {
          success: true,
          message: "Usuário adicionado ao grupo com sucesso",
          data,
        };
      }

      // Usuário já tem a role, verificar se já está no grupo
      const currentGroups = existingRole.grupo_ids || [];
      if (currentGroups.includes(payload.grupo_id)) {
        return {
          success: true,
          message: "Usuário já está no grupo",
          data: existingRole,
        };
      }

      // Adicionar grupo à lista existente
      const updatedGroups = [...currentGroups, payload.grupo_id];
      const { data, error } = await supabaseClient
        .schema("houston")
        .from("user_roles")
        .update({ grupo_ids: updatedGroups })
        .eq("user_id", payload.user_id)
        .eq("role", payload.role)
        .select()
        .single();

      if (error) {
        console.error("Erro ao adicionar usuário ao grupo:", error);
        return {
          success: false,
          error: `Erro ao adicionar usuário ao grupo: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Usuário adicionado ao grupo com sucesso",
        data,
      };
    } catch (error: any) {
      console.error("Erro no serviço addUserToGroup:", error);
      return { success: false, error: "Erro interno do servidor" };
    }
  }

  /**
   * Remove um usuário de um grupo específico para uma role específica
   */
  static async removeUserFromGroup(
    userId: string,
    role: string,
    groupId: string
  ): Promise<ServiceResponse> {
    try {
      if (!userId) {
        return { success: false, error: "user_id é obrigatório" };
      }

      if (!role) {
        return { success: false, error: "role é obrigatório" };
      }

      if (!groupId) {
        return { success: false, error: "grupo_id é obrigatório" };
      }

      // Verificar se a role existe
      const { data: existingRole } = await supabaseClient
        .schema("houston")
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .eq("role", role)
        .single();

      if (!existingRole) {
        return { success: false, error: "User role não encontrada" };
      }

      // Verificar se o usuário está no grupo
      const currentGroups = existingRole.grupo_ids || [];
      if (!currentGroups.includes(groupId)) {
        return {
          success: false,
          error: "Usuário não está no grupo especificado",
        };
      }

      // Remover grupo da lista
      const updatedGroups = currentGroups.filter(
        (id: string) => id !== groupId
      );

      // Se não há mais grupos, hospitais ou setores, remover a role completamente
      if (
        updatedGroups.length === 0 &&
        (existingRole.hospital_ids?.length || 0) === 0 &&
        (existingRole.setor_ids?.length || 0) === 0
      ) {
        const { error } = await supabaseClient
          .schema("houston")
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (error) {
          console.error("Erro ao remover user role:", error);
          return {
            success: false,
            error: `Erro ao remover user role: ${error.message}`,
          };
        }

        return {
          success: true,
          message: "Usuário removido do grupo e role removida",
        };
      }

      // Atualizar com a lista de grupos sem o grupo removido
      const { data, error } = await supabaseClient
        .schema("houston")
        .from("user_roles")
        .update({ grupo_ids: updatedGroups })
        .eq("user_id", userId)
        .eq("role", role)
        .select()
        .single();

      if (error) {
        console.error("Erro ao remover usuário do grupo:", error);
        return {
          success: false,
          error: `Erro ao remover usuário do grupo: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Usuário removido do grupo com sucesso",
        data,
      };
    } catch (error: any) {
      console.error("Erro no serviço removeUserFromGroup:", error);
      return { success: false, error: "Erro interno do servidor" };
    }
  }

  /**
   * Busca grupos com filtros e paginação
   */
  static async getGroups(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResponse> {
    try {
      let query = supabaseClient
        .schema("public")
        .from("grupos")
        .select(
          `
          id,
          nome,
          responsavel,
          telefone,
          email
        `
        )
        .order("nome", { ascending: true });

      // Aplicar filtro de busca se fornecido
      if (params?.search) {
        query = query.or(
          `nome.ilike.%${params.search}%,responsavel.ilike.%${params.search}%`
        );
      }

      // Aplicar paginação se fornecida
      if (params?.limit) {
        const offsetNum = params.offset || 0;
        query = query.range(offsetNum, offsetNum + params.limit - 1);
      }

      const { data: grupos, error, count } = await query;

      if (error) {
        console.error("Erro ao buscar grupos:", error);
        return {
          success: false,
          error: `Erro ao buscar grupos: ${error.message}`,
        };
      }

      // Transformar os dados para o formato esperado
      const gruposFormatted: Group[] =
        grupos?.map((grupo) => ({
          id: grupo.id,
          name: grupo.nome,
          responsavel: grupo.responsavel,
          telefone: grupo.telefone,
          email: grupo.email,
          // createDate: grupo.createdate,
        })) || [];

      return {
        success: true,
        data: gruposFormatted,
        message: `${gruposFormatted.length} grupos encontrados`,
      };
    } catch (error: any) {
      console.error("Erro no serviço getGroups:", error);
      return { success: false, error: "Erro interno do servidor" };
    }
  }
}

// Exportar apenas a classe, sem instância
export { UserGroupService };

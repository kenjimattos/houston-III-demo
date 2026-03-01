/**
 * Serviço para Gestão de Setores
 *
 * Serviço responsável por todas as operações relacionadas a setores:
 * - Buscar setores disponíveis
 * - Adicionar usuários a setores
 * - Remover usuários de setores
 *
 * Utiliza métodos estáticos para melhor performance e consistência
 * com os outros serviços da aplicação.
 */
import { getSupabaseClient } from "./supabaseClient";
const supabaseAdmin = getSupabaseClient();
// Interfaces
interface Setor {
  id: string;
  name: string;
}

interface SetorSearchParams {
  search?: string;
  limit?: number;
  offset?: number;
}

interface SetorSearchResult {
  success: boolean;
  data?: Setor[];
  count?: number;
  error?: string;
}

interface AddUserToSetorData {
  user_id: string;
  role: string;
  setor_id: string;
}

interface SetorOperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Serviço para gerenciar operações de setores
 */
export class UserSetorService {
  /**
   * Busca setores disponíveis
   *
   * @param params Parâmetros de busca e paginação
   * @returns Resultado da busca com setores encontrados
   */
  static async getSetores(
    params: SetorSearchParams = {}
  ): Promise<SetorSearchResult> {
    try {
      const { search, limit, offset } = params;

      let query = supabaseAdmin
        .from("setores")
        .select(
          `
          id,
          nome
        `,
          { count: "exact" }
        )
        .order("nome", { ascending: true });

      // Aplicar filtro de busca se fornecido
      if (search) {
        query = query.ilike("nome", `%${search}%`);
      }

      // Aplicar paginação se fornecida
      if (limit) {
        const offsetNum = offset || 0;
        query = query.range(offsetNum, offsetNum + limit - 1);
      }

      const { data: setores, error, count } = await query;

      if (error) {
        console.error("Erro ao buscar setores:", error);
        return {
          success: false,
          error: `Erro ao buscar setores: ${error.message}`,
        };
      }

      // Transformar os dados para o formato esperado
      const setoresFormatted: Setor[] =
        setores?.map((setor: any) => ({
          id: setor.id,
          name: setor.nome,
        })) || [];

      return {
        success: true,
        data: setoresFormatted,
        count: count || setoresFormatted.length,
      };
    } catch (error) {
      console.error("Erro inesperado ao buscar setores:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Adiciona um usuário a um setor
   *
   * @param data Dados do usuário e setor
   * @returns Resultado da operação
   */
  static async addUserToSetor(
    data: AddUserToSetorData
  ): Promise<SetorOperationResult> {
    try {
      const { user_id, role, setor_id } = data;

      // Validações
      if (!user_id) {
        return { success: false, error: "user_id é obrigatório" };
      }
      if (!role) {
        return { success: false, error: "role é obrigatório" };
      }
      if (!setor_id) {
        return { success: false, error: "setor_id é obrigatório" };
      }

      // Verificar se a role existe para o usuário
      const { data: existingRole } = await supabaseAdmin
        .schema("houston")
        .from("user_roles")
        .select("*")
        .eq("user_id", user_id)
        .eq("role", role)
        .single();

      if (!existingRole) {
        // Usuário não tem essa role, criar uma nova com o setor
        const { data: newRole, error } = await supabaseAdmin
          .schema("houston")
          .from("user_roles")
          .insert([
            {
              user_id,
              role,
              grupo_ids: [],
              hospital_ids: [],
              setor_ids: [setor_id],
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar user role com setor:", error);
          return {
            success: false,
            error: `Erro ao criar user role: ${error.message}`,
          };
        }

        return {
          success: true,
          data: newRole,
        };
      }

      // Usuário já tem a role, verificar se já está no setor
      const currentSetores = existingRole.setor_ids || [];
      if (currentSetores.includes(setor_id)) {
        return {
          success: true,
          data: existingRole,
        };
      }

      // Adicionar setor à lista existente
      const updatedSetores = [...currentSetores, setor_id];
      const { data: updatedRole, error } = await supabaseAdmin
        .schema("houston")
        .from("user_roles")
        .update({ setor_ids: updatedSetores })
        .eq("user_id", user_id)
        .eq("role", role)
        .select()
        .single();

      if (error) {
        console.error("Erro ao adicionar usuário ao setor:", error);
        return {
          success: false,
          error: `Erro ao adicionar usuário ao setor: ${error.message}`,
        };
      }

      return {
        success: true,
        data: updatedRole,
      };
    } catch (error) {
      console.error("Erro inesperado ao adicionar usuário ao setor:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Remove um usuário de um setor
   *
   * @param userId ID do usuário
   * @param role Role do usuário
   * @param setorId ID do setor
   * @returns Resultado da operação
   */
  static async removeUserFromSetor(
    userId: string,
    role: string,
    setorId: string
  ): Promise<SetorOperationResult> {
    try {
      // Validações
      if (!userId) {
        return { success: false, error: "userId é obrigatório" };
      }
      if (!role) {
        return { success: false, error: "role é obrigatório" };
      }
      if (!setorId) {
        return { success: false, error: "setorId é obrigatório" };
      }

      // Verificar se a role existe
      const { data: existingRole } = await supabaseAdmin
        .schema("houston")
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .eq("role", role)
        .single();

      if (!existingRole) {
        return {
          success: false,
          error: "User role não encontrada",
        };
      }

      // Verificar se o usuário está no setor
      const currentSetores = existingRole.setor_ids || [];
      if (!currentSetores.includes(setorId)) {
        return {
          success: false,
          error: "Usuário não está no setor especificado",
        };
      }

      // Remover setor da lista
      const updatedSetores = currentSetores.filter(
        (id: string) => id !== setorId
      );

      // Se não há mais grupos, hospitais ou setores, remover a role completamente
      if (
        (existingRole.grupo_ids?.length || 0) === 0 &&
        (existingRole.hospital_ids?.length || 0) === 0 &&
        updatedSetores.length === 0
      ) {
        const { error } = await supabaseAdmin
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
          data: null, // Role foi completamente removida
        };
      }

      // Atualizar com a lista de setores sem o setor removido
      const { data: updatedRole, error } = await supabaseAdmin
        .schema("houston")
        .from("user_roles")
        .update({ setor_ids: updatedSetores })
        .eq("user_id", userId)
        .eq("role", role)
        .select()
        .single();

      if (error) {
        console.error("Erro ao remover usuário do setor:", error);
        return {
          success: false,
          error: `Erro ao remover usuário do setor: ${error.message}`,
        };
      }

      return {
        success: true,
        data: updatedRole,
      };
    } catch (error) {
      console.error("Erro inesperado ao remover usuário do setor:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }
}

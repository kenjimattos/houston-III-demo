import { getSupabaseClient } from "./supabaseClient";

const supabaseClient = getSupabaseClient();

export interface AddToHospitalPayload {
  user_id: string;
  role: string;
  hospital_id: string;
}

export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface Hospital {
  id: string;
  name: string;
  logradouro?: string;
  numero?: string;
  cidade?: string;
  bairro?: string;
  estado?: string;
  pais?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  enderecoFormatado?: string;
  avatar?: string;
}

class UserHospitalService {
  /**
   * Adiciona um usuário a um hospital específico para uma role específica
   */
  static async addUserToHospital(
    payload: AddToHospitalPayload
  ): Promise<ServiceResponse> {
    try {
      // Validações obrigatórias
      if (!payload.user_id) {
        return { success: false, error: "user_id é obrigatório" };
      }

      if (!payload.role) {
        return { success: false, error: "role é obrigatório" };
      }

      if (!payload.hospital_id) {
        return { success: false, error: "hospital_id é obrigatório" };
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
        // Usuário não tem essa role, criar uma nova com o hospital
        const { data, error } = await supabaseClient
          .schema("houston")
          .from("user_roles")
          .insert([
            {
              user_id: payload.user_id,
              role: payload.role,
              grupo_ids: [],
              hospital_ids: [payload.hospital_id],
              setor_ids: [],
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar user role com hospital:", error);
          return {
            success: false,
            error: `Erro ao criar user role: ${error.message}`,
          };
        }

        return {
          success: true,
          message: "Usuário adicionado ao hospital com sucesso",
          data,
        };
      }

      // Usuário já tem a role, verificar se já está no hospital
      const currentHospitals = existingRole.hospital_ids || [];
      if (currentHospitals.includes(payload.hospital_id)) {
        return {
          success: true,
          message: "Usuário já está no hospital",
          data: existingRole,
        };
      }

      // Adicionar hospital à lista existente
      const updatedHospitals = [...currentHospitals, payload.hospital_id];
      const { data, error } = await supabaseClient
        .schema("houston")
        .from("user_roles")
        .update({ hospital_ids: updatedHospitals })
        .eq("user_id", payload.user_id)
        .eq("role", payload.role)
        .select()
        .single();

      if (error) {
        console.error("Erro ao adicionar usuário ao hospital:", error);
        return {
          success: false,
          error: `Erro ao adicionar usuário ao hospital: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Usuário adicionado ao hospital com sucesso",
        data,
      };
    } catch (error: any) {
      console.error("Erro no serviço addUserToHospital:", error);
      return { success: false, error: "Erro interno do servidor" };
    }
  }

  /**
   * Remove um usuário de um hospital específico para uma role específica
   */
  static async removeUserFromHospital(
    userId: string,
    role: string,
    hospitalId: string
  ): Promise<ServiceResponse> {
    try {
      if (!userId) {
        return { success: false, error: "user_id é obrigatório" };
      }

      if (!role) {
        return { success: false, error: "role é obrigatório" };
      }

      if (!hospitalId) {
        return { success: false, error: "hospital_id é obrigatório" };
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

      // Verificar se o usuário está no hospital
      const currentHospitals = existingRole.hospital_ids || [];
      if (!currentHospitals.includes(hospitalId)) {
        return {
          success: false,
          error: "Usuário não está no hospital especificado",
        };
      }

      // Remover hospital da lista
      const updatedHospitals = currentHospitals.filter(
        (id: string) => id !== hospitalId
      );

      // Se não há mais grupos, hospitais ou setores, remover a role completamente
      if (
        (existingRole.grupo_ids?.length || 0) === 0 &&
        updatedHospitals.length === 0 &&
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
          message: "Usuário removido do hospital e role removida",
        };
      }

      // Atualizar com a lista de hospitais sem o hospital removido
      const { data, error } = await supabaseClient
        .schema("houston")
        .from("user_roles")
        .update({ hospital_ids: updatedHospitals })
        .eq("user_id", userId)
        .eq("role", role)
        .select()
        .single();

      if (error) {
        console.error("Erro ao remover usuário do hospital:", error);
        return {
          success: false,
          error: `Erro ao remover usuário do hospital: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Usuário removido do hospital com sucesso",
        data,
      };
    } catch (error: any) {
      console.error("Erro no serviço removeUserFromHospital:", error);
      return { success: false, error: "Erro interno do servidor" };
    }
  }

  /**
   * Busca hospitais com filtros e paginação
   */
  static async getHospitals(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResponse> {
    try {
      let query = supabaseClient
        .from("hospitais")
        .select(
          `
          id,
          nome,
          logradouro,
          numero,
          cidade,
          bairro,
          estado,
          pais,
          cep,
          latitude,
          longitude,
          endereco_formatado,
          avatar
        `
        )
        .order("nome", { ascending: true });

      // Aplicar filtro de busca se fornecido
      if (params?.search) {
        query = query.or(
          `nome.ilike.%${params.search}%,cidade.ilike.%${params.search}%,bairro.ilike.%${params.search}%`
        );
      }

      // Aplicar paginação se fornecida
      if (params?.limit) {
        const offsetNum = params.offset || 0;
        query = query.range(offsetNum, offsetNum + params.limit - 1);
      }

      const { data: hospitais, error, count } = await query;

      if (error) {
        console.error("Erro ao buscar hospitais:", error);
        return {
          success: false,
          error: `Erro ao buscar hospitais: ${error.message}`,
        };
      }

      // Transformar os dados para o formato esperado
      const hospitaisFormatted: Hospital[] =
        hospitais?.map((hospital) => ({
          id: hospital.id,
          name: hospital.nome,
          logradouro: hospital.logradouro,
          numero: hospital.numero,
          cidade: hospital.cidade,
          bairro: hospital.bairro,
          estado: hospital.estado,
          pais: hospital.pais,
          cep: hospital.cep,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
          enderecoFormatado: hospital.endereco_formatado,
          avatar: hospital.avatar,
        })) || [];

      return {
        success: true,
        data: hospitaisFormatted,
        message: `${hospitaisFormatted.length} hospitais encontrados`,
      };
    } catch (error: any) {
      console.error("Erro no serviço getHospitals:", error);
      return { success: false, error: "Erro interno do servidor" };
    }
  }
}

// Exportar apenas a classe, sem instância
export { UserHospitalService };

import { supabase } from "./supabaseClient";
import {
  InviteUserData,
  InviteUserPayload,
  InviteUserResponse,
  InviteErrorResponse,
} from "@/types/invite";

// Função para convidar usuário via API route que usa auth.admin.inviteUserByEmail
export async function inviteUser(
  userData: InviteUserData,
  redirectTo?: string
): Promise<{ data: InviteUserResponse | null; error: string | null }> {
  try {
    const payload: InviteUserPayload = {
      userData: userData,
      redirectTo: `${window.location.origin}/auth/create-password`,
    };

    const response = await fetch("/api/auth/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result: InviteUserResponse | InviteErrorResponse =
      await response.json();

    if (!response.ok) {
      throw new Error(
        (result as InviteErrorResponse).error || "Erro ao enviar convite"
      );
    }

    return { data: result as InviteUserResponse, error: null };
  } catch (error: any) {
    console.error("Erro ao convidar usuário:", error);
    return { data: null, error: error.message };
  }
}

// Função para verificar token de convite
export async function verifyInviteToken(
  token: string,
  tokenHash?: string,
  type: string = "invite"
) {
  try {
    let verifyParams: any;

    if (tokenHash) {
      // Formato moderno com token_hash
      verifyParams = {
        token_hash: tokenHash,
        type: type as any,
      };
    } else {
      // Formato legacy com token simples
      verifyParams = {
        token: token,
        type: type as any,
      };
    }

    const { data, error } = await supabase.auth.verifyOtp(verifyParams);

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Erro ao verificar token:", error);
    return { data: null, error: error.message };
  }
}

// Função para definir senha do usuário autenticado
export async function setUserPassword(password: string) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Erro ao definir senha:", error);
    return { data: null, error: error.message };
  }
}

// Função para adicionar usuário a um grupo
export async function addUserToGroup(
  userId: string,
  groupId: string,
  role?: string
) {
  try {
    // Primeiro, verificar se o usuário já está no grupo
    const { data: existingRole, error: checkError } = await supabase
      .schema("houston")
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .contains("grupo_ids", [groupId])
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows found
      throw checkError;
    }

    if (existingRole) {
      return {
        data: existingRole,
        error: null,
        message: "Usuário já está neste grupo",
      };
    }

    // Buscar os grupos atuais do usuário
    const { data: currentUserRole, error: getCurrentError } = await supabase
      .schema("houston")
      .from("user_roles")
      .select("grupo_ids")
      .eq("user_id", userId)
      .single();

    let updatedGroupIds: string[] = [];

    if (getCurrentError && getCurrentError.code === "PGRST116") {
      // Usuário não tem roles ainda, criar novo registro
      updatedGroupIds = [groupId];

      const { data, error } = await supabase
        .schema("houston")
        .from("user_roles")
        .insert({
          user_id: userId,
          grupo_ids: updatedGroupIds,
          hospital_ids: [],
          setor_ids: [],
          role: role || "member",
        })
        .select()
        .single();

      if (error) throw error;
      return {
        data,
        error: null,
        message: "Usuário adicionado ao grupo com sucesso",
      };
    } else if (getCurrentError) {
      throw getCurrentError;
    } else {
      // Usuário já tem roles, atualizar array
      updatedGroupIds = [...(currentUserRole.grupo_ids || []), groupId];

      const { data, error } = await supabase
        .schema("houston")
        .from("user_roles")
        .update({
          grupo_ids: updatedGroupIds,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return {
        data,
        error: null,
        message: "Usuário adicionado ao grupo com sucesso",
      };
    }
  } catch (error: any) {
    console.error("Erro ao adicionar usuário ao grupo:", error);
    return { data: null, error: error.message };
  }
}

// Função para remover usuário de um grupo
export async function removeUserFromGroup(userId: string, groupId: string) {
  try {
    // Buscar os grupos atuais do usuário
    const { data: currentUserRole, error: getCurrentError } = await supabase
      .schema("houston")
      .from("user_roles")
      .select("grupo_ids")
      .eq("user_id", userId)
      .single();

    if (getCurrentError) {
      throw getCurrentError;
    }

    if (
      !currentUserRole.grupo_ids ||
      !currentUserRole.grupo_ids.includes(groupId)
    ) {
      return {
        data: null,
        error: null,
        message: "Usuário não está neste grupo",
      };
    }

    // Remover o grupo do array
    const updatedGroupIds = currentUserRole.grupo_ids.filter(
      (id: string) => id !== groupId
    );

    if (updatedGroupIds.length === 0) {
      // Se não há mais grupos, deletar o registro
      const { error } = await supabase
        .schema("houston")
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      return {
        data: null,
        error: null,
        message: "Usuário removido do grupo e registro deletado",
      };
    } else {
      // Atualizar com os grupos restantes
      const { data, error } = await supabase
        .schema("houston")
        .from("user_roles")
        .update({
          grupo_ids: updatedGroupIds,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return {
        data,
        error: null,
        message: "Usuário removido do grupo com sucesso",
      };
    }
  } catch (error: any) {
    console.error("Erro ao remover usuário do grupo:", error);
    return { data: null, error: error.message };
  }
}

// Função para listar usuários de um grupo
export async function getUsersByGroup(groupId: string) {
  try {
    const { data, error } = await supabase
      .schema("houston")
      .from("user_roles")
      .select(
        `
        user_id,
        role,
        profiles:user_id (
          id,
          name,
          email
        )
      `
      )
      .contains("grupo_ids", [groupId]);

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Erro ao buscar usuários do grupo:", error);
    return { data: null, error: error.message };
  }
}

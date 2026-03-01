import { getSupabaseClient } from "@/services/supabaseClient";
import { UserRole, UserRoleService } from "./userRoleService";
import { getCurrentUser } from "./authService";

export interface Escalista {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  grupo_id?: string | null;
  escalista_createdate: string; // timestamp
  escalista_updateat: string; // timestamp
  escalista_updateby?: string | null; // uuid
  escalista_status: "pendente" | "ativo" | "inativo";
  role?: UserRole["role"];
}

// Interface estendida para escalista com informações do grupo
export interface EscalistaComGrupo extends Escalista {
  grupo?: {
    id: string;
    nome: string;
    responsavel?: string;
    telefone?: string;
    email?: string;
  } | null;
}

// Interface para criar novo escalista (sem campos auto-gerados)
export interface EscalistaCreate {
  id?: string; // opcional pois tem default
  nome: string;
  escalista_telefone: string;
  email?: string | null;
  grupo_id?: string | null;
  escalista_status?: "pendente" | "ativo" | "inativo"; // opcional pois tem default 'pendente'
}

// Interface para atualizar escalista (todos os campos opcionais exceto timestamps que são auto-gerenciados)
export interface EscalistaUpdate {
  nome?: string;
  escalista_telefone?: string;
  email?: string;
  grupo_id?: string | null;
  escalista_status?: "pendente" | "ativo" | "inativo";
}

export interface Grupo {
  id: string;
  nome: string;
  responsavel?: string;
  telefone?: string;
  email?: string;
  escalistas: Escalista[];
}

export interface GrupoCreate {
  nome: string;
  responsavel?: string;
  telefone?: string;
  email?: string;
}

export async function fetchEscalistas(): Promise<EscalistaComGrupo[]> {
  const supabase = getSupabaseClient();

  const { data: escalistasData, error: escalistasError } = await supabase
    .from("escalistas")
    .select(
      `
      *,
      grupo:grupo_id(
        id,
        nome,
        responsavel,
        telefone,
        email
      )
    `
    );
  // .order("escalista_nome", { ascending: true });

  if (escalistasError) {
    console.error("Erro ao buscar escalistas:", escalistasError);
    return [];
  }

  return escalistasData || [];
}

// Função para manter compatibilidade - converte escalistas em grupos com escalistas
export async function fetchGruposComEscalistas(): Promise<Grupo[]> {
  const escalistas = await fetchEscalistas();

  // Buscar todos os grupos
  const supabase = getSupabaseClient();
  const { data: gruposData, error: gruposError } = await supabase
    .from("grupos")
    .select("*")
    .order("nome", { ascending: true });

  if (gruposError) return [];

  console.log("Grupos encontrados:", gruposData);

  const fetchingUserRoles = await Promise.all(
    escalistas.map(async (escalista) => {
      const userRoleResponse = await UserRoleService.getUserRole(escalista.id);
      if (userRoleResponse.success && userRoleResponse.data) {
        return {
          escalista,
          role: userRoleResponse.data,
        };
      }
    })
  );

  console.log("Roles dos escalistas:", fetchingUserRoles);

  const gruposComEscalistas: Grupo[] = (gruposData || []).map((grupo: any) => ({
    id: grupo.id,
    nome: grupo.nome,
    responsavel: grupo.responsavel,
    telefone: grupo.telefone,
    email: grupo.email,
    escalistas: fetchingUserRoles
      .filter((e) => e?.escalista.grupo_id === grupo.id)
      .map((e) => {
        const currentEscalista = e?.escalista;
        console.log("Processando escalista:", currentEscalista);
        return {
          role: e?.role.role ?? "escalista",
          id: currentEscalista!.id ?? "",
          nome: currentEscalista!.nome ?? "",
          telefone: currentEscalista!.telefone ?? "",
          email: currentEscalista!.email ?? "",
          grupo_id: currentEscalista!.grupo_id ?? "",
          grupo: currentEscalista!.grupo ?? "",
          escalista_createdate: currentEscalista!.escalista_createdate ?? "",
          escalista_updateat: currentEscalista!.escalista_updateat ?? "",
          escalista_updateby: currentEscalista!.escalista_updateby ?? "",
          escalista_status: currentEscalista!.escalista_status ?? "",
        };
      }),
  }));
  console.log("Grupos com escalistas:", gruposComEscalistas);

  return gruposComEscalistas;
}

// Adicionar novo grupo
export async function addGrupo(grupo: Omit<Grupo, "id" | "escalistas">) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("grupos")
    .insert([{ ...grupo }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Excluir grupo por ID
export async function deleteGrupo(grupo_id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("grupos").delete().eq("id", grupo_id);
  if (error) throw error;
}

// Adicionar novo escalista
export async function addEscalista(escalista: EscalistaCreate) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalistas")
    .insert([{ ...escalista }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Excluir escalista por ID
export async function deleteEscalista(escalista_id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("escalistas")
    .delete()
    .eq("id", escalista_id);
  if (error) throw error;
}

// Atualizar grupo
export async function updateGrupo(
  grupo_id: string,
  grupo: Partial<Omit<Grupo, "grupo_id" | "escalistas">>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("grupos")
    .update({ ...grupo })
    .eq("id", grupo_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Atualizar escalista
export async function updateEscalista(
  escalista_id: string,
  escalista: EscalistaUpdate
) {
  const currentUser = await getCurrentUser();
  console.log("Atualizando escalista:", { escalista_id, escalista });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalistas")
    .update({ ...escalista, update_by: currentUser.id })
    .eq("id", escalista_id)
    .select()
    .single();

  console.log("Resultado da atualização:", { data, error });
  if (error) throw error;
  return data;
}

// Buscar escalistas por status
export async function fetchEscalistasByStatus(
  status: "pendente" | "ativo" | "inativo"
): Promise<Escalista[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalista")
    .select("*")
    .eq("escalista_status", status)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Buscar escalista por auth_id
export async function fetchEscalistaByAuthId(
  escalista_auth_id: string
): Promise<Escalista | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalistas")
    .select("*")
    .eq("id", escalista_auth_id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    throw error;
  }
  return data;
}

// Atualizar status do escalista
export async function updateEscalistaStatus(
  escalista_id: string,
  status: "pendente" | "ativo" | "inativo"
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalistas")
    .update({ escalista_status: status })
    .eq("id", escalista_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Buscar escalistas por grupo
export async function fetchEscalistasByGrupo(
  grupo_id: string
): Promise<Escalista[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalistas")
    .select("*")
    .eq("grupo_id", grupo_id);

  if (error) throw error;
  return data || [];
}

// Buscar escalista por ID
export async function fetchEscalistaById(
  escalista_id: string
): Promise<EscalistaComGrupo | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("escalistas")
    .select(
      `
      *,
      grupos:id (
        id,
        nome,
        responsavel,
        telefone,
        email
      )
    `
    )
    .eq("id", escalista_id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    throw error;
  }
  return data;
}

// Contar escalistas por status
export async function countEscalistasByStatus(): Promise<{
  pendente: number;
  ativo: number;
  inativo: number;
  total: number;
}> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("escalistas")
    .select("escalista_status");

  if (error) throw error;

  const counts = {
    pendente: 0,
    ativo: 0,
    inativo: 0,
    total: data?.length || 0,
  };

  data?.forEach((escalista: any) => {
    if (escalista.escalista_status in counts) {
      counts[escalista.escalista_status as keyof typeof counts]++;
    }
  });

  return counts;
}

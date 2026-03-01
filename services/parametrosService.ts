import formatName from "@/lib/formatters/name-formatter";
import { getSupabaseClient } from "@/services/supabaseClient";

export interface Especialidade {
  id: string;
  nome: string;
}

export type ShiftType = {
  id: string;
  name: string;
};
export async function fetchSetores() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("setores")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchEspecialidades() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("especialidades")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchFormasRecebimento() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("formas_recebimento")
    .select("*")
    .order("forma_recebimento", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchTiposVaga() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tipos_vaga")
    .select("*")
    .order("nome", { ascending: true });

  const finalData = data?.map<ShiftType>((item) => {
    return {
      id: item.id,
      name: formatName(item.nome),
    };
  });
  console.log("Fetched tiposVaga:", data, error);
  if (error) throw error;
  return finalData ?? [];
}

export async function fetchBeneficios() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("beneficios")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchPeriodos() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("periodos")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchRequisitos() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("requisitos")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data;
}

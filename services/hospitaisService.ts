import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/services/supabaseClient";
import { BadgeCheck } from "lucide-react";

export interface CleanHospitalTerm {
  id: number;
  terms: string;
}

export interface Hospital {
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  cep: string;
  latitude?: number;
  longitude?: number;
  endereco_formatado?: string;
  avatar?: string;
}

export async function fetchHospitais(): Promise<Hospital[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("hospitais")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return data as Hospital[];
}

export async function fetchHospitalById(id: string): Promise<Hospital> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("hospitais")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Hospital;
}

export async function createHospital(
  data: Partial<Hospital>
): Promise<Hospital> {
  const supabase = getSupabaseClient();
  const { data: created, error } = await supabase
    .from("hospitais")
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return created as Hospital;
}

export async function updateHospital(
  id: string,
  data: Partial<Hospital>
): Promise<Hospital> {
  const supabase = getSupabaseClient();
  const {
    data: updated,
    error,
    count,
  } = await supabase
    .from("hospitais")
    .update({ ...data })
    .eq("id", id)
    .select();
  console.log("Hospital updated:", updated, error);
  if (error) throw error;
  if (count === 0) throw new Error("Hospital not found");
  toast({
    title: "Hospital atualizado!",
    description: "As informações do hospital foram atualizadas com sucesso.",
    icon: BadgeCheck,
  });
  return updated[0] as Hospital;
}

export async function deleteHospital(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("hospitais").delete().eq("id", id);
  if (error) throw error;
}

// Função para upload do avatar do hospital para o Supabase Storage
export async function uploadHospitalAvatar(
  blob: Blob,
  hospital_id: string
): Promise<string> {
  const supabase = getSupabaseClient();
  // Detecta o tipo do arquivo
  const isPng = blob.type === "image/png";
  const ext = isPng ? "png" : "jpg";
  const contentType = isPng ? "image/png" : "image/jpeg";
  const filePath = `${hospital_id}.${ext}`;
  // Faz upload sobrescrevendo o arquivo antigo
  const { error } = await supabase.storage
    .from("avatarhospitais")
    .upload(filePath, blob, {
      upsert: true,
      contentType,
    });
  if (error) throw error;

  // Obter URL pública (bucket agora é público)
  const { data } = supabase.storage
    .from("avatarhospitais")
    .getPublicUrl(filePath);
  // Adiciona cache busting para garantir atualização imediata
  return `${data.publicUrl}?t=${Date.now()}`;
}

// Função para gerar URL pública com cache busting
export function getHospitalAvatarUrl(hospital_avatar: string): string {
  // Se já é uma URL completa, adicionar cache busting
  if (hospital_avatar.startsWith("http")) {
    // Remove cache busting antigo se existir
    const urlWithoutQuery = hospital_avatar.split("?")[0];
    return `${urlWithoutQuery}?t=${Date.now()}`;
  }

  // Se é apenas um path, gerar URL pública com cache busting
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from("avatarhospitais")
    .getPublicUrl(hospital_avatar);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// (Opcional) Função para remover avatares antigos se houver múltiplos arquivos
export async function deleteOldHospitalAvatars(hospital_id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from("avatarhospitais")
    .list("");
  if (error) throw error;
  // Mantém apenas o arquivo atual (hospital_id.jpg)
  const filesToDelete = data
    .filter(
      (file) =>
        file.name.startsWith(hospital_id) && file.name !== `${hospital_id}.jpg`
    )
    .map((file) => file.name);
  if (filesToDelete.length > 0) {
    await supabase.storage.from("avatarhospitais").remove(filesToDelete);
  }
}

// Função para buscar termos de limpeza de nome de hospital
export async function fetchCleanHospitalTerms(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("clean_hospital")
    .select("terms")
    .order("id", { ascending: true });

  if (error) throw error;
  return data.map((item) => item.terms);
}

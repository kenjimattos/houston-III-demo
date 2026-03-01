import { getSupabaseClient } from "@/services/supabaseClient";
import { getCurrentEscalistaData } from "@/services/authService";

export interface Medico {
  id: string;
  primeiro_nome: string;
  sobrenome: string;
  crm: string;
  email: string;
  telefone: string;
  data_nascimento?: string;
  especialidade_id?: string;
  rqe?: string;
  cpf?: string;
  rg?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  cep?: string;
  created_at?: string;
  updated_at?: string;
  profile_picture_url?: string;
  especialidade_nome?: string;
  grupo_id?: string;
  is_precadastro?: boolean; // Para identificar se veio da tabela de pré-cadastro
}

export interface MedicoPreCadastro {
  id: string;
  primeiro_nome: string;
  sobrenome: string;
  crm: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  especialidade_id?: string;
  created_by: string;
  created_at: string;
  especialidade_nome?: string;
}

export interface DocumentoMedico {
  nome: string;
  url: string;
  tipo: string;
  uploadedAt: string;
  path: string; // caminho completo no storage
}
const supabase = getSupabaseClient();
// Função para normalizar nomes de pastas (remover acentos e substituir espaços por underscores)
function normalizarNomePasta(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\s+/g, "_") // Substitui espaços por underscores
    .toLowerCase();
}

// Busca todos os médicos
export async function fetchMedicos(): Promise<Medico[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("medicos")
    .select(
      `
      *,
      especialidades!especialidade_id(nome)
    `
    )
    .order("primeiro_nome", { ascending: true });

  console.log("show me doctor details ", data);

  if (error) throw error;

  // Transformar dados para incluir especialidade_nome diretamente no objeto
  return (data || []).map((medico: any) => ({
    ...medico,
    especialidade_nome: medico.especialidades?.nome || null,
  })) as Medico[];
}

// Busca médicos apenas com campos essenciais para listagem rápida
export async function fetchMedicosEssenciais(): Promise<Medico[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("medicos")
    .select(
      `
      id,
      primeiro_nome,
      sobrenome,
      crm,
      email,
      telefone,
      especialidade_id,
      especialidades!especialidade_id(nome)
    `
    )
    .order("primeiro_nome", { ascending: true });

  if (error) throw error;

  // Transformar dados para incluir especialidade_nome diretamente no objeto
  return (data || []).map((medico: any) => ({
    id: medico.id,
    primeiro_nome: medico.primeiro_nome,
    sobrenome: medico.sobrenome,
    crm: medico.crm,
    email: medico.email,
    telefone: medico.telefone,
    especialidade_id: medico.especialidade_id,
    especialidade_nome: medico.especialidades?.nome || null,
  })) as Medico[];
}

// Busca a foto de perfil do médico no bucket profilepictures
export async function getMedicoProfilePicture(
  medico_id: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  // Lista arquivos na pasta do médico
  const { data, error } = await supabase.storage
    .from("profilepictures")
    .list(`${medico_id}/`);
  if (error || !data || data.length === 0) return null;
  // Seleciona o arquivo mais recente
  const sorted = data
    .filter((item) => item.name)
    .sort((a, b) =>
      b.updated_at && a.updated_at
        ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        : 0
    );
  const file = sorted[0];
  if (!file) return null;
  const { data: urlData } = supabase.storage
    .from("profilepictures")
    .getPublicUrl(`${medico_id}/${file.name}`);
  return urlData?.publicUrl || null;
}

// Busca fotos de perfil de múltiplos médicos de forma otimizada

// Lista todas as versões de um tipo de documento do médico (ou todos se tipo = undefined)
export async function fetchMedicoDocumentos(
  medico_id: string,
  tipo?: string
): Promise<DocumentoMedico[]> {
  const supabase = getSupabaseClient();
  let prefix = `${medico_id}/`;
  if (tipo) prefix += `${tipo}/`;
  const { data, error } = await supabase.storage
    .from("carteira-digital")
    .list(prefix);
  if (error) throw error;
  if (!data) return [];
  // Ordenar por data decrescente (mais recente primeiro)
  return data
    .filter((item) => item.name)
    .map((item) => {
      const path = `${prefix}${item.name}`;
      return {
        nome: item.name,
        url: supabase.storage.from("carteira-digital").getPublicUrl(path).data
          .publicUrl,
        tipo: tipo || item.name.split("_")[0],
        uploadedAt: item.updated_at || "",
        path,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
}

// Lista todos os documentos da pasta "outros" do médico, organizados por subpastas
export async function fetchMedicoDocumentosOutros(
  medico_id: string
): Promise<DocumentoMedico[]> {
  const supabase = getSupabaseClient();
  const prefix = `${medico_id}/outros/`;
  const { data, error } = await supabase.storage
    .from("carteira-digital")
    .list(prefix);
  if (error) throw error;
  if (!data) return [];

  // Buscar pastas dentro de "outros" (pastas não têm 'name', apenas 'id')
  const folders = data.filter((item) => !item.name && item.id);
  const allDocuments: DocumentoMedico[] = [];

  // Para cada subpasta, buscar os documentos dentro dela
  for (const folder of folders) {
    const subpastaName = folder.id;
    const { data: folderData, error: folderError } = await supabase.storage
      .from("carteira-digital")
      .list(`${prefix}${subpastaName}/`);

    if (folderError) continue;
    if (!folderData) continue;

    const folderDocuments = folderData
      .filter((item) => item.name)
      .map((item) => {
        const path = `${prefix}${subpastaName}/${item.name}`;
        return {
          nome: item.name,
          url: supabase.storage.from("carteira-digital").getPublicUrl(path).data
            .publicUrl,
          tipo: subpastaName, // O tipo é o nome da subpasta (normalizado)
          uploadedAt: item.updated_at || "",
          path,
        };
      });

    allDocuments.push(...folderDocuments);
  }

  // Ordenar por data decrescente (mais recente primeiro)
  return allDocuments.sort(
    (a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

// Lista todas as versões de um documento específico da pasta "outros"
export async function fetchMedicoDocumentosOutrosSubpasta(
  medico_id: string,
  subpasta: string
): Promise<DocumentoMedico[]> {
  const supabase = getSupabaseClient();
  const prefix = `${medico_id}/outros/${subpasta}/`;
  const { data, error } = await supabase.storage
    .from("carteira-digital")
    .list(prefix);
  if (error) throw error;
  if (!data) return [];
  // Ordenar por data decrescente (mais recente primeiro)
  return data
    .filter((item) => item.name)
    .map((item) => {
      const path = `${prefix}${item.name}`;
      return {
        nome: item.name,
        url: supabase.storage.from("carteira-digital").getPublicUrl(path).data
          .publicUrl,
        tipo: subpasta,
        uploadedAt: item.updated_at || "",
        path,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
}

// Upload de documento do médico para o bucket carteira-digital
// tipo: tipo do documento (ex: cnh, rg, etc)
// nomeCustomizado: se tipo for 'outros', o nome personalizado do documento (que vira subpasta)
export async function uploadMedicoDocumento(
  medico_id: string,
  tipo: string,
  file: File,
  nomeCustomizado?: string
): Promise<DocumentoMedico> {
  const supabase = getSupabaseClient();
  const ext = file.name.split(".").pop() || "pdf";
  const now = new Date();
  const dataStr = `${String(now.getDate()).padStart(2, "0")}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${now.getFullYear()}-${String(now.getHours()).padStart(
    2,
    "0"
  )}-${String(now.getMinutes()).padStart(2, "0")}-${String(
    now.getSeconds()
  ).padStart(2, "0")}`;

  let folder = tipo;
  let nomeDoc = tipo;

  if (tipo === "outros") {
    if (!nomeCustomizado)
      throw new Error(
        'Nome customizado é obrigatório para documentos "outros"'
      );
    const subpastaNormalizada = normalizarNomePasta(nomeCustomizado);
    folder = `outros/${subpastaNormalizada}`; // Criar subpasta dentro de "outros"
    nomeDoc = subpastaNormalizada;
  }

  const fileName = `${nomeDoc}_${dataStr}.${ext}`;
  const filePath = `${medico_id}/${folder}/${fileName}`;
  const { error } = await supabase.storage
    .from("carteira-digital")
    .upload(filePath, file, { upsert: false });
  if (error) throw error;
  const url = supabase.storage.from("carteira-digital").getPublicUrl(filePath)
    .data.publicUrl;
  return {
    nome: fileName,
    url,
    tipo: tipo === "outros" ? normalizarNomePasta(nomeCustomizado!) : tipo,
    uploadedAt: now.toISOString(),
    path: filePath,
  };
}

// Deleta um documento específico pelo path
export async function deleteMedicoDocumento(path: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from("carteira-digital")
    .remove([path]);
  if (error) throw error;
}

// Interface para médicos favoritos
export interface MedicoFavorito {
  id: string;
  escalista_id: string;
  medico_id: string;
  grupo_id?: string;
  created_at: string;
}

// NOTA: getCurrentEscalistaData() foi movida para @/services/authService
// para centralizar todas as queries de dados do usuário atual.
// Import: import { getCurrentEscalistaData } from "@/services/authService"

// Busca o escalista_id do usuário logado (manter compatibilidade)
async function getCurrentEscalistaId(): Promise<string> {
  const { escalista_id } = await getCurrentEscalistaData();
  return escalista_id;
}

// Adiciona um médico aos favoritos
export async function addMedicoFavorito(medico_id: string): Promise<void> {
  const { escalista_id, grupo_id } = await getCurrentEscalistaData();
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("medicos_favoritos").insert([
    {
      escalista_id,
      medico_id,
      grupo_id,
    },
  ]);

  if (error) {
    // Se for erro de duplicata, ignorar (já está favoritado)
    if (error.code !== "23505") {
      throw error;
    }
  }
}

// Remove um médico dos favoritos (qualquer membro do grupo pode remover)
export async function removeMedicoFavorito(medico_id: string): Promise<void> {
  const { grupo_id } = await getCurrentEscalistaData();
  if (!grupo_id) return; // Se não tem grupo, não faz nada

  const supabase = getSupabaseClient();

  // Remove TODAS as instâncias deste médico nos favoritos do grupo
  // (caso tenha sido favoritado por múltiplos membros)
  const { error } = await supabase
    .from("medicos_favoritos")
    .delete()
    .eq("grupo_id", grupo_id)
    .eq("medico_id", medico_id);

  if (error) throw error;
}

// Verifica se um médico está nos favoritos (do grupo)
export async function isMedicoFavorito(medico_id: string): Promise<boolean> {
  const { grupo_id } = await getCurrentEscalistaData();
  if (!grupo_id) return false; // Se não tem grupo, não tem favoritos

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("medicos_favoritos")
    .select("id")
    .eq("grupo_id", grupo_id)
    .eq("medico_id", medico_id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

// Busca todos os médicos favoritos do grupo
export async function fetchMedicosFavoritos(): Promise<Medico[]> {
  const { grupo_id } = await getCurrentEscalistaData();
  if (!grupo_id) return []; // Se não tem grupo, retorna lista vazia

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("medicos_favoritos")
    .select(
      `
      medicos (
        id,
        primeiro_nome,
        sobrenome,
        crm,
        email,
        telefone,
        especialidade_id,
        especialidades!especialidade_id(nome),
        user_profile!left(profilepicture)
      )
    `
    )
    .eq("grupo_id", grupo_id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Extrair os dados dos médicos e transformar especialidades
  const medicosFavoritos = (data || [])
    .map((item: any) => item.medicos)
    .filter(Boolean)
    .map((medico: any) => ({
      id: medico.id,
      primeiro_nome: medico.primeiro_nome,
      sobrenome: medico.sobrenome,
      crm: medico.crm,
      email: medico.email,
      telefone: medico.telefone,
      especialidade_id: medico.especialidade_id,
      especialidade_nome: medico.especialidades?.nome || null,
      profile_picture_url: medico.user_profile?.profilepicture || null,
    }));

  // Remover duplicatas (caso o mesmo médico tenha sido favoritado por múltiplos membros do grupo)
  const medicosUnicos = medicosFavoritos.filter(
    (medico, index, self) => self.findIndex((m) => m.id === medico.id) === index
  );

  return medicosUnicos as Medico[];
}

// Busca IDs dos médicos favoritos do grupo (útil para verificações rápidas)
export async function fetchMedicosFavoritosIds(): Promise<string[]> {
  const { grupo_id } = await getCurrentEscalistaData();
  if (!grupo_id) return []; // Se não tem grupo, retorna lista vazia

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("medicos_favoritos")
    .select("medico_id")
    .eq("grupo_id", grupo_id);

  if (error) throw error;

  // Remover duplicatas (caso o mesmo médico tenha sido favoritado por múltiplos membros)
  const medicosIds = (data || []).map((item) => item.medico_id);
  return [...new Set(medicosIds)];
}

// Toggle favorito (adiciona se não existe, remove se existe)
export async function toggleMedicoFavorito(
  medico_id: string
): Promise<boolean> {
  const isFavorito = await isMedicoFavorito(medico_id);

  if (isFavorito) {
    await removeMedicoFavorito(medico_id);
    return false;
  } else {
    await addMedicoFavorito(medico_id);
    return true;
  }
}

// Busca médicos pré-cadastrados
export async function fetchMedicosPreCadastro(): Promise<MedicoPreCadastro[]> {

  const { data, error } = await supabase
    .from("medicos_precadastro")
    .select(
      `
      *,
      especialidades!especialidade_id(nome)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Transformar dados para incluir especialidade_nome diretamente no objeto
  return (data || []).map((medico: any) => ({
    ...medico,
    especialidade_nome: medico.especialidades?.nome || null,
  })) as MedicoPreCadastro[];
}

// Busca todos os médicos (confirmados + pré-cadastrados) para listagem unificada
export async function fetchMedicosCompleto(): Promise<Medico[]> {
  const supabase = getSupabaseClient();

  // Buscar médicos confirmados com profilepicture
  const { data: medicosConfirmados, error: errorConfirmados } = await supabase
    .from("medicos")
    .select(
      `
      *,
      especialidades!especialidade_id(nome),
      user_profile!left(profilepicture)
    `
    )
    .order("primeiro_nome", { ascending: true });

  if (errorConfirmados) throw errorConfirmados;

  // Buscar médicos pré-cadastrados
  const { data: medicosPreCadastrados, error: errorPreCadastrados } =
    await supabase
      .from("medicos_precadastro")
      .select(
        `
      *,
      especialidades!especialidade_id(nome)
    `
      )
      .order("primeiro_nome", { ascending: true });

  if (errorPreCadastrados) throw errorPreCadastrados;

  // Transformar médicos confirmados
  const medicosConfirmadosFormatados = (medicosConfirmados || []).map(
    (medico: any) => ({
      ...medico,
      especialidade_nome: medico.especialidades?.nome || null,
      profile_picture_url: medico.user_profile?.profilepicture || null,
      is_precadastro: false,
    })
  );

  // Transformar médicos pré-cadastrados para formato unificado
  const medicosPreCadastradosFormatados = (medicosPreCadastrados || []).map(
    (medico: any) => ({
      id: medico.id,
      primeiro_nome: medico.primeiro_nome,
      sobrenome: medico.sobrenome,
      crm: medico.crm,
      email: medico.email || "",
      telefone: medico.telefone || "",
      especialidade_id: medico.especialidade_id,
      cpf: medico.cpf,
      medico_cpf: medico.cpf,
      especialidade_nome: medico.especialidades?.nome || null,
      profile_picture_url: null, // Pré-cadastrados não têm foto
      created_at: medico.created_at,
      is_precadastro: true,
    })
  );

  // Unir as duas listas
  const todosMedicos = [
    ...medicosConfirmadosFormatados,
    ...medicosPreCadastradosFormatados,
  ];

  // Ordenar por nome
  return todosMedicos.sort((a, b) => {
    const nomeA = `${a.primeiro_nome} ${a.sobrenome}`.toLowerCase();
    const nomeB = `${b.primeiro_nome} ${b.sobrenome}`.toLowerCase();
    return nomeA.localeCompare(nomeB);
  });
}

// Busca apenas médicos confirmados da tabela medicos (para listagem Médicos Revoluna)
export async function fetchMedicosEssenciaisCompleto(): Promise<Medico[]> {
  const supabase = getSupabaseClient();

  // Buscar apenas médicos confirmados com profilepicture
  const { data: medicosConfirmados, error: errorConfirmados } = await supabase
    .from("medicos")
    .select(
      `
      id,
      primeiro_nome,
      sobrenome,
      crm,
      email,
      telefone,
      especialidade_id,
      especialidades!especialidade_id(nome),
      user_profile!left(profilepicture)
    `
    )
    .order("primeiro_nome", { ascending: true });

  if (errorConfirmados) throw errorConfirmados;

  // Transformar médicos confirmados
  const medicosConfirmadosFormatados = (medicosConfirmados || []).map(
    (medico: any) => ({
      id: medico.id,
      primeiro_nome: medico.primeiro_nome,
      sobrenome: medico.sobrenome,
      crm: medico.crm,
      email: medico.email,
      telefone: medico.telefone,
      especialidade_id: medico.especialidade_id,
      especialidade_nome: medico.especialidades?.nome || null,
      profile_picture_url: medico.user_profile?.profilepicture || null,
      is_precadastro: false,
    })
  );

  const medicFinalist = medicosConfirmadosFormatados.sort((a, b) => {
    const nomeA = `${a.primeiro_nome} ${a.sobrenome}`.toLowerCase();
    const nomeB = `${b.primeiro_nome} ${b.sobrenome}`.toLowerCase();
    return nomeA.localeCompare(nomeB);
  });
  // Ordenar por nome
  return medicFinalist;
}

// Busca médicos por CPF ou CRM nas tabelas medicos e medicos_precadastro (para busca no corpo clínico)

// Busca nas tabelas medicos e medicos_precadastro (sem filtro de grupo)
export async function searchInMedicosAndPrecadastro(
  searchTerm: string
): Promise<Medico[]> {
  const supabase = getSupabaseClient();
  const termo = searchTerm.trim();

  if (!termo || termo.length < 2) return [];

  // Para busca por nome, exigir pelo menos 2 palavras
  const isNumericSearch = /^\d+$/.test(termo);
  const isCpfSearch = termo.replace(/\D/g, "").length === 11;

  if (!isNumericSearch && !isCpfSearch) {
    const palavras = termo
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length > 0);
    if (palavras.length < 2) return [];
  }

  let results: Medico[] = [];

  if (isNumericSearch || isCpfSearch) {
    // Busca por CRM ou CPF
    const cpfLimpo = termo.replace(/\D/g, "");

    // Buscar em médicos confirmados
    const { data: medicosConfirmados, error: errorConfirmados } = await supabase
      .from("medicos")
      .select(
        `
        id,
        primeiro_nome,
        sobrenome,
        crm,
        cpf,
        email,
        telefone,
        especialidade_id,
        especialidades!especialidade_id(nome)
      `
      )
      .or(`crm.eq.${termo},cpf.eq.${cpfLimpo}`);

    if (errorConfirmados) throw errorConfirmados;

    // Buscar em médicos pré-cadastrados
    const { data: medicosPreCadastrados, error: errorPreCadastrados } =
      await supabase
        .from("medicos_precadastro")
        .select(
          `
        id,
        primeiro_nome,
        sobrenome,
        crm,
        cpf,
        email,
        telefone,
        especialidade_id,
        especialidades!especialidade_id(nome)
      `
        )
        .or(`crm.eq.${termo},cpf.eq.${cpfLimpo}`);

    if (errorPreCadastrados) throw errorPreCadastrados;

    // Transformar médicos confirmados
    const medicosConfirmadosFormatados = (medicosConfirmados || []).map(
      (medico: any) => ({
        id: medico.id,
        primeiro_nome: medico.primeiro_nome,
        sobrenome: medico.sobrenome,
        crm: medico.crm,
        cpf: medico.cpf,
        email: medico.email,
        telefone: medico.telefone,
        especialidade_id: medico.especialidade_id,
        especialidade_nome: medico.especialidades?.nome || null,
        is_precadastro: false,
      })
    );

    // Transformar médicos pré-cadastrados
    const medicosPreCadastradosFormatados = (medicosPreCadastrados || []).map(
      (medico: any) => ({
        id: medico.id,
        primeiro_nome: medico.primeiro_nome,
        sobrenome: medico.sobrenome,
        crm: medico.crm,
        cpf: medico.cpf,
        email: medico.email || "",
        telefone: medico.telefone || "",
        especialidade_id: medico.especialidade_id,
        especialidade_nome: medico.especialidades?.nome || null,
        is_precadastro: true,
      })
    );

    results = [
      ...medicosConfirmadosFormatados,
      ...medicosPreCadastradosFormatados,
    ];
  } else {
    // Busca por nome com múltiplas palavras
    const palavras = termo
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length > 0);

    // Buscar em médicos confirmados
    const { data: medicosConfirmados, error: errorConfirmados } = await supabase
      .from("medicos")
      .select(
        `
        id,
        primeiro_nome,
        sobrenome,
        crm,
        cpf,
        email,
        telefone,
        especialidade_id,
        especialidades!especialidade_id(nome)
      `
      )
      .order("primeiro_nome", { ascending: true });

    if (errorConfirmados) throw errorConfirmados;

    // Buscar em médicos pré-cadastrados
    const { data: medicosPreCadastrados, error: errorPreCadastrados } =
      await supabase
        .from("medicos_precadastro")
        .select(
          `
        id,
        primeiro_nome,
        sobrenome,
        crm,
        cpf,
        email,
        telefone,
        especialidade_id,
        especialidades!especialidade_id(nome)
      `
        )
        .order("primeiro_nome", { ascending: true });

    if (errorPreCadastrados) throw errorPreCadastrados;

    // Transformar e filtrar médicos confirmados
    const medicosConfirmadosFormatados = (medicosConfirmados || [])
      .map((medico: any) => ({
        id: medico.id,
        primeiro_nome: medico.primeiro_nome,
        sobrenome: medico.sobrenome,
        crm: medico.crm,
        cpf: medico.cpf,
        email: medico.email,
        telefone: medico.telefone,
        especialidade_id: medico.especialidade_id,
        especialidade_nome: medico.especialidades?.nome || null,
        is_precadastro: false,
      }))
      .filter((medico) => {
        const nomeCompleto =
          `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
        const crm = medico.crm?.toLowerCase() || "";

        // Verificar se TODAS as palavras fazem match
        return palavras.every(
          (palavra) => nomeCompleto.includes(palavra) || crm.includes(palavra)
        );
      });

    // Transformar e filtrar médicos pré-cadastrados
    const medicosPreCadastradosFormatados = (medicosPreCadastrados || [])
      .map((medico: any) => ({
        id: medico.id,
        primeiro_nome: medico.primeiro_nome,
        sobrenome: medico.sobrenome,
        crm: medico.crm,
        cpf: medico.cpf,
        email: medico.email || "",
        telefone: medico.telefone || "",
        especialidade_id: medico.especialidade_id,
        especialidade_nome: medico.especialidades?.nome || null,
        is_precadastro: true,
      }))
      .filter((medico) => {
        const nomeCompleto =
          `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
        const crm = medico.crm?.toLowerCase() || "";

        // Verificar se TODAS as palavras fazem match
        return palavras.every(
          (palavra) => nomeCompleto.includes(palavra) || crm.includes(palavra)
        );
      });

    results = [
      ...medicosConfirmadosFormatados,
      ...medicosPreCadastradosFormatados,
    ];
  }

  // Ordenar por nome
  return results.sort((a, b) => {
    const nomeA = `${a.primeiro_nome} ${a.sobrenome}`.toLowerCase();
    const nomeB = `${b.primeiro_nome} ${b.sobrenome}`.toLowerCase();
    return nomeA.localeCompare(nomeB);
  });
}

export async function searchMedicosByCpfOrCrm(
  searchTerm: string
): Promise<Medico[]> {
  const termo = searchTerm.trim();

  if (!termo || termo.length < 3) return [];

  // Buscar em médicos confirmados (apenas por CRM)
  const { data: medicosConfirmados, error: errorConfirmados } = await supabase
    .from("medicos")
    .select(
      `
      id,
      primeiro_nome,
      sobrenome,
      crm,
      cpf,
      email,
      telefone,
      especialidade_id,
      especialidades!especialidade_id(nome)
    `
    )
    .eq("crm", termo);

  if (errorConfirmados) throw errorConfirmados;

  // Buscar em médicos pré-cadastrados (apenas por CRM)
  const { data: medicosPreCadastrados, error: errorPreCadastrados } =
    await supabase
      .from("medicos_precadastro")
      .select(
        `
      id,
      primeiro_nome,
      sobrenome,
      crm,
      cpf,
      email,
      telefone,
      especialidade_id,
      especialidades!especialidade_id(nome)
    `
      )
      .eq("crm", termo);

  if (errorPreCadastrados) throw errorPreCadastrados;

  // Transformar médicos confirmados
  const medicosConfirmadosFormatados = (medicosConfirmados || []).map(
    (medico: any) => ({
      id: medico.id,
      primeiro_nome: medico.primeiro_nome,
      sobrenome: medico.sobrenome,
      crm: medico.crm,
      cpf: medico.cpf,
      email: medico.email,
      telefone: medico.telefone,
      especialidade_id: medico.especialidade_id,
      especialidade_nome: medico.especialidades?.nome || null,
      is_precadastro: false,
    })
  );

  // Transformar médicos pré-cadastrados
  const medicosPreCadastradosFormatados = (medicosPreCadastrados || []).map(
    (medico: any) => ({
      id: medico.id,
      primeiro_nome: medico.primeiro_nome,
      sobrenome: medico.sobrenome,
      crm: medico.crm,
      cpf: medico.cpf,
      email: medico.email || "",
      telefone: medico.telefone || "",
      especialidade_id: medico.especialidade_id,
      especialidade_nome: medico.especialidades?.nome || null,
      is_precadastro: true,
    })
  );

  // Unir as duas listas
  const todosMedicos = [
    ...medicosConfirmadosFormatados,
    ...medicosPreCadastradosFormatados,
  ];

  // Ordenar por nome
  return todosMedicos.sort((a, b) => {
    const nomeA = `${a.primeiro_nome} ${a.sobrenome}`.toLowerCase();
    const nomeB = `${b.primeiro_nome} ${b.sobrenome}`.toLowerCase();
    return nomeA.localeCompare(nomeB);
  });
}
export async function fetchMedicoCPF(cpf: string): Promise<Medico | null> {
  try {
    const { data, error } = await supabase
      .from("medicos")
      .select()
      .eq("cpf", cpf)
      .single();

    return data ? (data as Medico) : null;
  } catch (error) {
    throw error;
  }
}

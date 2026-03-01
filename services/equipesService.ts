import { getSupabaseClient } from "./supabaseClient"
import { getCurrentUserGrupoId } from "./authService"

export interface Equipe {
  id: string
  nome: string
  cor: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface EquipeMedico {
  equipe_id: string
  medico_id: string
  updated_by: string
  updated_at: string
}

export interface EquipeMedicoView {
  equipe_id: string
  equipes_nome: string
  equipes_cor: string
  medico_id: string
  primeiro_nome: string
  sobrenome: string
  crm: string
  email: string
  telefone?: string
  especialidade?: string
  especialidade_nome?: string
  equipes_createdat: string
  equipes_updatedat: string
  equipes_updatedby: string
  medicos_updatedat: string
  medicos_updatedby: string
  is_precadastro?: boolean
}

// Buscar todas as equipes do usuário
export async function fetchEquipes(): Promise<Equipe[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("equipes")
    .select("*")
    .order("nome", { ascending: true })

  if (error) {
    console.error("Erro ao buscar equipes:", error)
    throw error
  }

  return data || []
}

// Buscar equipe específica
export async function fetchEquipeById(equipeId: string): Promise<Equipe | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("equipes")
    .select("*")
    .eq("id", equipeId)
    .single()

  if (error) {
    console.error("Erro ao buscar equipe:", error)
    return null
  }

  return data
}

// Criar nova equipe
export async function createEquipe(nome: string, cor: string): Promise<Equipe> {
  const supabase = getSupabaseClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error("Usuário não autenticado")

  // Obter grupo_id do usuário atual
  const grupoId = await getCurrentUserGrupoId()

  const { data, error } = await supabase
    .from("equipes")
    .insert({
      nome,
      cor,
      grupo_id: grupoId,
      updated_by: userData.user.id
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao criar equipe:", error)
    throw error
  }

  return data
}

// Atualizar equipe
export async function updateEquipe(equipeId: string, updates: { nome?: string; cor?: string; updated_by: string; updated_at: Date }): Promise<Equipe> {
  const supabase = getSupabaseClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error("Usuário não autenticado")

  const { data, error } = await supabase
    .from("equipes")
    .update(updates)
    .eq("id", equipeId)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar equipe:", error)
    throw error
  }

  return data
}

// Deletar equipe (soft delete)
export async function deleteEquipe(equipeId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("equipes")
    .delete()
    .eq("id", equipeId)

  if (error) {
    console.error("Erro ao deletar equipe:", error)
    throw error
  }
}

// Buscar médicos de uma equipe específica
export async function fetchMedicosEquipe(equipeId: string): Promise<EquipeMedicoView[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("equipes_medicos")
    .select(`
      medico_id,
      updated_at,
      updated_by,
      medicos!inner(
        primeiro_nome,
        sobrenome,
        crm,
        email,
        telefone,
        especialidade_id,
        especialidades!especialidade_id(nome)
      )
    `)
    .eq("equipe_id", equipeId)
    .order("medicos(primeiro_nome)", { ascending: true })

  if (error) {
    console.error("Erro ao buscar médicos da equipe:", error)
    throw error
  }

  // Transformar dados para formato esperado
  return (data || []).map((item: any) => ({
    equipe_id: equipeId,
    equipes_nome: "", // Será preenchido quando necessário
    equipes_cor: "", // Será preenchido quando necessário
    medico_id: item.medico_id,
    primeiro_nome: item.medicos.primeiro_nome,
    sobrenome: item.medicos.sobrenome,
    crm: item.medicos.crm,
    email: item.medicos.email,
    telefone: item.medicos.telefone,
    especialidade_nome: item.medicos.especialidades?.nome || null,
    equipes_createdat: "",
    equipes_updatedat: item.updated_at,
    equipes_updatedby: item.updated_by,
    medicos_updatedat: item.updated_at,
    medicos_updatedby: item.updated_by
  }))
}

// Buscar todas as equipes com seus médicos usando estratégia one-for-all
export async function fetchEquipesComMedicos(): Promise<EquipeMedicoView[]> {
  const supabase = getSupabaseClient()

  // Buscar registros de equipes_medicos primeiro
  const { data: equipesData, error: equipesError } = await supabase
    .from("equipes_medicos")
    .select(`
      equipe_id,
      medico_id,
      medico_precadastro_id,
      updated_at,
      updated_by,
      equipes!inner(
        nome,
        cor
      )
    `)
    .not("equipe_id", "is", null)
    .order("equipes(nome)", { ascending: true })

  if (equipesError) {
    console.error("Erro ao buscar equipes com médicos:", equipesError)
    throw equipesError
  }

  if (!equipesData || equipesData.length === 0) {
    return []
  }

  // Separar IDs de médicos confirmados e pré-cadastrados
  const medicosConfirmadosIds = equipesData
    .filter(em => em.medico_id !== MEDICO_FANTASMA_ID)
    .map(em => em.medico_id)

  const medicosPreCadastradosIds = equipesData
    .filter(em => em.medico_precadastro_id)
    .map(em => em.medico_precadastro_id)

  // Buscar dados dos médicos confirmados
  let medicosConfirmados: any[] = []
  if (medicosConfirmadosIds.length > 0) {
    const { data } = await supabase
      .from('medicos')
      .select(`
        id,
        primeiro_nome,
        sobrenome,
        crm,
        email,
        telefone,
        especialidade_nome
      `)
      .in('id', medicosConfirmadosIds)
    medicosConfirmados = data || []
  }

  // Buscar dados dos médicos pré-cadastrados
  let medicosPreCadastrados: any[] = []
  if (medicosPreCadastradosIds.length > 0) {
    const { data } = await supabase
      .from('medicos_precadastro')
      .select(`
        id,
        primeiro_nome,
        sobrenome,
        crm,
        email,
        telefone,
        especialidades!especialidade_id(nome)
      `)
      .in('id', medicosPreCadastradosIds)
    medicosPreCadastrados = data || []
  }

  // Combinar dados usando estratégia one-for-all
  const result: EquipeMedicoView[] = []

  equipesData.forEach(item => {
    let medicoData
    let medicoId

    let isPrecadastro = false

    if (item.medico_id === MEDICO_FANTASMA_ID && item.medico_precadastro_id) {
      // É um médico pré-cadastrado
      medicoData = medicosPreCadastrados.find(m => m.id === item.medico_precadastro_id)
      medicoId = item.medico_precadastro_id
      isPrecadastro = true
      if (medicoData) {
        medicoData.especialidade_nome = medicoData.especialidades?.nome || null
      }
    } else {
      // É um médico confirmado
      medicoData = medicosConfirmados.find(m => m.id === item.medico_id)
      medicoId = item.medico_id
    }

    if (medicoData) {
      result.push({
        equipe_id: item.equipe_id,
        equipes_nome: (item as any).equipes?.nome || '',
        equipes_cor: (item as any).equipes?.cor || '',
        medico_id: medicoId,
        primeiro_nome: medicoData.primeiro_nome,
        sobrenome: medicoData.sobrenome,
        crm: medicoData.crm,
        email: medicoData.email || '',
        telefone: medicoData.telefone || '',
        especialidade_nome: medicoData.especialidade_nome,
        equipes_createdat: item.updated_at,
        equipes_updatedat: item.updated_at,
        equipes_updatedby: item.updated_by,
        medicos_updatedat: item.updated_at,
        medicos_updatedby: item.updated_by,
        is_precadastro: isPrecadastro
      })
    }
  })

  // Ordenar por nome do médico
  return result.sort((a, b) =>
    a.primeiro_nome.localeCompare(b.primeiro_nome)
  )
}

// Buscar equipes de um médico específico
export async function fetchEquipesDoMedico(medicoId: string): Promise<string[]> {
  const supabase = getSupabaseClient()

  // Usar estratégia one-for-all para buscar equipes
  const { data, error } = await supabase
    .from("equipes_medicos")
    .select("equipe_id")
    .or(`medico_id.eq.${medicoId},medico_precadastro_id.eq.${medicoId}`)
    .not("equipe_id", "is", null)

  if (error) {
    console.error("Erro ao buscar equipes do médico:", error)
    throw error
  }

  return (data || []).map(item => item.equipe_id).filter(Boolean)
}

// ID do usuário fantasma para médicos pré-cadastrados
const MEDICO_FANTASMA_ID = '9cd29712-91b5-492f-86ff-41e38c7b03d5'

// Adicionar médico à equipe (se já estiver no corpo clínico, atualiza; senão, insere)
export async function addMedicoToEquipe(equipeId: string, medicoId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error("Usuário não autenticado")

  // Obter grupo_id do usuário atual
  const grupoId = await getCurrentUserGrupoId()

  // Verificar se é médico pré-cadastrado
  const { data: preCadastroData } = await supabase
    .from('medicos_precadastro')
    .select('id')
    .eq('id', medicoId)
    .maybeSingle()

  // Verificar se médico já está no corpo clínico usando estratégia one-for-all
  let existing
  if (preCadastroData) {
    // É pré-cadastrado: buscar por ID fantasma + medico_precadastro_id
    const { data } = await supabase
      .from("equipes_medicos")
      .select("*")
      .eq("medico_id", MEDICO_FANTASMA_ID)
      .eq("medico_precadastro_id", medicoId)
      .is("equipe_id", null)
      .maybeSingle()
    existing = data
  } else {
    // É médico confirmado: buscar por ID real
    const { data } = await supabase
      .from("equipes_medicos")
      .select("*")
      .eq("medico_id", medicoId)
      .is("equipe_id", null)
      .maybeSingle()
    existing = data
  }

  if (existing) {
    // Atualizar registro existente
    const { error } = await supabase
      .from("equipes_medicos")
      .update({
        equipe_id: equipeId,
        updated_by: userData.user.id
      })
      .eq("id", existing.id)

    if (error) {
      console.error("Erro ao mover médico para equipe:", error)
      throw error
    }
  } else {
    // Inserir novo registro usando estratégia one-for-all
    let insertData
    if (preCadastroData) {
      insertData = {
        equipe_id: equipeId,
        medico_id: MEDICO_FANTASMA_ID,
        medico_precadastro_id: medicoId,
        grupo_id: grupoId,
        updated_by: userData.user.id
      }
    } else {
      insertData = {
        equipe_id: equipeId,
        medico_id: medicoId,
        medico_precadastro_id: null,
        grupo_id: grupoId,
        updated_by: userData.user.id
      }
    }

    const { error } = await supabase
      .from("equipes_medicos")
      .insert(insertData)

    if (error) {
      // Se for erro de duplicação, ignorar
      if (error.code === "23505") {
        return
      }
      console.error("Erro ao adicionar médico à equipe:", error)
      throw error
    }
  }
}

// Remover médico da equipe (volta para o corpo clínico)
export async function removeMedicoFromEquipe(equipeId: string, medicoId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error("Usuário não autenticado")

  // Em vez de deletar, volta o médico para o corpo clínico (equipe_id = null)
  // Usar estratégia one-for-all para considerar ambos os tipos de médicos
  const { error } = await supabase
    .from("equipes_medicos")
    .update({
      equipe_id: null,
      updated_by: userData.user.id
    })
    .eq("equipe_id", equipeId)
    .or(`medico_id.eq.${medicoId},medico_precadastro_id.eq.${medicoId}`)

  if (error) {
    console.error("Erro ao remover médico da equipe:", error)
    throw error
  }
}


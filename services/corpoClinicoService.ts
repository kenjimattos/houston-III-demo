import { getSupabaseClient } from "./supabaseClient"

export interface CorpoClinicoMedicoView {
  medico_id: string
  primeiro_nome: string
  sobrenome: string
  crm: string
  email: string
  telefone?: string
  especialidade_id?: string
  especialidade_nome?: string
  updated_at: string
  updated_by: string
  is_precadastro?: boolean
}

// ID do usuário fantasma para médicos pré-cadastrados
const MEDICO_FANTASMA_ID = '9cd29712-91b5-492f-86ff-41e38c7b03d5'

// Adicionar médico ao corpo clínico
export async function addMedicoToCorpoClinico(medicoId: string, grupoId?: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) throw new Error("Usuário não autenticado")

  // Obter grupo_id do usuário se não foi passado
  let grupo = grupoId
  if (!grupo) {
    const { data: escalista } = await supabase
      .from("escalistas")
      .select("grupo_id")
      .eq("id", userData.user.id)
      .single()

    grupo = escalista?.grupo_id
  }

  if (!grupo) {
    throw new Error("Grupo do usuário não encontrado")
  }

  // Verificar se médico já está no grupo
  const jaEsta = await isMedicoInCorpoClinico(medicoId, grupo)
  if (jaEsta) {
    return
  }

  // Verificar se é médico pré-cadastrado
  const { data: preCadastroData } = await supabase
    .from('medicos_precadastro')
    .select('id')
    .eq('id', medicoId)
    .maybeSingle()

  let insertData
  if (preCadastroData) {
    // É pré-cadastrado: usar ID fantasma e preencher medico_precadastro_id
    insertData = {
      medico_id: MEDICO_FANTASMA_ID,
      medico_precadastro_id: medicoId,
      equipe_id: null,
      grupo_id: grupo,
      updated_by: userData.user.id
    }
  } else {
    // É médico confirmado: usar ID real e deixar medico_precadastro_id null
    insertData = {
      medico_id: medicoId,
      medico_precadastro_id: null,
      equipe_id: null,
      grupo_id: grupo,
      updated_by: userData.user.id
    }
  }

  const { error } = await supabase
    .from("equipes_medicos")
    .insert(insertData)

  if (error) {
    console.error("Erro ao adicionar médico ao corpo clínico:", error)
    throw error
  }
}

// Remover médico do corpo clínico (remove todas as associações do médico)
export async function removeMedicoFromCorpoClinico(medicoId: string): Promise<{ success: boolean; deletedCount: number }> {
  const supabase = getSupabaseClient()

  // Remover considerando se é médico confirmado ou pré-cadastrado
  const { data, error } = await supabase
    .from("equipes_medicos")
    .delete()
    .or(`medico_id.eq.${medicoId},medico_precadastro_id.eq.${medicoId}`)
    .select("*")

  if (error) {
    console.error("Erro ao remover médico do corpo clínico:", error)
    throw error
  }

  const deletedCount = data?.length || 0

  return {
    success: deletedCount > 0,
    deletedCount
  }
}

// Buscar médicos do corpo clínico (todos os médicos do grupo, removendo duplicatas)
export async function fetchCorpoClinicoMedicos(): Promise<CorpoClinicoMedicoView[]> {
  const supabase = getSupabaseClient()

  // Buscar médicos do corpo clínico usando estratégia one-for-all
  const { data: equipesMedicos, error: equipesError } = await supabase
    .from("equipes_medicos")
    .select(`
      medico_id,
      medico_precadastro_id,
      updated_at,
      updated_by
    `)

  if (equipesError) {
    console.error("Erro ao buscar médicos do corpo clínico:", equipesError)
    throw equipesError
  }

  if (!equipesMedicos || equipesMedicos.length === 0) {
    return []
  }

  // Separar IDs de médicos confirmados e pré-cadastrados
  const medicosConfirmadosIds = equipesMedicos
    .filter(em => em.medico_id !== MEDICO_FANTASMA_ID)
    .map(em => em.medico_id)

  const medicosPreCadastradosIds = equipesMedicos
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
        especialidade_id,
        especialidades!especialidade_id(nome)
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
        especialidade_id,
        especialidades!especialidade_id(nome)
      `)
      .in('id', medicosPreCadastradosIds)
    medicosPreCadastrados = data || []
  }

  // Combinar dados usando a estratégia one-for-all
  const transformedData: CorpoClinicoMedicoView[] = []

  equipesMedicos.forEach(equipeMedico => {
    if (equipeMedico.medico_id === MEDICO_FANTASMA_ID && equipeMedico.medico_precadastro_id) {
      // É um médico pré-cadastrado
      const medicoPreCadastrado = medicosPreCadastrados.find(m => m.id === equipeMedico.medico_precadastro_id)
      if (medicoPreCadastrado) {
        transformedData.push({
          medico_id: medicoPreCadastrado.id,
          primeiro_nome: medicoPreCadastrado.primeiro_nome,
          sobrenome: medicoPreCadastrado.sobrenome,
          crm: medicoPreCadastrado.crm,
          email: medicoPreCadastrado.email || '',
          telefone: medicoPreCadastrado.telefone || '',
          especialidade_id: medicoPreCadastrado.especialidade_id,
          especialidade_nome: medicoPreCadastrado.especialidades?.nome || null,
          updated_at: equipeMedico.updated_at,
          updated_by: equipeMedico.updated_by,
          is_precadastro: true
        })
      }
    } else {
      // É um médico confirmado
      const medicoConfirmado = medicosConfirmados.find(m => m.id === equipeMedico.medico_id)
      if (medicoConfirmado) {
        transformedData.push({
          medico_id: medicoConfirmado.id,
          primeiro_nome: medicoConfirmado.primeiro_nome,
          sobrenome: medicoConfirmado.sobrenome,
          crm: medicoConfirmado.crm,
          email: medicoConfirmado.email,
          telefone: medicoConfirmado.telefone || '',
          especialidade_id: medicoConfirmado.especialidade_id,
          especialidade_nome: medicoConfirmado.especialidades?.nome || null,
          updated_at: equipeMedico.updated_at,
          updated_by: equipeMedico.updated_by,
          is_precadastro: false
        })
      }
    }
  })

  // Filtrar duplicatas - manter apenas um registro por médico
  return removeDuplicateMedicos(transformedData)
}

// Função auxiliar para remover duplicatas de médicos
function removeDuplicateMedicos(medicos: any[]): CorpoClinicoMedicoView[] {
  const medicosUnicos = new Map<string, CorpoClinicoMedicoView>()

  medicos.forEach(medico => {
    const medicoId = medico.medico_id

    // Se já existe, manter o mais recente (baseado em updated_at)
    if (medicosUnicos.has(medicoId)) {
      const existente = medicosUnicos.get(medicoId)!
      const existenteDate = new Date(existente.updated_at)
      const novoDate = new Date(medico.updated_at)

      // Manter o mais recente
      if (novoDate > existenteDate) {
        medicosUnicos.set(medicoId, medico)
      }
    } else {
      medicosUnicos.set(medicoId, medico)
    }
  })

  // Retornar array ordenado por nome
  return Array.from(medicosUnicos.values()).sort((a, b) =>
    a.primeiro_nome.localeCompare(b.primeiro_nome)
  )
}

// Verificar se médico já está no corpo clínico (qualquer registro no grupo)
export async function isMedicoInCorpoClinico(medicoId: string, grupoId?: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  // Verificar usando estratégia one-for-all
  let query = supabase
    .from("equipes_medicos")
    .select("medico_id, medico_precadastro_id")
    .or(`medico_id.eq.${medicoId},medico_precadastro_id.eq.${medicoId}`)

  // Se grupo_id foi passado, filtrar por grupo
  if (grupoId) {
    query = query.eq("grupo_id", grupoId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error("Erro ao verificar médico no corpo clínico:", error)
    return false
  }

  return !!data && data.length > 0
}
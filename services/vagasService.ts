import { getSupabaseClient } from "@/services/supabaseClient";
import { getCurrentUser } from "./authService";

// Função para obter o horário local do Brasil (UTC-3) no formato ISO para salvar no banco
function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

interface VagaInsert {
  hospital_id: string
  data: string
  periodo_id: string
  hora_inicio: string
  hora_fim: string
  valor: number
  data_pagamento: string | null
  tipos_vaga_id: string
  observacoes: string
  setor_id: string
  status: "aberta" | "fechada" | "cancelada" | "anunciada"
  total_candidaturas: number
  especialidade_id: string
  forma_recebimento_id: string
  grupo_id: string
  escalista_id: string
  updated_by: string
  updated_at: string
  recorrencia_id?: string // Campo opcional para recorrência
  grade_id?: string // Campo opcional para grade
}

// Função para verificar conflito de horário antes de criar/editar vaga
export async function verificarConflitoHorario({
  medico_id,
  data,
  hora_inicio,
  hora_fim,
}: {
  medico_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
}) {
  const supabase = getSupabaseClient();

  // Preparar parâmetros base
  const params: any = {
    p_medico_id: medico_id,
    p_data: data,
    p_hora_inicio: hora_inicio,
    p_hora_fim: hora_fim,
  };

  // Chama a função que retorna exception em caso de conflito
  const { error } = await supabase.rpc('verificar_conflito_vaga_designada', params)

  if (error) {
    // Se houver erro, é conflito - lançar o erro para ser tratado no frontend
    throw error;
  }

  return { tem_conflito: false }
}

export async function createVaga({ vagaInsert, selectedBeneficios, selectedRequisitos = [] }: { vagaInsert: VagaInsert, selectedBeneficios: string[], selectedRequisitos?: string[] }) {
  const user = await getCurrentUser()
  const now = getBrazilNowISO()

  // Adicionar campos de auditoria à vaga
  const vagaComAuditoria = {
    ...vagaInsert,
    updated_by: user.id,
    updated_at: now
  }

  // Chamar API route para criar vaga com benefícios e requisitos
  const response = await fetch('/api/vagas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Importante: envia cookies (JWT)
    body: JSON.stringify({
      ...vagaComAuditoria,
      selectedBeneficios,
      selectedRequisitos
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao criar vaga')
  }

  const { data } = await response.json()
  return data
}

export async function updateVaga({ vaga_id, vagaUpdate, selectedBeneficios, selectedRequisitos = [] }: { vaga_id: string, vagaUpdate: Partial<VagaInsert>, selectedBeneficios: string[], selectedRequisitos?: string[] }) {
  const user = await getCurrentUser()
  const now = getBrazilNowISO()

  // Adicionar campos de auditoria ao update
  const vagaUpdateComAuditoria = {
    ...vagaUpdate,
    updated_by: user.id,
    updated_at: now
  }

  // Chamar API route para atualizar vaga com benefícios e requisitos
  const response = await fetch(`/api/vagas/${vaga_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Importante: envia cookies (JWT)
    body: JSON.stringify({
      ...vagaUpdateComAuditoria,
      selectedBeneficios,
      selectedRequisitos
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao atualizar vaga')
  }

  const { data } = await response.json()
  return data
}

export async function fetchBeneficiosDaVaga(vaga_id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('vagas_beneficios')
    .select('vaga_id, beneficio_id, beneficios:beneficio_id (nome)')
    .eq('vaga_id', vaga_id)
  if (error) throw error
  return data // array de { beneficio_id, beneficio: { nome } }
}

export async function fetchRequisitosDaVaga(vaga_id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('vagas_requisitos')
    .select('vaga_id, requisito_id, requisitos:requisito_id (nome)')
    .eq('vaga_id', vaga_id)
  if (error) throw error
  return data // array de { requisito_id, requisito: { nome } }
}

export async function createVagasRecorrentes({
  data_inicio,
  data_fim,
  dias_semana,
  vaga_base,
  created_by,
  medico_id = null,
  observacoes = null,
  selectedBeneficios = [],
  selectedRequisitos = [],
  diasPagamento = null,
}: {
  data_inicio: string;
  data_fim: string;
  dias_semana: number[];
  vaga_base: any;
  created_by: string;
  medico_id?: string | null;
  observacoes?: string | null;
  selectedBeneficios?: string[];
  selectedRequisitos?: string[];
  diasPagamento?: number | null;
}) {
  const supabase = getSupabaseClient()

  // Se diasPagamento foi fornecido, recalcular vaga_datapagamento baseado na data + dias
  if (diasPagamento !== null && vaga_base.vaga_data) {
    const dataPlantao = new Date(vaga_base.vaga_data)
    const dataPagamento = new Date(dataPlantao)
    dataPagamento.setDate(dataPagamento.getDate() + diasPagamento)
    vaga_base.vaga_datapagamento = dataPagamento.toISOString().slice(0, 10)
  }

  const { data, error } = await supabase.rpc('criar_recorrencia_com_vagas', {
    p_data_inicio: data_inicio,
    p_data_fim: data_fim,
    p_dias_semana: dias_semana,
    p_vaga_base: vaga_base,
    p_created_by: created_by,
    p_medico_id: medico_id || null,
    p_observacoes: observacoes || null,
    p_beneficios: selectedBeneficios,
    p_requisitos: selectedRequisitos,
  });
  if (error) throw error;
  return data; // retorna o recorrencia_id
}

export async function editarVagasRecorrencia({
  recorrencia_id,
  update,
  updateby,
  selectedBeneficios = [],
  selectedRequisitos = [],
  diasPagamento = null,
}: {
  recorrencia_id: string;
  update: any;
  updateby: string;
  selectedBeneficios?: string[];
  selectedRequisitos?: string[];
  diasPagamento?: number | null;
}) {
  const supabase = getSupabaseClient()

  // REMOVIDO: Não calcular aqui no frontend, deixar o backend calcular
  // A função RPC vai receber diasPagamento e calcular individualmente para cada vaga

  const { error } = await supabase.rpc('editar_vagas_recorrencia', {
    p_recorrencia_id: recorrencia_id,
    p_update: update,
    p_updateby: updateby,
    p_beneficios: selectedBeneficios,
    p_requisitos: selectedRequisitos,
    p_dias_pagamento: diasPagamento, // PASSAR DIAS DIRETAMENTE PARA O BACKEND
  });
  if (error) throw error;
  return true;
}

export async function deletarVagasRecorrencia({
  recorrencia_id,
  updateby,
}: {
  recorrencia_id: string;
  updateby: string;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("deletar_vagas_recorrencia", {
    p_recorrencia_id: recorrencia_id,
    p_updateby: updateby,
  });
  if (error) throw error;
  return true;
}

// Função para verificar vagas existentes da mesma grade no período
export async function verificarVagasDaGradeNoPeriodo({
  grade_id,
  data_inicio,
  data_fim,
}: {
  grade_id: string;
  data_inicio: string;
  data_fim: string;
}) {
  const supabase = getSupabaseClient()

  // Buscar apenas vagas da mesma grade no período
  const { data, error } = await supabase
    .from('vagas')
    .select('id, data, periodo_id, hora_inicio, hora_fim, status')
    .eq('grade_id', grade_id)
    .gte('data', data_inicio)
    .lte('data', data_fim)
    .neq('status', 'cancelada')

  if (error) throw error
  return data || []
}

// Função para cancelar vagas conflitantes
export async function removerVagasConflitantes({
  vaga_ids,
  motivo
}: {
  vaga_ids: string[]
  motivo: string
}) {
  if (vaga_ids.length === 0) return

  const supabase = getSupabaseClient()
  const user = await getCurrentUser()
  const now = getBrazilNowISO()

  // Atualizar status das vagas para cancelada (mantém histórico)
  const { error } = await supabase
    .from("vagas")
    .update({
      status: 'cancelada',
      observacoes: motivo,
      updated_by: user.id,
      updated_at: now
    })
    .in('id', vaga_ids)

  if (error) throw error
  return true
}

// Função para buscar vagas canceladas
export async function buscarVagasCanceladas({
  grupo_id,
  limit = 100,
}: {
  grupo_id: string;
  limit?: number;
}) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('vagas')
    .select(`
      id,
      data,
      periodo_id,
      hora_inicio,
      hora_fim,
      observacoes,
      updated_at,
      hospital:hospital_id(nome),
      especialidade:especialidade_id(nome),
      setor:setor_id(nome)
    `)
    .eq('grupo_id', grupo_id)
    .eq('status', 'cancelada')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Função para excluir definitivamente vagas canceladas
// ✅ MIGRADO: Usa API route para deletar vagas
export async function excluirVagasCanceladas({
  vaga_ids
}: {
  vaga_ids: string[]
}) {
  if (vaga_ids.length === 0) return

  // Deletar vagas em paralelo usando API route
  const deletePromises = vaga_ids.map(async (vaga_id) => {
    const response = await fetch(`/api/vagas/${vaga_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Erro ao deletar vaga ${vaga_id}`)
    }

    return response.json()
  })

  const results = await Promise.all(deletePromises)

  // Retornar a quantidade de vagas excluídas
  return results.length
}

// Função placeholder para buscar vagas por usuário - implementação futura
export async function getVagasByUser() {
  // TODO: Implementar função para buscar vagas por usuário
  return []
}
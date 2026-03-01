// ============================================
// INTERFACES DE DADOS
// ============================================

/**
 * Interface representando uma linha da view vw_plantoes_pagamentos
 * Combina dados de vagas, candidaturas, check-in/checkout e pagamentos
 */
export interface PagamentosData {
  idx: number;
  id: string;
  candidatura_id: string;
  vaga_id: string;
  medico_id: string;
  hospital_id: string;
  setor_id: string;
  especialidade_id: string;
  escalista_id: string;
  grupo_id: string;

  // Dados da vaga
  vaga_data: string;
  vaga_horainicio: string;
  vaga_horafim: string;
  vaga_valor: number;
  vaga_status: string;

  // Dados relacionados
  hospital_nome: string;
  setor_nome: string;
  especialidade_nome: string;
  escalista_nome: string;

  // Dados do médico
  medico_primeiro_nome: string;
  medico_sobrenome: string;
  medico_nome: string;
  medico_cpf: string;
  medico_crm: string;

  // Check-in
  checkin_id: number | null;
  checkin_hora: string | null;
  checkin_status: string | null;
  checkin_justificativa: string | null;
  checkin_aprovado_por: string | null;
  checkin_aprovado_em: string | null;
  checkin_aprovado_por_nome: string | null;

  // Checkout
  checkout_hora: string | null;
  checkout_status: string | null;
  checkout_justificativa: string | null;
  checkout_aprovado_por: string | null;
  checkout_aprovado_em: string | null;
  checkout_aprovado_por_nome: string | null;

  // Pagamento
  pagamento_id: string | null;
  pagamento_status: string | null;
  pagamento_valor: number | null;
  autorizado_por: string | null;
  autorizado_em: string | null;
  autorizado_por_nome: string | null;
  pago_em: string | null;
  pago_por: string | null;
  pago_por_nome: string | null;
}

// ============================================
// ENUMS
// ============================================

/**
 * Campos disponíveis para ordenação na view vw_plantoes_pagamentos
 */
export enum PagamentosSortField {
  VAGA_DATA = 'vaga_data',
  HOSPITAL_NOME = 'hospital_nome',
  SETOR_NOME = 'setor_nome',
  MEDICO_NOME = 'medico_nome',
  VAGA_VALOR = 'vaga_valor',
  PAGAMENTO_STATUS = 'pagamento_status',
  CHECKIN_STATUS = 'checkin_status',
}

/**
 * Alias para compatibilidade com código legado
 * @deprecated Use PagamentosSortField
 */
export const PlantaoSortField = PagamentosSortField;

/**
 * Status possíveis de um pagamento
 */
export enum PagamentosStatus {
  PENDENTE = 'PENDENTE',
  AUTORIZADO = 'AUTORIZADO',
  PAGO = 'PAGO',
}

/**
 * Status possíveis de check-in/checkout
 */
export enum CheckinStatus {
  PENDENTE = 'PENDENTE',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
}

// ============================================
// INTERFACES DE FILTROS
// ============================================

/**
 * Filtros disponíveis para listagem de pagamentos
 */
export interface PagamentosFilters {
  hospital_ids?: string[];
  setor_ids?: string[];
  especialidade_ids?: string[];
  medico_ids?: string[];
  status_checkin?: string[];
  status_pagamento?: string[];
  data_inicio?: string;
  data_fim?: string;
}

// ============================================
// INTERFACES DE RESPOSTA
// ============================================

/**
 * Resposta paginada da API de pagamentos
 */
export interface PagamentosResponse {
  data: PagamentosData[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

/**
 * Resultado de operações em massa (bulk operations)
 */
export interface BulkOperationResult {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// ============================================
// TIPOS DE PAYLOAD
// ============================================

/**
 * Payload para criar um novo pagamento
 */
export interface CreatePagamentoPayload {
  candidatura_id: string;
  medico_id: string;
  vaga_id: string;
  valor: number;
}

/**
 * Payload para atualizar valor de um pagamento
 */
export interface UpdatePagamentoPayload {
  valor: number;
}

/**
 * Payload para ações de check-in/checkout (aprovar/rejeitar)
 */
export interface CheckinCheckoutActionPayload {
  action: 'aprovar' | 'rejeitar';
  justificativa?: string;
}

/**
 * Payload para criar/atualizar check-in/checkout
 */
export interface CheckinCheckoutPayload {
  vaga_id: string;
  medico_id: string;
  checkin?: string;
  checkout?: string;
}

/**
 * Payload para operações em massa
 */
export interface BulkPagamentosPayload {
  pagamento_ids: string[];
}

/**
 * Payload para confirmar check-ins em massa
 */
export interface BulkConfirmarCheckinPayload {
  plantoes: Array<{
    vaga_id: string;
    medico_id: string;
    vaga_data: string;
    horario_inicio: string;
    horario_fim: string;
  }>;
}

/**
 * Payload para confirmar pagamentos em massa
 */
export interface BulkConfirmarPagamentosPayload {
  plantoes: Array<{
    candidatura_id: string;
    vaga_id: string;
    medico_id: string;
    vaga_valor: number;
  }>;
}

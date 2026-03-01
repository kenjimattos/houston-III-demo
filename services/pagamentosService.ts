/**
 * ✅ MIGRADO: Serviço de pagamentos usando API routes
 *
 * IMPORTANTE: Todas as operações agora usam API routes ao invés de queries diretas.
 * Isso garante autenticação, autorização e RLS consistentes.
 */

import {
  PagamentosFilters,
  PagamentosSortField,
  PagamentosResponse,
} from "@/types/pagamentos";
import { SortDirection } from "@/types";

// ========================================
// QUERY FUNCTIONS (GET)
// ========================================

/**
 * Busca todos os plantões/pagamentos com filtros e paginação
 */
export async function fetchPagamentos({
  pageNumber = 1,
  pageSize = 50,
  orderBy = PagamentosSortField.VAGA_DATA,
  sortDirection = SortDirection.DESC,
  filters = {},
}: {
  pageNumber?: number;
  pageSize?: number;
  orderBy?: PagamentosSortField;
  sortDirection?: SortDirection;
  filters?: PagamentosFilters;
}): Promise<PagamentosResponse> {
  const params = new URLSearchParams({
    pageNumber: pageNumber.toString(),
    pageSize: pageSize.toString(),
    orderBy,
    sortDirection,
  });

  // Adicionar filtros opcionais
  if (filters.hospital_ids?.length) {
    params.append('hospital_ids', filters.hospital_ids.join(','));
  }
  if (filters.setor_ids?.length) {
    params.append('setor_ids', filters.setor_ids.join(','));
  }
  if (filters.especialidade_ids?.length) {
    params.append('especialidade_ids', filters.especialidade_ids.join(','));
  }
  if (filters.medico_ids?.length) {
    params.append('medico_ids', filters.medico_ids.join(','));
  }
  if (filters.status_checkin?.length) {
    params.append('status_checkin', filters.status_checkin.join(','));
  }
  if (filters.status_pagamento?.length) {
    params.append('status_pagamento', filters.status_pagamento.join(','));
  }
  if (filters.data_inicio) {
    params.append('data_inicio', filters.data_inicio);
  }
  if (filters.data_fim) {
    params.append('data_fim', filters.data_fim);
  }

  const response = await fetch(`/api/pagamentos?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar plantões');
  }

  return response.json();
}

/**
 * Busca apenas plantões com pagamento autorizado
 */
export async function fetchPlantoesAutorizados({
  pageNumber = 1,
  pageSize = 50,
  orderBy = PagamentosSortField.VAGA_DATA,
  sortDirection = SortDirection.DESC,
  filters = {},
}: {
  pageNumber?: number;
  pageSize?: number;
  orderBy?: PagamentosSortField;
  sortDirection?: SortDirection;
  filters?: PagamentosFilters;
}): Promise<PagamentosResponse> {
  const params = new URLSearchParams({
    pageNumber: pageNumber.toString(),
    pageSize: pageSize.toString(),
    orderBy,
    sortDirection,
  });

  // Adicionar filtros opcionais
  if (filters.hospital_ids?.length) {
    params.append('hospital_ids', filters.hospital_ids.join(','));
  }
  if (filters.setor_ids?.length) {
    params.append('setor_ids', filters.setor_ids.join(','));
  }
  if (filters.especialidade_ids?.length) {
    params.append('especialidade_ids', filters.especialidade_ids.join(','));
  }
  if (filters.medico_ids?.length) {
    params.append('medico_ids', filters.medico_ids.join(','));
  }
  if (filters.data_inicio) {
    params.append('data_inicio', filters.data_inicio);
  }
  if (filters.data_fim) {
    params.append('data_fim', filters.data_fim);
  }

  const response = await fetch(`/api/pagamentos/autorizados?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar plantões autorizados');
  }

  return response.json();
}

// ========================================
// MUTATION FUNCTIONS (POST/PATCH/DELETE)
// ========================================

/**
 * Autoriza um pagamento (muda status de PENDENTE para AUTORIZADO)
 */
export async function autorizarPagamento({
  pagamento_id,
}: {
  pagamento_id: string;
}): Promise<boolean> {
  const response = await fetch(`/api/pagamentos/${pagamento_id}/autorizar`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao autorizar pagamento');
  }

  return true;
}

/**
 * Marca um pagamento como pago (muda status de AUTORIZADO para PAGO)
 */
export async function marcarComoPago({
  pagamento_id,
}: {
  pagamento_id: string;
}): Promise<boolean> {
  const response = await fetch(`/api/pagamentos/${pagamento_id}/pago`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao marcar pagamento como pago');
  }

  return true;
}

/**
 * Cria um novo registro de pagamento
 */
export async function criarPagamento({
  candidatura_id,
  medico_id,
  valor,
  vaga_id,
}: {
  candidatura_id: string;
  medico_id: string;
  valor: number;
  vaga_id: string;
}): Promise<boolean> {
  const response = await fetch('/api/pagamentos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      candidatura_id,
      medico_id,
      valor,
      vaga_id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar pagamento');
  }

  return true;
}

/**
 * Atualiza o valor de um pagamento existente
 */
export async function atualizarPagamentoValor({
  pagamento_id,
  valor,
}: {
  pagamento_id: string;
  valor: number;
}): Promise<boolean> {
  const response = await fetch(`/api/pagamentos/${pagamento_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ valor }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar valor do pagamento');
  }

  return true;
}

/**
 * Cria um novo pagamento ou atualiza um existente
 */
export async function criarOuAtualizarPagamento({
  candidatura_id,
  vaga_id,
  medico_id,
  valor,
  pagamento_id,
}: {
  candidatura_id: string;
  vaga_id: string;
  medico_id: string;
  valor: number;
  pagamento_id?: string;
}): Promise<boolean> {
  if (pagamento_id) {
    // Atualizar pagamento existente
    return atualizarPagamentoValor({ pagamento_id, valor });
  } else {
    // Criar novo pagamento
    return criarPagamento({ candidatura_id, vaga_id, medico_id, valor });
  }
}

// ========================================
// RE-EXPORTS from other services
// ========================================

export {
  aprovarCheckin,
  rejeitarCheckin,
  aprovarCheckout,
  rejeitarCheckout,
  atualizarCheckinCheckout,
  criarOuAtualizarCheckinCheckout,
} from "./checkinCheckoutService";

export {
  isElegivelParaAutorizacao,
  isElegivelParaPagamento,
} from "@/validators/pagamentosValidator";

export {
  getBrazilNowISO,
  buildTimestamp,
} from "@/utils/pagamentosUtils";

export {
  autorizarPagamentosEmMassa,
  marcarComoPagoEmMassa,
  confirmarCheckinCheckoutEmMassa,
  confirmarPagamentosEmMassa,
} from "./pagamentosBulkService";

export type { BulkOperationResult } from "@/types/pagamentos";

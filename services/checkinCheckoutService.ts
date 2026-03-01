/**
 * ✅ MIGRADO: Serviço de checkin/checkout usando API routes
 *
 * IMPORTANTE: Todas as operações agora usam API routes ao invés de queries diretas.
 * Isso garante autenticação, autorização e RLS consistentes.
 */

export async function aprovarCheckin({
  checkin_id,
}: {
  checkin_id: string;
}): Promise<boolean> {
  const response = await fetch(`/api/checkin-checkout/${checkin_id}/checkin`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ action: 'aprovar' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao aprovar checkin');
  }

  return true;
}

export async function rejeitarCheckin({
  checkin_id,
}: {
  checkin_id: string;
}): Promise<boolean> {
  const response = await fetch(`/api/checkin-checkout/${checkin_id}/checkin`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ action: 'rejeitar' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao rejeitar checkin');
  }

  return true;
}

export async function aprovarCheckout({
  checkin_id,
}: {
  checkin_id: string;
}): Promise<boolean> {
  const response = await fetch(`/api/checkin-checkout/${checkin_id}/checkout`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ action: 'aprovar' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao aprovar checkout');
  }

  return true;
}

export async function rejeitarCheckout({
  checkin_id,
}: {
  checkin_id: string;
}): Promise<boolean> {
  const response = await fetch(`/api/checkin-checkout/${checkin_id}/checkout`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ action: 'rejeitar' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao rejeitar checkout');
  }

  return true;
}

export async function atualizarCheckinCheckout({
  checkin_id,
  checkin,
  checkout,
}: {
  checkin_id: string;
  checkin?: string;
  checkout?: string;
}): Promise<boolean> {
  const response = await fetch(`/api/checkin-checkout/${checkin_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ checkin, checkout }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar checkin/checkout');
  }

  return true;
}

/**
 * Aprova check-in/checkout do gestor
 *
 * REGRA DE NEGÓCIO:
 * - Se médico NÃO preencheu checkin/checkout → campo permanece NULL
 * - Apenas preenche checkin_aprovado_por/em e checkout_aprovado_por/em
 * - Nunca sobrescreve o valor que o médico preencheu
 */
export async function criarOuAtualizarCheckinCheckout({
  vaga_id,
  medico_id,
  checkin_timestamp,
  checkout_timestamp,
  checkin_id,
}: {
  vaga_id: string;
  medico_id: string;
  checkin_timestamp?: string;
  checkout_timestamp?: string;
  checkin_id?: string;
}): Promise<boolean> {
  // Construir payload com vaga_data e horários a partir dos timestamps
  const payload: any = {
    vaga_id,
    medico_id,
  };

  // Extrair data e horários dos timestamps se fornecidos
  if (checkin_timestamp) {
    const [vaga_data, horario_inicio] = checkin_timestamp.split(' ');
    payload.vaga_data = vaga_data;
    payload.horario_inicio = horario_inicio;
  }

  if (checkout_timestamp) {
    const [vaga_data, horario_fim] = checkout_timestamp.split(' ');
    if (!payload.vaga_data) payload.vaga_data = vaga_data;
    payload.horario_fim = horario_fim;
  }

  const response = await fetch('/api/checkin-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar/atualizar checkin/checkout');
  }

  return true;
}

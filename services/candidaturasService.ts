/**
 * ✅ MIGRADO: Serviço de candidaturas usando API routes
 *
 * IMPORTANTE: Todas as operações agora usam API routes ao invés de queries diretas.
 * Isso garante autenticação, autorização e RLS consistentes.
 */

// Aprova uma candidatura pelo ID e fecha a vaga correspondente
// ✅ MIGRADO: Usa API route
export async function aprovarCandidatura({
  candidatura_id,
  vaga_id,
}: {
  candidatura_id: string;
  vaga_id: string;
}) {
  const response = await fetch(`/api/candidaturas/${candidatura_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'aprovar',
      vaga_id
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao aprovar candidatura');
  }

  return true;
}

// Reprova uma candidatura pelo ID
// ✅ MIGRADO: Usa API route
export async function reprovarCandidatura({
  candidatura_id,
}: {
  candidatura_id: string;
}) {
  const response = await fetch(`/api/candidaturas/${candidatura_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'reprovar'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao reprovar candidatura');
  }

  return true;
}

// Atualiza uma candidatura para PENDENTE pelo ID
// ✅ MIGRADO: Usa API route
export async function reconsiderarCandidatura({
  candidatura_id,
}: {
  candidatura_id: string;
}) {
  const response = await fetch(`/api/candidaturas/${candidatura_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'reconsiderar'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao reconsiderar candidatura');
  }

  return true;
}

// Reabre uma vaga (status aberta) pelo ID
// ✅ MIGRADO: Usa API route de vagas (não candidaturas)
export async function reabrirVaga({ vaga_id }: { vaga_id: string }) {
  const response = await fetch(`/api/vagas/${vaga_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'aberta'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao reabrir vaga');
  }

  return true;
}

// Cria uma nova candidatura usando estratégia one-for-all
// ✅ MIGRADO: Usa API route
export async function createCandidatura({
  vaga_id,
  medico_id,
  status = "APROVADO",
  vaga_valor,
}: {
  vaga_id: string;
  medico_id: string;
  status?: "APROVADO" | "PENDENTE" | "REPROVADO";
  vaga_valor: number;
}) {
  const response = await fetch('/api/candidaturas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vaga_id,
      medico_id,
      status,
      vaga_valor
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar candidatura');
  }

  const result = await response.json();
  return result.data;
}

// Cancela todas as candidaturas ativas de uma vaga (reprova PENDENTES e APROVADAS)
// ✅ MIGRADO: Usa API route
export async function cancelarCandidaturasDaVaga({
  vaga_id,
}: {
  vaga_id: string;
}) {
  const response = await fetch(`/api/candidaturas/vaga/${vaga_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'cancelar'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao cancelar candidaturas');
  }

  return true;
}

// Reativa todas as candidaturas reprovadas de uma vaga (volta para PENDENTE)
// ✅ MIGRADO: Usa API route
export async function reativarCandidaturasDaVaga({
  vaga_id,
}: {
  vaga_id: string;
}) {
  const response = await fetch(`/api/candidaturas/vaga/${vaga_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'reativar'
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao reativar candidaturas');
  }

  return true;
}

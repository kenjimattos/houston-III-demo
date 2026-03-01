/**
 * ✅ MIGRADO: Serviço de operações em massa usando API routes
 *
 * IMPORTANTE: Todas as operações agora usam API routes ao invés de queries diretas.
 * Isso garante autenticação, autorização e RLS consistentes.
 */

import { PagamentosData } from "@/types/pagamentos";
import { BulkOperationResult } from "@/types/pagamentos";

export async function autorizarPagamentosEmMassa(
  plantoes: PagamentosData[]
): Promise<BulkOperationResult> {
  const response = await fetch('/api/pagamentos/bulk/autorizar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ plantoes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao autorizar pagamentos em massa');
  }

  const data = await response.json();
  return data.result;
}

export async function marcarComoPagoEmMassa(
  plantoes: PagamentosData[]
): Promise<BulkOperationResult> {
  const response = await fetch('/api/pagamentos/bulk/pago', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ plantoes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao marcar pagamentos como pagos em massa');
  }

  const data = await response.json();
  return data.result;
}

export async function confirmarCheckinCheckoutEmMassa(
  plantoes: PagamentosData[]
): Promise<BulkOperationResult> {
  const response = await fetch('/api/checkin-checkout/bulk/confirmar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ plantoes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao confirmar checkin/checkout em massa');
  }

  const data = await response.json();
  return data.result;
}

export async function confirmarPagamentosEmMassa(
  plantoes: PagamentosData[]
): Promise<BulkOperationResult> {
  const response = await fetch('/api/pagamentos/bulk/confirmar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ plantoes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao confirmar pagamentos em massa');
  }

  const data = await response.json();
  return data.result;
}

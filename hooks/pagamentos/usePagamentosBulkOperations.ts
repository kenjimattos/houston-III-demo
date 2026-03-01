"use client";

import { useState, useCallback } from "react";
import { PagamentosData } from "@/types/pagamentos";
import {
  autorizarPagamentosEmMassa,
  marcarComoPagoEmMassa,
  confirmarCheckinCheckoutEmMassa,
  confirmarPagamentosEmMassa,
} from "@/services/pagamentosBulkService";
import { BulkOperationResult } from "@/types/pagamentos";
import {
  isElegivelParaAutorizacao,
  isElegivelParaPagamento,
} from "@/validators/pagamentosValidator";

export function usePagamentosBulkOperations() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<BulkOperationResult | null>(null);

  const handleBulkAutorizar = useCallback(
    async (
      plantoes: PagamentosData[],
      onSuccess?: () => void
    ): Promise<BulkOperationResult> => {
      setLoading(true);
      try {
        const result = await autorizarPagamentosEmMassa(plantoes);
        setLastResult(result);
        if (result.success > 0 && onSuccess) {
          onSuccess();
        }
        return result;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleBulkPagar = useCallback(
    async (
      plantoes: PagamentosData[],
      onSuccess?: () => void
    ): Promise<BulkOperationResult> => {
      setLoading(true);
      try {
        const result = await marcarComoPagoEmMassa(plantoes);
        setLastResult(result);
        if (result.success > 0 && onSuccess) {
          onSuccess();
        }
        return result;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleBulkConfirmarCheckin = useCallback(
    async (
      plantoes: PagamentosData[],
      onSuccess?: () => void
    ): Promise<BulkOperationResult> => {
      setLoading(true);
      try {
        const result = await confirmarCheckinCheckoutEmMassa(plantoes);
        setLastResult(result);
        if (result.success > 0 && onSuccess) {
          onSuccess();
        }
        return result;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleBulkConfirmarPagamento = useCallback(
    async (
      plantoes: PagamentosData[],
      onSuccess?: () => void
    ): Promise<BulkOperationResult> => {
      setLoading(true);
      try {
        const result = await confirmarPagamentosEmMassa(plantoes);
        setLastResult(result);
        if (result.success > 0 && onSuccess) {
          onSuccess();
        }
        return result;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Conta quantos plantões estão elegíveis para cada ação
  const countElegiveisParaAutorizacao = useCallback((plantoes: PagamentosData[]) => {
    return plantoes.filter(isElegivelParaAutorizacao).length;
  }, []);

  const countElegiveisParaPagamento = useCallback((plantoes: PagamentosData[]) => {
    return plantoes.filter(isElegivelParaPagamento).length;
  }, []);

  return {
    loading,
    lastResult,
    handleBulkAutorizar,
    handleBulkPagar,
    handleBulkConfirmarCheckin,
    handleBulkConfirmarPagamento,
    countElegiveisParaAutorizacao,
    countElegiveisParaPagamento,
  };
}

"use client";

import { BulkActionsBar } from "@/components/ui/bulk-actions-bar";
import { PagamentosData } from "@/types/pagamentos";
import {
  isElegivelParaAutorizacao,
  isElegivelParaPagamento,
} from "@/services/pagamentosService";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, DollarSign, Loader2, Clock, Wallet } from "lucide-react";

interface PagamentosBulkActionsBarProps {
  selectedPagamentos: string[];
  pagamentos: PagamentosData[];
  onClearSelection: () => void;
  onBulkAutorizar: (pagamentos: PagamentosData[]) => Promise<void>;
  onBulkPagar: (pagamentos: PagamentosData[]) => Promise<void>;
  onBulkConfirmarCheckin?: (pagamentos: PagamentosData[]) => Promise<void>;
  onBulkConfirmarPagamento?: (pagamentos: PagamentosData[]) => Promise<void>;
  loading?: boolean;
  canMarcarPago?: boolean;
}

export function PagamentosBulkActionsBar({
  selectedPagamentos,
  pagamentos,
  onClearSelection,
  onBulkAutorizar,
  onBulkPagar,
  onBulkConfirmarCheckin,
  onBulkConfirmarPagamento,
  loading = false,
  canMarcarPago = true,
}: PagamentosBulkActionsBarProps) {
  // Filtra os pagamentos selecionados
  const pagamentosSelecionados = pagamentos.filter((p) =>
    selectedPagamentos.includes(p.candidatura_id)
  );

  // Filtra elegíveis para cada ação
  const elegiveisParaAutorizacaoList = pagamentosSelecionados.filter(
    isElegivelParaAutorizacao
  );
  const elegiveisParaPagamentoList = pagamentosSelecionados.filter(
    isElegivelParaPagamento
  );

  const elegiveisParaAutorizacao = elegiveisParaAutorizacaoList.length;
  const elegiveisParaPagamento = elegiveisParaPagamentoList.length;

  // Conta quantos ainda não têm check-in/checkout e pagamento confirmados
  // Check-in confirmado: médico preencheu (checkin_hora) OU gestor aprovou (checkin_aprovado_em)
  const semCheckin = pagamentosSelecionados.filter(
    (p) => !p.checkin_hora && !p.checkin_aprovado_em
  ).length;
  const semPagamento = pagamentosSelecionados.filter((p) => !p.pagamento_id).length;

  // Calcula total geral dos selecionados
  const totalSelecionado = pagamentosSelecionados.reduce(
    (sum, p) => sum + (p.pagamento_valor || p.vaga_valor || 0),
    0
  );

  // Calcula totais dos elegíveis para cada ação
  const totalParaAutorizar = elegiveisParaAutorizacaoList.reduce(
    (sum, p) => sum + (p.pagamento_valor || p.vaga_valor || 0),
    0
  );
  const totalParaPagar = elegiveisParaPagamentoList.reduce(
    (sum, p) => sum + (p.pagamento_valor || p.vaga_valor || 0),
    0
  );

  const handleBulkAutorizar = async () => {
    await onBulkAutorizar(pagamentosSelecionados);
  };

  const handleBulkPagar = async () => {
    await onBulkPagar(pagamentosSelecionados);
  };

  const handleBulkConfirmarCheckin = async () => {
    if (onBulkConfirmarCheckin) {
      await onBulkConfirmarCheckin(pagamentosSelecionados);
    }
  };

  const handleBulkConfirmarPagamento = async () => {
    if (onBulkConfirmarPagamento) {
      await onBulkConfirmarPagamento(pagamentosSelecionados);
    }
  };

  const actions = [
    // Ações auxiliares (discretas, à esquerda)
    {
      key: "confirmar-checkin",
      label: loading ? "..." : `Check (${semCheckin})`,
      icon: loading ? Loader2 : Clock,
      variant: "ghost" as const,
      className: "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 text-xs h-7 px-2",
      onClick: handleBulkConfirmarCheckin,
      disabled: loading || semCheckin === 0 || !onBulkConfirmarCheckin,
      visible: !!onBulkConfirmarCheckin && semCheckin > 0,
    },
    {
      key: "confirmar-pagamento",
      label: loading ? "..." : `Valor (${semPagamento})`,
      icon: loading ? Loader2 : Wallet,
      variant: "ghost" as const,
      className: "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 text-xs h-7 px-2",
      onClick: handleBulkConfirmarPagamento,
      disabled: loading || semPagamento === 0 || !onBulkConfirmarPagamento,
      visible: !!onBulkConfirmarPagamento && semPagamento > 0,
    },
    // Separador visual (será tratado no render)
    // Ações principais
    {
      key: "autorizar",
      label: loading
        ? "Processando..."
        : `Autorizar (${elegiveisParaAutorizacao})`,
      icon: loading ? Loader2 : CheckCircle,
      variant: "outline" as const,
      className:
        "text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950",
      onClick: handleBulkAutorizar,
      disabled: loading || elegiveisParaAutorizacao === 0,
      visible: elegiveisParaAutorizacao > 0,
    },
    {
      key: "pagar",
      label: loading ? "Processando..." : `Marcar Pago (${elegiveisParaPagamento})`,
      icon: loading ? Loader2 : DollarSign,
      variant: "outline" as const,
      className:
        "text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950",
      onClick: handleBulkPagar,
      disabled: loading || elegiveisParaPagamento === 0,
      visible: canMarcarPago && elegiveisParaPagamento > 0,
    },
  ];

  // Conteúdo extra com totais
  const totaisContent = (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-gray-600 dark:text-gray-400">
        Total selecionado: <strong>{formatCurrency(totalSelecionado)}</strong>
      </span>
      {totalParaAutorizar > 0 && (
        <>
          <span className="text-gray-400">|</span>
          <span className="text-blue-600 dark:text-blue-400">
            A autorizar: <strong>{formatCurrency(totalParaAutorizar)}</strong>
          </span>
        </>
      )}
      {canMarcarPago && totalParaPagar > 0 && (
        <>
          <span className="text-gray-400">|</span>
          <span className="text-green-600 dark:text-green-400">
            A pagar: <strong>{formatCurrency(totalParaPagar)}</strong>
          </span>
        </>
      )}
    </div>
  );

  return (
    <BulkActionsBar
      selectedItems={selectedPagamentos}
      items={pagamentos}
      itemName="pagamento"
      itemNamePlural="pagamentos"
      onClearSelection={onClearSelection}
      actions={actions}
      loading={loading}
      bgColor="bg-blue-50 dark:bg-blue-950/20"
      borderColor="border-blue-200 dark:border-blue-800"
      textColor="text-blue-700 dark:text-blue-300"
      extraContent={totaisContent}
    />
  );
}

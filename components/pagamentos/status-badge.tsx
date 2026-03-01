"use client";

import { Badge } from "@/components/ui/badge";
import { PagamentosStatus } from "@/types/pagamentos";

interface StatusBadgeProps {
  vagaStatus: string;
  pagamentoStatus: PagamentosStatus | null | undefined;
}

const pagamentoStyles: Record<PagamentosStatus, string> = {
  PENDENTE:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 text-[10px] px-1.5 py-0.5",
  AUTORIZADO:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 text-[10px] px-1.5 py-0.5",
  PAGO:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 text-[10px] px-1.5 py-0.5",
};

export function StatusBadge({ vagaStatus, pagamentoStatus }: StatusBadgeProps) {
  // Se tem pagamento_status, mostra ele
  if (pagamentoStatus) {
    return (
      <Badge variant="outline" className={pagamentoStyles[pagamentoStatus]}>
        {pagamentoStatus}
      </Badge>
    );
  }

  // Senão, mostra vaga_status
  if (vagaStatus === "fechada") {
    return (
      <Badge
        variant="outline"
        className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 text-[10px] px-1.5 py-0.5"
      >
        FECHADA
      </Badge>
    );
  }

  if (vagaStatus === "aberta") {
    return (
      <Badge
        variant="outline"
        className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 text-[10px] px-1.5 py-0.5"
      >
        ABERTA
      </Badge>
    );
  }

  return <span className="text-muted-foreground">-</span>;
}

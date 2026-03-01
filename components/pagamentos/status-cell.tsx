"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "./status-badge";
import { formatDateTimeBrasil } from "@/lib/date-formatters";
import { PagamentosStatus } from "@/types/pagamentos";

interface StatusCellProps {
  vagaStatus: string;
  pagamentoStatus: PagamentosStatus | null | undefined;
  autorizadoPor: string | null | undefined;
  autorizadoPorNome: string | null | undefined;
  autorizadoEm: string | null | undefined;
  pagoPor: string | null | undefined;
  pagoPorNome: string | null | undefined;
  pagoEm: string | null | undefined;
}

export function StatusCell({
  vagaStatus,
  pagamentoStatus,
  autorizadoPor,
  autorizadoPorNome,
  autorizadoEm,
  pagoPor,
  pagoPorNome,
  pagoEm,
}: StatusCellProps) {
  const hasTooltipInfo = autorizadoPor || pagoPor;

  if (!hasTooltipInfo) {
    return <StatusBadge vagaStatus={vagaStatus} pagamentoStatus={pagamentoStatus} />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-pointer">
            <StatusBadge vagaStatus={vagaStatus} pagamentoStatus={pagamentoStatus} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex flex-col gap-1 text-xs">
            {autorizadoPor && autorizadoEm && (
              <div>
                <span className="font-medium">Autorizado por: </span>
                <span>{autorizadoPorNome || "Usuário"}</span>
                <span className="text-muted-foreground ml-1">
                  ({formatDateTimeBrasil(autorizadoEm)})
                </span>
              </div>
            )}
            {pagamentoStatus === "PAGO" && pagoEm && (
              <div>
                <span className="font-medium text-green-600">Pago por: </span>
                <span>{pagoPorNome || "Usuário"}</span>
                <span className="text-muted-foreground ml-1">
                  ({formatDateTimeBrasil(pagoEm)})
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

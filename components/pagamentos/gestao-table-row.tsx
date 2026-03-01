"use client";

import { DoctorNameLink } from "@/components/medicos/doctor-name-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { marcarComoPago } from "@/services/pagamentosService";
import { PagamentosData, PagamentosStatus } from "@/types/pagamentos";
import { format, parseISO } from "date-fns";

interface GestaoTableRowProps {
  plantao: PagamentosData;
  onDataRefresh: () => void;
}

function getPagamentoStatusBadge(status: PagamentosStatus | null | undefined) {
  if (!status) return <span className="text-muted-foreground">-</span>;

  const styles: Record<PagamentosStatus, string> = {
    PENDENTE:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
    AUTORIZADO:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    PAGO:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  };

  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  );
}

export function GestaoTableRow({ plantao, onDataRefresh }: GestaoTableRowProps) {
  const handleMarcarPago = async () => {
    if (!plantao.pagamento_id) return;
    try {
      await marcarComoPago({ pagamento_id: plantao.pagamento_id });
      onDataRefresh();
    } catch {
      alert("Erro ao marcar como pago");
    }
  };

  const pagamentoStatus = plantao.pagamento_status as PagamentosStatus | null;
  const canMarcarPago = pagamentoStatus === "AUTORIZADO";

  return (
    <TableRow>
      <TableCell>
        {plantao.vaga_data
          ? format(parseISO(plantao.vaga_data), "dd/MM/yyyy")
          : "-"}
      </TableCell>
      <TableCell className="text-left truncate max-w-xs">
        <DoctorNameLink
          doctorId={plantao.medico_id}
          doctorName={plantao.medico_nome}
        />
      </TableCell>
      <TableCell>{plantao.hospital_nome}</TableCell>
      <TableCell>{plantao.setor_nome || "-"}</TableCell>
      <TableCell>
        {plantao.vaga_horainicio} - {plantao.vaga_horafim}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(plantao.vaga_valor)}
      </TableCell>
      <TableCell>{getPagamentoStatusBadge(pagamentoStatus)}</TableCell>
      <TableCell>
        {plantao.autorizado_por && (
          <span className="text-xs text-muted-foreground">
            {plantao.autorizado_em
              ? format(parseISO(plantao.autorizado_em), "dd/MM/yyyy HH:mm")
              : "-"}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canMarcarPago && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-green-600 border-green-200 hover:bg-green-50 font-normal"
            onClick={handleMarcarPago}
          >
            Marcar como Pago
          </Button>
        )}
        {pagamentoStatus === "PAGO" && plantao.pago_em && (
          <span className="text-xs text-muted-foreground">
            Pago em{" "}
            {format(parseISO(plantao.pago_em), "dd/MM/yyyy HH:mm")}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

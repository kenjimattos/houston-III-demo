"use client";

import { DoctorNameLink } from "@/components/medicos/doctor-name-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  aprovarCandidatura,
  reconsiderarCandidatura,
  reprovarCandidatura,
} from "@/services/candidaturasService";
import { ApplicationData } from "@/types";
import { format, parseISO } from "date-fns";
import { Eye } from "lucide-react";

interface CandidaturaTableRowProps {
  application: ApplicationData;
  onDetailsModalOpen: (application: ApplicationData) => void;
  onDataRefresh: () => void;
}

export function CandidaturaTableRow({
  application,
  onDetailsModalOpen,
  onDataRefresh,
}: CandidaturaTableRowProps) {
  const handleAprovar = async () => {
    try {
      await aprovarCandidatura({
        candidatura_id: application.candidatura_id,
        vaga_id: application.vaga.vaga_id,
      });
      onDataRefresh();
    } catch (err) {
      alert("Erro ao aprovar candidatura");
    }
  };

  const handleReprovar = async () => {
    try {
      await reprovarCandidatura({
        candidatura_id: application.candidatura_id,
      });
      onDataRefresh();
    } catch (err) {
      alert("Erro ao reprovar candidatura");
    }
  };

  const handleReconsiderar = async () => {
    try {
      await reconsiderarCandidatura({
        candidatura_id: application.candidatura_id,
      });
      onDataRefresh();
    } catch (err) {
      alert("Erro ao reconsiderar candidatura");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "APROVADO":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900";
      case "REPROVADO":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900";
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900";
    }
  };

  const formatDate = (dateString: string) => {
    return (
      dateString.slice(8, 10) +
      "/" +
      dateString.slice(5, 7) +
      "/" +
      dateString.slice(0, 4)
    );
  };

  return (
    <TableRow key={application.candidatura_id}>
      <TableCell>
        {application.candidatura_createdate
          ? format(parseISO(application.candidatura_createdate), "dd/MM/yyyy")
          : "-"}
      </TableCell>
      <TableCell className="text-left truncate max-w-xs overflow-ellipsis">
        <DoctorNameLink
          doctorId={application.medico.medico_id}
          doctorName={
            application.medico.medico_primeiro_nome +
            " " +
            application.medico.medico_sobrenome
          }
        />
      </TableCell>
      <TableCell className="text-left w-min-fit">
        {application.hospital.hospital_nome}
      </TableCell>
      <TableCell>{application.setor.setor_nome || "-"}</TableCell>
      <TableCell>
        {application.vaga.vaga_data
          ? formatDate(application.vaga.vaga_data)
          : "-"}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(application.vaga.vaga_valor)}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={getStatusBadgeClass(application.candidatura_status)}
        >
          {application.candidatura_status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDetailsModalOpen(application)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {application.candidatura_status === "PENDENTE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 font-normal"
                onClick={handleAprovar}
              >
                Aprovar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-normal"
                onClick={handleReprovar}
              >
                Reprovar
              </Button>
            </>
          )}
          {application.candidatura_status === "APROVADO" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-normal"
              onClick={handleReconsiderar}
            >
              Cancelar
            </Button>
          )}
          {application.candidatura_status === "REPROVADO" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 font-normal"
              onClick={handleReconsiderar}
            >
              Reconsiderar
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

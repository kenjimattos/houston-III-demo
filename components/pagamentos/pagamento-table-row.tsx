"use client";

import { DoctorNameLink } from "@/components/medicos/doctor-name-link";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { usePagamentoRowState } from "@/hooks/pagamentos/usePagamentoRowState";
import { usePagamentoActions } from "@/hooks/pagamentos/usePagamentoActions";
import { formatCurrency } from "@/lib/utils";
import { isElegivelParaAutorizacao } from "@/services/pagamentosService";
import { PagamentosData, PagamentosStatus } from "@/types/pagamentos";
import { Permission } from "@/types/permission";
import { format, parseISO } from "date-fns";

import { CheckinCheckoutInput, PagamentoInput } from "./inputs";
import { StatusCell } from "./status-cell";
import { ActionButtons } from "./action-buttons";

interface PagamentosTableRowProps {
  pagamento: PagamentosData;
  onDataRefresh: () => void;
  isSelected?: boolean;
  onSelectionChange?: (candidaturaId: string, selected: boolean) => void;
  showCheckbox?: boolean;
  canMarcarPago?: boolean;
}

export function PagamentosTableRow({
  pagamento,
  onDataRefresh,
  isSelected = false,
  onSelectionChange,
  showCheckbox = false,
  canMarcarPago: canMarcarPagoProp = true,
}: PagamentosTableRowProps) {
  const { has } = usePermissions();

  // Fallback para relatorios.update enquanto as novas permissões não estão em prod
  const canEditCheckinCheckout = has(Permission.PAGAMENTOS_UPDATE);
  const canEditPagamento = has(Permission.PAGAMENTOS_UPDATE);

  // Estado consolidado
  const state = usePagamentoRowState(pagamento);

  // Ações
  const actions = usePagamentoActions({
    pagamento,
    onDataRefresh,
    checkinDate: state.checkinDate,
    checkinTime: state.checkinTime,
    checkoutDate: state.checkoutDate,
    checkoutTime: state.checkoutTime,
    pagamentoValue: state.pagamentoValue,
    setIsEditingCheckin: state.setIsEditingCheckin,
    setIsEditingCheckout: state.setIsEditingCheckout,
    setIsEditingPagamento: state.setIsEditingPagamento,
    // Novos parâmetros para salvamento unificado
    setIsEditingCheckinCheckout: state.setIsEditingCheckinCheckout,
    hasCheckinChanges: state.hasCheckinChanges,
    hasCheckoutChanges: state.hasCheckoutChanges,
  });

  // Verificar se vaga está fechada (pré-requisito para edição)
  const vagaFechada = pagamento.vaga_status === "fechada";
  const pagamentoStatus = pagamento.pagamento_status as PagamentosStatus | null;
  const pagamentoFinalizado = pagamentoStatus === "AUTORIZADO" || pagamentoStatus === "PAGO";

  // Campos só editáveis se vaga fechada E pagamento não finalizado
  const canEditCheckinCheckoutField = canEditCheckinCheckout && vagaFechada && !pagamentoFinalizado;
  const canEditPagamentoField = canEditPagamento && vagaFechada && (!pagamentoStatus || pagamentoStatus === "PENDENTE");

  const canAutorizarPagamento = canEditPagamento && isElegivelParaAutorizacao(pagamento);
  // Só pode marcar como pago se: tem permissão de edição, status é AUTORIZADO, E a prop permite (baseada na role)
  const canMarcarPago = canEditPagamento && pagamentoStatus === "AUTORIZADO" && canMarcarPagoProp;

  const handleCheckboxChange = (checked: boolean) => {
    onSelectionChange?.(pagamento.candidatura_id, checked);
  };

  return (
    <TableRow className={isSelected ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}>
      {/* Checkbox de seleção */}
      {showCheckbox && (
        <TableCell className="w-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            aria-label={`Selecionar plantão de ${pagamento.medico_nome}`}
          />
        </TableCell>
      )}

      {/* Data */}
      <TableCell>
        {pagamento.vaga_data
          ? format(parseISO(pagamento.vaga_data), "dd/MM/yyyy")
          : "-"}
      </TableCell>

      {/* Médico */}
      <TableCell className="text-left truncate max-w-xs">
        <DoctorNameLink
          doctorId={pagamento.medico_id}
          doctorName={pagamento.medico_nome}
        />
      </TableCell>

      {/* Hospital */}
      <TableCell>{pagamento.hospital_nome}</TableCell>

      {/* Setor */}
      <TableCell>{pagamento.setor_nome || "-"}</TableCell>

      {/* Horário da Vaga */}
      <TableCell>
        {pagamento.vaga_horainicio} - {pagamento.vaga_horafim}
      </TableCell>

      {/* Valor da Vaga */}
      <TableCell className="text-right">
        {formatCurrency(pagamento.vaga_valor)}
      </TableCell>

      {/* Check-in / Check-out */}
      <TableCell>
        <CheckinCheckoutInput
          // Check-in
          checkinDate={state.checkinDate}
          checkinTime={state.checkinTime}
          onCheckinDateChange={state.setCheckinDate}
          onCheckinTimeChange={state.setCheckinTime}
          checkinCalendarOpen={state.checkinCalendarOpen}
          onCheckinCalendarOpenChange={state.setCheckinCalendarOpen}
          showCheckinWarning={!pagamento.checkin_hora}
          checkinWarningMessage="Médico não registrou entrada"
          // Check-out
          checkoutDate={state.checkoutDate}
          checkoutTime={state.checkoutTime}
          onCheckoutDateChange={state.setCheckoutDate}
          onCheckoutTimeChange={state.setCheckoutTime}
          checkoutCalendarOpen={state.checkoutCalendarOpen}
          onCheckoutCalendarOpenChange={state.setCheckoutCalendarOpen}
          showCheckoutWarning={!pagamento.checkout_hora}
          checkoutWarningMessage="Médico não registrou saída"
          // Estado compartilhado
          canEdit={canEditCheckinCheckoutField}
          jaSalvo={state.checkinCheckoutJaSalvo}
          isEditing={state.isEditingCheckinCheckout}
          onEditClick={() => state.setIsEditingCheckinCheckout(true)}
          onSave={actions.handleSaveCheckinCheckout}
          onCancel={() => {
            state.resetCheckinCheckoutToOriginal();
            state.setIsEditingCheckinCheckout(false);
          }}
        />
      </TableCell>

      {/* Valor do Pagamento */}
      <TableCell>
        <PagamentoInput
          value={state.pagamentoValue}
          onChange={state.setPagamentoValue}
          canEdit={canEditPagamentoField}
          jaSalvo={state.pagamentoJaSalvo}
          isEditing={state.isEditingPagamento}
          onEditClick={() => state.setIsEditingPagamento(true)}
          onSave={actions.handleSavePagamento}
          onCancel={() => state.setIsEditingPagamento(false)}
          originalValue={pagamento.pagamento_valor?.toString() || pagamento.vaga_valor?.toString() || ""}
        />
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusCell
          vagaStatus={pagamento.vaga_status}
          pagamentoStatus={pagamentoStatus}
          autorizadoPor={pagamento.autorizado_por}
          autorizadoPorNome={pagamento.autorizado_por_nome}
          autorizadoEm={pagamento.autorizado_em}
          pagoPor={pagamento.pago_por}
          pagoPorNome={pagamento.pago_por_nome}
          pagoEm={pagamento.pago_em}
        />
      </TableCell>

      {/* Ações */}
      <TableCell className="text-right">
        <ActionButtons
          canAutorizarPagamento={canAutorizarPagamento}
          canMarcarPago={canMarcarPago}
          onAutorizar={actions.handleAutorizarPagamento}
          onMarcarPago={actions.handleMarcarPago}
        />
      </TableCell>
    </TableRow>
  );
}

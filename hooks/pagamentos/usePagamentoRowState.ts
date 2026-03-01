import { useState, useEffect } from "react";
import { PagamentosData } from "@/types/pagamentos";
import { formatTimeForInput, parseDateFromTimestamp } from "@/lib/date-formatters";

export interface PagamentoRowState {
  // Estados de horário (time string HH:mm)
  checkinTime: string;
  setCheckinTime: (time: string) => void;
  checkoutTime: string;
  setCheckoutTime: (time: string) => void;

  // Estados de data (Date object)
  checkinDate: Date | undefined;
  setCheckinDate: (date: Date | undefined) => void;
  checkoutDate: Date | undefined;
  setCheckoutDate: (date: Date | undefined) => void;

  // Estado do valor de pagamento
  pagamentoValue: string;
  setPagamentoValue: (value: string) => void;

  // Estados de edição (legado - mantido para compatibilidade)
  isEditingCheckin: boolean;
  setIsEditingCheckin: (editing: boolean) => void;
  isEditingCheckout: boolean;
  setIsEditingCheckout: (editing: boolean) => void;
  isEditingPagamento: boolean;
  setIsEditingPagamento: (editing: boolean) => void;

  // Estado unificado de edição para check-in/check-out
  isEditingCheckinCheckout: boolean;
  setIsEditingCheckinCheckout: (editing: boolean) => void;

  // Estados de popover do calendário
  checkinCalendarOpen: boolean;
  setCheckinCalendarOpen: (open: boolean) => void;
  checkoutCalendarOpen: boolean;
  setCheckoutCalendarOpen: (open: boolean) => void;

  // Computed values
  checkinJaSalvo: boolean;
  checkoutJaSalvo: boolean;
  checkinCheckoutJaSalvo: boolean;
  pagamentoJaSalvo: boolean;

  // Valores originais para detectar mudanças
  originalCheckinTime: string;
  originalCheckinDate: Date | undefined;
  originalCheckoutTime: string;
  originalCheckoutDate: Date | undefined;

  // Detectores de mudança
  hasCheckinChanges: boolean;
  hasCheckoutChanges: boolean;
  hasAnyCheckinCheckoutChanges: boolean;

  // Função para resetar valores ao original (cancelar edição)
  resetCheckinCheckoutToOriginal: () => void;
}

export function usePagamentoRowState(pagamento: PagamentosData): PagamentoRowState {
  // Valores originais (para detectar mudanças e cancelar edição)
  const originalCheckinTime = formatTimeForInput(pagamento.checkin_hora || pagamento.checkin_aprovado_em);
  const originalCheckoutTime = formatTimeForInput(pagamento.checkout_hora || pagamento.checkout_aprovado_em);
  const originalCheckinDate = parseDateFromTimestamp(pagamento.checkin_hora || pagamento.checkin_aprovado_em);
  const originalCheckoutDate = parseDateFromTimestamp(pagamento.checkout_hora || pagamento.checkout_aprovado_em);

  // Estados de horário (time string HH:mm) - COM fallback para aprovado_em (gestor)
  const [checkinTime, setCheckinTime] = useState(originalCheckinTime);
  const [checkoutTime, setCheckoutTime] = useState(originalCheckoutTime);

  // Estados de data (Date object) - COM fallback para aprovado_em (gestor)
  const [checkinDate, setCheckinDate] = useState<Date | undefined>(originalCheckinDate);
  const [checkoutDate, setCheckoutDate] = useState<Date | undefined>(originalCheckoutDate);

  const [pagamentoValue, setPagamentoValue] = useState(
    pagamento.pagamento_valor?.toString() || pagamento.vaga_valor?.toString() || ""
  );

  // Estados de edição (legado - mantido para compatibilidade)
  const [isEditingCheckin, setIsEditingCheckin] = useState(false);
  const [isEditingCheckout, setIsEditingCheckout] = useState(false);
  const [isEditingPagamento, setIsEditingPagamento] = useState(false);

  // Estado unificado de edição para check-in/check-out
  const [isEditingCheckinCheckout, setIsEditingCheckinCheckout] = useState(false);

  // Estados de popover do calendário
  const [checkinCalendarOpen, setCheckinCalendarOpen] = useState(false);
  const [checkoutCalendarOpen, setCheckoutCalendarOpen] = useState(false);

  // Verificar se já foi salvo (médico preencheu OU gestor aprovou)
  const checkinJaSalvo = !!pagamento.checkin_hora || !!pagamento.checkin_aprovado_em;
  const checkoutJaSalvo = !!pagamento.checkout_hora || !!pagamento.checkout_aprovado_em;
  const checkinCheckoutJaSalvo = checkinJaSalvo || checkoutJaSalvo;
  const pagamentoJaSalvo = !!pagamento.pagamento_id;

  // Detectar mudanças comparando com valores originais
  const hasCheckinChanges =
    checkinTime !== originalCheckinTime ||
    checkinDate?.getTime() !== originalCheckinDate?.getTime();

  const hasCheckoutChanges =
    checkoutTime !== originalCheckoutTime ||
    checkoutDate?.getTime() !== originalCheckoutDate?.getTime();

  const hasAnyCheckinCheckoutChanges = hasCheckinChanges || hasCheckoutChanges;

  // Função para resetar valores ao original (cancelar edição)
  const resetCheckinCheckoutToOriginal = () => {
    setCheckinTime(originalCheckinTime);
    setCheckinDate(originalCheckinDate);
    setCheckoutTime(originalCheckoutTime);
    setCheckoutDate(originalCheckoutDate);
  };

  useEffect(() => {
    // COM fallback para aprovado_em (quando gestor confirma sem médico preencher)
    setCheckinTime(formatTimeForInput(pagamento.checkin_hora || pagamento.checkin_aprovado_em));
    setCheckoutTime(formatTimeForInput(pagamento.checkout_hora || pagamento.checkout_aprovado_em));
    setCheckinDate(parseDateFromTimestamp(pagamento.checkin_hora || pagamento.checkin_aprovado_em));
    setCheckoutDate(parseDateFromTimestamp(pagamento.checkout_hora || pagamento.checkout_aprovado_em));
    setPagamentoValue(pagamento.pagamento_valor?.toString() || pagamento.vaga_valor?.toString() || "");
    setIsEditingCheckin(false);
    setIsEditingCheckout(false);
    setIsEditingPagamento(false);
    setIsEditingCheckinCheckout(false);
  }, [
    pagamento.checkin_hora,
    pagamento.checkout_hora,
    pagamento.checkin_aprovado_em,
    pagamento.checkout_aprovado_em,
    pagamento.pagamento_valor,
    pagamento.vaga_valor,
  ]);

  return {
    checkinTime,
    setCheckinTime,
    checkoutTime,
    setCheckoutTime,
    checkinDate,
    setCheckinDate,
    checkoutDate,
    setCheckoutDate,
    pagamentoValue,
    setPagamentoValue,
    isEditingCheckin,
    setIsEditingCheckin,
    isEditingCheckout,
    setIsEditingCheckout,
    isEditingPagamento,
    setIsEditingPagamento,
    isEditingCheckinCheckout,
    setIsEditingCheckinCheckout,
    checkinCalendarOpen,
    setCheckinCalendarOpen,
    checkoutCalendarOpen,
    setCheckoutCalendarOpen,
    checkinJaSalvo,
    checkoutJaSalvo,
    checkinCheckoutJaSalvo,
    pagamentoJaSalvo,
    originalCheckinTime,
    originalCheckinDate,
    originalCheckoutTime,
    originalCheckoutDate,
    hasCheckinChanges,
    hasCheckoutChanges,
    hasAnyCheckinCheckoutChanges,
    resetCheckinCheckoutToOriginal,
  };
}

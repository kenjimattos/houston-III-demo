import { toast } from "sonner";
import { PagamentosData } from "@/types/pagamentos";
import {
  autorizarPagamento,
  marcarComoPago,
  criarOuAtualizarCheckinCheckout,
  criarOuAtualizarPagamento,
} from "@/services/pagamentosService";
import { buildTimestampFromDateTime } from "@/utils/pagamentosUtils";

export interface PagamentosActionsParams {
  pagamento: PagamentosData;
  onDataRefresh: () => void;
  checkinDate: Date | undefined;
  checkinTime: string;
  checkoutDate: Date | undefined;
  checkoutTime: string;
  pagamentoValue: string;
  setIsEditingCheckin: (editing: boolean) => void;
  setIsEditingCheckout: (editing: boolean) => void;
  setIsEditingPagamento: (editing: boolean) => void;
  // Novos parâmetros para salvamento unificado
  setIsEditingCheckinCheckout?: (editing: boolean) => void;
  hasCheckinChanges?: boolean;
  hasCheckoutChanges?: boolean;
}

export interface PagamentosActions {
  handleAutorizarPagamento: () => Promise<void>;
  handleMarcarPago: () => Promise<void>;
  handleSaveCheckin: () => Promise<void>;
  handleSaveCheckout: () => Promise<void>;
  handleSavePagamento: () => Promise<void>;
  // Nova função unificada
  handleSaveCheckinCheckout: () => Promise<void>;
}

export function usePagamentoActions({
  pagamento,
  onDataRefresh,
  checkinDate,
  checkinTime,
  checkoutDate,
  checkoutTime,
  pagamentoValue,
  setIsEditingCheckin,
  setIsEditingCheckout,
  setIsEditingPagamento,
  setIsEditingCheckinCheckout,
  hasCheckinChanges = false,
  hasCheckoutChanges = false,
}: PagamentosActionsParams): PagamentosActions {
  const handleAutorizarPagamento = async () => {
    try {
      let pagamentoId = pagamento.pagamento_id;

      // Se não existe pagamento, criar primeiro
      if (!pagamentoId) {
        const valor = Number(pagamentoValue.replace(",", ".")) || pagamento.vaga_valor || 0;
        await criarOuAtualizarPagamento({
          candidatura_id: pagamento.candidatura_id,
          vaga_id: pagamento.vaga_id,
          medico_id: pagamento.medico_id,
          valor,
        });
        // Refresh para obter o pagamento_id criado
        onDataRefresh();
        return; // Após refresh, usuário clica novamente para autorizar
      }

      await autorizarPagamento({ pagamento_id: pagamentoId });
      onDataRefresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Erro ao autorizar pagamento:", errorMessage, err);
      toast.error(`Erro ao autorizar pagamento: ${errorMessage}`);
    }
  };

  const handleMarcarPago = async () => {
    if (!pagamento.pagamento_id) return;
    try {
      await marcarComoPago({ pagamento_id: pagamento.pagamento_id });
      onDataRefresh();
    } catch {
      toast.error("Erro ao marcar como pago");
    }
  };

  const handleSaveCheckin = async () => {
    if (!checkinDate || !checkinTime) {
      toast.error("Data e horário são obrigatórios");
      return;
    }
    try {
      const timestamp = buildTimestampFromDateTime(checkinDate, checkinTime);
      await criarOuAtualizarCheckinCheckout({
        vaga_id: pagamento.vaga_id,
        medico_id: pagamento.medico_id,
        checkin_timestamp: timestamp,
        checkin_id: pagamento.checkin_id?.toString() || undefined,
      });
      setIsEditingCheckin(false);
      onDataRefresh();
      toast.success("Check-in salvo com sucesso");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Erro ao salvar check-in:", errorMessage, err);
      toast.error(`Erro ao salvar check-in: ${errorMessage}`);
    }
  };

  const handleSaveCheckout = async () => {
    if (!checkoutDate || !checkoutTime) {
      toast.error("Data e horário são obrigatórios");
      return;
    }
    try {
      const timestamp = buildTimestampFromDateTime(checkoutDate, checkoutTime);
      await criarOuAtualizarCheckinCheckout({
        vaga_id: pagamento.vaga_id,
        medico_id: pagamento.medico_id,
        checkout_timestamp: timestamp,
        checkin_id: pagamento.checkin_id?.toString() || undefined,
      });
      setIsEditingCheckout(false);
      onDataRefresh();
      toast.success("Check-out salvo com sucesso");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Erro ao salvar check-out:", errorMessage, err);
      toast.error(`Erro ao salvar check-out: ${errorMessage}`);
    }
  };

  const handleSavePagamento = async () => {
    try {
      await criarOuAtualizarPagamento({
        candidatura_id: pagamento.candidatura_id,
        vaga_id: pagamento.vaga_id,
        medico_id: pagamento.medico_id,
        valor: Number(pagamentoValue.replace(",", ".")),
        pagamento_id: pagamento.pagamento_id || undefined,
      });
      setIsEditingPagamento(false);
      onDataRefresh();
      toast.success("Valor do pagamento salvo com sucesso");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Erro ao salvar pagamento:", errorMessage, err);
      toast.error(`Erro ao salvar pagamento: ${errorMessage}`);
    }
  };

  // Função unificada para salvar check-in e check-out de uma vez
  const handleSaveCheckinCheckout = async () => {
    const savedItems: string[] = [];

    // Preparar timestamps apenas se houver mudanças e dados válidos
    let checkinTimestamp: string | undefined;
    let checkoutTimestamp: string | undefined;

    if (hasCheckinChanges && checkinDate && checkinTime) {
      checkinTimestamp = buildTimestampFromDateTime(checkinDate, checkinTime);
      savedItems.push("check-in");
    }

    if (hasCheckoutChanges && checkoutDate && checkoutTime) {
      checkoutTimestamp = buildTimestampFromDateTime(checkoutDate, checkoutTime);
      savedItems.push("check-out");
    }

    if (savedItems.length === 0) {
      toast.info("Nenhuma alteração para salvar");
      setIsEditingCheckinCheckout?.(false);
      return;
    }

    try {
      // Uma única chamada com ambos os valores (se aplicável)
      await criarOuAtualizarCheckinCheckout({
        vaga_id: pagamento.vaga_id,
        medico_id: pagamento.medico_id,
        checkin_timestamp: checkinTimestamp,
        checkout_timestamp: checkoutTimestamp,
        checkin_id: pagamento.checkin_id?.toString() || undefined,
      });

      setIsEditingCheckinCheckout?.(false);
      onDataRefresh();
      toast.success(`${savedItems.join(" e ")} salvo(s) com sucesso`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Erro ao salvar check-in/check-out:", errorMessage, err);
      toast.error(`Erro ao salvar: ${errorMessage}`);
    }
  };

  return {
    handleAutorizarPagamento,
    handleMarcarPago,
    handleSaveCheckin,
    handleSaveCheckout,
    handleSavePagamento,
    handleSaveCheckinCheckout,
  };
}

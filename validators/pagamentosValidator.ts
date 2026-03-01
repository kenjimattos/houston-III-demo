import { PagamentosData } from "@/types/pagamentos";

export function isElegivelParaAutorizacao(plantao: PagamentosData): boolean {
  // Check-in confirmado: médico preencheu OU gestor aprovou
  const checkinConfirmado = !!(plantao.checkin_hora || plantao.checkin_aprovado_em);
  // Checkout confirmado: médico preencheu OU gestor aprovou
  const checkoutConfirmado = !!(plantao.checkout_hora || plantao.checkout_aprovado_em);

  return !!(
    checkinConfirmado &&
    checkoutConfirmado &&
    plantao.pagamento_valor &&
    (!plantao.pagamento_status || plantao.pagamento_status === "PENDENTE")
  );
}

export function isElegivelParaPagamento(plantao: PagamentosData): boolean {
  return plantao.pagamento_status === "AUTORIZADO";
}

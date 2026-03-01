import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Cria uma data local a partir de uma string YYYY-MM-DD
 * sem problemas de timezone
 */
export function createLocalDate(dateString: string): Date {
  if (!dateString) return new Date();

  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formata uma string de data YYYY-MM-DD para exibição
 * mantendo a data local sem conversões de timezone
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return "";

  const localDate = createLocalDate(dateString);
  return format(localDate, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Formata uma string de data para chave (YYYY-MM-DD)
 * garantindo que seja a mesma data que aparece na tela
 */
export function formatDateKey(dateString: string): string {
  if (!dateString) return "";

  const localDate = createLocalDate(dateString);
  return format(localDate, "yyyy-MM-dd");
}

/**
 * Verifica se uma data está dentro de um intervalo
 * usando datas locais para evitar problemas de timezone
 */
export function isDateInRange(
  dateString: string,
  startDate: Date,
  endDate: Date
): boolean {
  const date = createLocalDate(dateString);
  return date >= startDate && date <= endDate;
}

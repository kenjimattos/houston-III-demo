import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata um timestamp para exibição no formato HH:mm no fuso horário de Brasília
 */
export function formatTimeForInput(time: string | null | undefined): string {
  if (!time) return "";
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) return "";

    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    return "";
  }
}

/**
 * Formata um timestamp ISO para exibição no formato dd/MM/yy HH:mm
 */
export function formatDateTimeBrasil(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "dd/MM/yy HH:mm");
}

/**
 * Converte um timestamp para um objeto Date no fuso horário de Brasília
 */
export function parseDateFromTimestamp(timestamp: string | null | undefined): Date | undefined {
  if (!timestamp) return undefined;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return undefined;

    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const brasilDateStr = formatter.format(date); // "YYYY-MM-DD"
    return parseISO(brasilDateStr);
  } catch {
    return undefined;
  }
}

/**
 * Formata uma data para exibição no formato dd/MM/yy
 */
export function formatDateForDisplay(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "dd/MM/yy", { locale: ptBR });
}

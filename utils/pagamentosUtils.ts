export function getBrazilNowISO(): string {
  // Formata a data/hora atual no fuso horário de Brasília com offset -03:00
  const now = new Date();
  const brasilFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // Formato: "YYYY-MM-DD HH:mm:ss-03:00" para que o banco saiba que é horário de Brasília
  return brasilFormatter.format(now).replace("T", " ") + "-03:00";
}

export function buildTimestamp(vaga_data: string, timeString: string): string {
  const dateOnly = vaga_data.split("T")[0];
  // Garantir formato HH:mm:ss
  const timeParts = timeString.split(":");
  const hours = timeParts[0] || "00";
  const minutes = timeParts[1] || "00";
  const seconds = timeParts[2] || "00";
  return `${dateOnly} ${hours}:${minutes}:${seconds}-03:00`;
}

/**
 * Constrói timestamp a partir de data e hora separados
 * @param date - Data (Date object ou string ISO)
 * @param time - Hora no formato HH:mm ou HH:mm:ss
 * @returns Timestamp no formato "YYYY-MM-DD HH:mm:ss-03:00"
 */
export function buildTimestampFromDateTime(date: Date | string, time: string): string {
  let dateOnly: string;

  if (date instanceof Date) {
    // Formatar Date para YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dateOnly = `${year}-${month}-${day}`;
  } else {
    // Se for string, extrair parte da data
    dateOnly = date.split("T")[0];
  }

  // Garantir formato HH:mm:ss
  const timeParts = time.split(":");
  const hours = timeParts[0] || "00";
  const minutes = timeParts[1] || "00";
  const seconds = timeParts[2] || "00";

  return `${dateOnly} ${hours}:${minutes}:${seconds}-03:00`;
}

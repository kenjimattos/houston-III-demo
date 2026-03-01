/**
 * Script para detectar período de plantão automaticamente baseado nos horários
 *
 * Regras:
 * - Plantões de 12h que começam de manhã (7h-19h) = "Diurno"
 * - Plantões de 12h que começam à noite (19h-7h) = "Noturno"
 * - Plantões de 6h que começam de manhã (7h-13h) = "Meio período (manhã)"
 * - Plantões de 6h que começam à tarde (13h-19h) = "Meio período (tarde)"
 * - Plantões de 6h que começam à noite = "Cinderela"
 */

export interface PeriodoInfo {
  periodo: string;
  duracao: number;
  descricao: string;
}

/**
 * Detecta o período do plantão baseado nos horários de início e fim
 * @param startHour - Hora de início (0-23)
 * @param endHour - Hora de fim (0-23)
 * @returns Objeto com informações do período      
 */
export function detectarPeriodo(
  startHour: number,
  endHour: number
): PeriodoInfo {
  // Calcular duração considerando turnos que atravessam meia-noite
  const duracao =
    endHour > startHour ? endHour - startHour : 24 - startHour + endHour;

  // Plantões de 12 horas
  if (duracao === 12) {
    if (startHour >= 5 && startHour < 17) {
      return {
        periodo: "Diurno",
        duracao,
        descricao: "Plantão diurno de 12 horas",
      };
    } else {
      return {
        periodo: "Noturno",
        duracao,
        descricao: "Plantão noturno de 12 horas",
      };
    }
  }

  // Plantões de 6 horas
  if (duracao === 6) {
    if (startHour >= 5 && startHour < 13) {
      return {
        periodo: "Meio período (manhã)",
        duracao,
        descricao: "Plantão matutino de 6 horas",
      };
    } else if (startHour >= 13 && startHour < 17) {
      return {
        periodo: "Meio período (tarde)",
        duracao,
        descricao: "Plantão vespertino de 6 horas",
      };
    } else {
      return {
        periodo: "Cinderela",
        duracao,
        descricao: "Plantão noturno de 6 horas (Cinderela)",
      };
    }
  }

  // Casos especiais conhecidos
  if (startHour === 19 && endHour === 1) {
    return {
      periodo: "Cinderela",
      duracao: 6, // 19h às 1h = 6 horas
      descricao: "Plantão noturno de 6 horas (Cinderela)",
    };
  }

  // Outros casos - classificar por horário de início
  if (startHour >= 5 && startHour < 12) {
    return {
      periodo: "Diurno",
      duracao,
      descricao: `Plantão diurno de ${duracao} horas`,
    };
  } else if (startHour >= 12 && startHour < 18) {
    return {
      periodo: "Vespertino",
      duracao,
      descricao: `Plantão vespertino de ${duracao} horas`,
    };
  } else {
    return {
      periodo: "Noturno",
      duracao,
      descricao: `Plantão noturno de ${duracao} horas`,
    };
  }
}

/**
 * Converte período detectado para o UUID do banco de dados
 * @param periodoInfo - Informações do período
 * @param periodos - Lista de períodos do banco (período_id, periodo)
 * @returns UUID do período ou null se não encontrado
 */
export function formatarPeriodoParaBanco(
  periodoInfo: PeriodoInfo,
  periodos: { id: string; nome: string }[]
): string | null {
  const periodoEncontrado = periodos.find((p) => {
    console.log(
      "Verificando período:",
      p.nome,
      "contra",
      periodoInfo.periodo
    );
    return p.nome.toLowerCase() === periodoInfo.periodo.toLowerCase();
  });
  return periodoEncontrado?.id || null;
}

/**
 * Função para testar a detecção com diferentes horários
 * Útil para validar a lógica antes de usar em produção
 */
export function testarDeteccaoPeriodo() {
  const testes = [
    { start: 7, end: 19, esperado: "Diurno" },
    { start: 19, end: 7, esperado: "Noturno" },
    { start: 7, end: 13, esperado: "Meio período (manhã)" },
    { start: 13, end: 19, esperado: "Meio período (tarde)" },
    { start: 19, end: 1, esperado: "Cinderela" },
    { start: 7, end: 1, esperado: "Cinderela" },
    { start: 0, end: 6, esperado: "Cinderela" },
  ];

  // Testes removidos para produção
}

// Exportar também os tipos de período disponíveis
export const TIPOS_PERIODO = [
  "Diurno",
  "Noturno",
  "Meio período (manhã)",
  "Meio período (tarde)",
  "Cinderela",
] as const;

export type TipoPeriodo = (typeof TIPOS_PERIODO)[number];

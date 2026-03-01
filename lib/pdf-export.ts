/**
 * @fileoverview Biblioteca para exportação de calendários de escala médica em formato PDF
 * 
 * Este módulo fornece funcionalidades para gerar documentos PDF profissionais
 * contendo calendários de escalas médicas com as seguintes características:
 * - Orientação retrato (Portrait) com altura dinâmica
 * - Badges coloridos por status (Aberta, Fechada, Anunciada, Cancelada)
 * - Indicadores de cor por grade (tipo de escala)
 * - Legenda de cores
 * - Tabela de médicos participantes
 * - Branding Houston no rodapé
 * 
 * @module lib/pdf-export
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  createLocalDate,
  formatDateKey,
  isDateInRange,
} from "@/utils/dateUtils";

/**
 * Interface que define os dados de uma vaga para exportação PDF
 */
interface VagaData {
  /** ID único da vaga */
  id: string;
  /** Nome do hospital */
  hospital_nome: string;
  /** Nome da especialidade médica */
  especialidade_nome: string;
  /** Nome do setor (opcional) */
  setor_nome?: string;
  /** Data da vaga no formato string */
  vaga_data: string;
  /** Horário de início (formato HH:MM:SS) */
  vagas_horainicio: string;
  /** Horário de término (formato HH:MM:SS) */
  vagas_horafim: string;
  /** Status atual da vaga */
  vaga_status: "aberta" | "fechada" | "cancelada" | "anunciada";
  /** Valor da vaga (opcional) */
  vaga_valor?: number;
  /** Nome do médico aprovado (opcional) */
  medico_nome?: string;
  /** CRM do médico (opcional) */
  medico_crm?: string;
  /** Telefone do médico (opcional) */
  medico_telefone?: string;
  /** Número de candidaturas pendentes */
  candidaturas_pendentes?: number;
  /** Cor da grade em formato hexadecimal (ex: #FF5733) */
  grade_cor?: string;
}

/**
 * Opções de configuração para exportação do PDF
 */
interface ExportPdfOptions {
  /** Nome do arquivo PDF a ser gerado (opcional) */
  filename?: string;
  /** Data de referência para o calendário */
  date?: Date;
  /** Tipo de visualização: mensal ou semanal */
  view?: "month" | "week";
  /** Filtros aplicados (IDs) */
  appliedFilters?: {
    hospitals?: string[];
    specialties?: string[];
    sectors?: string[];
    periods?: string[];
    statuses?: string[];
    doctors?: string[];
  };
  /** Nomes legíveis dos filtros aplicados */
  filterNames?: {
    hospitalNames?: string[];
    specialtyNames?: string[];
    sectorNames?: string[];
    periodNames?: string[];
    statusNames?: string[];
    doctorNames?: string[];
  };
  /** Dados dos médicos para a tabela */
  doctorsData?: Array<{
    id: string;
    nome: string;
    telefone: string;
    crm: string;
    email?: string;
  }>;
  /** Dados das vagas a serem exibidas */
  vagasData?: VagaData[];
}

/**
 * Estilos de cores para badges de status
 * Cada status possui cores para fundo, texto e borda em formato RGB
 */
const BADGE_STYLES = {
  fechada: {
    bg: [239, 246, 255],
    text: [30, 64, 175],
    border: [191, 219, 254],
  }, // bg-blue-50 text-blue-800 border-blue-200
  anunciada: {
    bg: [254, 252, 232],
    text: [133, 77, 14],
    border: [254, 240, 138],
  }, // bg-yellow-50 text-yellow-800 border-yellow-200
  aberta: {
    bg: [240, 253, 244],
    text: [22, 101, 52],
    border: [187, 247, 208],
  }, // bg-green-50 text-green-800 border-green-200
  cancelada: {
    bg: [249, 250, 251],
    text: [107, 114, 128],
    border: [229, 231, 235],
  }, // bg-gray-50 text-gray-500 border-gray-200
};

/**
 * Cores gerais da interface do usuário
 */
const UI_COLORS = {
  header: { bg: [249, 250, 251], text: [55, 65, 81] }, // bg-gray-50 text-gray-700
  cellBorder: [209, 213, 219], // gray-300
  defaultText: [31, 41, 55], // gray-800
};

/**
 * Exporta um calendário de escalas médicas para PDF
 * 
 * Gera um documento PDF profissional contendo:
 * - Cabeçalho com título e filtros aplicados
 * - Legenda de cores dos status
 * - Calendário mensal ou semanal com vagas
 * - Tabela de médicos participantes
 * - Rodapé com branding Houston e timestamp
 * 
 * @param elementId - ID do elemento HTML (não utilizado atualmente, mantido por compatibilidade)
 * @param options - Opções de configuração da exportação
 * @throws {Error} Se houver falha na geração do PDF
 * 
 * @example
 * ```typescript
 * await exportCalendarToPdf("calendar-container", {
 *   date: new Date(),
 *   view: "month",
 *   vagasData: vagas,
 *   doctorsData: medicos
 * });
 * ```
 */
export async function exportCalendarToPdf(
  elementId: string,
  options: ExportPdfOptions = {}
): Promise<void> {
  const {
    filename,
    date = new Date(),
    view = "month",
    appliedFilters,
    filterNames,
    doctorsData = [],
    vagasData = [],
  } = options;

  try {
    // 1. Calcular dimensões necessárias
    // A4 Portrait: 210mm x 297mm (base)
    const pageWidth = 210;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    
    // Calcular altura necessária para o calendário
    const calendarHeight = calculateCalendarHeight(vagasData, date, contentWidth);
    
    // Calcular altura da tabela de médicos
    const doctorsTableHeight = calculateDoctorsTableHeight(doctorsData);
    
    // Altura do cabeçalho e filtros
    const headerHeight = 30; // Título + Filtros (estimado)
    const legendHeight = 8; // Legenda
    const footerHeight = 10;
    const spacing = 10; // Espaço entre calendário e tabela
    
    // Altura total necessária
    const totalHeight = Math.max(
        297, 
        margin + headerHeight + legendHeight + calendarHeight + spacing + doctorsTableHeight + footerHeight + margin
    );

    // Criar PDF com altura dinâmica
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pageWidth, totalHeight], // [width, height] para custom size
    });

    // Adicionar cabeçalho
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);

    const title =
      view === "month"
        ? `Escala - ${
            format(date, "MMMM 'de' yyyy", { locale: ptBR })
              .charAt(0)
              .toUpperCase() +
            format(date, "MMMM 'de' yyyy", { locale: ptBR }).slice(1)
          }`
        : `Escala - Semana de ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;

    const truncatedTitle = truncateTextToWidth(pdf, title, contentWidth);
    pdf.text(truncatedTitle, margin, margin + 7);

    // Adicionar filtros
    let yPosition = margin + 15;
    if (appliedFilters && filterNames) {
      yPosition = renderFilters(pdf, filterNames, margin, yPosition, contentWidth);
    }
    
    // Adicionar Legenda
    yPosition = renderLegend(pdf, margin, yPosition, contentWidth);

    // Gerar calendário
    if (view === "month") {
      yPosition = await generateMonthCalendar(
        pdf,
        vagasData,
        date,
        margin,
        yPosition,
        pageWidth,
        totalHeight, // Usar altura total calculada
        contentWidth
      );
    } else {
      // Implementação simplificada para semana (pode ser expandida se necessário)
       yPosition = await generateMonthCalendar(
        pdf,
        vagasData,
        date,
        margin,
        yPosition,
        pageWidth,
        totalHeight,
        contentWidth
      );
    }
    
    // Renderizar Tabela de Médicos
    if (doctorsData.length > 0) {
        yPosition += spacing;
        renderDoctorsTable(pdf, doctorsData, margin, yPosition, contentWidth);
    }

    // Rodapé com logo Houston
    const footerY = totalHeight - 8;
    
    // Linha separadora superior
    pdf.setDrawColor(209, 213, 219); // gray-300
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY - 2, pageWidth - margin, footerY - 2);
    
    // Logo "HOUSTON" estilizado (cor primary do projeto)
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(163, 105, 237); // #A369ED - cor primary do Houston (roxo)
    const logoText = "HOUSTON";
    pdf.text(logoText, margin, footerY + 3);
    
    // Ponto final característico do logo
    const logoWidth = pdf.getTextWidth(logoText);
    pdf.setFillColor(163, 105, 237); // #A369ED
    pdf.circle(margin + logoWidth + 2, footerY + 2.5, 1, "F");
    
    // Timestamp à direita
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(107, 114, 128); // gray-500
    const footerText = `Exportado em ${format(
      new Date(),
      "dd/MM/yyyy 'às' HH:mm",
      { locale: ptBR }
    )}`;
    pdf.text(footerText, pageWidth - margin - pdf.getTextWidth(footerText), footerY + 3);

    // Salvar
    const defaultFilename =
      view === "month"
        ? `escala-mensal-${format(date, "MM-yyyy")}.pdf`
        : `escala-semanal-${format(date, "dd-MM-yyyy")}.pdf`;

    pdf.save(filename || defaultFilename);
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    throw new Error(
      `Falha ao exportar calendário: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

/**
 * Calcula a altura necessária para renderizar o calendário completo
 * 
 * Simula a renderização do calendário para determinar a altura total necessária,
 * considerando o número de vagas por dia e a altura dos badges.
 * 
 * @param vagasData - Array de vagas a serem exibidas
 * @param date - Data de referência do calendário
 * @param contentWidth - Largura disponível para o conteúdo
 * @returns Altura total necessária em milímetros
 */
function calculateCalendarHeight(
  vagasData: VagaData[],
  date: Date,
  contentWidth: number
): number {
  const cellWidth = contentWidth / 7;
  const headerHeight = 8;
  const minCellHeight = 25;
  const badgeHeight = 4.5;
  const badgeMargin = 1;
  const timeSlotHeight = 4;
  
  let totalHeight = headerHeight;

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // Agrupar vagas
  const vagasPorData = groupVagasByDate(vagasData);

  let lastCurrentDate = new Date();
  
  // Simular renderização semana a semana
  for (let semana = 0; semana < 6; semana++) {
    let maxAlturaNaSemana = 0;

    for (let dia = 0; dia < 7; dia++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + semana * 7 + dia);
      lastCurrentDate = currentDate;
      
      const dataKey = format(currentDate, "yyyy-MM-dd");
      const vagasDia = vagasPorData[dataKey] || [];
      const isCurrentMonth = currentDate.getMonth() === date.getMonth();

      if (vagasDia.length > 0 && isCurrentMonth) {
        const vagasProcessadas = processVagasForDay(vagasDia);
        let alturaEstimada = 0;

        vagasProcessadas.forEach(grupo => {
            alturaEstimada += timeSlotHeight; // Horário
            alturaEstimada += grupo.items.length * (badgeHeight + badgeMargin);
            alturaEstimada += 2; // Espaço extra
        });
        
        maxAlturaNaSemana = Math.max(maxAlturaNaSemana, alturaEstimada);
      }
    }
    
    const cellHeight = Math.max(minCellHeight, 10 + maxAlturaNaSemana + 2);
    totalHeight += cellHeight;

    if (lastCurrentDate > lastDay) break;
  }

  return totalHeight;
}

/**
 * Renderiza a seção de filtros aplicados no PDF
 * 
 * Exibe os filtros que foram aplicados na visualização do calendário,
 * organizados em linhas com quebra automática de texto.
 * 
 * @param pdf - Instância do jsPDF
 * @param filterNames - Objeto contendo os nomes dos filtros aplicados
 * @param x - Posição X inicial
 * @param y - Posição Y inicial
 * @param maxWidth - Largura máxima disponível
 * @returns Nova posição Y após renderizar os filtros
 */
function renderFilters(
    pdf: jsPDF, 
    filterNames: any, 
    x: number, 
    y: number, 
    maxWidth: number
): number {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);

    const filters = [];
    
    // Lógica de formatação de filtros (simplificada da original)
    if (filterNames.hospitalNames?.length) filters.push(`Hospitais: ${filterNames.hospitalNames.join(", ")}`);
    if (filterNames.specialtyNames?.length) filters.push(`Especialidades: ${filterNames.specialtyNames.join(", ")}`);
    if (filterNames.sectorNames?.length) filters.push(`Setores: ${filterNames.sectorNames.join(", ")}`);
    if (filterNames.periodNames?.length) filters.push(`Períodos: ${filterNames.periodNames.join(", ")}`);
    if (filterNames.statusNames?.length) filters.push(`Status: ${filterNames.statusNames.join(", ")}`);
    if (filterNames.doctorNames?.length) filters.push(`Médicos: ${filterNames.doctorNames.join(", ")}`);

    if (filters.length > 0) {
        pdf.text("Filtros aplicados:", x, y);
        y += 5;
        
        filters.forEach(filter => {
            const lines = pdf.splitTextToSize(`• ${filter}`, maxWidth);
            pdf.text(lines, x + 5, y);
            y += lines.length * 4;
        });
        y += 2;
    }
    return y;
}

/**
 * Renderiza a legenda de cores dos status de vagas
 * 
 * Exibe uma linha horizontal com badges de exemplo para cada status,
 * ajudando o usuário a entender o significado de cada cor.
 * 
 * @param pdf - Instância do jsPDF
 * @param x - Posição X inicial
 * @param y - Posição Y inicial
 * @param width - Largura disponível
 * @returns Nova posição Y após renderizar a legenda
 */
function renderLegend(pdf: jsPDF, x: number, y: number, width: number): number {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);
    pdf.text("Legenda:", x, y);

    const items = [
        { label: "Fechada", type: "fechada" },
        { label: "Anunciada", type: "anunciada" },
        { label: "Aberta", type: "aberta" },
        { label: "Cancelada", type: "cancelada" },
    ];

    let currentX = x + 15; // Start after "Legenda:"
    const badgeWidth = 4;
    const badgeHeight = 4;

    items.forEach(item => {
        const style = BADGE_STYLES[item.type as keyof typeof BADGE_STYLES];
        
        // Badge
        pdf.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
        pdf.setDrawColor(style.border[0], style.border[1], style.border[2]);
        pdf.roundedRect(currentX, y - 3, badgeWidth, badgeHeight, 1, 1, "FD");

        // Label
        pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);
        pdf.setFont("helvetica", "normal");
        pdf.text(item.label, currentX + badgeWidth + 2, y);

        currentX += badgeWidth + 2 + pdf.getTextWidth(item.label) + 5; // Spacing
    });

    return y + 8; // Return new Y position
}

/**
 * Gera e renderiza o calendário mensal no PDF
 * 
 * Função principal que desenha o calendário completo, incluindo:
 * - Cabeçalho com dias da semana
 * - Grid de dias do mês
 * - Badges de vagas em cada dia
 * - Indicadores de grade (bolinhas coloridas)
 * 
 * @param pdf - Instância do jsPDF
 * @param vagasData - Array de vagas a serem exibidas
 * @param date - Data de referência do calendário
 * @param margin - Margem lateral do documento
 * @param startY - Posição Y inicial para começar a desenhar
 * @param pageWidth - Largura total da página
 * @param pageHeight - Altura total da página
 * @param contentWidth - Largura disponível para conteúdo
 * @returns Nova posição Y após renderizar o calendário
 */
async function generateMonthCalendar(
  pdf: jsPDF,
  vagasData: VagaData[],
  date: Date,
  margin: number,
  startY: number,
  pageWidth: number,
  pageHeight: number,
  contentWidth: number
): Promise<number> {
  const cellWidth = contentWidth / 7;
  const minCellHeight = 25;
  const headerHeight = 8;
  let currentY = startY;

  // Cabeçalho Dias da Semana
  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");

  for (let i = 0; i < 7; i++) {
    const x = margin + i * cellWidth;
    
    // Aplicar mesma cor para todos os dias
    pdf.setFillColor(249, 250, 251); // gray-50 - fundo claro
    pdf.rect(x, currentY, cellWidth, headerHeight, "F");
    
    pdf.setDrawColor(UI_COLORS.cellBorder[0], UI_COLORS.cellBorder[1], UI_COLORS.cellBorder[2]);
    pdf.rect(x, currentY, cellWidth, headerHeight, "S"); // Borda

    pdf.setTextColor(55, 65, 81); // gray-700 - texto escuro
    const textWidth = pdf.getTextWidth(diasSemana[i]);
    pdf.text(diasSemana[i], x + (cellWidth - textWidth) / 2, currentY + 5.5);
  }
  currentY += headerHeight;

  // Preparar dados
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const vagasPorData = groupVagasByDate(vagasData);

  // Renderizar Semanas
  let lastCurrentDate = new Date();
  for (let semana = 0; semana < 6; semana++) {
    // 1. Calcular altura da linha (pré-processamento)
    let maxAlturaNaSemana = 0;
    const dadosSemana: any[] = []; // Armazenar dados processados para não recalcular

    for (let dia = 0; dia < 7; dia++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + semana * 7 + dia);
      const dataKey = format(currentDate, "yyyy-MM-dd");
      const vagasDia = vagasPorData[dataKey] || [];
      const isCurrentMonth = currentDate.getMonth() === date.getMonth();
      
      const gruposHorario = isCurrentMonth ? processVagasForDay(vagasDia) : [];
      dadosSemana.push({ currentDate, isCurrentMonth, gruposHorario });

      if (gruposHorario.length > 0) {
        let alturaEstimada = 0;
        gruposHorario.forEach(grupo => {
            alturaEstimada += 4; // Horário
            alturaEstimada += grupo.items.length * 5.5; // Badge + margem
            alturaEstimada += 2;
        });
        maxAlturaNaSemana = Math.max(maxAlturaNaSemana, alturaEstimada);
      }
    }

    const cellHeight = Math.max(minCellHeight, 10 + maxAlturaNaSemana + 2);
    const rowY = currentY;

    // 2. Renderizar Células
    for (let dia = 0; dia < 7; dia++) {
      const { currentDate, isCurrentMonth, gruposHorario } = dadosSemana[dia];
      lastCurrentDate = currentDate;
      const x = margin + dia * cellWidth;

      // Fundo e Borda
      if (!isCurrentMonth) {
        pdf.setFillColor(249, 250, 251); // Gray-50 para dias fora do mês
        pdf.rect(x, rowY, cellWidth, cellHeight, "F");
      }
      pdf.setDrawColor(UI_COLORS.cellBorder[0], UI_COLORS.cellBorder[1], UI_COLORS.cellBorder[2]);
      pdf.rect(x, rowY, cellWidth, cellHeight, "S");

      // Número do dia
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      if (isCurrentMonth) {
         // Verificar se é hoje (opcional, mas legal)
         const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
         if (isToday) {
             pdf.setFillColor(30, 64, 175); // Blue
             pdf.circle(x + cellWidth - 5, rowY + 5, 3, 'F');
             pdf.setTextColor(255, 255, 255);
             const dayNum = currentDate.getDate().toString();
             const w = pdf.getTextWidth(dayNum);
             pdf.text(dayNum, x + cellWidth - 5 - w/2, rowY + 6);
         } else {
             pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);
             pdf.text(currentDate.getDate().toString(), x + cellWidth - 8, rowY + 6);
         }
      } else {
        pdf.setTextColor(156, 163, 175); // Gray-400
        pdf.text(currentDate.getDate().toString(), x + cellWidth - 8, rowY + 6);
      }

      // Conteúdo (Vagas)
      if (gruposHorario.length > 0) {
        let contentY = rowY + 8;
        
        gruposHorario.forEach((grupo: any) => {
            // Horário
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6);
            pdf.setTextColor(55, 65, 81); // Gray-700
            pdf.text(grupo.horario, x + 2, contentY + 2);
            contentY += 4;

            // Badges
            grupo.items.forEach((item: any) => {
                drawBadge(pdf, x + 2, contentY, cellWidth - 4, 4.5, item.text, item.type, item.count, item.gradeColor);
                contentY += 5.5;
            });
            
            contentY += 1;
        });
      }
    }

    currentY += cellHeight;
    if (lastCurrentDate > lastDay) break;
  }

  return currentY + 10;
}

/**
 * Calcula a altura necessária para a tabela de médicos
 * 
 * @param doctors - Array de médicos a serem exibidos
 * @returns Altura total necessária em milímetros
 */
function calculateDoctorsTableHeight(doctors: any[]): number {
    if (doctors.length === 0) return 0;
    const headerHeight = 10; // Título
    const rowHeight = 7;
    const tableHeaderHeight = 7;
    return headerHeight + tableHeaderHeight + (doctors.length * rowHeight) + 5;
}

/**
 * Renderiza a tabela de médicos participantes da escala
 * 
 * Cria uma tabela formatada com as seguintes colunas:
 * - Nome (40% da largura)
 * - CRM (15% da largura)
 * - Telefone (20% da largura)
 * - Email (25% da largura)
 * 
 * @param pdf - Instância do jsPDF
 * @param doctors - Array de médicos a serem exibidos
 * @param x - Posição X inicial
 * @param y - Posição Y inicial
 * @param width - Largura total da tabela
 */
function renderDoctorsTable(
    pdf: jsPDF,
    doctors: any[],
    x: number,
    y: number,
    width: number
) {
    // Título da Seção
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);
    pdf.text("Lista de Médicos", x, y);
    y += 6;

    // Configuração da Tabela
    const colWidths = {
        nome: width * 0.4,
        crm: width * 0.15,
        telefone: width * 0.20,
        email: width * 0.25
    };
    
    const rowHeight = 7;
    
    // Cabeçalho da Tabela
    pdf.setFillColor(UI_COLORS.header.bg[0], UI_COLORS.header.bg[1], UI_COLORS.header.bg[2]);
    pdf.rect(x, y, width, rowHeight, "F");
    pdf.setDrawColor(UI_COLORS.cellBorder[0], UI_COLORS.cellBorder[1], UI_COLORS.cellBorder[2]);
    pdf.rect(x, y, width, rowHeight, "S");
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(UI_COLORS.header.text[0], UI_COLORS.header.text[1], UI_COLORS.header.text[2]);
    
    let currentX = x;
    
    // Coluna Nome
    pdf.text("Nome", currentX + 2, y + 4.5);
    currentX += colWidths.nome;
    
    // Coluna CRM
    pdf.text("CRM", currentX + 2, y + 4.5);
    currentX += colWidths.crm;
    
    // Coluna Telefone
    pdf.text("Telefone", currentX + 2, y + 4.5);
    currentX += colWidths.telefone;
    
    // Coluna Email
    pdf.text("Email", currentX + 2, y + 4.5);
    
    y += rowHeight;
    
    // Linhas da Tabela
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(UI_COLORS.defaultText[0], UI_COLORS.defaultText[1], UI_COLORS.defaultText[2]);
    
    doctors.forEach((doctor, index) => {
        // Fundo alternado (opcional, mas fica bom)
        if (index % 2 === 1) {
             pdf.setFillColor(249, 250, 251); // Gray-50
             pdf.rect(x, y, width, rowHeight, "F");
        }
        
        pdf.setDrawColor(UI_COLORS.cellBorder[0], UI_COLORS.cellBorder[1], UI_COLORS.cellBorder[2]);
        pdf.rect(x, y, width, rowHeight, "S"); // Borda externa da linha
        
        // Linhas verticais (opcional, simplificando para apenas borda externa da linha por enquanto para visual mais limpo)
        
        currentX = x;
        
        // Nome
        const nomeTruncado = truncateTextToWidth(pdf, doctor.nome, colWidths.nome - 4);
        pdf.text(nomeTruncado, currentX + 2, y + 4.5);
        currentX += colWidths.nome;
        
        // CRM
        const crmTruncado = truncateTextToWidth(pdf, doctor.crm, colWidths.crm - 4);
        pdf.text(crmTruncado, currentX + 2, y + 4.5);
        currentX += colWidths.crm;
        
        // Telefone
        const telefoneTruncado = truncateTextToWidth(pdf, doctor.telefone, colWidths.telefone - 4);
        pdf.text(telefoneTruncado, currentX + 2, y + 4.5);
        currentX += colWidths.telefone;
        
        // Email
        const emailTruncado = truncateTextToWidth(pdf, doctor.email || "-", colWidths.email - 4);
        pdf.text(emailTruncado, currentX + 2, y + 4.5);
        
        y += rowHeight;
    });
}

// ============================================================================
// FUNÇÕES AUXILIARES (HELPERS)
// ============================================================================

/**
 * Agrupa vagas por data
 * 
 * Organiza um array de vagas em um objeto onde cada chave é uma data
 * e o valor é um array de vagas daquela data.
 * 
 * @param vagas - Array de vagas a serem agrupadas
 * @returns Objeto com vagas agrupadas por data (formato YYYY-MM-DD)
 */
function groupVagasByDate(vagas: VagaData[]) {
  const grouped: Record<string, VagaData[]> = {};
  vagas.forEach((vaga) => {
    const dataKey = formatDateKey(vaga.vaga_data);
    if (!grouped[dataKey]) grouped[dataKey] = [];
    grouped[dataKey].push(vaga);
  });
  return grouped;
}

/**
 * Processa e agrupa vagas de um dia específico por horário
 * 
 * Organiza as vagas por faixa horária e aplica regras de agregação:
 * - Vagas "Fechada" e "Anunciada": exibidas individualmente com nome do médico
 * - Vagas "Aberta": agregadas por contagem (ex: "2 vagas abertas")
 * - Vagas "Cancelada": agregadas por contagem (ex: "1 cancelada")
 * 
 * @param vagas - Array de vagas do dia
 * @returns Array de grupos de vagas organizados por horário
 */
function processVagasForDay(vagas: VagaData[]) {
    // Agrupar por horário
    const porHorario: Record<string, VagaData[]> = {};
    vagas.forEach(v => {
        const h = `${v.vagas_horainicio.slice(0,2)}h - ${v.vagas_horafim.slice(0,2)}h`;
        if (!porHorario[h]) porHorario[h] = [];
        porHorario[h].push(v);
    });

    const horariosOrdenados = Object.keys(porHorario).sort();
    
    return horariosOrdenados.map(horario => {
        const vagasDoHorario = porHorario[horario];
        const items: { type: string, text: string, count?: number, gradeColor?: string }[] = [];

        // 1. Fechadas e Anunciadas (Individuais)
        vagasDoHorario
            .filter(v => v.vaga_status === 'fechada' || v.vaga_status === 'anunciada')
            .forEach(v => {
                items.push({
                    type: v.vaga_status,
                    text: v.medico_nome || (v.vaga_status === 'fechada' ? 'Vaga Fechada' : 'Vaga Anunciada'),
                    gradeColor: v.grade_cor
                });
            });

        // 2. Abertas (Agrupadas)
        const abertas = vagasDoHorario.filter(v => v.vaga_status === 'aberta');
        if (abertas.length > 0) {
            const count = abertas.length;
            const pendentes = abertas.reduce((acc, curr) => acc + (curr.candidaturas_pendentes || 0), 0);
            items.push({
                type: 'aberta',
                text: `${count} vaga${count > 1 ? 's' : ''} aberta${count > 1 ? 's' : ''}`,
                count: pendentes > 0 ? pendentes : undefined,
                gradeColor: abertas[0].grade_cor
            });
        }

        // 3. Canceladas (Agrupadas)
        const canceladas = vagasDoHorario.filter(v => v.vaga_status === 'cancelada');
        if (canceladas.length > 0) {
            const count = canceladas.length;
            items.push({
                type: 'cancelada',
                text: `${count} cancelada${count > 1 ? 's' : ''}`,
                gradeColor: canceladas[0].grade_cor
            });
        }

        return { horario, items };
    });
}

/**
 * Desenha um badge de vaga no PDF
 * 
 * Renderiza um retângulo arredondado com:
 * - Fundo colorido de acordo com o status
 * - Borda colorida
 * - Texto da vaga
 * - Bolinha colorida da grade (se houver)
 * - Contador de candidaturas pendentes (se houver)
 * 
 * @param pdf - Instância do jsPDF
 * @param x - Posição X do badge
 * @param y - Posição Y do badge
 * @param width - Largura do badge
 * @param height - Altura do badge
 * @param text - Texto a ser exibido
 * @param type - Tipo/status da vaga (aberta, fechada, etc.)
 * @param count - Número de candidaturas pendentes (opcional)
 * @param gradeColor - Cor da grade em formato hexadecimal (opcional)
 */
function drawBadge(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  type: string,
  count?: number,
  gradeColor?: string
) {
  const style = BADGE_STYLES[type as keyof typeof BADGE_STYLES] || BADGE_STYLES.cancelada;
  
  // Fundo
  pdf.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
  pdf.roundedRect(x, y, width, height, 1, 1, "F");

  // Borda
  pdf.setDrawColor(style.border[0], style.border[1], style.border[2]);
  pdf.roundedRect(x, y, width, height, 1, 1, "S");
  
  // Texto
  pdf.setTextColor(style.text[0], style.text[1], style.text[2]);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  
  let textX = x + 1;

  // Bolinha da Grade (se existir cor)
  if (gradeColor) {
      // Converter hex para rgb
      const r = parseInt(gradeColor.slice(1, 3), 16);
      const g = parseInt(gradeColor.slice(3, 5), 16);
      const b = parseInt(gradeColor.slice(5, 7), 16);
      
      pdf.setFillColor(r, g, b);
      pdf.circle(textX + 1, y + 2.25, 1, "F");
      textX += 3; // Deslocar texto
  }
  
  // Truncar texto para dar espaço ao contador se existir
  const paddingRight = count ? 6 : 1;
  const availableWidth = width - (textX - x) - paddingRight;
  const truncated = truncateTextToWidth(pdf, text, availableWidth);
  pdf.text(truncated, textX, y + 3);

  // Contador (Pill amarela)
  if (count && count > 0) {
      const countStr = count.toString();
      const countW = pdf.getTextWidth(countStr) + 2;
      const countX = x + width - countW - 1;
      
      pdf.setFillColor(254, 249, 195); // yellow-100
      pdf.setDrawColor(253, 224, 71); // yellow-300
      pdf.roundedRect(countX, y + 0.5, countW, 3.5, 1, 1, "FD");
      
      pdf.setTextColor(133, 77, 14); // yellow-800
      pdf.setFontSize(6);
      pdf.text(countStr, countX + 1, y + 2.5);
  }
}

/**
 * Trunca texto para caber em uma largura específica
 * 
 * Reduz o texto caractere por caractere até que caiba na largura máxima,
 * adicionando reticências (...) ao final.
 * 
 * @param pdf - Instância do jsPDF
 * @param text - Texto a ser truncado
 * @param maxWidth - Largura máxima em milímetros
 * @param ellipsis - Caracteres de reticências (padrão: "...")
 * @returns Texto truncado com reticências se necessário
 */
function truncateTextToWidth(
  pdf: jsPDF,
  text: string,
  maxWidth: number,
  ellipsis: string = "..."
): string {
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (pdf.getTextWidth(truncated + ellipsis) > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

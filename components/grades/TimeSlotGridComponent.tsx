"use client";

import React, { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MedicoSelectWithTeams } from "@/components/grades/MedicoSelectWithTeams";
import { type GradeLine, type TimeSlot } from "@/hooks/grades";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { normalizeHour } from "@/lib/utils";
import { cornersOfRectangle } from "@dnd-kit/core/dist/utilities/algorithms/helpers";

/**
 * Interface de props para o componente TimeSlotGridComponent
 *
 * Este componente gerencia a interface de edição detalhada de um dia específico
 * da grade de plantões, permitindo criar, editar e organizar slots de tempo
 * com validação completa de conflitos (incluindo plantões que atravessam meia-noite)
 */
interface TimeSlotGridComponentProps {
  // === DADOS BÁSICOS ===
  /** Linha da grade sendo editada (contém cor, nome, etc.) */
  line: GradeLine;
  /** Índice do dia sendo editado (0-6 para Dom-Sab) */
  editingDayIndex: number;
  /** Índice da semana/linha ativa */
  activeLineIndex: number;

  // === DADOS PARA EDIÇÃO ===
  /** Estrutura de slots organizados por linha e dia */
  slotsByDay: { [lineIndex: number]: { [dayIndex: number]: TimeSlot[] } };
  /** Contadores de linhas (rows) por dia */
  dayRowCounts: { [lineIndex: number]: { [dayIndex: number]: number } };
  /** Horário de início de cada semana/linha */
  weekStartHours: { [lineIndex: number]: number };
  /** Horário padrão da grade (fallback) */
  editingGradeHorario: number;

  // === DADOS DE REFERÊNCIA ===
  /** Lista de médicos disponíveis */
  medicos: any[];
  /** Nomes dos dias da semana */
  diasSemana: string[];

  // === ESTADOS DE DRAG ===
  /** Se está arrastando para criar slot */
  isDragging: boolean;
  /** Linha onde está acontecendo o drag */
  dragRowIndex: number | null;
  /** Hora inicial do drag */
  dragStart: number | null;
  /** Hora final do drag */
  dragEnd: number | null;
  /** Se já houve movimento no drag */
  hasDragged: boolean;

  // === CALLBACKS DE NAVEGAÇÃO ===
  /** Função para voltar à visão geral */
  setEditingDayIndex: (dayIndex: number | null) => void;
  /** Função para alterar número de linhas de um dia */
  updateDayRowCount: (
    lineIndex: number,
    dayIndex: number,
    rowCount: number
  ) => void;
  /** Função para obter número atual de linhas de um dia */
  getDayRowCount: (lineIndex: number, dayIndex: number) => number;
  /** Função para limpar linhas vazias (opcional) */
  cleanupEmptyRowsForDay?: (lineIndex: number, dayIndex: number) => void;

  // === CALLBACKS DE DRAG ===
  /** Definir se está em modo drag */
  setIsDragging: (isDragging: boolean) => void;
  /** Definir linha do drag */
  setDragRowIndex: (rowIndex: number | null) => void;
  /** Definir início do drag */
  setDragStart: (start: number | null) => void;
  /** Definir fim do drag */
  setDragEnd: (end: number | null) => void;
  /** Definir se houve movimento */
  setHasDragged: (hasDragged: boolean) => void;

  // === CALLBACKS DE GESTÃO DE SLOTS ===
  /** Finalizar criação de slot via drag */
  handleDragEnd: (
    startHour: number,
    endHour: number,
    rowIndex?: number
  ) => void;
  /** Atualizar médico responsável por um slot */
  updateSlotMedico: (
    slotId: string,
    medico: { medicoId: string; medicoNome: string } | null
  ) => void;
  /** Adicionar linha adicional a um slot existente */
  addAdditionalHourLine: (slotId: string) => void;
  /** Remover slot completamente */
  removeSlot: (slotId: string) => void;
  /** Redimensionar slot (início ou fim) */
  handleSlotResize: (
    slotId: string,
    direction: "start" | "end",
    e: React.MouseEvent
  ) => void;
  /** Formatar hora para exibição (ex: 7 → "07:00") */
  formatHourDisplay: (hour: number) => string;

  // === SISTEMA DE REPLICAÇÃO ===
  /** Replicar configuração do dia atual para outros dias */
  replicateDayToOtherDays?: (
    fromDayIndex: number,
    toDayIndices: number[]
  ) => void;
}

/**
 * 🕒 TimeSlotGridComponent - Editor Avançado de Plantões
 *
 * Componente responsável pela edição detalhada de um dia específico na grade de plantões.
 * Oferece funcionalidades avançadas como:
 *
 * ✨ PRINCIPAIS RECURSOS:
 * - 🎨 Interface drag-and-drop intuitiva
 * - ⚠️  Validação completa de conflitos (incluindo meia-noite)
 * - 💡 Sugestões inteligentes de horários alternativos
 * - 🔄 Sistema de replicação para outros dias
 * - 📱 Responsivo e otimizado
 *
 * 🛡️ SISTEMA DE VALIDAÇÃO:
 * - Impede 100% dos conflitos de horário
 * - Suporte completo a plantões noturnos (ex: 22h-06h)
 * - Modal elegante com até 3 sugestões alternativas
 * - Algoritmo inteligente baseado em horários médicos ideais
 *
 * 🎯 CASOS DE USO:
 * - Criação via drag: Arraste para criar slots
 * - Criação via menu: Clique + menu contextual
 * - Edição: Redimensionamento e atribuição de médicos
 * - Replicação: Copie configuração para outros dias
 */
export const TimeSlotGridComponent = memo(function TimeSlotGridComponent({
  line,
  editingDayIndex,
  activeLineIndex,
  slotsByDay,
  dayRowCounts,
  weekStartHours,
  editingGradeHorario,
  medicos,
  diasSemana,
  isDragging,
  dragRowIndex,
  dragStart,
  dragEnd,
  hasDragged,
  setEditingDayIndex,
  updateDayRowCount,
  getDayRowCount,
  cleanupEmptyRowsForDay,
  setIsDragging,
  setDragRowIndex,
  setDragStart,
  setDragEnd,
  setHasDragged,
  handleDragEnd,
  updateSlotMedico,
  addAdditionalHourLine,
  removeSlot,
  handleSlotResize,
  formatHourDisplay,
  replicateDayToOtherDays,
}: TimeSlotGridComponentProps) {
  // ========================================
  // 🎯 ESTADOS LOCAIS
  // ========================================

  /**
   * 🔄 SISTEMA DE REPLICAÇÃO
   * Dias selecionados para receber cópia da configuração atual
   */
  const [selectedReplicationDays, setSelectedReplicationDays] = React.useState<
    number[]
  >([]);

  // ============================================================================
  // 📊 SISTEMA DE GESTÃO DE ESTADO
  // ============================================================================

  /**
   * 💡 SISTEMA DE SUGESTÕES DE CONFLITO
   * Estados para gerenciar modal de alternativas quando há conflito
   */
  const [showSuggestionsModal, setShowSuggestionsModal] = React.useState(false);
  const [suggestedSlots, setSuggestedSlots] = React.useState<
    {
      startHour: number;
      endHour: number;
      score: number;
    }[]
  >([]);
  /** Informação textual sobre o conflito detectado */
  const [conflictInfo, setConflictInfo] = React.useState<string>("");
  /** Dados temporários do plantão aguardando aprovação do usuário */
  const [pendingCreation, setPendingCreation] = React.useState<{
    duration: number;
    targetRow: number;
    originalStart: number;
  } | null>(null);

  /**
   * 🖱️ MENU CONTEXTUAL
   * Estados para gerenciar menu de opções ao clicar no grid
   */
  const [showPlantaoMenu, setShowPlantaoMenu] = React.useState(false);
  const [canShowMenu, setCanShowMenu] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [menuClickedHour, setMenuClickedHour] = React.useState<number | null>(
    null
  );
  const [menuTargetRow, setMenuTargetRow] = React.useState<number | null>(null);

  // ========================================
  // 🛠️ FUNÇÕES AUXILIARES
  // ========================================

  /**
   * Valida se um plantão de determinada duração está dentro dos limites da grade
   */
  const validatePlantaoLimits = (
    clickedHour: number,
    duration: number
  ): { isValid: boolean; errorMessage?: string } => {
    // Obter horário de início da grade (base)
    const gradeStartHour =
      weekStartHours[activeLineIndex] || editingGradeHorario || 7;

    // Calcular horários do plantão
    const plantaoStartHour = clickedHour;
    const plantaoEndHour = plantaoStartHour + duration;

    // Calcular limites válidos da grade (janela de 24h)
    const gradeMinHour = gradeStartHour;
    const gradeMaxHour = gradeStartHour + 24;

    /**
     * Função para validar se o plantão está dentro dos limites da grade
     * Considera casos onde plantão e/ou grade atravessam meia-noite
     */
    const isPlantaoWithinGridLimits = (
      startHour: number,
      endHour: number,
      gridStart: number,
      gridEnd: number
    ): boolean => {
      // Caso 1: Plantão não atravessa meia-noite
      if (startHour < 24 && endHour <= 24) {
        return startHour >= gridStart && endHour <= gridEnd;
      }

      // Caso 2: Plantão atravessa meia-noite (endHour > 24)
      if (endHour > 24) {
        // Grade também atravessa meia-noite
        if (gridEnd > 24) {
          return startHour >= gridStart && endHour <= gridEnd;
        }
        // Grade não atravessa meia-noite - plantão deve estar totalmente dentro
        return false;
      }

      // Caso 3: Outros cenários complexos
      return startHour >= gridStart && endHour <= gridEnd;
    };

    // Validar se o plantão está dentro dos limites
    const isValid = isPlantaoWithinGridLimits(
      plantaoStartHour,
      plantaoEndHour,
      gradeMinHour,
      gradeMaxHour
    );

    if (!isValid) {
      // Calcular os horários formatados para a mensagem de erro
      const startFormatted = formatHourDisplay(plantaoStartHour);
      const endFormatted = formatHourDisplay(plantaoEndHour);
      const gridStartFormatted = formatHourDisplay(gradeMinHour);
      const gridEndFormatted = formatHourDisplay(gradeMaxHour);

      return {
        isValid: false,
        errorMessage: `Plantão ${startFormatted}-${endFormatted} está fora dos limites da grade (${gridStartFormatted}-${gridEndFormatted}). Escolha um horário dentro desta janela de 24 horas.`,
      };
    }

    return { isValid: true };
  };

  /**
   * 🕐 MODAL DE EXTENSÃO ALÉM DA GRADE
   * Estados para gerenciar confirmação de plantão que se estende além da grade
   */
  const [showExtendedShiftModal, setShowExtendedShiftModal] =
    React.useState(false);
  const [extendedShiftData, setExtendedShiftData] = React.useState<{
    rawStartHour: number;
    plantaoEndHour: number;
    extendedHours: number;
    normalizedStart: number;
    duration: number;
    dragRowIndex: number;
  } | null>(null);

  // ========================================
  // 🧮 FUNÇÕES UTILITÁRIAS
  // ========================================

  /**
   * � Calcular posicionamento visual correto para slots
   *
   * Função dedicada para resolver problemas de renderização de slots,
   * especialmente para plantões noturnos e slots que atravessam meia-noite.
   *
   * @param startHour Hora de início do slot
   * @param endHour Hora de fim do slot
   * @param startHourBase Hora base da grade (ex: 7 para grade 7h-7h)
   * @returns Objeto com leftOffset e width em porcentagem
   */
  const calculateSlotPosition = React.useCallback(
    (
      startHour: number,
      endHour: number,
      startHourBase: number
    ): { leftOffset: number; width: number; isVisible: boolean } => {
      // Detectar diferentes tipos de plantões
      const duration = endHour - startHour;
      const isNightShift =
        endHour > 24 || (endHour < startHour && endHour <= 23);

      let relativePosition: number;
      let calculatedWidth: number;

      if (isNightShift) {
        // 🌙 PLANTÃO NOTURNO
        if (endHour > 24) {
          // Formato normalizado (ex: startHour=22, endHour=30 para 22h-06h)
          const realEndHour = endHour - 24;

          if (startHour >= startHourBase) {
            // Começa no mesmo dia da grade
            relativePosition = startHour - startHourBase;
            const hoursUntilMidnight = 24 - startHour;
            calculatedWidth = ((hoursUntilMidnight + realEndHour) / 24) * 100;
          } else {
            // Começa no próximo dia (após meia-noite)
            relativePosition = 24 - startHourBase + startHour;
            calculatedWidth = (duration / 24) * 100;
          }
        } else {
          // Formato clássico (ex: startHour=22, endHour=6 para 22h-06h)
          if (startHour >= startHourBase) {
            relativePosition = startHour - startHourBase;
            const hoursUntilMidnight = 24 - startHour;
            calculatedWidth = ((hoursUntilMidnight + endHour) / 24) * 100;
          } else {
            // Parte após meia-noite
            relativePosition = 24 - startHourBase + startHour;
            calculatedWidth = ((endHour - startHour) / 24) * 100;
          }
        }
      } else {
        // 🌅 PLANTÃO NORMAL
        if (startHour >= startHourBase) {
          // Horário no mesmo dia da grade
          relativePosition = startHour - startHourBase;
        } else {
          // Horário no próximo dia (ex: 03h numa grade 07h-07h)
          relativePosition = 24 - startHourBase + startHour;
        }
        calculatedWidth = (duration / 24) * 100;
      }

      const leftOffset = (relativePosition / 24) * 100;

      // Verificar visibilidade (com pequena margem para slots nas bordas)
      const isVisible =
        leftOffset >= -2 && leftOffset <= 102 && calculatedWidth > 0.1;

      return {
        leftOffset,
        width: calculatedWidth,
        isVisible,
      };
    },
    []
  );

  /**
   * �📏 Calcular número mínimo de linhas necessárias
   *
   * Garante que sempre há linhas suficientes para acomodar todos os slots existentes.
   * Baseado no maior rowIndex encontrado nos slots do dia atual.
   *
   * @returns Número mínimo de linhas necessárias (min: 1)
   */
  const calculateMinimumRows = React.useCallback(() => {
    const daySlots = slotsByDay[activeLineIndex]?.[editingDayIndex] || [];
    if (daySlots.length === 0) return 1; // Pelo menos 1 linha sempre

    // Encontrar o maior rowIndex usado
    const maxRowIndex = Math.max(...daySlots.map((slot) => slot.rowIndex || 0));
    return Math.max(1, maxRowIndex + 1); // +1 porque rowIndex é zero-based
  }, [slotsByDay, activeLineIndex, editingDayIndex]);

  /**
   * 🔧 Auto-ajuste de linhas
   *
   * Effect que garante que sempre há linhas suficientes para acomodar
   * todos os slots existentes, mas nunca reduz automaticamente.
   */
  React.useEffect(() => {
    const currentRows = getDayRowCount(activeLineIndex, editingDayIndex);
    const minimumRows = calculateMinimumRows();

    // Apenas garantir que temos pelo menos o mínimo necessário, nunca reduzir
    if (currentRows < minimumRows) {
      updateDayRowCount(activeLineIndex, editingDayIndex, minimumRows);
    }
  }, [
    activeLineIndex,
    editingDayIndex,
    calculateMinimumRows,
    getDayRowCount,
    updateDayRowCount,
  ]);

  // ========================================
  // ============================================================================
  // ⚠️  SISTEMA DE VALIDAÇÃO DE CONFLITOS ROBUSTO
  // ============================================================================

  /**
   * 🛡️ Verificar conflitos de horários (ALGORITMO ROBUSTO)
   *
   * Detecta conflitos entre slots, incluindo casos complexos:
   * ✅ Plantões normais (8h-16h vs 10h-14h)
   * ✅ Plantões noturnos (22h-06h vs 04h-10h)
   * ✅ Plantões 24h (7h-7h vs qualquer outro)
   * ✅ Casos mistos (qualquer combinação)
   *
   * @param newStartHour Hora início do novo plantão (0-23)
   * @param newEndHour Hora fim do novo plantão (pode ser >24 para atravessar meia-noite)
   * @param targetRowIndex Linha onde criar o plantão
   * @param excludeSlotId ID do slot a ignorar (para edições)
   * @returns true se há conflito, false caso contrário
   */
  const checkTimeConflict = useCallback(
    (
      newStartHour: number,
      newEndHour: number,
      targetRowIndex: number,
      excludeSlotId?: string
    ): boolean => {
      const daySlots = slotsByDay[activeLineIndex]?.[editingDayIndex] || [];
      const slotsInRow = daySlots.filter(
        (slot) =>
          (slot.rowIndex || 0) === targetRowIndex && slot.id !== excludeSlotId
      );

      return slotsInRow.some((slot) => {
        const slotStart = slot.startHour;
        const slotEnd = slot.endHour;

        // Detectar travessia de meia-noite
        const newCrossesMidnight =
          newEndHour > 24 || (newEndHour < newStartHour && newEndHour < 24);
        const slotCrossesMidnight =
          slotEnd > 24 || (slotEnd < slotStart && slotEnd < 24);

        // 📋 CENÁRIO 1: Ambos são plantões normais (não atravessam meia-noite)
        // Exemplo: 8h-16h vs 10h-14h → Usa lógica simples de sobreposição
        if (!newCrossesMidnight && !slotCrossesMidnight) {
          return newStartHour < slotEnd && newEndHour > slotStart;
        }

        // 📋 CENÁRIO 2: Novo plantão atravessa meia-noite, existente não
        // Exemplo: 14h-07h vs 07h-12h → Precisa verificar ambas as partes
        if (newCrossesMidnight && !slotCrossesMidnight) {
          const newEndNormalized =
            newEndHour > 24 ? newEndHour - 24 : newEndHour;

          // Conflito antes da meia-noite (parte 14h-24h)
          const conflictBeforeMidnight =
            newStartHour < slotEnd && 24 > slotStart;

          // Conflito após a meia-noite (parte 00h-07h)
          const conflictAfterMidnight =
            0 < slotEnd && newEndNormalized > slotStart;

          return conflictBeforeMidnight || conflictAfterMidnight;
        }

        // 📋 CENÁRIO 3: Plantão existente atravessa meia-noite, novo não
        // Exemplo: 22h-06h vs 04h-10h → Verifica sobreposição com ambas as partes
        if (!newCrossesMidnight && slotCrossesMidnight) {
          const slotEndNormalized = slotEnd > 24 ? slotEnd - 24 : slotEnd;

          // Conflito com a parte antes da meia-noite (22h-24h)
          const conflictBeforeMidnight =
            newStartHour < 24 && newEndHour > slotStart;

          // Conflito com a parte após a meia-noite (00h-06h)
          const conflictAfterMidnight =
            newStartHour < slotEndNormalized && newEndHour > 0;

          return conflictBeforeMidnight || conflictAfterMidnight;
        }

        // 📋 CENÁRIO 4: Ambos atravessam meia-noite (caso mais complexo)
        // Exemplo: 20h-04h vs 22h-08h → Verificação completa de todas as sobreposições
        if (newCrossesMidnight && slotCrossesMidnight) {
          const newEndNormalized =
            newEndHour > 24 ? newEndHour - 24 : newEndHour;
          const slotEndNormalized = slotEnd > 24 ? slotEnd - 24 : slotEnd;

          // Conflito na primeira parte (antes da meia-noite)
          const conflictBeforeMidnight = newStartHour < 24 && 24 > slotStart;

          // Conflito na segunda parte (após meia-noite)
          const conflictAfterMidnight =
            0 < slotEndNormalized && newEndNormalized > 0;

          // Sobreposição direta das partes normalizadas
          const directOverlap =
            newStartHour < slotEndNormalized && newEndNormalized > slotStart;

          return (
            conflictBeforeMidnight || conflictAfterMidnight || directOverlap
          );
        }

        return false;
      });
    },
    [slotsByDay, activeLineIndex, editingDayIndex]
  );

  /**
   * 🔍 Encontrar slots conflitantes
   *
   * Retorna array com todos os slots que conflitam com o horário especificado.
   * Usa a mesma lógica robusta de detecção de conflitos da função anterior.
   *
   * @param newStartHour Hora início do novo plantão
   * @param newEndHour Hora fim do novo plantão
   * @param targetRowIndex Linha alvo
   * @param excludeSlotId ID do slot a ignorar (opcional)
   * @returns Array de slots conflitantes
   */
  const findConflictingSlots = useCallback(
    (
      newStartHour: number,
      newEndHour: number,
      targetRowIndex: number,
      excludeSlotId?: string
    ): TimeSlot[] => {
      const daySlots = slotsByDay[activeLineIndex]?.[editingDayIndex] || [];
      return daySlots.filter((slot) => {
        if (
          (slot.rowIndex || 0) !== targetRowIndex ||
          slot.id === excludeSlotId
        ) {
          return false;
        }

        const slotStart = slot.startHour;
        const slotEnd = slot.endHour;

        // Reutiliza a mesma lógica de detecção de conflitos
        const newCrossesMidnight =
          newEndHour > 24 || (newEndHour < newStartHour && newEndHour < 24);
        const slotCrossesMidnight =
          slotEnd > 24 || (slotEnd < slotStart && slotEnd < 24);

        // Aplicar os mesmos 4 cenários da função de validação
        if (!newCrossesMidnight && !slotCrossesMidnight) {
          return newStartHour < slotEnd && newEndHour > slotStart;
        }

        if (newCrossesMidnight && !slotCrossesMidnight) {
          const newEndNormalized =
            newEndHour > 24 ? newEndHour - 24 : newEndHour;
          const conflictBeforeMidnight =
            newStartHour < slotEnd && 24 > slotStart;
          const conflictAfterMidnight =
            0 < slotEnd && newEndNormalized > slotStart;
          return conflictBeforeMidnight || conflictAfterMidnight;
        }

        if (!newCrossesMidnight && slotCrossesMidnight) {
          const slotEndNormalized = slotEnd > 24 ? slotEnd - 24 : slotEnd;
          const conflictBeforeMidnight =
            newStartHour < 24 && newEndHour > slotStart;
          const conflictAfterMidnight =
            newStartHour < slotEndNormalized && newEndHour > 0;
          return conflictBeforeMidnight || conflictAfterMidnight;
        }

        if (newCrossesMidnight && slotCrossesMidnight) {
          const newEndNormalized =
            newEndHour > 24 ? newEndHour - 24 : newEndHour;
          const slotEndNormalized = slotEnd > 24 ? slotEnd - 24 : slotEnd;
          const conflictBeforeMidnight = newStartHour < 24 && 24 > slotStart;
          const conflictAfterMidnight =
            0 < slotEndNormalized && newEndNormalized > 0;
          const directOverlap =
            newStartHour < slotEndNormalized && newEndNormalized > slotStart;
          return (
            conflictBeforeMidnight || conflictAfterMidnight || directOverlap
          );
        }

        return false;
      });
    },
    [slotsByDay, activeLineIndex, editingDayIndex]
  );

  // ============================================================================
  // 💡 SISTEMA DE SUGESTÃO INTELIGENTE DE HORÁRIOS
  // ============================================================================

  /**
   * 💡 Algoritmo de Sugestão de Horários Inteligente
   *
   * Encontra melhores horários disponíveis baseado em:
   * - Durações médicas padrão: 6h, 7h, 8h (ideais), 12h, 18h, 19h
   * - Horários de início preferenciais: 06h, 07h, 08h (diurno), 18h, 19h (noturno)
   * - Sistema de pontuação que favorece práticas médicas comuns
   * - Validação completa de conflitos (incluindo plantões que atravessam meia-noite)
   *
   * @param duration Duração desejada do plantão em horas
   * @param targetRowIndex Linha onde se deseja criar o plantão
   * @param maxSuggestions Número máximo de sugestões a retornar
   * @returns Array com sugestões ordenadas por relevância médica
   */
  const findAvailableTimeSlots = useCallback(
    (
      duration: number,
      targetRowIndex: number,
      maxSuggestions = 3
    ): { startHour: number; endHour: number; score: number }[] => {
      const availableSlots: {
        startHour: number;
        endHour: number;
        score: number;
      }[] = [];

      // 🕐 Horários de início alinhados com rotinas hospitalares
      const idealStartTimes = [
        6, // 06:00 - Matutino cedo (troca de plantão)
        7, // 07:00 - Diurno padrão (mais comum)
        8, // 08:00 - Administrativo/ambulatorial
        18, // 18:00 - Noturno ideal (troca de plantão)
        19, // 19:00 - Noturno alternativo (comum)
      ];

      // 🔍 Primeiro: testar horários ideais para a medicina
      for (const startHour of idealStartTimes) {
        let endHour = startHour + duration;

        // ⏰ Plantões que atravessam meia-noite mantêm endHour > 24
        // Exemplo: 22h + 8h = 30h (representa 22h-06h do dia seguinte)

        // ✅ Verificar conflitos usando algoritmo robusto de 4 cenários
        if (
          !checkTimeConflict(startHour, endHour, targetRowIndex) &&
          duration <= 24
        ) {
          // 🏆 Sistema de Pontuação Médica Otimizado
          let score = 0;

          // Horários ideais recebem pontuação máxima (menor score = melhor)
          if ([6, 7, 8].includes(startHour)) score = 1; // Diurno ideal
          else if ([18, 19].includes(startHour)) score = 2; // Noturno ideal

          availableSlots.push({
            startHour,
            endHour: endHour > 24 ? endHour : endHour % 24,
            score,
          });
        }
      }

      // 🔍 Se não há slots ideais suficientes, testar todos os horários (0-23h)
      if (availableSlots.length < maxSuggestions) {
        for (let startHour = 0; startHour < 24; startHour++) {
          // Pular horários já testados
          if (idealStartTimes.includes(startHour)) continue;

          let endHour = startHour + duration;

          if (
            !checkTimeConflict(startHour, endHour, targetRowIndex) &&
            duration <= 24
          ) {
            // Calcular distância dos horários ideais (6h, 7h, 8h, 18h, 19h)
            const distances = idealStartTimes.map((ideal) =>
              Math.abs(startHour - ideal)
            );
            const score = Math.min(...distances) + 3; // +3 para priorizar slots ideais

            availableSlots.push({
              startHour,
              endHour: endHour > 24 ? endHour : endHour % 24,
              score,
            });
          }
        }
      }

      // 📊 Retornar melhores sugestões (menor score = melhor)
      return availableSlots
        .sort((a, b) => a.score - b.score)
        .slice(0, maxSuggestions);
    },
    [checkTimeConflict]
  );

  /**
   * 🎯 Buscar Próximo Horário Disponível
   *
   * Função de compatibilidade que encontra o primeiro slot disponível
   * próximo ao horário preferido pelo usuário.
   *
   * @param preferredStartHour Horário preferido de início
   * @param duration Duração desejada em horas
   * @param targetRowIndex Linha alvo
   * @returns Slot disponível mais próximo ou null se não houver
   */
  const findNextAvailableTime = useCallback(
    (
      preferredStartHour: number,
      duration: number,
      targetRowIndex: number
    ): { startHour: number; endHour: number } | null => {
      const availableSlots = findAvailableTimeSlots(
        duration,
        targetRowIndex,
        1
      );

      if (availableSlots.length === 0) return null;

      // 🎯 Tentar encontrar slot próximo ao horário preferido (±2h de tolerância)
      const preferredSlot = availableSlots.find(
        (slot) => Math.abs(slot.startHour - preferredStartHour) <= 2
      );

      return preferredSlot || availableSlots[0];
    },
    [findAvailableTimeSlots]
  );

  // ============================================================================
  // 🎭 SISTEMA DE GESTÃO INTELIGENTE DE CONFLITOS
  // ============================================================================

  /**
   * ⚠️ Gestão Inteligente de Conflitos de Horário
   *
   * Quando detectado conflito, esta função:
   * 1. 🔍 Identifica exatamente quais plantões estão conflitando
   * 2. 💡 Busca até 3 alternativas inteligentes usando algoritmo de pontuação médica
   * 3. 🎭 Apresenta modal elegante com sugestões ou alerta informativo
   *
   * Substitui alertas básicos por interface moderna de resolução de conflitos.
   *
   * @param startHour Hora início do plantão com conflito
   * @param endHour Hora fim do plantão com conflito
   * @param targetRow Linha onde ocorreu o conflito
   * @param duration Duração do plantão em horas
   */
  const handleTimeConflict = useCallback(
    (
      startHour: number,
      endHour: number,
      targetRow: number,
      duration: number
    ) => {
      // 🔍 Identificar slots específicos em conflito
      const conflictingSlots = findConflictingSlots(
        startHour,
        endHour,
        targetRow
      );
      const conflictText = conflictingSlots
        .map(
          (slot) =>
            `${formatHourDisplay(slot.startHour)} - ${formatHourDisplay(
              slot.endHour
            )}`
        )
        .join(", ");

      // 💡 Buscar alternativas inteligentes (até 3 sugestões)
      const availableAlternatives = findAvailableTimeSlots(
        duration,
        targetRow,
        3
      );

      if (availableAlternatives.length > 0) {
        // ✨ Mostrar modal elegante com sugestões inteligentes
        setConflictInfo(`Conflito detectado nos horários: ${conflictText}`);
        setSuggestedSlots(availableAlternatives);
        setPendingCreation({
          duration,
          targetRow,
          originalStart: startHour,
        });
        setShowSuggestionsModal(true);
      } else {
        // 🚫 Nenhuma alternativa disponível - mostrar toast informativo
        toast.error("Conflito de horário!", {
          position: "top-right",
          description: () => {
            return (
              <>
                <h1>
                  Horário solicitado: {formatHourDisplay(startHour)} -{" "}
                  {formatHourDisplay(endHour)}
                </h1>
                <h2>Conflito com: {conflictText}</h2>
                <h3>
                  ❗ Não há horários livres suficientes para um plantão de{" "}
                  {duration}h nesta linha.
                </h3>
                <h3>
                  💡 Sugestão: Tente usar outra linha ou remover alguns plantões
                  existentes.
                </h3>
              </>
            );
          },
          duration: 10000,
        });
      }
    },
    [findConflictingSlots, findAvailableTimeSlots, formatHourDisplay]
  );

  // ============================================================================
  // 👨‍⚕️ SISTEMA DE VALIDAÇÃO DE CONFLITOS DE MÉDICOS
  // ============================================================================

  /**
   * 🩺 Verificar conflitos de médicos
   *
   * Detecta se um médico já está atribuído a outro horário conflitante
   * APENAS no mesmo dia da mesma semana:
   * ✅ Plantões normais (8h-16h vs 10h-14h)
   * ✅ Plantões noturnos (22h-06h vs 04h-10h)
   * ✅ Plantões 24h (7h-7h vs qualquer outro)
   * ✅ Casos mistos (qualquer combinação)
   *
   * ❌ NÃO considera conflito:
   * - Mesmo médico em dias diferentes (Segunda vs Terça)
   * - Mesmo médico em semanas diferentes (Semana 1 vs Semana 2)
   *
   * @param medicoId ID do médico a ser verificado
   * @param newStartHour Hora início do slot onde se quer atribuir o médico
   * @param newEndHour Hora fim do slot onde se quer atribuir o médico
   * @param excludeSlotId ID do slot a ignorar (para edições)
   * @returns {conflicting: boolean, conflictingSlots: TimeSlot[]} - conflito detectado e slots conflitantes
   */
  const checkMedicoConflict = useCallback(
    (
      medicoId: string,
      newStartHour: number,
      newEndHour: number,
      excludeSlotId?: string
    ): { conflicting: boolean; conflictingSlots: TimeSlot[] } => {
      if (!medicoId || medicoId === "none") {
        return { conflicting: false, conflictingSlots: [] };
      }

      // 🎯 Verificar conflitos APENAS no dia atual da semana atual
      const conflictingSlots: TimeSlot[] = [];

      // Verificar apenas os slots do DIA ATUAL da SEMANA ATUAL
      const daySlots = slotsByDay[activeLineIndex]?.[editingDayIndex] || [];

      const slotsWithMedico = daySlots.filter((slot) => {
        // Verificar se o médico está atribuído a este slot
        const hasMedico = slot.assignedVagas?.some(
          (vaga) => vaga.medicoId === medicoId
        );

        // Ignorar o slot que está sendo editado
        return hasMedico && slot.id !== excludeSlotId;
      });

      // Para cada slot onde o médico está atribuído, verificar conflito
      slotsWithMedico.forEach((slot) => {
        const slotStart = slot.startHour;
        const slotEnd = slot.endHour;

        // Usar a mesma lógica robusta de detecção de conflitos de horários
        const newCrossesMidnight =
          newEndHour > 24 || (newEndHour < newStartHour && newEndHour < 24);
        const slotCrossesMidnight =
          slotEnd > 24 || (slotEnd < slotStart && slotEnd < 24);

        let hasConflict = false;

        // 📋 CENÁRIO 1: Ambos são plantões normais (não atravessam meia-noite)
        if (!newCrossesMidnight && !slotCrossesMidnight) {
          hasConflict = newStartHour < slotEnd && newEndHour > slotStart;
        }
        // 📋 CENÁRIO 2: Novo plantão atravessa meia-noite, existente não
        else if (newCrossesMidnight && !slotCrossesMidnight) {
          const newEndNormalized =
            newEndHour > 24 ? newEndHour - 24 : newEndHour;
          const conflictBeforeMidnight =
            newStartHour < slotEnd && 24 > slotStart;
          const conflictAfterMidnight =
            0 < slotEnd && newEndNormalized > slotStart;
          hasConflict = conflictBeforeMidnight || conflictAfterMidnight;
        }
        // 📋 CENÁRIO 3: Plantão existente atravessa meia-noite, novo não
        else if (!newCrossesMidnight && slotCrossesMidnight) {
          const slotEndNormalized = slotEnd > 24 ? slotEnd - 24 : slotEnd;
          const conflictBeforeMidnight =
            newStartHour < 24 && newEndHour > slotStart;
          const conflictAfterMidnight =
            newStartHour < slotEndNormalized && newEndHour > 0;
          hasConflict = conflictBeforeMidnight || conflictAfterMidnight;
        }
        // 📋 CENÁRIO 4: Ambos atravessam meia-noite
        else if (newCrossesMidnight && slotCrossesMidnight) {
          const newEndNormalized =
            newEndHour > 24 ? newEndHour - 24 : newEndHour;
          const slotEndNormalized = slotEnd > 24 ? slotEnd - 24 : slotEnd;
          const conflictBeforeMidnight = newStartHour < 24 && 24 > slotStart;
          const conflictAfterMidnight =
            0 < slotEndNormalized && newEndNormalized > 0;
          const directOverlap =
            newStartHour < slotEndNormalized && newEndNormalized > slotStart;
          hasConflict =
            conflictBeforeMidnight || conflictAfterMidnight || directOverlap;
        }

        if (hasConflict) {
          conflictingSlots.push({
            ...slot,
            dayIndex: editingDayIndex, // Sempre o dia atual sendo editado
          } as TimeSlot & { dayIndex: number });
        }
      });

      return {
        conflicting: conflictingSlots.length > 0,
        conflictingSlots,
      };
    },
    [slotsByDay, activeLineIndex, editingDayIndex]
  );

  // ============================================================================
  // ✅ SISTEMA DE CRIAÇÃO E UTILITÁRIOS
  // ============================================================================

  /**
   * ✅ Criação Segura de Plantão
   *
   * Cria um plantão validado (sem conflitos) através de simulação do drag-and-drop.
   * Esta função é usada quando um horário é selecionado do modal de sugestões.
   *
   * @param startHour Hora de início do plantão
   * @param endHour Hora de fim do plantão
   * @param targetRow Linha onde criar o plantão
   */
  const createPlantaoSafely = useCallback(
    (startHour: number, endHour: number, targetRow: number) => {
      setDragRowIndex(targetRow);
      setTimeout(() => {
        handleDragEnd(startHour, endHour, targetRow);
        setTimeout(() => setDragRowIndex(null), 50);
      }, 10);
    },
    [handleDragEnd, setDragRowIndex]
  );

  /**
   * ✅ Confirmar criação de plantão que se estende além da grade
   */
  const handleConfirmExtendedShift = useCallback(() => {
    console.log("Confirmando criação de plantão que se estende além da grade");
    if (!extendedShiftData) return;

    const { normalizedStart, duration, dragRowIndex } = extendedShiftData;
    const finalEndHour = normalizedStart + duration;

    // 🔍 Verificar conflitos para plantão noturno
    const hasConflict = checkTimeConflict(
      normalizedStart,
      finalEndHour,
      dragRowIndex
    );

    if (hasConflict) {
      // ⚠️ Mostrar modal de sugestões para plantão noturno
      handleTimeConflict(normalizedStart, finalEndHour, dragRowIndex, duration);
    } else {
      // ✅ Sem conflitos, criar plantão noturno
      handleDragEnd(normalizedStart, finalEndHour, dragRowIndex);
      toast.success("Plantão noturno criado!", {
        description: `Plantão de ${duration}h criado com sucesso atravessando a meia-noite.`,
        duration: 4000,
      });
    }

    // Fechar modal
    setShowExtendedShiftModal(false);
    setExtendedShiftData(null);
  }, [extendedShiftData, checkTimeConflict, handleTimeConflict, handleDragEnd]);

  /**
   * ❌ Cancelar criação de plantão que se estende além da grade
   */
  const handleCancelExtendedShift = useCallback(() => {
    // Fechar modal e mostrar dicas
    setShowExtendedShiftModal(false);
    setExtendedShiftData(null);

    toast.info("Dicas para ajustar o horário", {
      description:
        "1. Reduza a duração do plantão\n2. Use o menu contextual (clique direito)\n3. Considere plantão de 6h, 8h ou 12h\n4. Para plantão noturno, use menu de criação\n\nExemplo: Ao invés de arrastar de 07h até além da grade, clique em 07h → Menu → Escolha duração desejada",
      duration: 8000,
    });
  }, []);

  /**
   * 🔄 Replicação de Escala para Múltiplos Dias
   *
   * Replica a configuração de plantões do dia atual para os dias selecionados.
   * Útil para criar padrões de escala semanais ou mensais.
   */
  const replicateToSelectedDays = () => {
    if (selectedReplicationDays.length > 0 && replicateDayToOtherDays) {
      replicateDayToOtherDays(editingDayIndex, selectedReplicationDays);
      setSelectedReplicationDays([]);
    }
  };

  // ============================================================================
  // 🖱️ SISTEMA DE MANIPULAÇÃO DE EVENTOS DE MOUSE
  // ============================================================================

  /**
   * 🖱️ Finalização do Drag-and-Drop com Validação
   *
   * Processa o término da operação de arrastar para criar plantão:
   * 1. 📏 Calcula horários baseado nas posições inicial/final do drag
   * 2. 🚫 Bloqueia arrastar "para trás" (direção inválida)
   * 3. ✅ Valida duração (1-24h) e normaliza horários
   * 4. 🔍 Verifica conflitos usando algoritmo robusto de 4 cenários
   * 5. 🎭 Apresenta feedback elegante ou cria o plantão
   *
   * Sistema completo de validação que previne sobreposições de horários.
   */
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      if (
        hasDragged &&
        dragStart !== null &&
        dragEnd !== null &&
        dragRowIndex !== null
      ) {
        // 🚫 VALIDAÇÃO CRÍTICA: Impedir arrastar "para trás"
        if (dragEnd < dragStart) {
          toast.error("Direção inválida!", {
            description:
              "Para criar um plantão, arraste da esquerda para a direita (do horário inicial para o final). Exemplo: Clique em 07:00 e arraste até 15:00",
            duration: 5000,
          });

          // 🧹 Reset do estado de drag sem criar plantão
          setIsDragging(false);
          setDragRowIndex(null);
          setDragStart(null);
          setDragEnd(null);
          setHasDragged(false);
          return;
        }

        // 📏 Calcular horários do drag baseado nas posições
        const rawStartHour = Math.min(dragStart, dragEnd);
        const rawEndHour = Math.max(dragStart, dragEnd) + 1;

        // 🕐 Normalizar para formato 0-23h padrão
        const normalizedStart = rawStartHour % 24;
        const duration = rawEndHour - rawStartHour;

        // 🚫 VALIDAÇÃO: Verificar se o plantão se estende além da grade atual
        const startHourBase =
          weekStartHours[activeLineIndex] || editingGradeHorario;
        const gridEndHour = startHourBase + 23; // Grade de 24h
        const plantaoEndHour = rawStartHour + duration;

        // Se o plantão tenta se estender além da grade visível atual
        if (plantaoEndHour > gridEndHour + 1 && duration <= 24) {
          const extendedHours = plantaoEndHour - (gridEndHour + 1);

          // Armazenar dados para o modal e exibir
          setExtendedShiftData({
            rawStartHour,
            plantaoEndHour,
            extendedHours,
            normalizedStart,
            duration,
            dragRowIndex,
          });
          setShowExtendedShiftModal(true);

          // 🧹 Reset do estado de drag (será retomado se usuário confirmar)
          setIsDragging(false);
          setDragRowIndex(null);
          setDragStart(null);
          setDragEnd(null);
          setHasDragged(false);
          return;
        }

        // ✅ Validar duração (máximo 24h para plantões médicos)
        if (duration > 0 && duration <= 24) {
          // ⏰ Para plantões que atravessam meia-noite, usar representação que o sistema entende
          let finalEndHour = normalizedStart + duration;

          // 🔍 Verificar conflitos usando algoritmo robusto de 4 cenários
          const hasConflict = checkTimeConflict(
            normalizedStart,
            finalEndHour,
            dragRowIndex
          );

          if (hasConflict) {
            // ⚠️ Mostrar feedback detalhado de conflito
            const conflictingSlots = findConflictingSlots(
              normalizedStart,
              finalEndHour,
              dragRowIndex
            );
            const conflictInfo = conflictingSlots
              .map(
                (slot) =>
                  `${formatHourDisplay(slot.startHour)} - ${formatHourDisplay(
                    slot.endHour
                  )}`
              )
              .join(", ");

            // 🎭 Feedback elegante de conflito
            toast.error("Conflito de horário detectado!", {
              description: `Já existe(m) plantão(ões) em: ${conflictInfo}. Tente criar em outra linha ou horário diferente.`,
              duration: 6000,
            });
          } else {
            // ✅ Sem conflitos, criar o slot com segurança
            handleDragEnd(normalizedStart, finalEndHour, dragRowIndex);
          }
        } else {
          toast.error("Duração inválida", {
            description: "O plantão deve ter entre 1 e 24 horas.",
            duration: 4000,
          });
        }
      }

      // 🧹 Reset completo do estado de drag
      setIsDragging(false);
      setDragRowIndex(null);
      setDragStart(null);
      setDragEnd(null);
      setHasDragged(false);
    }
  }, [
    isDragging,
    hasDragged,
    dragStart,
    dragEnd,
    dragRowIndex,
    checkTimeConflict,
    findConflictingSlots,
    formatHourDisplay,
    handleDragEnd,
  ]);

  // Adicionar listener global como fallback
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  const menuOptions: {
    [key: number]: string;
  } = {
    24: "Plantão Completo",
    12: "Meio Plantão",
    8: "Turno Padrão",
    6: "Turno reduzido",
  };
  // MARK: INICIO DA RENDERIZAÇÃO
  return (
    <div className="space-y-4 p-4">
      {/* Header da interface de edição de dia específico */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              // Limpar linhas vazias antes de sair
              if (cleanupEmptyRowsForDay) {
                cleanupEmptyRowsForDay(activeLineIndex, editingDayIndex);
              }

              // Replicar se houver dias selecionados
              if (selectedReplicationDays.length > 0) {
                replicateToSelectedDays();
              }

              // Voltar para visão geral
              setEditingDayIndex(null);
            }}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-sm font-normal"
          >
            ← Voltar
          </Button>
          <span className="text-sm font-normal">
            Editando: {diasSemana[editingDayIndex]} - Semana{" "}
            {activeLineIndex + 1}
          </span>
        </div>
      </div>

      {/* TODO: Controles de replicação */}
      <div className="h-full px-4 py-4 flex justify-center rounded-md border border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-thin">Replicar para:</Label>
          <div className="flex gap-1">
            {diasSemana.map((dia, dayIndex) => {
              const isCurrentDay = dayIndex === editingDayIndex;
              const isSelected = selectedReplicationDays.includes(dayIndex);

              return (
                <Button
                  key={dayIndex}
                  onClick={() => {
                    if (isCurrentDay) return;

                    if (isSelected) {
                      // Remover da lista de replicação
                      setSelectedReplicationDays((prev) =>
                        prev.filter((d) => d !== dayIndex)
                      );
                    } else {
                      // Adicionar à lista de replicação
                      setSelectedReplicationDays((prev) => [...prev, dayIndex]);
                    }
                  }}
                  variant={
                    isCurrentDay
                      ? "default"
                      : isSelected
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  className={`h-7 px-2 text-xs ${
                    isCurrentDay
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:scale-105 transition-transform"
                  }`}
                  disabled={isCurrentDay}
                  title={
                    isCurrentDay
                      ? "Dia atual (sempre incluído)"
                      : isSelected
                      ? "Clique para desmarcar"
                      : "Clique para replicar"
                  }
                  style={
                    isCurrentDay || isSelected
                      ? {
                          backgroundColor: line.cor,
                          borderColor: line.cor,
                          color: "white",
                        }
                      : {
                          borderColor: line.cor,
                          color: line.cor,
                        }
                  }
                >
                  {dia}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de horários */}

      <div>
        {/* MARK: Marcação das 24 horas no topo */}
        <div className="relative w-full border border-gray-300 rounded-t-md bg-gray-50 flex text-xs font-thin text-gray-600">
          {Array.from({ length: 24 }, (_, i) => {
            const startHourBase =
              weekStartHours[activeLineIndex] || editingGradeHorario;
            const actualHour = startHourBase + i;

            {
              /* MARK: START HOUR BASE */
            }
            return (
              <div
                key={i}
                className="flex-1 border-r border-gray-200 text-center py-1"
                style={{
                  minWidth: "calc(100% / 24)",
                }}
              >
                {formatHourDisplay(actualHour)}
              </div>
            );
          })}
        </div>

        {/* Container principal do grid de edição */}
        <div
          className="relative w-full border border-gray-300 border-t-0 rounded shadow-sm bg-white overflow-visible"
          style={{
            height: `${
              getDayRowCount(activeLineIndex, editingDayIndex) * 80
            }px`,
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* MARK: Renderizar múltiplas linhas */}
          {Array.from(
            { length: getDayRowCount(activeLineIndex, editingDayIndex) },
            (_, rowIndex) => (
              <div
                key={rowIndex}
                className={`absolute w-full flex border-b border-gray-200 transition-all ${
                  isDragging && dragRowIndex === rowIndex
                    ? "ring-2 ring-offset-1"
                    : ""
                }`}
                style={
                  {
                    top: `${rowIndex * 80}px`,
                    height: "80px",
                    "--tw-ring-color":
                      isDragging && dragRowIndex === rowIndex
                        ? line.cor
                        : undefined,
                  } as React.CSSProperties
                }
              >
                {/* MARK: Região para criação de novos plantões - fundo clickável */}
                <div className="absolute inset-0 flex z-0">
                  {/* MARK:  MUDAR A A LENGTH*/}
                  {Array.from({ length: 24 }, (_, i) => {
                    // MARK: LÓGICA DE INTERAÇÃO DE DRAG-AND-DROP
                    return (
                      <div
                        key={i}
                        className="flex-1 border-r border-gray-200 transition-colors relative hover:bg-gray-100 hover:bg-opacity-30 cursor-pointer"
                        style={{
                          minWidth: "calc(100% / 24)",
                        }}
                        onMouseDown={(e) => {
                          // 🚫 LIMITE CRÍTICO: Não permitir iniciar drag na última posição da grade
                          if (i === 23) {
                            e.preventDefault();
                            e.stopPropagation();

                            toast.error("Posição final da grade", {
                              description:
                                "Não é possível iniciar um plantão na última posição da grade. Use as posições anteriores ou o menu contextual para criar plantões que atravessam a meia-noite.",
                              duration: 4000,
                            });
                            return;
                          }

                          // Iniciando drag/click
                          e.preventDefault();
                          e.stopPropagation();

                          const startHourBase =
                            weekStartHours[activeLineIndex] ||
                            editingGradeHorario;
                          const actualHour = startHourBase + i;

                          // Iniciar processo de drag
                          setIsDragging(true);
                          setDragRowIndex(rowIndex);
                          setDragStart(actualHour);
                          setDragEnd(actualHour);
                          setHasDragged(false);
                        }}
                        onMouseEnter={() => {
                          if (isDragging) {
                            console.warn("entrando ");
                            console.info("DRAG END -> ", dragEnd);
                            console.info("dragRowIndex -> ", dragRowIndex);
                          }
                          //MARK: COLOCAR O BLOQUEO AQUI
                          if (isDragging && dragStart !== null) {
                            const startHourBase =
                              weekStartHours[activeLineIndex] ||
                              editingGradeHorario;
                            const actualHour = startHourBase + i;

                            // 🎯 LÓGICA DIRECIONAL INTELIGENTE baseada na posição inicial
                            const dragStartRelativeIndex =
                              (dragStart - startHourBase + 24) % 24;
                            const currentRelativeIndex = i;
                            const isDraggingRight =
                              currentRelativeIndex > dragStartRelativeIndex;
                            const isDraggingLeft =
                              currentRelativeIndex < dragStartRelativeIndex;

                            // 🚫 VALIDAÇÃO: Posição 06h (índice 23) - só pode arrastar para ESQUERDA
                            if (
                              dragStartRelativeIndex === 23 &&
                              isDraggingRight
                            ) {
                              if (!hasDragged) {
                                toast.error("Drag bloqueado - posição final", {
                                  description:
                                    "Iniciando em 06h: só é possível arrastar para a esquerda (direção 07h). Direção direita bloqueada.",
                                  duration: 3000,
                                });
                                setHasDragged(true);
                              }
                              return;
                            }

                            // 🚫 VALIDAÇÃO: Posição 07h (índice 0) - só pode arrastar para DIREITA
                            if (
                              dragStartRelativeIndex === 0 &&
                              isDraggingLeft
                            ) {
                              if (!hasDragged) {
                                toast.error(
                                  "Drag bloqueado - posição inicial",
                                  {
                                    description:
                                      "Iniciando em 07h: só é possível arrastar para a direita (direção 06h). Direção esquerda bloqueada.",
                                    duration: 3000,
                                  }
                                );
                                setHasDragged(true);
                              }
                              return;
                            }

                            // 🚫 VALIDAÇÃO: Limites absolutos da grade
                            const gridStartHour = startHourBase;
                            const gridEndHour = startHourBase + 23;

                            if (dragStart !== null) {
                              const wouldExtendBeyond =
                                (dragStart <= actualHour &&
                                  actualHour > gridEndHour) ||
                                (dragStart >= actualHour &&
                                  actualHour < gridStartHour);

                              if (wouldExtendBeyond) {
                                if (!hasDragged) {
                                  toast.info("Limite da grade atingido", {
                                    description: `Arraste limitado dentro da grade (${formatHourDisplay(
                                      gridStartHour
                                    )} - ${formatHourDisplay(
                                      gridEndHour + 1
                                    )}). Use o menu contextual para plantões que atravessam meia-noite.`,
                                    duration: 3000,
                                  });
                                }
                                return;
                              }
                            }

                            // Só atualizar se mudou e está dentro dos limites
                            if (actualHour !== dragEnd) {
                              setDragEnd(actualHour);
                              setHasDragged(true);
                            }
                          }
                        }}
                        onClick={(e) => {
                          // Só abrir menu se não houver drag
                          if (!isDragging && !hasDragged) {
                            e.preventDefault();
                            e.stopPropagation();

                            const clickedHour =
                              (weekStartHours[activeLineIndex] ||
                                editingGradeHorario) + i;

                            // Calcular posição do menu
                            const menuWidth = 200;
                            const menuHeight = 320;
                            const padding = 10;

                            let menuX = e.clientX;
                            let menuY = e.clientY;

                            // Ajustar posicionamento
                            if (
                              menuX + menuWidth + padding >
                              window.innerWidth
                            ) {
                              menuX = window.innerWidth - menuWidth - padding;
                            }
                            if (menuX < padding) {
                              menuX = padding;
                            }
                            if (
                              menuY + menuHeight + padding >
                              window.innerHeight
                            ) {
                              menuY = window.innerHeight - menuHeight - padding;
                            }
                            if (menuY < padding) {
                              menuY = padding;
                            }

                            setMenuPosition({ x: menuX, y: menuY });

                            setMenuClickedHour(clickedHour);
                            setMenuTargetRow(rowIndex);
                            setShowPlantaoMenu(true);
                          }
                        }}
                      ></div>
                    );
                  })}
                </div>

                {/* Indicador da linha */}
                <div className="absolute left-2 top-2 text-xs text-gray-400 font-thin z-1 pointer-events-none">
                  Linha {rowIndex + 1}
                </div>
              </div>
            )
          )}

          {/* Slots renderizados por linha */}
          {Array.from(
            { length: getDayRowCount(activeLineIndex, editingDayIndex) },
            (_, rowIndex) => (
              <div
                key={`slots-row-${rowIndex}`}
                className="absolute w-full pointer-events-none"
                style={{
                  top: `${rowIndex * 80}px`,
                  height: "80px",
                  zIndex: 10,
                }}
              >
                {/* Slots para esta linha específica */}
                {(() => {
                  const daySlots =
                    slotsByDay[activeLineIndex]?.[editingDayIndex] || [];
                  const slotsForRow = daySlots.filter(
                    (slot) => (slot.rowIndex || 0) === rowIndex
                  );

                  // 🐛 DEBUG: Log completo dos slots encontrados

                  // Ordenar slots por hora de início para renderização correta
                  const sortedSlots = slotsForRow.sort(
                    (a, b) => a.startHour - b.startHour
                  );

                  // Renderizar cada slot individualmente (sem agrupamento)
                  return sortedSlots.map((slot, index) => {
                    const startHour = slot.startHour;
                    const endHour = slot.endHour;
                    const startHourBase =
                      weekStartHours[activeLineIndex] || editingGradeHorario;
                    const duration = endHour - startHour;

                    // ✅ USAR FUNÇÃO UTILITÁRIA para cálculo correto de posicionamento
                    const position = calculateSlotPosition(
                      startHour,
                      endHour,
                      startHourBase
                    );

                    // 🚫 Não renderizar slots invisíveis
                    if (!position.isVisible) {
                      // Log específico para slots que deveriam estar visíveis
                      if (startHour >= 3 && startHour <= 7) {
                        console.error(`🚨 SLOT CRÍTICO INVISÍVEL (03h-07h):`, {
                          slotId: slot.id,
                          startHour,
                          endHour,
                          startHourBase,
                          position,
                          message:
                            "Este slot deveria estar visível mas foi ocultado!",
                        });
                      }
                      return null;
                    }

                    const duracaoTexto = `${duration}h`;
                    const isSmall = duration <= 1;

                    // Verificar se há conflito com outros slots (para styling)
                    const hasTimeConflict = sortedSlots.some(
                      (otherSlot, otherIndex) => {
                        if (otherIndex === index || otherSlot.id === slot.id)
                          return false;
                        return (
                          startHour < otherSlot.endHour &&
                          endHour > otherSlot.startHour
                        );
                      }
                    );

                    // Verificar se há conflito de médico
                    const hasMedicoConflict = slot.assignedVagas?.[0]?.medicoId
                      ? checkMedicoConflict(
                          slot.assignedVagas[0].medicoId,
                          startHour,
                          endHour,
                          slot.id
                        ).conflicting
                      : false;

                    // Conflito geral (tempo ou médico)
                    const hasConflict = hasTimeConflict || hasMedicoConflict;

                    return (
                      <div
                        key={slot.id}
                        className="absolute h-full"
                        style={{
                          left: `${position.leftOffset}%`,
                          width: `${position.width}%`,
                          zIndex: 20 + index, // Z-index crescente para evitar sobreposições
                        }}
                      >
                        <div
                          className={`absolute inset-0 m-px rounded shadow-sm transition-all hover:shadow-lg pointer-events-auto ${
                            hasConflict
                              ? "ring-2 ring-red-500 ring-opacity-50"
                              : ""
                          }`}
                          style={{
                            backgroundColor: hasConflict
                              ? "#ef4444" + "60" // Vermelho semi-transparente para conflitos
                              : line.cor + "80", // Cor normal
                            borderColor: hasConflict ? "#ef4444" : line.cor,
                            borderWidth: hasConflict ? "2px" : "1px",
                          }}
                          title={
                            hasConflict
                              ? `⚠️ CONFLITO${
                                  hasTimeConflict ? " DE HORÁRIO" : ""
                                }${
                                  hasMedicoConflict ? " DE MÉDICO" : ""
                                }: ${formatHourDisplay(
                                  startHour
                                )} - ${formatHourDisplay(
                                  endHour
                                )} (${duracaoTexto})`
                              : `${formatHourDisplay(
                                  startHour
                                )} - ${formatHourDisplay(
                                  endHour
                                )} (${duracaoTexto})`
                          }
                        >
                          {/*MARK: Handles de redimensionamento */}
                          <>
                            <div
                              className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize opacity-0 hover:opacity-50 transition-all"
                              style={{
                                backgroundColor: hasConflict
                                  ? "#ef4444"
                                  : line.cor,
                                zIndex: 50,
                              }}
                              onMouseDown={(e) => {
                                if (isDragging) {
                                  console.warn("entrando ");
                                  console.info("DRAG END -> ", dragEnd);
                                  console.info(
                                    "dragRowIndex -> ",
                                    dragRowIndex
                                  );
                                }
                                e.stopPropagation();
                                e.preventDefault();
                                handleSlotResize(slot.id, "start", e);
                              }}
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize opacity-0 hover:opacity-50 transition-all"
                              style={{
                                backgroundColor: hasConflict
                                  ? "#ef4444"
                                  : line.cor,
                                zIndex: 50,
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleSlotResize(slot.id, "end", e);
                              }}
                            />
                          </>

                          <div
                            className={`h-full flex items-center ${
                              isSmall
                                ? "flex-col justify-center px-1"
                                : "justify-between px-2"
                            }`}
                          >
                            <div
                              className={`${
                                isSmall
                                  ? "text-center"
                                  : "flex items-center gap-2"
                              } min-w-0`}
                            >
                              <span
                                className={`${
                                  isSmall ? "text-xs" : "text-sm"
                                } font-thin truncate`}
                              >
                                {isSmall
                                  ? duracaoTexto
                                  : `${formatHourDisplay(
                                      startHour
                                    )} - ${formatHourDisplay(endHour)}`}
                              </span>
                              {!isSmall && (
                                <span className="text-xs font-thin">
                                  ({duracaoTexto})
                                </span>
                              )}
                              {hasConflict && (
                                <span
                                  className="text-xs text-red-600 font-bold"
                                  title={
                                    hasTimeConflict && hasMedicoConflict
                                      ? "Conflito de horário e médico"
                                      : hasTimeConflict
                                      ? "Conflito de horário"
                                      : "Conflito de médico"
                                  }
                                >
                                  {hasTimeConflict && hasMedicoConflict
                                    ? "⚠️❌"
                                    : hasTimeConflict
                                    ? "⚠️"
                                    : "👨‍⚕️"}
                                </span>
                              )}
                            </div>

                            <div
                              className={`flex items-center gap-1 ${
                                isSmall ? "flex-1 justify-end" : ""
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <MedicoSelectWithTeams
                                  value={
                                    slot.assignedVagas[0]?.medicoId || "none"
                                  }
                                  onValueChange={(value, medicoData) => {
                                    if (value === "none") {
                                      updateSlotMedico(slot.id, null);
                                    } else if (medicoData) {
                                      // 🩺 VALIDAÇÃO DE CONFLITO DE MÉDICO
                                      const conflictCheck = checkMedicoConflict(
                                        medicoData.id,
                                        slot.startHour,
                                        slot.endHour,
                                        slot.id
                                      );

                                      if (conflictCheck.conflicting) {
                                        // Gerar informações detalhadas dos conflitos
                                        const conflictDetails =
                                          conflictCheck.conflictingSlots
                                            .map((conflictSlot: any) => {
                                              return `${formatHourDisplay(
                                                conflictSlot.startHour
                                              )} - ${formatHourDisplay(
                                                conflictSlot.endHour
                                              )}`;
                                            })
                                            .join(", ");

                                        // Mostrar toast de erro com detalhes
                                        toast.error(
                                          "Conflito de médico detectado!",
                                          {
                                            description: `Dr(a). ${medicoData.nome} já está atribuído(a) no mesmo dia em: ${conflictDetails}`,
                                            duration: 6000,
                                          }
                                        );
                                        return; // Não atribuir o médico
                                      }

                                      // Sem conflitos, atribuir normalmente
                                      updateSlotMedico(slot.id, {
                                        medicoId: medicoData.id,
                                        medicoNome: medicoData.nome,
                                      });
                                    } else {
                                      // Fallback para compatibilidade
                                      const medico = medicos.find(
                                        (m) => m.id === value
                                      );
                                      if (medico) {
                                        const medicoNome = `${medico.medico_primeironome} ${medico.medico_sobrenome}`;

                                        // 🩺 VALIDAÇÃO DE CONFLITO DE MÉDICO (fallback)
                                        const conflictCheck =
                                          checkMedicoConflict(
                                            medico.id,
                                            slot.startHour,
                                            slot.endHour,
                                            slot.id
                                          );

                                        if (conflictCheck.conflicting) {
                                          const conflictDetails =
                                            conflictCheck.conflictingSlots
                                              .map((conflictSlot: any) => {
                                                return `${formatHourDisplay(
                                                  conflictSlot.startHour
                                                )} - ${formatHourDisplay(
                                                  conflictSlot.endHour
                                                )}`;
                                              })
                                              .join(", ");

                                          toast.error(
                                            "Conflito de médico detectado!",
                                            {
                                              description: `Dr(a). ${medicoNome} já está atribuído(a) no mesmo dia em: ${conflictDetails}`,
                                              duration: 6000,
                                            }
                                          );
                                          return;
                                        }

                                        updateSlotMedico(slot.id, {
                                          medicoId: medico.id,
                                          medicoNome,
                                        });
                                      }
                                    }
                                  }}
                                  isSmall={isSmall}
                                  placeholder="Médico"
                                />
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addAdditionalHourLine(slot.id);
                                    }}
                                    className="h-4 w-4 p-0 text-xs hover:text-green-600 transition-all pointer-events-auto"
                                    style={{
                                      color: hasConflict ? "#ef4444" : line.cor,
                                      zIndex: 60,
                                    }}
                                    title="Adicionar linha adicional"
                                  >
                                    +
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeSlot(slot.id);
                                    }}
                                    className="h-4 w-4 p-0 text-xs hover:text-red-600 transition-all pointer-events-auto"
                                    style={{
                                      color: hasConflict ? "#ef4444" : line.cor,
                                      zIndex: 60,
                                    }}
                                    title="Remover horário"
                                  >
                                    ×
                                  </Button>
                                </>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )
          )}

          {/* Visualização do drag - barra temporária com indicação de conflito */}
          {isDragging &&
            dragStart !== null &&
            dragEnd !== null &&
            dragRowIndex !== null &&
            (() => {
              // 🚫 VALIDAÇÃO: Detectar direção inválida (arrastar para trás)
              const isInvalidDirection = dragEnd < dragStart;

              const startHour = Math.min(dragStart, dragEnd);
              const endHour = Math.max(dragStart, dragEnd);
              const duration = endHour - startHour + 1;
              const startHourBase =
                weekStartHours[activeLineIndex] || editingGradeHorario;

              // 🚫 VALIDAÇÃO: Detectar se plantão se estende além da grade
              const gridEndHour = startHourBase + 23;
              const plantaoEndHour = startHour + duration;
              const extendsBeforeGrid =
                !isInvalidDirection && plantaoEndHour > gridEndHour + 1;

              // Verificar se há conflito (apenas se direção for válida e não estende além)
              const normalizedStart = startHour % 24;
              const finalEndHour = normalizedStart + duration;
              const hasConflict =
                !isInvalidDirection &&
                !extendsBeforeGrid &&
                checkTimeConflict(normalizedStart, finalEndHour, dragRowIndex);

              // Calcular posição relativa no grid de 24h
              let relativeStartPosition: number;

              if (startHour >= startHourBase) {
                // Horário na primeira parte (mesmo dia)
                relativeStartPosition = startHour - startHourBase;
              } else {
                // Horário na segunda parte (próximo dia): 00h-05h quando base=7h
                relativeStartPosition = 24 - startHourBase + startHour;
              }

              const leftOffset = (relativeStartPosition / 24) * 100;
              const width = (duration / 24) * 100;

              return (
                <div
                  className="absolute pointer-events-none w-full"
                  style={{
                    top: `${dragRowIndex * 80}px`,
                    height: "80px",
                    zIndex: 1000,
                    left: 0,
                  }}
                >
                  <div
                    className={`absolute rounded opacity-90 ${
                      isInvalidDirection
                        ? "animate-bounce"
                        : extendsBeforeGrid
                        ? "animate-pulse"
                        : hasConflict
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={{
                      left: `${leftOffset}%`,
                      width: `${width}%`,
                      height: "76px",
                      top: "2px",
                      backgroundColor: isInvalidDirection
                        ? "#ef4444" + "40" // Vermelho para direção inválida
                        : extendsBeforeGrid
                        ? "#3b82f6" + "40" // Azul para extensão além da grade
                        : hasConflict
                        ? "#ef4444" + "30" // Vermelho para conflito
                        : line.cor + "30", // Cor normal
                      border: `3px dashed ${
                        isInvalidDirection
                          ? "#ef4444" // Vermelho
                          : extendsBeforeGrid
                          ? "#3b82f6" // Azul
                          : hasConflict
                          ? "#ef4444" // Vermelho
                          : line.cor // Cor normal
                      }`,
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      className="h-full flex items-center justify-center text-sm font-normal text-center px-2"
                      style={{
                        color: isInvalidDirection
                          ? "#ef4444"
                          : extendsBeforeGrid
                          ? "#3b82f6"
                          : hasConflict
                          ? "#ef4444"
                          : line.cor,
                      }}
                    >
                      {isInvalidDirection
                        ? "🚫 DIREÇÃO INVÁLIDA"
                        : extendsBeforeGrid
                        ? `🕐 ALÉM DA GRADE\n+${
                            plantaoEndHour - (gridEndHour + 1)
                          }h extra`
                        : hasConflict
                        ? "⚠️ CONFLITO"
                        : `${formatHourDisplay(
                            startHour
                          )} - ${formatHourDisplay(
                            endHour + 1
                          )} (${duration}h)`}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Botão de expansão - pequeno e redondo */}
          <div className="absolute -bottom-4 right-4" style={{ zIndex: 100 }}>
            <Button
              onClick={() => {
                const currentRows = getDayRowCount(
                  activeLineIndex,
                  editingDayIndex
                );
                const newRowCount = currentRows + 1;
                updateDayRowCount(
                  activeLineIndex,
                  editingDayIndex,
                  newRowCount
                );
              }}
              variant="default"
              size="sm"
              className="h-8 w-8 p-0 rounded-full shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: line.cor,
                borderColor: line.cor,
                color: "white",
              }}
              title="Adicionar linha ao container"
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Menu contextual para criação de plantão */}
      {showPlantaoMenu && menuTargetRow !== null && (
        <>
          {/* Overlay para fechar o menu ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPlantaoMenu(false)}
          />

          {/* Menu contextual */}
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] max-h-[400px] overflow-y-auto"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
            }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-sm font-normal text-gray-900">
                Criar Plantão
              </div>
              <div className="text-xs text-gray-500">
                Linha {menuTargetRow + 1}
              </div>
            </div>

            <div className="py-1">
              {Object.entries(menuOptions)
                .reverse()
                .map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (menuClickedHour !== null && menuTargetRow !== null) {
                        // Validar se o plantão está dentro dos limites
                        const validation = validatePlantaoLimits(
                          menuClickedHour,
                          Number(key)
                        );

                        if (!validation.isValid) {
                          toast.error("Plantão fora dos limites da grade", {
                            description: validation.errorMessage,
                            duration: 6000,
                          });
                          return;
                        }

                        const normalizedStart = menuClickedHour % 24;
                        const finalEndHour = menuClickedHour + Number(key);

                        // Verificar conflito antes de criar
                        const hasConflict = checkTimeConflict(
                          normalizedStart,
                          finalEndHour,
                          menuTargetRow
                        );

                        if (hasConflict) {
                          handleTimeConflict(
                            normalizedStart,
                            finalEndHour,
                            menuTargetRow,
                            Number(key)
                          );
                        } else {
                          // Sem conflitos, criar normalmente
                          createPlantaoSafely(
                            normalizedStart,
                            finalEndHour,
                            menuTargetRow
                          );
                        }
                      }
                      setShowPlantaoMenu(false);
                    }}
                    className="flex items-center justify-start w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-start">
                      <div className="font-thin">{key} horas</div>
                      <div className="text-xs text-gray-400">{value}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Modal de sugestões de horários alternativos */}
      {showSuggestionsModal && pendingCreation && (
        <>
          {/* Overlay para fechar o modal ao clicar fora */}
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
            onClick={() => {
              setShowSuggestionsModal(false);
              setPendingCreation(null);
              setSuggestedSlots([]);
              setConflictInfo("");
            }}
          >
            {/* Modal */}
            <div
              className="bg-white rounded-lg shadow-xl p-6 min-w-[400px] max-w-[500px] max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Conflito de Horário
                  </h3>
                  <p className="text-sm text-gray-600">
                    Linha {pendingCreation.targetRow + 1} •{" "}
                    {pendingCreation.duration}h
                  </p>
                </div>
              </div>

              {/* Informação do conflito */}
              <div className="py-4 border-b border-gray-200">
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {conflictInfo}
                </p>
              </div>

              {/* Sugestões de horários */}
              <div className="py-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  💡 Horários alternativos disponíveis:
                </h4>

                <div className="space-y-2">
                  {suggestedSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        createPlantaoSafely(
                          slot.startHour,
                          slot.endHour,
                          pendingCreation.targetRow
                        );
                        setShowSuggestionsModal(false);
                        setPendingCreation(null);
                        setSuggestedSlots([]);
                        setConflictInfo("");
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      style={{
                        borderColor: index === 0 ? line.cor : undefined,
                        backgroundColor:
                          index === 0 ? line.cor + "10" : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatHourDisplay(slot.startHour)} -{" "}
                            {formatHourDisplay(slot.endHour)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pendingCreation.duration}h de duração
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Recomendado
                            </span>
                          )}
                          <span className="text-lg">→</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setShowSuggestionsModal(false);
                    setPendingCreation(null);
                    setSuggestedSlots([]);
                    setConflictInfo("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (suggestedSlots.length > 0) {
                      const bestSlot = suggestedSlots[0];
                      createPlantaoSafely(
                        bestSlot.startHour,
                        bestSlot.endHour,
                        pendingCreation.targetRow
                      );
                      setShowSuggestionsModal(false);
                      setPendingCreation(null);
                      setSuggestedSlots([]);
                      setConflictInfo("");
                    }
                  }}
                  size="sm"
                  style={{
                    backgroundColor: line.cor,
                    borderColor: line.cor,
                  }}
                  disabled={suggestedSlots.length === 0}
                >
                  Usar Recomendado
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de extensão além da grade */}
    </div>
  );
});

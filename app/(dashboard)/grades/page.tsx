"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  PenLine,
  Save,
  SquarePen,
  Trash2,
  Users,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
// Imports corretos usando arquitetura existente
// fetchPeriodos mantido para compatibilidade com função legada gerarVagasAPartirDaGrade
import { fetchPeriodos } from "@/services/parametrosService";
// Lazy loading para modais pesados
import { GradeFormComponent, HospitalTabsComponent } from "@/components/grades";
import { EditGradeModal } from "@/components/grades/edit-grade-modal";
import {
  calcularDataPagamento,
  calcularValorPorHora,
} from "@/components/grades/scripts/calcular-valores";
import {
  detectarPeriodo,
  formatarPeriodoParaBanco,
} from "@/components/grades/scripts/detectar-periodo";
import { UnsavedChangesModal } from "@/components/grades/unsaved-changes-modal";
import {
  useContextualMenu,
  useDataLoading,
  useDragAndDrop,
  useGradeEditing,
  useGradeState,
  type GradeLine,
  type TimeSlot,
} from "@/hooks/grades";
import { useGrades } from "@/hooks/grades/useGrades";
import { normalizeHour } from "@/lib/utils";
import { createCandidatura } from "@/services/candidaturasService";
import { gradesService } from "@/services/gradesService";
import { getSupabaseClient } from "@/services/supabaseClient";
import {
  createVaga,
  verificarVagasDaGradeNoPeriodo,
} from "@/services/vagasService";
import { lazy, Suspense } from "react";
const GenerateVagasModal = lazy(() =>
  import("@/components/grades/generate-vagas-modal").then((module) => ({
    default: module.GenerateVagasModal,
  }))
);

// Lazy loading para componente complexo de edição
const GradeCardEditingMode = lazy(() =>
  import("@/components/grades").then((module) => ({
    default: module.GradeCardEditingMode,
  }))
);

// Interfaces movidas para /hooks/grades/useGradeState.ts

// Interface Hospital importada de hospitaisService

export default function GradesPage() {
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);
  const [pendingGradeExit, setPendingGradeExit] = useState<string | null>(null);

  // Integração com banco de dados
  const {
    grades: dbGrades,
    loading: dbLoading,
    saving: dbSaving,
    fetchGrades,
    createGrade: dbCreateGrade,
    updateGrade: dbUpdateGrade,
    deleteGrade: dbDeleteGrade,
  } = useGrades();

  // Hook consolidado para estados principais (ETAPA 1.1)
  const {
    gradeLines,
    setGradeLines,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    hasUnsavedChangesRef,
    autoSaveTimeoutId,
    setAutoSaveTimeoutId,
    hasManualSave,
    setHasManualSave,
    isSaving,
    setIsSaving,
    markUnsavedChanges,
    clearUnsavedChanges,
    hasAnyUnsavedChanges,
    updateGradeLine,
    triggerAutoSave,
  } = useGradeState();

  // Hook consolidado para carregamento de dados (ETAPA 1.9)
  const {
    medicos,
    especialidades,
    setores,
    hospitais,
    formasRecebimento,
    tiposVaga,
    medicosLoading,
    especialidadesLoading,
    setoresLoading,
    hospitaisLoading,
    loadAllData,
    loadMedicos,
  } = useDataLoading();

  // Estados para criação de nova linha
  const [novaLinha, setNovaLinha] = useState({
    nome: "",
    especialidade_id: "",
    setor_id: "",
    hospital_id: "",
    cor: "#3B82F6",
  });

  // Hook consolidado para drag & drop (ETAPA 1.3)
  const {
    draggedGradeId,
    setDraggedGradeId,
    dragOverGradeId,
    setDragOverGradeId,
    gradesOrder,
    setGradesOrder,
    dragStart,
    setDragStart,
    dragEnd,
    setDragEnd,
    dragRowIndex,
    setDragRowIndex,
    isDragging,
    setIsDragging,
    hasDragged,
    setHasDragged,
    saveGradesOrderToDb,
  } = useDragAndDrop();

  // Estados para criação de slots (drag & drop movido para useDragAndDrop)
  const [slotLines, setSlotLines] = useState<TimeSlot[][]>([[]]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);

  // MARK: VARIAVEL PARA GUARDAR TEMPO MAXIMO E MINIMO
  const [timeRangeHolder, setTimeRangeHolder] = useState<{
    start: number;
    end: number;
  }>({
    start: 7,
    end: 31,
  });
  const [forceUpdate, setForceUpdate] = useState(0); // Para forçar re-render
  // Estado horarioInicial removido (não utilizado)
  // Hook consolidado para edição (ETAPA 1.5)
  const {
    editingGradeId,
    setEditingGradeId,
    editingGradeHorario,
    setEditingGradeHorario,
    editingDayIndex,
    setEditingDayIndex,
    editingColorGradeId,
    setEditingColorGradeId,
    editingPaymentGradeId,
    setEditingPaymentGradeId,
  } = useGradeEditing();

  const [selectedDays, setSelectedDays] = useState<{
    [lineIndex: number]: boolean[];
  }>({ 0: new Array(7).fill(false) });

  // Estados para nomes personalizados das linhas
  const [lineNames, setLineNames] = useState<{
    [gradeId: string]: { [lineIndex: number]: string };
  }>({});

  // Estado para controle de abas por hospital
  const [activeHospitalTab, setActiveHospitalTab] = useState<string>("");

  // Estado para controle de colapso/expansão individual das grades
  const [collapsedGrades, setCollapsedGrades] = useState<
    Record<string, boolean>
  >({});

  // Estados para geração de vagas
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedGradeForGeneration, setSelectedGradeForGeneration] =
    useState<GradeLine | null>(null);
  const [generationStartDate, setGenerationStartDate] = useState<Date>(
    new Date()
  );

  // Estados para edição de grade
  const [showEditGradeModal, setShowEditGradeModal] = useState(false);
  const [selectedGradeForEdit, setSelectedGradeForEdit] =
    useState<GradeLine | null>(null);
  const [generationEndDate, setGenerationEndDate] = useState<Date>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ); // 30 dias a partir de hoje
  const [generationLoading, setGenerationLoading] = useState(false);

  // Estado para duplicação de grade
  const [selectedGradeForDuplication, setSelectedGradeForDuplication] =
    useState<GradeLine | null>(null);

  // Estados para modal de confirmação de deleção
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedGradeForDeletion, setSelectedGradeForDeletion] =
    useState<GradeLine | null>(null);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    vagasExistentes: any[];
    vagasAbertas: number;
    vagasFechadas: number;
    vagasAnunciadas: number;
    totalVagas: number;
  } | null>(null);

  // Estado editingDayIndex movido para useGradeEditing

  // Estado para slots por dia (durante edição)
  const [slotsByDay, setSlotsByDay] = useState<{
    [lineIndex: number]: { [dayIndex: number]: TimeSlot[] };
  }>({});

  // Estado para horário inicial por semana
  const [weekStartHours, setWeekStartHours] = useState<{
    [lineIndex: number]: number;
  }>({});

  // Estado para número de linhas por dia da semana
  const [dayRowCounts, setDayRowCounts] = useState<{
    [lineIndex: number]: { [dayIndex: number]: number };
  }>({});

  // Estados de auto-save movidos para useGradeState

  // Estado para dias selecionados para replicação
  const [replicationDays, setReplicationDays] = useState<{
    [key: string]: number[];
  }>({}); // key = "lineIndex-dayIndex"

  // Estados de expansão do container removidos (não utilizados)

  // Hook consolidado para menu contextual (ETAPA 1.7)
  const {
    showPlantaoMenu,
    setShowPlantaoMenu,
    menuClickedHour,
    setMenuClickedHour,
    menuTargetRow,
    setMenuTargetRow,
    menuPosition,
    setMenuPosition,
  } = useContextualMenu();

  // Lista de hospitais carregada do banco de dados

  // Função getHospitalNome removida (não utilizada)

  const getSetorNome = (setor_id: string) => {
    return (
      setores.find((s) => s.id === setor_id)?.nome || "Setor não encontrado"
    );
  };

  const getEspecialidadeNome = (especialidade_id: string) => {
    return (
      especialidades.find((e) => e.id === especialidade_id)?.nome ||
      "Especialidade não encontrada"
    );
  };

  // Função para alternar colapso/expansão das grades
  const toggleGradeCollapse = (gradeId: string) => {
    setCollapsedGrades((prev) => {
      const newState = {
        ...prev,
        [gradeId]: !prev[gradeId],
      };

      // Salvar estado no localStorage
      try {
        localStorage.setItem("grades-collapsed", JSON.stringify(newState));
      } catch (error) {
        // Falha ao salvar no localStorage
      }

      return newState;
    });
  };

  const cores = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CFF",
    "#EC4899",
    "#14B8A6",
    "#F97316",
    "#6366F1",
    "#EF4675",
    "#06B6D4",
    "#84CC16",
    "#A855F7",
    "#F43F5E",
    "#22D3EE",
    "#FBB040",
    "#8B5CF6",
    "#F87171",
    "#34D399",
    "#FBBF24",
    "#C084FC",
    "#FB7185",
    "#67E8F9",
    "#FCD34D",
    "#6D28D9",
    "#DC2626",
    "#059669",
    "#D97706",
    "#7C3AED",
    "#BE185D",
    "#0891B2",
    "#CA8A04",
  ];

  const diasSemana = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ];

  // Carregar dados de referência usando hook (ETAPA 1.9)
  useEffect(() => {
    loadAllData().catch(() => {
      toast.error("Erro ao carregar dados do sistema");
    });
  }, [loadAllData]);

  // Converter grades do banco para formato local quando carregarem
  useEffect(() => {
    if (dbGrades.length === 0) {
      setGradeLines([]);
      return;
    }

    const convertedGrades: GradeLine[] = dbGrades.map((grade) => ({
      id: grade.id,
      nome: grade.nome,
      especialidade_id: grade.especialidade_id,
      setor_id: grade.setor_id,
      hospital_id: grade.hospital_id,
      cor: grade.cor,
      horarioInicial: grade.horario_inicial,
      lineNames: grade.configuracao.lineNames || {},
      selectedDays: grade.configuracao.selectedDays || {
        0: new Array(7).fill(false),
      },
      slotsByDay: grade.configuracao.slotsByDay || {
        0: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      },
      weekStartHours: grade.configuracao.weekStartHours || {
        0: grade.horario_inicial,
      },
      dayRowCounts: (grade.configuracao as any).dayRowCounts || {},
      configuracao: {
        tipoCalculo: grade.configuracao.tipoCalculo || "valor_hora",
        valorPorHora: grade.configuracao.valorPorHora,
        valorPorPlantao: grade.configuracao.valorPorPlantao,
        horasPlantao: grade.configuracao.horasPlantao,
        diasPagamento: grade.configuracao.diasPagamento || "30dias",
        formaRecebimento: grade.configuracao.formaRecebimento,
        tipoVaga: grade.configuracao.tipoVaga,
        observacoesPadrao: grade.configuracao.observacoesPadrao,
      },
    }));

    // Atualizar sempre com dados do banco, mas preservar mudanças locais se em edição
    setGradeLines((prev) => {
      if (!editingGradeId || prev.length === 0) {
        // Sem edição ativa ou estado inicial - usar dados do banco
        return convertedGrades;
      }

      // Há edição ativa - manter mudanças locais apenas para a grade editada
      return convertedGrades.map((dbGrade) => {
        const gradeLocal = prev.find((local) => local.id === dbGrade.id);

        if (
          dbGrade.id === editingGradeId &&
          gradeLocal &&
          hasUnsavedChangesRef.current[editingGradeId]
        ) {
          // Grade em edição com mudanças não salvas - preservar dados locais de slots
          return {
            ...dbGrade,
            slotsByDay: gradeLocal.slotsByDay,
            selectedDays: gradeLocal.selectedDays,
            weekStartHours: gradeLocal.weekStartHours,
            dayRowCounts: gradeLocal.dayRowCounts,
            lineNames: gradeLocal.lineNames,
          };
        }

        // Todas as outras grades ou grade salva - usar dados do banco
        return dbGrade;
      });
    });

    // Limpar marcação de mudanças não salvas para grades que foram atualizadas
    setHasUnsavedChanges((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((gradeId) => {
        if (gradeId !== editingGradeId) {
          delete newState[gradeId];
        }
      });
      return newState;
    });
  }, [
    dbGrades,
    editingGradeId,
    setGradeLines,
    setHasUnsavedChanges,
    hasUnsavedChangesRef,
  ]);

  // Manter ref sincronizada com hasUnsavedChanges
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges, hasUnsavedChangesRef]);

  // Definir primeiro hospital como ativo quando dados carregarem
  useEffect(() => {
    if (hospitais.length > 0 && !activeHospitalTab) {
      setActiveHospitalTab(hospitais[0].id);
    }
  }, [hospitais, activeHospitalTab]);

  // Inicializar ordenação das grades do banco de dados
  useEffect(() => {
    if (dbGrades.length === 0) return;

    // Agrupar grades por hospital e ordenar pelo campo 'ordem'
    const orderByHospital: {[hospitalId: string]: string[]} = {}
    
    dbGrades
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999))
      .forEach(grade => {
        if (!orderByHospital[grade.hospital_id]) {
          orderByHospital[grade.hospital_id] = []
        }
        orderByHospital[grade.hospital_id].push(grade.id)
      })

    setGradesOrder(orderByHospital)
  }, [dbGrades, setGradesOrder]);

  // Auto-save da ordenação com debounce
  useEffect(() => {
    // Só salvar se não estiver arrastando e houver ordenação
    if (draggedGradeId !== null || Object.keys(gradesOrder).length === 0) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      // Salvar ordenação de todos os hospitais
      for (const hospitalId of Object.keys(gradesOrder)) {
        const success = await saveGradesOrderToDb(hospitalId)
        if (!success) {
          console.error(`Falha ao salvar ordenação do hospital ${hospitalId}`)
        }
      }
    }, 1000) // Debounce de 1 segundo

    return () => clearTimeout(timeoutId)
  }, [gradesOrder, draggedGradeId, saveGradesOrderToDb]);

  // Função markUnsavedChanges movida para useGradeState

  // Função para salvar uma grade específica (removido auto-save)

  // Função para replicar distribuição de horários para outros dias
  const replicateToSelectedDays = () => {
    if (editingDayIndex === null) return;

    const sourceSlots = slotsByDay[activeLineIndex]?.[editingDayIndex] || [];
    const targetDays =
      replicationDays[`${activeLineIndex}-${editingDayIndex}`] || [];

    if (sourceSlots.length === 0) {
      toast.warning("Nenhum horário para replicar", {
        description:
          "Defina horários neste dia antes de replicar para outros dias.",
        duration: 3000,
      });
      return;
    }

    if (targetDays.length === 0) {
      toast.warning("Selecione os dias de destino", {
        description:
          "Selecione pelo menos um dia para replicar a distribuição de horários.",
        duration: 3000,
      });
      return;
    }

    // Criar cópias dos slots para cada dia de destino
    const newSlotsByDay = { ...slotsByDay };

    targetDays.forEach((targetDayIndex) => {
      // Criar novos slots com IDs únicos
      const replicatedSlots = sourceSlots.map((slot) => ({
        ...slot,
        id: `${slot.id}_replicated_${targetDayIndex}_${Date.now()}`,
      }));

      // Garantir que as estruturas existem
      if (!newSlotsByDay[activeLineIndex]) {
        newSlotsByDay[activeLineIndex] = {};
      }

      // Sobrescrever os dias de destino
      newSlotsByDay[activeLineIndex][targetDayIndex] = replicatedSlots;
    });

    // Aplicar as alterações
    setSlotsByDay(newSlotsByDay);

    // Replicar também o número de linhas do dia de origem
    const sourceRowCount = getDayRowCount(activeLineIndex, editingDayIndex);
    targetDays.forEach((targetDayIndex) => {
      updateDayRowCount(activeLineIndex, targetDayIndex, sourceRowCount);
    });

    // Marcar como alterado
    markUnsavedChanges();

    // Feedback para o usuário
    const dayNames = targetDays
      .map((dayIndex) => diasSemana[dayIndex])
      .join(", ");
    toast.success("Distribuição replicada", {
      description: `Horários de ${diasSemana[editingDayIndex]} foram aplicados para: ${dayNames}`,
      duration: 3000,
    });
  };

  // Carregar médicos usando hook (ETAPA 1.9)
  useEffect(() => {
    if (medicos.length === 0 && !medicosLoading) {
      loadMedicos();
    }
  }, [medicos.length, medicosLoading, loadMedicos]);

  // Removido sistema de auto-save automático

  // Função para calcular o número de linhas necessárias para um dia específico
  const calculateRequiredRowsForDay = useCallback(
    (lineIndex: number, dayIndex: number) => {
      if (editingDayIndex !== dayIndex) return 1; // Se não é o dia sendo editado, retorna 1

      const daySlots = slotsByDay[lineIndex]?.[dayIndex] || [];
      if (daySlots.length === 0) return 1; // Mínimo 1 linha

      // Encontrar o maior rowIndex usado + 1
      const maxRowIndex = Math.max(
        ...daySlots.map((slot) => slot.rowIndex || 0)
      );
      return Math.max(1, maxRowIndex + 1);
    },
    [editingDayIndex, slotsByDay]
  );

  // Função para atualizar número de linhas por dia
  const updateDayRowCount = useCallback(
    (lineIndex: number, dayIndex: number, rowCount: number) => {
      setDayRowCounts((prev) => {
        const newState = { ...prev };
        if (!newState[lineIndex]) {
          newState[lineIndex] = {};
        }
        newState[lineIndex][dayIndex] = rowCount;
        return newState;
      });
      setForceUpdate((prev) => prev + 1); // Forçar re-render
      markUnsavedChanges();
    },
    [markUnsavedChanges]
  );

  // Função handleMouseUp definida antes do useEffect para evitar erro de referência
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startHour = Math.min(dragStart, dragEnd);
      const endHour = Math.max(dragStart, dragEnd) + 1;

      // ✅ Só criar slot se houve movimento de drag (não apenas clique)
      if (endHour > startHour && hasDragged) {
        if (editingDayIndex !== null) {
          // Editando dia específico - manter funcionalidade existente
          const currentDaySlots =
            slotsByDay[activeLineIndex]?.[editingDayIndex] || [];

          // ✅ Filtrar slots apenas da linha específica para verificar conflitos
          const currentRowSlots = currentDaySlots.filter(
            (slot) => (slot.rowIndex || 0) === (dragRowIndex ?? 0)
          );

          const existingSlot = currentRowSlots.find(
            (slot) => slot.startHour === startHour && slot.endHour === endHour
          );

          const newSlotsByDay = { ...slotsByDay };
          if (!newSlotsByDay[activeLineIndex]) {
            newSlotsByDay[activeLineIndex] = {};
          }
          if (!newSlotsByDay[activeLineIndex][editingDayIndex]) {
            newSlotsByDay[activeLineIndex][editingDayIndex] = [];
          }

          if (existingSlot) {
            existingSlot.vagasCount = (existingSlot.vagasCount || 1) + 1;
          } else {
            // ✅ Verificar sobreposição apenas na linha específica
            const hasOverlap = currentRowSlots.some(
              (slot) => startHour < slot.endHour && endHour > slot.startHour
            );

            if (hasOverlap) {
              // Se há sobreposição na mesma linha, não criar o slot
            } else {
              const newSlot: TimeSlot = {
                id: `${Date.now()}_day_${editingDayIndex}`,
                startHour,
                endHour,
                vagasCount: 1,
                assignedVagas: [],
                lineIndex: activeLineIndex,
                slotLineIndex: 0,
                rowIndex: dragRowIndex ?? 0, // ✅ Usar a linha correta onde foi feito o drag
              };
              newSlotsByDay[activeLineIndex][editingDayIndex].push(newSlot);

              // ✅ Atualizar número de linhas do container automaticamente
              const requiredRows = Math.max(
                (dragRowIndex ?? 0) + 1,
                calculateRequiredRowsForDay(activeLineIndex, editingDayIndex)
              );
              updateDayRowCount(activeLineIndex, editingDayIndex, requiredRows);
              // Estados de expansão removidos
            }
          }

          setSlotsByDay(newSlotsByDay);

          // ✅ Forçar re-render após criar slot
          setForceUpdate((prev) => prev + 1);

          // Marcar como alterado quando horários são criados
          if (editingGradeId) {
            markUnsavedChanges(editingGradeId);
          }
        } else {
          // Modo de visualização geral - criar slots simples como na versão anterior
          const currentLineSlots = slotLines[activeLineIndex];
          const hasConflict = currentLineSlots.some(
            (slot) => startHour < slot.endHour && endHour > slot.startHour
          );

          if (!hasConflict) {
            const newSlot: TimeSlot = {
              id: Date.now().toString(),
              startHour,
              endHour,
              vagasCount: 1,
              assignedVagas: [],
              lineIndex: activeLineIndex,
            };

            const newSlotLines = [...slotLines];
            newSlotLines[activeLineIndex] = [...currentLineSlots, newSlot].sort(
              (a, b) => a.startHour - b.startHour
            );
            setSlotLines(newSlotLines);
            markUnsavedChanges();
          }
        }
      }
    }

    setIsDragging(false);
    setHasDragged(false); // ✅ Reset drag flag
    setDragStart(null);
    setDragEnd(null);
    setDragRowIndex(null); // ✅ Reset rowIndex após drag
  }, [
    isDragging,
    dragStart,
    dragEnd,
    hasDragged,
    editingDayIndex,
    activeLineIndex,
    slotsByDay,
    dragRowIndex,
    editingGradeId,
    slotLines,
    markUnsavedChanges,
    calculateRequiredRowsForDay,
    updateDayRowCount,
    setSlotsByDay,
    setForceUpdate,
    setIsDragging,
    setHasDragged,
    setDragStart,
    setDragEnd,
    setDragRowIndex,
    setSlotLines,
  ]);

  // useEffect global para detectar mouseup em qualquer lugar da página durante drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        // Global mouseUp detectado durante drag
        handleMouseUp();
      }
    };

    if (isDragging) {
      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  // Função para adicionar nova linha usando banco de dados
  const adicionarLinha = async () => {
    if (!novaLinha.nome.trim()) return;

    try {
      // Criar grade no banco de dados - isso já atualiza o estado via useGrades hook
      const newGrade = await dbCreateGrade({
        nome: novaLinha.nome,
        especialidade_id: novaLinha.especialidade_id,
        setor_id: novaLinha.setor_id,
        hospital_id: novaLinha.hospital_id,
        cor: novaLinha.cor,
        horario_inicial: 7,
      });

      // Entrar automaticamente em modo de edição da nova grade
      setEditingGradeId(newGrade.id);
      setEditingGradeHorario(7);

      // Reset estados para edição da nova grade
      setSlotLines([[]]);
      setSelectedDays({ 0: new Array(7).fill(false) });
      setSlotsByDay({ 0: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } });
      setWeekStartHours({ 0: 7 });

      // CRUCIAL: Atualizar a grade recém criada no estado global com a estrutura inicial
      setTimeout(() => {
        setGradeLines((prevGrades) =>
          prevGrades.map((grade) => {
            if (grade.id === newGrade.id) {
              return {
                ...grade,
                slotsByDay: {
                  0: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
                },
                weekStartHours: { 0: 7 },
              };
            }
            return grade;
          })
        );
        markUnsavedChanges();
      }, 100);
      clearLineNamesForGrade(newGrade.id);

      // Reset formulário mantendo hospital selecionado
      setNovaLinha({
        nome: "",
        especialidade_id: "",
        setor_id: "",
        hospital_id: novaLinha.hospital_id,
        cor: "#3B82F6",
      });

      // Mudar para a aba do hospital onde a grade foi criada
      setActiveHospitalTab(novaLinha.hospital_id);

      // Atualizar ordem das grades - nova grade no topo
      const hospitalId = novaLinha.hospital_id;
      setGradesOrder((prev) => {
        const currentOrder = prev[hospitalId] || [];
        const newOrder = [
          newGrade.id,
          ...currentOrder.filter((id) => id !== newGrade.id),
        ];

        // Salvar no localStorage
        try {
          const savedOrders = JSON.parse(
            localStorage.getItem("grades-order") || "{}"
          );
          savedOrders[hospitalId] = newOrder;
          localStorage.setItem("grades-order", JSON.stringify(savedOrders));
        } catch (error) {
          // Falha ao salvar no localStorage
        }

        return {
          ...prev,
          [hospitalId]: newOrder,
        };
      });
    } catch (error) {
      // Erro ao criar grade
      // O toast de erro já é mostrado no hook useGrades
    }
  };

  // Função para verificar vagas antes de deletar grade
  const checkVagasBeforeDelete = async (gradeId: string): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();

      // Buscar vagas que usam esta grade e estão publicadas (abertas, fechadas, anunciadas)
      const { data: vagasExistentes, error } = await supabase
        .from("vw_vagas_candidaturas")
        .select(
          "vaga_id, vaga_status, vaga_data, hospital_nome, especialidade_nome, setor_nome"
        )
        .eq("grade_id", gradeId)
        .in("vaga_status", ["aberta", "fechada", "anunciada"]);

      if (error) {
        console.error("Erro ao consultar vagas existentes:", error);
        toast.error("Erro ao verificar vagas existentes");
        return false;
      }

      if (vagasExistentes && vagasExistentes.length > 0) {
        // Agrupar vagas por status
        const vagasAbertas = vagasExistentes.filter(
          (v) => v.vaga_status === "aberta"
        );
        const vagasFechadas = vagasExistentes.filter(
          (v) => v.vaga_status === "fechada"
        );
        const vagasAnunciadas = vagasExistentes.filter(
          (v) => v.vaga_status === "anunciada"
        );

        const totalVagas = vagasExistentes.length;

        // Encontrar a grade que será deletada
        const gradeParaDeletar = gradeLines.find((g) => g.id === gradeId);

        // Configurar dados para o modal
        setDeleteConfirmData({
          vagasExistentes,
          vagasAbertas: vagasAbertas.length,
          vagasFechadas: vagasFechadas.length,
          vagasAnunciadas: vagasAnunciadas.length,
          totalVagas,
        });
        setSelectedGradeForDeletion(gradeParaDeletar || null);
        setShowDeleteConfirmModal(true);

        // Retornar false para aguardar confirmação do modal
        return false;
      }

      // Se não há vagas, permitir deleção diretamente
      return true;
    } catch (error) {
      console.error("Erro ao verificar vagas existentes:", error);
      toast.error("Erro ao verificar vagas existentes");
      return false;
    }
  };

  // Função para confirmar e executar a deleção da grade
  const confirmDeleteGrade = async () => {
    if (!selectedGradeForDeletion) return;

    try {
      const lineId = selectedGradeForDeletion.id;

      // Fechar modal
      setShowDeleteConfirmModal(false);
      setSelectedGradeForDeletion(null);
      setDeleteConfirmData(null);

      // Remover do banco de dados
      await dbDeleteGrade(lineId);

      // Limpar estados locais
      clearLineNamesForGrade(lineId); // Limpar nomes das linhas da grade removida
      setHasUnsavedChanges((prev) => {
        const newState = { ...prev };
        delete newState[lineId];
        return newState;
      });

      if (editingGradeId === lineId) {
        setEditingGradeId(null);
        setSlotLines([[]]);
        setSelectedDays({ 0: new Array(7).fill(false) });
        setSlotsByDay({});
        setWeekStartHours({});
      }

      toast.success("Grade removida com sucesso!");
    } catch (error) {
      // Erro ao remover grade
      // O toast de erro já é mostrado no hook useGrades
    }
  };

  // Função para cancelar a deleção
  const cancelDeleteGrade = () => {
    setShowDeleteConfirmModal(false);
    setSelectedGradeForDeletion(null);
    setDeleteConfirmData(null);
  };

  // Função para remover linha usando banco de dados
  const removerLinha = async (lineId: string) => {
    try {
      // Verificar se há vagas publicadas antes de deletar
      const canDelete = await checkVagasBeforeDelete(lineId);

      if (!canDelete) {
        // Se canDelete é false, significa que há vagas e o modal foi aberto
        // ou houve erro na verificação. A deleção será tratada pelo modal.
        return;
      }

      // Se chegou aqui, não há vagas - pode deletar diretamente
      await dbDeleteGrade(lineId);

      // Limpar estados locais
      clearLineNamesForGrade(lineId); // Limpar nomes das linhas da grade removida
      setHasUnsavedChanges((prev) => {
        const newState = { ...prev };
        delete newState[lineId];
        return newState;
      });

      if (editingGradeId === lineId) {
        setEditingGradeId(null);
        setSlotLines([[]]);
        setSelectedDays({ 0: new Array(7).fill(false) });
        setSlotsByDay({});
        setWeekStartHours({});
      }

      toast.success("Grade removida com sucesso!");
    } catch (error) {
      // Erro ao remover grade
      // O toast de erro já é mostrado no hook useGrades
    }
  };

  // Função para adicionar nova linha de slots
  const addNewSlotLine = () => {
    // Obter o próximo índice baseado no slotsByDay da grade atual E estado local
    const currentGrade = gradeLines.find(
      (grade) => grade.id === editingGradeId
    );
    // Combinar semanas existentes do estado local e da grade salva
    const existingWeeksFromGrade = currentGrade?.slotsByDay
      ? Object.keys(currentGrade.slotsByDay).map(Number)
      : [];
    const existingWeeksFromLocal = Object.keys(slotsByDay).map(Number);
    const allExistingWeeks = [
      ...new Set([...existingWeeksFromGrade, ...existingWeeksFromLocal]),
    ];
    // Usar contagem de semanas existentes (não o valor máximo)
    const newLineIndex = allExistingWeeks.length > 0 ? allExistingWeeks.length : 0;
    setSlotLines([...slotLines, []]);
    setSelectedDays((prev) => ({
      ...prev,
      [newLineIndex]: new Array(7).fill(false),
    }));
    // Definir horário inicial padrão para a nova semana
    setWeekStartHours((prev) => ({
      ...prev,
      [newLineIndex]: 7, // Horário padrão: 7h
    }));

    // CRUCIAL: Atualizar TAMBÉM o estado local slotsByDay para renderização imediata
    setSlotsByDay((prev) => ({
      ...prev,
      [newLineIndex]: {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [], // Inicializar todos os dias da semana
      },
    }));

    // Atualizar a grade atual com a nova semana na estrutura slotsByDay
    if (editingGradeId) {
      setGradeLines((prevGrades) =>
        prevGrades.map((grade) => {
          if (grade.id === editingGradeId) {
            return {
              ...grade,
              slotsByDay: {
                ...grade.slotsByDay,
                [newLineIndex]: {
                  0: [],
                  1: [],
                  2: [],
                  3: [],
                  4: [],
                  5: [],
                  6: [], // Inicializar todos os dias da semana
                },
              },
              weekStartHours: {
                ...grade.weekStartHours,
                [newLineIndex]: 7,
              },
            };
          }
          return grade;
        })
      );
      markUnsavedChanges();
    }

    // Ativar a nova semana
    setActiveLineIndex(newLineIndex);
  };

  // Função para duplicar uma semana
  const duplicateWeek = (
    sourceWeekIndex: number,
    includeMedicos: boolean = true
  ) => {
    // Obter o próximo índice baseado no slotsByDay da grade atual
    const currentGrade = gradeLines.find(
      (grade) => grade.id === editingGradeId
    );
    // Combinar semanas existentes do estado local e da grade salva
    const existingWeeksFromGrade = currentGrade?.slotsByDay
      ? Object.keys(currentGrade.slotsByDay).map(Number)
      : [];
    const existingWeeksFromLocal = Object.keys(slotsByDay).map(Number);
    const allExistingWeeks = [
      ...new Set([...existingWeeksFromGrade, ...existingWeeksFromLocal]),
    ];

    // Validar se a semana source existe (no estado local OU na grade salva)
    if (!allExistingWeeks.includes(sourceWeekIndex)) return;

    // Calcular próximo índice sequencial (não acumulativo)
    const newLineIndex = allExistingWeeks.length > 0 ? allExistingWeeks.length : 0;

    // IMPORTANTE: Priorizar estado local slotsByDay (para semanas não salvas)
    // Se não existir no estado local, usar da grade salva
    const sourceSlotsByDay = slotsByDay[sourceWeekIndex] ||
      currentGrade?.slotsByDay?.[sourceWeekIndex] || {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
      };

    // Duplicar slots para cada dia
    const duplicatedSlotsByDay: { [dayIndex: number]: TimeSlot[] } = {};
    Object.keys(sourceSlotsByDay).forEach((dayKey) => {
      const dayIndex = parseInt(dayKey);
      const daySlots = sourceSlotsByDay[dayIndex] || [];
      duplicatedSlotsByDay[dayIndex] = daySlots.map((slot) => ({
        ...slot,
        id: crypto.randomUUID(), // Novo ID único
        lineIndex: newLineIndex,
        // Se não incluir médicos, limpar assignedVagas
        assignedVagas: includeMedicos ? slot.assignedVagas : [],
      }));
    });

    // Atualizar setSlotLines para compatibilidade
    setSlotLines([...slotLines, []]);

    // Duplicar configuração dos dias selecionados
    const sourceDays =
      selectedDays[sourceWeekIndex] || new Array(7).fill(false);
    setSelectedDays((prev) => ({
      ...prev,
      [newLineIndex]: [...sourceDays],
    }));

    // Duplicar horário inicial
    const sourceHour = weekStartHours[sourceWeekIndex] || 7;
    setWeekStartHours((prev) => ({
      ...prev,
      [newLineIndex]: sourceHour,
    }));

    // Atualizar estado local slotsByDay
    setSlotsByDay((prev) => ({
      ...prev,
      [newLineIndex]: duplicatedSlotsByDay,
    }));

    // Duplicar nomes de linha se existir
    if (
      lineNames[editingGradeId!] &&
      lineNames[editingGradeId!][sourceWeekIndex]
    ) {
      const sourceName = lineNames[editingGradeId!][sourceWeekIndex];
      const newName = `${sourceName} (Cópia)`;

      setLineNames((prev) => ({
        ...prev,
        [editingGradeId!]: {
          ...prev[editingGradeId!],
          [newLineIndex]: newName,
        },
      }));
    }

    // Ativar a nova semana
    setActiveLineIndex(newLineIndex);

    // NOVA ABORDAGEM: Atualizar diretamente gradeLines ANTES de salvar
    setGradeLines((prev) =>
      prev.map((grade) => {
        if (grade.id !== editingGradeId) return grade;

        // Atualizar configuração da grade COM os novos dados
        return {
          ...grade,
          slotsByDay: {
            ...grade.slotsByDay,
            [newLineIndex]: duplicatedSlotsByDay,
          },
          selectedDays: {
            ...grade.selectedDays,
            [newLineIndex]: [...sourceDays],
          },
          weekStartHours: {
            ...grade.weekStartHours,
            [newLineIndex]: sourceHour,
          },
          lineNames: lineNames[editingGradeId!]
            ? {
                ...grade.lineNames,
                ...lineNames[editingGradeId!],
              }
            : grade.lineNames,
        };
      })
    );

    // Marcar como alterado após duplicação
    if (editingGradeId) {
      markUnsavedChanges(editingGradeId);
    }

    toast.success(
      `Semana ${sourceWeekIndex + 1} duplicada com sucesso${
        includeMedicos ? " (com médicos)" : " (apenas vagas)"
      }`
    );
  };

  // Função para limpar uma semana (manter estrutura mas remover slots)
  const clearWeek = (weekIndex: number) => {
    // Validar se a semana existe na grade atual
    const currentGrade = gradeLines.find(
      (grade) => grade.id === editingGradeId
    );
    if (!currentGrade?.slotsByDay?.[weekIndex]) return;

    // Limpar slots da semana
    const newSlotLines = [...slotLines];
    newSlotLines[weekIndex] = [];
    setSlotLines(newSlotLines);

    // Limpar dias selecionados
    setSelectedDays((prev) => ({
      ...prev,
      [weekIndex]: new Array(7).fill(false),
    }));

    // Limpar slots por dia se existir (mas manter estrutura da semana)
    if (slotsByDay[weekIndex]) {
      setSlotsByDay((prev) => {
        const newSlotsByDay = { ...prev };
        // NÃO deletar a semana, apenas esvaziar os arrays dos dias
        newSlotsByDay[weekIndex] = {
          0: [],
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
          6: [],
        };
        return newSlotsByDay;
      });
    }

    // NOVA ABORDAGEM: Atualizar diretamente gradeLines ANTES de salvar
    setGradeLines((prev) =>
      prev.map((grade) => {
        if (grade.id !== editingGradeId) return grade;

        // Limpar slotsByDay para esta semana (mas manter estrutura)
        const newSlotsByDay = { ...grade.slotsByDay };
        if (newSlotsByDay[weekIndex]) {
          // NÃO deletar a semana, apenas esvaziar os arrays dos dias
          newSlotsByDay[weekIndex] = {
            0: [],
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
          };
        }

        return {
          ...grade,
          slotsByDay: newSlotsByDay,
          selectedDays: {
            ...grade.selectedDays,
            [weekIndex]: new Array(7).fill(false),
          },
        };
      })
    );

    // Marcar como alterado após limpeza
    if (editingGradeId) {
      markUnsavedChanges(editingGradeId);
    }

    toast.success(`Semana ${weekIndex + 1} foi limpa com sucesso`);
  };

  // Função para remover linha de slots
  const removeSlotLine = (lineIndex: number) => {
    // Validar se a semana existe e se há mais de uma semana na grade atual
    const currentGrade = gradeLines.find(
      (grade) => grade.id === editingGradeId
    );
    const existingWeeks = currentGrade?.slotsByDay
      ? Object.keys(currentGrade.slotsByDay).map(Number)
      : [];

    if (existingWeeks.length > 1 && existingWeeks.includes(lineIndex)) {
      const newLength = existingWeeks.length - 1;

      // Remover linha dos slots
      const newSlotLines = slotLines.filter((_, index) => index !== lineIndex);
      setSlotLines(newSlotLines);

      // Limpar selectedDays
      const newSelectedDays = { ...selectedDays };
      delete newSelectedDays[lineIndex];

      const reindexedDays: { [key: number]: boolean[] } = {};
      Object.keys(newSelectedDays).forEach((key) => {
        const oldIndex = parseInt(key);
        const newIndex = oldIndex > lineIndex ? oldIndex - 1 : oldIndex;
        reindexedDays[newIndex] = newSelectedDays[oldIndex];
      });
      setSelectedDays(reindexedDays);

      // Limpar slotsByDay para a linha removida
      const newSlotsByDay = { ...slotsByDay };
      delete newSlotsByDay[lineIndex];

      // Reindexar slotsByDay
      const reindexedSlotsByDay: {
        [lineIndex: number]: { [dayIndex: number]: TimeSlot[] };
      } = {};
      Object.keys(newSlotsByDay).forEach((key) => {
        const oldIndex = parseInt(key);
        const newIndex = oldIndex > lineIndex ? oldIndex - 1 : oldIndex;
        reindexedSlotsByDay[newIndex] = newSlotsByDay[oldIndex];
      });
      setSlotsByDay(reindexedSlotsByDay);

      // Limpar weekStartHours para a linha removida
      const newWeekStartHours = { ...weekStartHours };
      delete newWeekStartHours[lineIndex];

      // Reindexar weekStartHours
      const reindexedWeekStartHours: { [lineIndex: number]: number } = {};
      Object.keys(newWeekStartHours).forEach((key) => {
        const oldIndex = parseInt(key);
        const newIndex = oldIndex > lineIndex ? oldIndex - 1 : oldIndex;
        reindexedWeekStartHours[newIndex] = newWeekStartHours[oldIndex];
      });
      setWeekStartHours(reindexedWeekStartHours);

      // Limpar replicationDays relacionados à linha removida
      const newReplicationDays = { ...replicationDays };
      Object.keys(newReplicationDays).forEach((key) => {
        const [lineIdx, dayIdx] = key.split("-").map(Number);
        if (lineIdx === lineIndex) {
          delete newReplicationDays[key];
        } else if (lineIdx > lineIndex) {
          // Reindexar chaves que têm lineIndex maior que o removido
          const newKey = `${lineIdx - 1}-${dayIdx}`;
          newReplicationDays[newKey] = newReplicationDays[key];
          delete newReplicationDays[key];
        }
      });
      setReplicationDays(newReplicationDays);

      // Ajustar activeLineIndex usando o novo comprimento
      if (activeLineIndex >= newLength) {
        setActiveLineIndex(Math.max(0, newLength - 1));
      } else if (activeLineIndex > lineIndex) {
        setActiveLineIndex(activeLineIndex - 1);
      }

      // Se estivermos editando um dia da linha removida, sair do modo de edição de dia
      if (editingDayIndex !== null && activeLineIndex === lineIndex) {
        setEditingDayIndex(null);
      }

      // IMPORTANTE: Atualizar gradeLines com os índices reindexados
      setGradeLines((prev) =>
        prev.map((grade) => {
          if (grade.id !== editingGradeId) return grade;

          // Remover e reindexar slotsByDay na grade
          const gradeSlotsByDay = { ...grade.slotsByDay };
          delete gradeSlotsByDay[lineIndex];
          const reindexedGradeSlotsByDay: {
            [lineIndex: number]: { [dayIndex: number]: TimeSlot[] };
          } = {};
          Object.keys(gradeSlotsByDay).forEach((key) => {
            const oldIndex = parseInt(key);
            const newIndex = oldIndex > lineIndex ? oldIndex - 1 : oldIndex;
            reindexedGradeSlotsByDay[newIndex] = gradeSlotsByDay[oldIndex];
          });

          // Remover e reindexar selectedDays na grade
          const gradeSelectedDays = { ...grade.selectedDays };
          if (gradeSelectedDays) {
            delete gradeSelectedDays[lineIndex];
            const reindexedGradeSelectedDays: { [key: number]: boolean[] } = {};
            Object.keys(gradeSelectedDays).forEach((key) => {
              const oldIndex = parseInt(key);
              const newIndex = oldIndex > lineIndex ? oldIndex - 1 : oldIndex;
              reindexedGradeSelectedDays[newIndex] = gradeSelectedDays[oldIndex];
            });
            grade.selectedDays = reindexedGradeSelectedDays;
          }

          // Remover e reindexar weekStartHours na grade
          const gradeWeekStartHours = { ...grade.weekStartHours };
          if (gradeWeekStartHours) {
            delete gradeWeekStartHours[lineIndex];
            const reindexedGradeWeekStartHours: { [lineIndex: number]: number } =
              {};
            Object.keys(gradeWeekStartHours).forEach((key) => {
              const oldIndex = parseInt(key);
              const newIndex = oldIndex > lineIndex ? oldIndex - 1 : oldIndex;
              reindexedGradeWeekStartHours[newIndex] =
                gradeWeekStartHours[oldIndex];
            });
            grade.weekStartHours = reindexedGradeWeekStartHours;
          }

          return {
            ...grade,
            slotsByDay: reindexedGradeSlotsByDay,
          };
        })
      );

      // Marcar como alterado após remoção
      markUnsavedChanges();
    }
  };

  // Função para adicionar linha adicional de horário a um slot específico
  const addAdditionalHourLine = (slotId: string) => {
    if (editingDayIndex !== null) {
      // No modo de edição de dia específico
      const newSlotsByDay = { ...slotsByDay };
      if (newSlotsByDay[activeLineIndex]?.[editingDayIndex]) {
        const daySlots = newSlotsByDay[activeLineIndex][editingDayIndex];
        const targetSlot = daySlots.find((slot) => slot.id === slotId);

        if (targetSlot) {
          // Encontrar a próxima linha (rowIndex) disponível para este horário
          const sameTimeSlots = daySlots.filter(
            (slot) =>
              slot.startHour === targetSlot.startHour &&
              slot.endHour === targetSlot.endHour
          );

          // Encontrar a próxima rowIndex disponível
          const usedRowIndices = sameTimeSlots.map(
            (slot) => slot.rowIndex || 0
          );
          const nextRowIndex = Math.max(...usedRowIndices) + 1;

          const newSlot: TimeSlot = {
            id: `${Date.now()}_row_${nextRowIndex}`,
            startHour: targetSlot.startHour,
            endHour: targetSlot.endHour,
            vagasCount: 1,
            assignedVagas: [],
            lineIndex: activeLineIndex,
            slotLineIndex: 0, // Resetar para 0 na nova linha
            rowIndex: nextRowIndex,
          };

          newSlotsByDay[activeLineIndex][editingDayIndex] = [
            ...daySlots,
            newSlot,
          ];
          setSlotsByDay(newSlotsByDay);

          // Calcular e aplicar número de linhas necessárias
          const requiredRows = Math.max(
            nextRowIndex + 1,
            calculateRequiredRowsForDay(activeLineIndex, editingDayIndex)
          );
          updateDayRowCount(activeLineIndex, editingDayIndex, requiredRows);
          // Estados de expansão removidos

          // Forçar re-render
          setForceUpdate((prev) => prev + 1);

          markUnsavedChanges();
        }
      }
    } else {
      // No modo de visualização geral, adicionar ao slotLines
      const newSlotLines = [...slotLines];
      if (newSlotLines[activeLineIndex]) {
        const lineSlots = newSlotLines[activeLineIndex];
        const targetSlot = lineSlots.find((slot) => slot.id === slotId);

        if (targetSlot) {
          const sameTimeSlots = lineSlots.filter(
            (slot) =>
              slot.startHour === targetSlot.startHour &&
              slot.endHour === targetSlot.endHour
          );

          // Encontrar a próxima rowIndex disponível
          const usedRowIndices = sameTimeSlots.map(
            (slot) => slot.rowIndex || 0
          );
          const nextRowIndex = Math.max(...usedRowIndices) + 1;

          const newSlot: TimeSlot = {
            id: `${Date.now()}_row_${nextRowIndex}`,
            startHour: targetSlot.startHour,
            endHour: targetSlot.endHour,
            vagasCount: 1,
            assignedVagas: [],
            lineIndex: activeLineIndex,
            slotLineIndex: 0,
            rowIndex: nextRowIndex,
          };

          newSlotLines[activeLineIndex] = [...lineSlots, newSlot];
          setSlotLines(newSlotLines);
          markUnsavedChanges();
        }
      }
    }
  };

  // Função para remover linha adicional de horário
  const removeAdditionalHourLine = (slotId: string) => {
    if (editingDayIndex !== null) {
      const newSlotsByDay = { ...slotsByDay };
      if (newSlotsByDay[activeLineIndex]?.[editingDayIndex]) {
        newSlotsByDay[activeLineIndex][editingDayIndex] = newSlotsByDay[
          activeLineIndex
        ][editingDayIndex].filter((slot) => slot.id !== slotId);
        setSlotsByDay(newSlotsByDay);

        // Marcar como alterado quando slots são removidos (sem auto-save)
        if (editingGradeId) {
          markUnsavedChanges(editingGradeId);
        }
      }
    } else {
      const newSlotLines = [...slotLines];
      if (newSlotLines[activeLineIndex]) {
        newSlotLines[activeLineIndex] = newSlotLines[activeLineIndex].filter(
          (slot) => slot.id !== slotId
        );
        setSlotLines(newSlotLines);
        markUnsavedChanges();
      }
    }
  };

  // Função para obter número de linhas para um dia
  const getDayRowCount = (lineIndex: number, dayIndex: number) => {
    // Sempre usar o valor salvo em dayRowCounts se existir
    const savedRowCount = dayRowCounts[lineIndex]?.[dayIndex];

    if (savedRowCount !== undefined && savedRowCount > 0) {
      return savedRowCount;
    }

    // Se não há valor salvo, calcular dinamicamente baseado nos slots existentes
    const requiredRows = calculateRequiredRowsForDay(lineIndex, dayIndex);

    // Se temos slots, garantir pelo menos o número de linhas necessário
    if (requiredRows > 1) {
      return requiredRows;
    }

    // Padrão: pelo menos 1 linha
    return 1;
  };

  // Função para limpar linhas vazias quando sair da edição do dia
  const cleanupEmptyRowsForDay = useCallback(
    (lineIndex: number, dayIndex: number) => {
      const daySlots = slotsByDay[lineIndex]?.[dayIndex] || [];
      const requiredRows = calculateRequiredRowsForDay(lineIndex, dayIndex);

      // Salvar número de linhas necessárias
      updateDayRowCount(lineIndex, dayIndex, requiredRows);
    },
    [slotsByDay, calculateRequiredRowsForDay, updateDayRowCount]
  );

  // Função para calcular vagas fechadas e abertas
  const getSlotStats = (
    slots: TimeSlot[],
    startHour: number,
    endHour: number
  ) => {
    const sameTimeSlots = slots.filter(
      (slot) => slot.startHour === startHour && slot.endHour === endHour
    );

    const fechadas = sameTimeSlots.filter(
      (slot) => slot.assignedVagas.length > 0
    ).length;
    const abertas = sameTimeSlots.filter(
      (slot) => slot.assignedVagas.length === 0
    ).length;

    return { fechadas, abertas, total: fechadas + abertas };
  };

  // Função criarQuebraFixa removida (código morto)

  // ✅ Nova função para criar plantões em posição específica com duração escolhida
  const criarPlantaoEspecifico = (
    horasPorSlot: number,
    startHour: number,
    targetRowIndex: number
  ) => {
    if (editingDayIndex === null) return;

    // Calcular quantas barras criar baseado na duração
    const numeroBarras = 24 / horasPorSlot; // 24h=1, 12h=2, 8h=3, 6h=4
    const startHourBase =
      weekStartHours[activeLineIndex] || editingGradeHorario;

    const newSlots: TimeSlot[] = [];

    for (let i = 0; i < numeroBarras; i++) {
      const slotStartHour = normalizeHour(startHourBase + i * horasPorSlot);
      const rawEndHour = slotStartHour + horasPorSlot;
      const slotEndHour = normalizeHour(rawEndHour);

      // Validar duração máxima de 24h
      if (!isValidHourRange(slotStartHour, rawEndHour)) {
        toast.error("Horário inválido", {
          description: `Plantão ${i + 1} tem duração inválida (máximo 24h).`,
          duration: 3000,
        });
        continue;
      }

      // Verificar se há conflito na linha específica para este slot
      const currentSlots =
        slotsByDay[activeLineIndex]?.[editingDayIndex]?.filter(
          (slot) => (slot.rowIndex || 0) === targetRowIndex
        ) || [];
      const hasConflict = currentSlots.some(
        (slot) => slotStartHour < slot.endHour && slotEndHour > slot.startHour
      );

      if (hasConflict) {
        toast.warning("Conflito de horário", {
          description: `Plantão ${i + 1} (${formatHourDisplay(
            slotStartHour
          )}-${formatHourDisplay(
            slotEndHour
          )}) conflita com plantão existente.`,
          duration: 3000,
        });
        continue;
      }

      const newSlot: TimeSlot = {
        id: `${Date.now()}_${i}_specific`,
        startHour: slotStartHour,
        endHour: slotEndHour,
        vagasCount: 1,
        assignedVagas: [],
        lineIndex: activeLineIndex,
        slotLineIndex: 0,
        rowIndex: targetRowIndex,
      };

      newSlots.push(newSlot);
    }

    if (newSlots.length === 0) {
      toast.error("Nenhum plantão foi criado", {
        description: "Todos os horários conflitam com plantões existentes.",
        duration: 3000,
      });
      return;
    }

    // Adicionar todos os slots criados
    const newSlotsByDay = { ...slotsByDay };
    if (!newSlotsByDay[activeLineIndex]) {
      newSlotsByDay[activeLineIndex] = {};
    }
    if (!newSlotsByDay[activeLineIndex][editingDayIndex]) {
      newSlotsByDay[activeLineIndex][editingDayIndex] = [];
    }

    newSlotsByDay[activeLineIndex][editingDayIndex].push(...newSlots);
    setSlotsByDay(newSlotsByDay);

    // Auto-save para plantões criados via menu
    if (editingGradeId) {
      markUnsavedChanges(editingGradeId);
    }

    const criadosCount = newSlots.length;
    const totalCount = numeroBarras;

    if (criadosCount === totalCount) {
      toast.success(`${criadosCount} plantões criados`, {
        description: `${horasPorSlot}h cada - distribuição completa na linha ${
          targetRowIndex + 1
        }`,
        duration: 2000,
      });
    } else {
      toast.warning(`${criadosCount}/${totalCount} plantões criados`, {
        description: `Alguns conflitaram com plantões existentes na linha ${
          targetRowIndex + 1
        }`,
        duration: 3000,
      });
    }
  };

  // Função handleMouseDown removida (código morto)

  // Função handleMouseMove removida (código morto)
  // Função handleMouseUp movida para antes do useEffect que a utiliza

  // Função para remover slot
  const removeSlot = (slotId: string) => {
    if (editingDayIndex !== null) {
      // Removendo slot de dia específico
      const newSlotsByDay = { ...slotsByDay };
      if (newSlotsByDay[activeLineIndex]?.[editingDayIndex]) {
        newSlotsByDay[activeLineIndex][editingDayIndex] = newSlotsByDay[
          activeLineIndex
        ][editingDayIndex].filter((slot) => slot.id !== slotId);
        setSlotsByDay(newSlotsByDay);
        markUnsavedChanges(); // Marcar como alterado após remover slot
      }
    } else {
      const newSlotLines = slotLines.map((line) =>
        line.filter((slot) => slot.id !== slotId)
      );
      setSlotLines(newSlotLines);
    }
  };

  // Função para adicionar um slot em uma linha e dia específicos
  const addSlot = (lineIndex: number, dayIndex: number, startHour: number) => {
    const endHour = startHour + 1; // Slot de 1 hora por padrão

    const newSlotsByDay = { ...slotsByDay };
    if (!newSlotsByDay[lineIndex]) {
      newSlotsByDay[lineIndex] = {};
    }
    if (!newSlotsByDay[lineIndex][dayIndex]) {
      newSlotsByDay[lineIndex][dayIndex] = [];
    }

    // Verificar se já existe um slot no mesmo horário
    const existingSlot = newSlotsByDay[lineIndex][dayIndex].find(
      (slot) => slot.startHour === startHour && slot.endHour === endHour
    );

    if (existingSlot) {
      // Se já existe, incrementar o número de vagas
      existingSlot.vagasCount = (existingSlot.vagasCount || 1) + 1;
    } else {
      // Criar novo slot
      const newSlot: TimeSlot = {
        id: `${Date.now()}_line_${lineIndex}_day_${dayIndex}`,
        startHour,
        endHour,
        vagasCount: 1,
        assignedVagas: [],
        lineIndex,
        slotLineIndex: 0,
        rowIndex: 0,
      };
      newSlotsByDay[lineIndex][dayIndex].push(newSlot);
    }

    setSlotsByDay(newSlotsByDay);
    markUnsavedChanges();
  };

  // Função updateSlotVagas removida (código morto)

  // Função para atualizar médico atribuído ao slot
  const updateSlotMedico = (
    slotId: string,
    medico: { medicoId: string; medicoNome: string } | null
  ) => {
    if (editingDayIndex !== null) {
      // Atualizando médico em dia específico
      const newSlotsByDay = { ...slotsByDay };
      if (newSlotsByDay[activeLineIndex]?.[editingDayIndex]) {
        newSlotsByDay[activeLineIndex][editingDayIndex] = newSlotsByDay[
          activeLineIndex
        ][editingDayIndex].map((slot) =>
          slot.id === slotId
            ? { ...slot, assignedVagas: medico ? [medico] : [] }
            : slot
        );
        setSlotsByDay(newSlotsByDay);

        // Marcar como alterado quando médico é alterado
        if (editingGradeId) {
          markUnsavedChanges(editingGradeId);
        }
      }
    } else {
      const newSlotLines = slotLines.map((line) =>
        line.map((slot) =>
          slot.id === slotId
            ? { ...slot, assignedVagas: medico ? [medico] : [] }
            : slot
        )
      );
      setSlotLines(newSlotLines);
    }
  };

  // MARK: Função para redimensionar slot
  const handleSlotResize = (
    slotId: string,
    mode: "start" | "end",
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    let slot: TimeSlot | undefined;
    const normalizedLimitEndRange = normalizeHour(timeRangeHolder.end);
    console.error("LIMIT END RANGE NORMALIZED:", normalizedLimitEndRange);

    let haveReachedEnd = false;
    let returningToBeginig = false;
    if (editingDayIndex !== null) {
      // Procurar slot em dia específico
      slot = slotsByDay[activeLineIndex]?.[editingDayIndex]?.find(
        (s) => s.id === slotId
      );
    } else {
      slot = slotLines.flat().find((s) => s.id === slotId);
    }

    if (!slot) return;

    const startX = event.clientX;
    const originalStartHour = slot.startHour;
    const originalEndHour = slot.endHour;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const hourChange = Math.round(deltaX / 100); // Reduzida sensibilidade: 100px = 1 hora

      if (editingDayIndex !== null) {
        // Redimensionar em dia específico
        if (mode === "start") {
          const newStartHour = Math.max(
            0,
            Math.min(originalEndHour - 1, originalStartHour + hourChange)
          );
          const newSlotsByDay = { ...slotsByDay };

          if (newStartHour < timeRangeHolder.start) {
            return;
          }
          if (newSlotsByDay[activeLineIndex]?.[editingDayIndex]) {
            newSlotsByDay[activeLineIndex][editingDayIndex] = newSlotsByDay[
              activeLineIndex
            ][editingDayIndex].map((s) =>
              s.id === slotId ? { ...s, startHour: newStartHour } : s
            );
            setSlotsByDay(newSlotsByDay);
            markUnsavedChanges(); // Marcar como alterado após redimensionar início do slot
          }
        } else {
          let newEndHour = Math.min(
            48,
            Math.max(originalStartHour + 1, originalEndHour + hourChange)
          );
          const normalizedNewEndHour = normalizeHour(newEndHour);
          const newSlotsByDay = { ...slotsByDay };

          if (
            newEndHour > timeRangeHolder.end ||
            (newEndHour > timeRangeHolder.start &&
              newEndHour <= timeRangeHolder.start + 2)
          ) {
            toast.error(
              `Limite máximo de ${formatHourDisplay(
                timeRangeHolder.end
              )} atingido`
            );
            return; // Impedir ajuste se ultrapassar o limite permitido
            // Impedir ajuste se ultrapassar o limite permitido
          }

          if (newSlotsByDay[activeLineIndex]?.[editingDayIndex]) {
            newSlotsByDay[activeLineIndex][editingDayIndex] = newSlotsByDay[
              activeLineIndex
            ][editingDayIndex].map((s) =>
              s.id === slotId ? { ...s, endHour: newEndHour } : s
            );
            setSlotsByDay(newSlotsByDay);
            markUnsavedChanges(); // Marcar como alterado após redimensionar fim do slot
          }
        }
      } else {
        // Redimensionar em modo geral
        if (mode === "start") {
          const newStartHour = Math.max(
            0,
            Math.min(originalEndHour - 1, originalStartHour + hourChange)
          );
          const newSlotLines = slotLines.map((line) =>
            line.map((s) =>
              s.id === slotId ? { ...s, startHour: newStartHour } : s
            )
          );
          setSlotLines(newSlotLines);
        } else {
          const newEndHour = Math.min(
            48,
            Math.max(originalStartHour + 1, originalEndHour + hourChange)
          );
          const newSlotLines = slotLines.map((line) =>
            line.map((s) =>
              s.id === slotId ? { ...s, endHour: newEndHour } : s
            )
          );
          setSlotLines(newSlotLines);
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Função para formatar hora
  const formatHourDisplay = (hour: number) => {
    if (hour >= 24) {
      const normalizedHour = hour % 24;
      return `${normalizedHour.toString().padStart(2, "0")}h`;
    }

    return `${hour.toString().padStart(2, "0")}h`;
  };

  // Função para verificar conflitos de médicos na grade
  const verificarConflitosNaGrade = (grade: GradeLine): boolean => {
    if (!grade.slotsByDay) {
      return false;
    }

    // Verificar cada linha/semana
    for (const lineIndex in grade.slotsByDay) {
      const lineSlots = grade.slotsByDay[lineIndex];

      // Verificar cada dia da semana
      for (const dayIndex in lineSlots) {
        const daySlots = lineSlots[dayIndex] || [];

        // Verificar cada par de slots no mesmo dia
        for (let i = 0; i < daySlots.length; i++) {
          const slot1 = daySlots[i];

          if (!slot1.assignedVagas || slot1.assignedVagas.length === 0) {
            continue;
          }

          // Verificar todos os médicos do slot1
          for (const medico1 of slot1.assignedVagas) {
            // Comparar com todos os outros slots do mesmo dia
            for (let j = i + 1; j < daySlots.length; j++) {
              const slot2 = daySlots[j];

              if (!slot2.assignedVagas || slot2.assignedVagas.length === 0) {
                continue;
              }

              // Verificar todos os médicos do slot2
              for (const medico2 of slot2.assignedVagas) {
                // Se é o mesmo médico, verificar se há sobreposição de horários
                if (medico1.medicoId === medico2.medicoId) {
                  const start1 = slot1.startHour;
                  const end1 = slot1.endHour;
                  const start2 = slot2.startHour;
                  const end2 = slot2.endHour;

                  // Verificar sobreposição simples
                  if (start1 < end2 && start2 < end1) {
                    return true; // Conflito encontrado
                  }
                }
              }
            }
          }
        }
      }
    }

    return false; // Nenhum conflito
  };

  // Função para normalizar horário dentro de um dia (0-23)

  // Função para verificar se horário é válido para operações (máximo 24h)
  const isValidHourRange = (startHour: number, endHour: number) => {
    // Normalizar horários para 0-23
    const normalizedStart = normalizeHour(startHour);
    const normalizedEnd = normalizeHour(endHour);

    // Calcular duração - se endHour for maior que startHour, é provável que atravesse meia-noite
    let duration: number;

    // Se o endHour original é maior que 23, definitivamente atravessa meia-noite
    if (endHour > 23) {
      duration = endHour - startHour;
    } else if (normalizedEnd > normalizedStart) {
      // Plantão no mesmo dia (ex: 08h às 20h)
      duration = normalizedEnd - normalizedStart;
    } else if (normalizedEnd < normalizedStart) {
      // Plantão que atravessa meia-noite (ex: 19h às 07h)
      duration = 24 - normalizedStart + normalizedEnd;
    } else {
      // Horários iguais - plantão de 24h (ex: 00h às 00h)
      duration = 24;
    }

    // Validar: horários válidos e duração máxima de 24h
    return (
      normalizedStart >= 0 &&
      normalizedStart <= 23 &&
      normalizedEnd >= 0 &&
      normalizedEnd <= 23 &&
      duration > 0 &&
      duration <= 24
    );
  };

  // Salvar configuração na grade atual no banco de dados (apenas quando clicar em salvar)
  const salvarConfiguracaoGrade = async () => {
    if (!editingGradeId) return;

    setIsSaving(true);
    try {
      // Preparar configuração para salvar - priorizar slotsByDay se existir
      let todosSlots: any[] = [];

      // Verificar se existem slots por dia (estrutura nova)
      const hasSlotsByDay = Object.keys(slotsByDay).length > 0;
      if (hasSlotsByDay) {
        // Usar slotsByDay como fonte principal
        Object.keys(slotsByDay).forEach((lineIndexStr) => {
          const lineIndex = parseInt(lineIndexStr);
          Object.keys(slotsByDay[lineIndex] || {}).forEach((dayIndexStr) => {
            const dayIndex = parseInt(dayIndexStr);
            const daySlots = slotsByDay[lineIndex][dayIndex] || [];
            daySlots.forEach((slot) => {
              todosSlots.push({
                ...slot,
                lineIndex,
              });
            });
          });
        });
      } else {
        // Fallback para slotLines (estrutura antiga)
        todosSlots = slotLines.flat().map((slot) => ({
          ...slot,
          lineIndex: slotLines.findIndex((line) => line.includes(slot)),
        }));
      }

      // Buscar configuração atual da grade
      const gradeAtual = gradeLines.find((g) => g.id === editingGradeId);

      const configuracao = {
        slots: todosSlots,
        lineNames: lineNames[editingGradeId] || {},
        selectedDays: selectedDays,
        slotsByDay: slotsByDay,
        weekStartHours: weekStartHours,
        dayRowCounts: dayRowCounts, // Salvar configuração de linhas por dia
        // Incluir configurações de valores
        tipoCalculo: gradeAtual?.configuracao?.tipoCalculo,
        valorPorHora: gradeAtual?.configuracao?.valorPorHora,
        valorPorPlantao: gradeAtual?.configuracao?.valorPorPlantao,
        horasPlantao: gradeAtual?.configuracao?.horasPlantao,
        diasPagamento: gradeAtual?.configuracao?.diasPagamento,
        formaRecebimento: gradeAtual?.configuracao?.formaRecebimento,
        tipoVaga: gradeAtual?.configuracao?.tipoVaga,
        observacoesPadrao: gradeAtual?.configuracao?.observacoesPadrao,
      };

      // Salvar no banco de dados
      await dbUpdateGrade(editingGradeId, {
        horario_inicial: editingGradeHorario,
        configuracao: configuracao,
      });

      // Marcar como salvo
      setHasUnsavedChanges((prev) => ({
        ...prev,
        [editingGradeId]: false,
      }));
      setHasManualSave(true);

      // Limpar mudanças pendentes
      clearUnsavedChanges(editingGradeId);

      // Feedback de sucesso
      toast.success("Grade salva com sucesso");
    } catch (error) {
      // Erro ao salvar grade
      toast.error("Erro ao salvar a grade. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Função toggleDiaSemana removida (código morto)

  // Função para obter nome da linha
  const getLineName = (gradeId: string, lineIndex: number) => {
    return lineNames[gradeId]?.[lineIndex] || "";
  };

  // Função para atualizar nome da linha
  const updateLineName = (gradeId: string, lineIndex: number, name: string) => {
    setLineNames((prev) => ({
      ...prev,
      [gradeId]: {
        ...prev[gradeId],
        [lineIndex]: name,
      },
    }));
    markUnsavedChanges(); // Marcar como alterado após alterar nome da semana
  };

  // Função para limpar nomes das linhas ao trocar de grade
  const clearLineNamesForGrade = (gradeId: string) => {
    setLineNames((prev) => {
      const newLineNames = { ...prev };
      delete newLineNames[gradeId];
      return newLineNames;
    });
  };

  // Função para filtrar grades por hospital com ordenação
  const getGradesByHospital = (hospitalId: string) => {
    const grades = gradeLines.filter(
      (grade) => grade.hospital_id === hospitalId
    );
    const order = gradesOrder[hospitalId] || [];

    // Se não há ordem definida, retornar grades na ordem original (mais recente primeiro)
    if (order.length === 0) {
      return grades;
    }

    // Separar grades que estão na ordem das que não estão
    const orderedGrades: GradeLine[] = [];
    const unorderedGrades: GradeLine[] = [];

    grades.forEach((grade) => {
      if (order.includes(grade.id)) {
        orderedGrades.push(grade);
      } else {
        unorderedGrades.push(grade);
      }
    });

    // Ordenar grades conforme a ordem salva
    orderedGrades.sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      return aIndex - bIndex;
    });

    // Grades não ordenadas aparecem no topo (mais recentes primeiro)
    return [...unorderedGrades, ...orderedGrades];
  };

  // Função para obter hospitais que têm grades
  const getHospitalsWithGrades = useCallback(() => {
    const hospitalIds = new Set(gradeLines.map((grade) => grade.hospital_id));
    return hospitais.filter((hospital) => hospitalIds.has(hospital.id));
  }, [gradeLines, hospitais]);

  // Funções de drag & drop para reordenação de grades
  const handleDragStart = (e: React.DragEvent, gradeId: string) => {
    e.dataTransfer.setData("text/plain", gradeId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedGradeId(gradeId);
  };

  const handleDragOver = (e: React.DragEvent, gradeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverGradeId(gradeId);
  };

  const handleDragLeave = () => {
    setDragOverGradeId(null);
  };

  const handleDrop = (e: React.DragEvent, targetGradeId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");

    if (draggedId && draggedId !== targetGradeId) {
      reorderGrades(draggedId, targetGradeId);
    }

    setDraggedGradeId(null);
    setDragOverGradeId(null);
  };

  const handleDragEnd = () => {
    setDraggedGradeId(null);
    setDragOverGradeId(null);
  };

  // Função para criar slot após drag (para TimeSlotGridComponent)
  const handleDragEndSlot = (
    startHour: number,
    endHour: number,
    rowIndex?: number
  ) => {
    console.log("handleDragEndSlot chamado com:", {
      startHour,
      endHour,
    });

    // Usar rowIndex se fornecido, senão usar dragRowIndex
    const targetRowIndex = rowIndex !== undefined ? rowIndex : dragRowIndex;

    if (editingDayIndex === null || targetRowIndex === null) {
      return;
    }

    const newSlot: TimeSlot = {
      id: `${Date.now()}_drag_${Math.random().toString(36).substr(2, 9)}`,
      startHour,
      endHour,
      vagasCount: 1,
      assignedVagas: [],
      lineIndex: activeLineIndex,
      slotLineIndex: 0,
      rowIndex: targetRowIndex,
    };

    // Validar duração máxima de 24h
    if (!isValidHourRange(startHour, endHour)) {
      toast.error("Horário inválido", {
        description: "O plantão tem duração inválida (máximo 24h).",
        duration: 3000,
      });
      return;
    }

    // Adicionar o slot
    const newSlotsByDay = { ...slotsByDay };
    if (!newSlotsByDay[activeLineIndex]) {
      newSlotsByDay[activeLineIndex] = {};
    }
    if (!newSlotsByDay[activeLineIndex][editingDayIndex]) {
      newSlotsByDay[activeLineIndex][editingDayIndex] = [];
    }

    newSlotsByDay[activeLineIndex][editingDayIndex].push(newSlot);

    setSlotsByDay(newSlotsByDay);

    // Marcar como alterado (sem auto-save)
    if (editingGradeId) {
      markUnsavedChanges(editingGradeId);
    }

    const duration = endHour - startHour;
    toast.success("Plantão criado", {
      description: `${formatHourDisplay(startHour)} - ${formatHourDisplay(
        endHour
      )} (${duration}h)`,
      duration: 2000,
    });
  };

  // Função para reordenar grades
  const reorderGrades = (draggedGradeId: string, targetGradeId: string) => {
    // Encontrar o hospital das grades
    const draggedGrade = gradeLines.find((g) => g.id === draggedGradeId);
    const targetGrade = gradeLines.find((g) => g.id === targetGradeId);

    if (
      !draggedGrade ||
      !targetGrade ||
      draggedGrade.hospital_id !== targetGrade.hospital_id
    ) {
      return;
    }

    const hospitalId = draggedGrade.hospital_id;
    const hospitalGrades = getGradesByHospital(hospitalId);
    const currentOrder =
      gradesOrder[hospitalId] || hospitalGrades.map((g) => g.id);

    // Encontrar posições atuais
    const draggedIndex = currentOrder.indexOf(draggedGradeId);
    const targetIndex = currentOrder.indexOf(targetGradeId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Criar nova ordem
    const newOrder = [...currentOrder];

    // Remover o item da posição original
    newOrder.splice(draggedIndex, 1);

    // Calcular nova posição de inserção
    let insertIndex = targetIndex;

    // Se estamos movendo para baixo (índice maior), inserir após o target
    // Se estamos movendo para cima (índice menor), inserir antes do target
    if (draggedIndex < targetIndex) {
      // Movendo para baixo: inserir após o target
      insertIndex = targetIndex; // targetIndex já foi ajustado pela remoção anterior
    } else {
      // Movendo para cima: inserir antes do target
      insertIndex = targetIndex;
    }

    // Inserir na nova posição
    newOrder.splice(insertIndex, 0, draggedGradeId);

    // Atualizar estado
    setGradesOrder((prev) => ({
      ...prev,
      [hospitalId]: newOrder,
    }));

    // Salvar ordem no localStorage
    try {
      const savedOrders = JSON.parse(
        localStorage.getItem("grades-order") || "{}"
      );
      savedOrders[hospitalId] = newOrder;
      localStorage.setItem("grades-order", JSON.stringify(savedOrders));
    } catch (error) {
      // Falha ao salvar no localStorage
    }
  };

  // Carregar ordem das grades do localStorage
  React.useEffect(() => {
    try {
      const savedOrders = JSON.parse(
        localStorage.getItem("grades-order") || "{}"
      );
      setGradesOrder(savedOrders);
    } catch (error) {
      // Falha ao carregar do localStorage
    }
  }, [setGradesOrder]);

  // Carregar estado de collapse/expand das grades do localStorage
  React.useEffect(() => {
    try {
      const savedCollapsedState = JSON.parse(
        localStorage.getItem("grades-collapsed") || "{}"
      );
      setCollapsedGrades(savedCollapsedState);
    } catch (error) {
      // Falha ao carregar do localStorage
    }
  }, []);

  // Limpar grades removidas da ordem salva
  React.useEffect(() => {
    if (gradeLines.length === 0) return;

    const gradeIds = new Set(gradeLines.map((grade) => grade.id));
    const hospitalsWithChanges = new Set<string>();

    // Verificar se há grades na ordem que não existem mais
    const updatedOrder = { ...gradesOrder };

    Object.keys(updatedOrder).forEach((hospitalId) => {
      const hospitalOrder = updatedOrder[hospitalId] || [];
      const filteredOrder = hospitalOrder.filter((gradeId) =>
        gradeIds.has(gradeId)
      );

      if (filteredOrder.length !== hospitalOrder.length) {
        updatedOrder[hospitalId] = filteredOrder;
        hospitalsWithChanges.add(hospitalId);
      }
    });

    // Se houve mudanças, atualizar estado e localStorage
    if (hospitalsWithChanges.size > 0) {
      setGradesOrder(updatedOrder);

      try {
        localStorage.setItem("grades-order", JSON.stringify(updatedOrder));
      } catch (error) {
        // Falha ao salvar no localStorage
      }
    }
  }, [gradeLines, gradesOrder, setGradesOrder]);

  // Limpar estados de collapse para grades removidas
  React.useEffect(() => {
    if (gradeLines.length === 0) return;

    const gradeIds = new Set(gradeLines.map((grade) => grade.id));
    const collapsedGradeIds = Object.keys(collapsedGrades);
    const invalidCollapsedIds = collapsedGradeIds.filter(
      (id) => !gradeIds.has(id)
    );

    if (invalidCollapsedIds.length > 0) {
      const newCollapsedGrades = { ...collapsedGrades };

      invalidCollapsedIds.forEach((id) => {
        delete newCollapsedGrades[id];
      });

      setCollapsedGrades(newCollapsedGrades);

      // Atualizar localStorage
      try {
        localStorage.setItem(
          "grades-collapsed",
          JSON.stringify(newCollapsedGrades)
        );
      } catch (error) {
        // Falha ao salvar no localStorage
      }
    }
  }, [gradeLines, collapsedGrades]);

  // Atualizar aba ativa se não houver grades no hospital atual
  React.useEffect(() => {
    const hospitalsWithGrades = getHospitalsWithGrades();
    if (
      hospitalsWithGrades.length > 0 &&
      !hospitalsWithGrades.find((h) => h.id === activeHospitalTab)
    ) {
      setActiveHospitalTab(hospitalsWithGrades[0].id);
    }
  }, [gradeLines, activeHospitalTab, getHospitalsWithGrades]);

  // Função para atualizar cor da grade
  const updateGradeColor = (gradeId: string, newColor: string) => {
    setGradeLines((prev) =>
      prev.map((grade) =>
        grade.id === gradeId ? { ...grade, cor: newColor } : grade
      )
    );
  };

  // Função para atualizar dados da grade com persistência no banco
  const handleGradeUpdate = async (
    gradeId: string,
    updates: {
      nome: string;
      cor: string;
    }
  ) => {
    try {
      // Atualizar no banco primeiro
      await dbUpdateGrade(gradeId, updates);

      // Atualizar estado local após sucesso no banco
      setGradeLines((prev) =>
        prev.map((grade) =>
          grade.id === gradeId ? { ...grade, ...updates } : grade
        )
      );

      toast.success("Grade atualizada com sucesso!");

      // Verificar se há vagas existentes usando essa grade para alertar o usuário
      await checkExistingVagas(gradeId, updates);
    } catch (error) {
      console.error("Erro ao atualizar grade:", error);
      toast.error("Erro ao atualizar a grade. Tente novamente.");
      throw error; // Re-throw para o modal saber que houve erro
    }
  };

  // Função para verificar e tratar vagas existentes quando grade é alterada
  const checkExistingVagas = async (
    gradeId: string,
    updates: {
      nome: string;
      cor: string;
    }
  ) => {
    try {
      const supabase = getSupabaseClient();

      // Buscar vagas que usam esta grade e estão publicadas (abertas, fechadas, anunciadas)
      const { data: vagasExistentes, error } = await supabase
        .from("vw_vagas_candidaturas")
        .select(
          "vaga_id, vaga_status, vaga_data, hospital_nome, especialidade_nome, setor_nome"
        )
        .eq("grade_id", gradeId)
        .in("vaga_status", ["aberta", "fechada", "anunciada"]);

      if (error) {
        console.error("Erro ao consultar vagas existentes:", error);
        return;
      }

      if (vagasExistentes && vagasExistentes.length > 0) {
        // Agrupar vagas por status
        const vagasAbertas = vagasExistentes.filter(
          (v) => v.vaga_status === "aberta"
        );
        const vagasFechadas = vagasExistentes.filter(
          (v) => v.vaga_status === "fechada"
        );
        const vagasAnunciadas = vagasExistentes.filter(
          (v) => v.vaga_status === "anunciada"
        );

        const totalVagas = vagasExistentes.length;
        let mensagem = `Foram encontradas ${totalVagas} vaga${
          totalVagas > 1 ? "s" : ""
        } já publicada${totalVagas > 1 ? "s" : ""} usando esta grade:\n\n`;

        if (vagasAbertas.length > 0) {
          mensagem += `• ${vagasAbertas.length} vaga${
            vagasAbertas.length > 1 ? "s" : ""
          } aberta${vagasAbertas.length > 1 ? "s" : ""}\n`;
        }
        if (vagasFechadas.length > 0) {
          mensagem += `• ${vagasFechadas.length} vaga${
            vagasFechadas.length > 1 ? "s" : ""
          } fechada${vagasFechadas.length > 1 ? "s" : ""}\n`;
        }
        if (vagasAnunciadas.length > 0) {
          mensagem += `• ${vagasAnunciadas.length} vaga${
            vagasAnunciadas.length > 1 ? "s" : ""
          } anunciada${vagasAnunciadas.length > 1 ? "s" : ""}\n`;
        }

        mensagem += `\n⚠️ As alterações de nome e cor da grade foram aplicadas IMEDIATAMENTE a todas essas vagas.`;

        // Mostrar alerta informativo sobre as vagas existentes
        toast.info("Alterações aplicadas às vagas existentes", {
          description: mensagem,
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Erro ao verificar vagas existentes:", error);
    }
  };

  // Função para atualizar configuração da grade
  const updateGradeConfig = (
    gradeId: string,
    configKey: string,
    value: any
  ) => {
    console.log("Atualizando configuração:", value);
    setGradeLines((prev) =>
      prev.map((grade) =>
        grade.id === gradeId
          ? {
              ...grade,
              configuracao: {
                ...grade.configuracao,
                [configKey]: value,
              },
            }
          : grade
      )
    );

    const startTime = value["0"];
    const endDate = startTime + 24;

    timeRangeHolder.start = startTime;
    timeRangeHolder.end = endDate;
    const normalizedEnd = normalizeHour(endDate);
    console.log("24h Range:", {
      startHour: startTime,
      endHour: endDate,
      normalizedEnd,
    });

    markUnsavedChanges();
  };

  // Componente helper para labels com tooltip
  const LabelWithTooltip = ({
    label,
    tooltip,
  }: {
    label: string;
    tooltip: string;
  }) => (
    <div className="flex items-center gap-1">
      <label className="text-sm font-normal text-gray-700">{label}</label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // Função openGenerateModal removida (código morto)

  // Função para fechar modal de geração de vagas
  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setSelectedGradeForGeneration(null);
    setGenerationStartDate(new Date());
    setGenerationEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  };

  // Função para duplicar grade
  const handleDuplicateGrade = async (type: "fechada" | "aberta", gradeToClone?: GradeLine) => {
    // Usar a grade passada diretamente ou o estado (para compatibilidade)
    const gradeOriginal = gradeToClone || selectedGradeForDuplication;
    if (!gradeOriginal) return;

    try {
      // Criar cópia da grade
      const novaNome = `${gradeOriginal.nome} (Cópia)`;

      // Criar nova grade no banco
      const newGrade = await dbCreateGrade({
        nome: novaNome,
        especialidade_id: gradeOriginal.especialidade_id,
        setor_id: gradeOriginal.setor_id,
        hospital_id: gradeOriginal.hospital_id,
        cor: gradeOriginal.cor,
        horario_inicial: gradeOriginal.horarioInicial || 7,
      });

      // Verificar se a grade tem estrutura válida antes de copiar
      const temSlotsParaCopiar =
        gradeOriginal.slotsByDay ||
        (gradeOriginal.configuracao &&
          (gradeOriginal.configuracao as any).slotsByDay);

      // Copiar estrutura de slots
      if (temSlotsParaCopiar) {
        // Usar slotsByDay do nível raiz ou de configuracao
        const slotsOriginais =
          gradeOriginal.slotsByDay ||
          (gradeOriginal.configuracao as any)?.slotsByDay ||
          {};
        const slotsDuplicados: typeof gradeOriginal.slotsByDay = {};

        // Iterar por cada semana
        Object.entries(slotsOriginais).forEach(
          ([weekIndex, weekSlots]: [string, any]) => {
            slotsDuplicados[parseInt(weekIndex)] = {};

            // Iterar por cada dia da semana
            Object.entries(weekSlots).forEach(
              ([dayIndex, daySlots]: [string, any]) => {
                slotsDuplicados[parseInt(weekIndex)][parseInt(dayIndex)] =
                  daySlots.map((slot: any) => ({
                    ...slot,
                    id: crypto.randomUUID(),
                    // Se duplicar aberta, remover médicos
                    assignedVagas: type === "aberta" ? [] : slot.assignedVagas,
                  }));
              }
            );
          }
        );

        // Preparar configuração completa para salvar no banco
        const weekStartHoursOriginal = gradeOriginal.weekStartHours ||
          (gradeOriginal.configuracao as any)?.weekStartHours || { 0: 7 };
        const selectedDaysOriginal = gradeOriginal.selectedDays ||
          (gradeOriginal.configuracao as any)?.selectedDays || {
            0: new Array(7).fill(false),
          };
        const lineNamesOriginal =
          gradeOriginal.lineNames ||
          (gradeOriginal.configuracao as any)?.lineNames ||
          {};
        const dayRowCountsOriginal =
          gradeOriginal.dayRowCounts ||
          (gradeOriginal.configuracao as any)?.dayRowCounts ||
          {};

        const configuracaoCompleta = {
          ...gradeOriginal.configuracao,
          slotsByDay: slotsDuplicados,
          weekStartHours: weekStartHoursOriginal,
          selectedDays: selectedDaysOriginal,
          lineNames: lineNamesOriginal,
          dayRowCounts: dayRowCountsOriginal,
          // Incluir slots em formato flat para compatibilidade
          slots: Object.entries(slotsDuplicados).flatMap(
            ([lineIndex, weekSlots]) =>
              Object.entries(weekSlots).flatMap(([dayIndex, daySlots]) =>
                daySlots.map((slot) => ({
                  ...slot,
                  lineIndex: parseInt(lineIndex),
                }))
              )
          ),
        };

        // Salvar no banco com estrutura correta
        await dbUpdateGrade(newGrade.id, {
          horario_inicial: gradeOriginal.horarioInicial || 7,
          configuracao: configuracaoCompleta,
        });

        // Recarregar grades do banco para garantir sincronização
        await fetchGrades();

        // Aguardar um momento para garantir que o estado foi atualizado
        setTimeout(() => {
          // Atualizar aba ativa para mostrar a nova grade
          setActiveHospitalTab(gradeOriginal.hospital_id);
        }, 100);
      }

      // Mostrar sucesso
      toast.success(`Grade duplicada com sucesso como "${novaNome}"`, {
        description:
          type === "fechada"
            ? "Grade copiada com todos os médicos designados"
            : "Grade copiada apenas com os horários, sem médicos",
      });

      // Limpar seleção
      setSelectedGradeForDuplication(null);

      // Atualizar aba ativa para mostrar a nova grade
      setActiveHospitalTab(gradeOriginal.hospital_id);
    } catch (error) {
      console.error("Erro ao duplicar grade:", error);
      const mensagemErro =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao duplicar grade", {
        description: mensagemErro,
      });
    }
  };

  // Função para calcular data real da vaga considerando horários de dia seguinte
  const calcularDataRealDaVaga = (
    dataBase: Date,
    startHour: number,
    weekStartHour: number = 7
  ) => {
    const dataVaga = new Date(dataBase);

    // LÓGICA DE DIA SEGUINTE baseada no horário de início da semana:
    // Se o startHour for menor que o weekStartHour, considera que atravessou meia-noite
    //
    // Exemplos:
    // - Grade inicia às 7h: 00h-06h são madrugada (dia seguinte), 07h-23h são do mesmo dia
    // - Grade inicia às 0h: 00h-23h são do mesmo dia
    // - Grade inicia às 12h: 00h-11h são madrugada (dia seguinte), 12h-23h são do mesmo dia

    if (startHour < weekStartHour) {
      dataVaga.setDate(dataVaga.getDate() + 1);
    }

    return dataVaga;
  };

  // Função principal para gerar vagas a partir da grade
  const gerarVagasAPartirDaGrade = async (
    grade: GradeLine,
    dataInicio: Date,
    dataFim: Date
  ) => {
    if (!grade.configuracao?.tipoCalculo) {
      throw new Error(
        "Grade não possui configuração de pagamento. Configure os valores antes de gerar vagas."
      );
    }

    // Obter dados do usuário atual
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Buscar grupo e escalista_id do usuário
    const { data: escalista, error: escalistaError } = await supabase
      .from("escalistas")
      .select("grupo_id, id")
      .eq("id", user.id)
      .single();

    if (escalistaError || !escalista?.grupo_id || !escalista?.id) {
      throw new Error("Dados do escalista não encontrados");
    }

    // Verificar e remover vagas antigas da mesma grade no período

    const dataInicioStr = dataInicio.toISOString().slice(0, 10);
    const dataFimStr = dataFim.toISOString().slice(0, 10);

    // Buscar apenas vagas da mesma grade no período especificado
    const vagasAntigasDaGrade = await verificarVagasDaGradeNoPeriodo({
      grade_id: grade.id,
      data_inicio: dataInicioStr,
      data_fim: dataFimStr,
    });

    // Se existem vagas antigas da mesma grade NO PERÍODO, excluí-las definitivamente
    if (vagasAntigasDaGrade.length > 0) {
      const vagasIds = vagasAntigasDaGrade.map((v) => v.id);

      // HOTFIX: Excluir definitivamente apenas as vagas da mesma grade no período especificado
      // Isso evita acúmulo de vagas canceladas e problemas com candidaturas órfãs
      const { error: deleteError } = await supabase
        .from("vagas")
        .delete()
        .in("id", vagasIds);

      if (deleteError) {
        console.error("Erro ao excluir vagas antigas da grade:", deleteError);
        throw new Error(
          `Erro ao excluir vagas antigas da grade: ${deleteError.message}`
        );
      }

      toast.warning(
        `${
          vagasAntigasDaGrade.length
        } vaga(s) anterior(es) foram excluídas para republicação da grade no período de ${dataInicio.toLocaleDateString(
          "pt-BR"
        )} a ${dataFim.toLocaleDateString("pt-BR")}`
      );
    }

    // Buscar períodos do banco para converter nomes em UUIDs
    const periodos = await fetchPeriodos();

    // Extrair todos os slots da grade
    const todosSlots: TimeSlot[] = [];

    if (grade.slotsByDay && Object.keys(grade.slotsByDay).length > 0) {
      // Iterar por todas as semanas (lineIndex)
      Object.keys(grade.slotsByDay).forEach((lineIndexStr) => {
        const lineIndex = parseInt(lineIndexStr);
        const semanaSlots = grade.slotsByDay![lineIndex];

        // Iterar por todos os dias da semana (dayIndex)
        Object.keys(semanaSlots || {}).forEach((dayIndexStr) => {
          const dayIndex = parseInt(dayIndexStr);
          const daySlots = semanaSlots[dayIndex] || [];

          // Adicionar todos os slots deste dia
          daySlots.forEach((slot) => {
            todosSlots.push({
              ...slot,
              lineIndex,
              dayIndex, // Adicionar dayIndex para saber qual dia da semana
            });
          });
        });
      });
    }

    if (todosSlots.length === 0) {
      throw new Error(
        "Nenhum horário encontrado na grade. Adicione horários antes de gerar vagas."
      );
    }

    // Organizar slots por semana da grade (lineIndex)
    const slotsPorSemana: { [lineIndex: number]: TimeSlot[] } = {};

    todosSlots.forEach((slot) => {
      if (!slotsPorSemana[slot.lineIndex!]) {
        slotsPorSemana[slot.lineIndex!] = [];
      }
      slotsPorSemana[slot.lineIndex!].push(slot);
    });

    // Calcular total de dias e configuração da grade
    const dataInicioDate = new Date(dataInicio);
    const dataFimDate = new Date(dataFim);
    const diasTotal =
      Math.ceil(
        (dataFimDate.getTime() - dataInicioDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1; // +1 para incluir o último dia

    // Obter chaves ordenadas das semanas da grade (lineIndex)
    const chavesSemanasOrdenadas = Object.keys(slotsPorSemana)
      .map((k) => parseInt(k))
      .sort((a, b) => a - b);
    const semanasGrade = chavesSemanasOrdenadas.length;

    // ESTRATÉGIA FINAL: Criar vagas individuais para cada data específica
    // Não usar recorrências que se sobrepõem, criar vaga por vaga

    // Iniciando criação de vagas - estratégia individual por data

    // LÓGICA SIMPLES: Mapear sequencialmente com offset inicial
    const vagasParaCriar: {
      slot: TimeSlot;
      medicoId: string | null;
      medicoNome: string | null;
      data: Date;
    }[] = [];

    // 1. Detectar que dia da semana é a data de início
    const diaInicialJS = dataInicioDate.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado
    const diaInicialFrontend = diaInicialJS === 0 ? 6 : diaInicialJS - 1; // 0=Segunda, 1=Terça, ..., 6=Domingo

    // 2. Criar array sequencial de todos os slots da grade (todas as semanas, todos os dias)
    const todosSlotsDaGradeSequencial: {
      slot: TimeSlot;
      posicaoNaGrade: number; // Posição absoluta no ciclo da grade
      semanaGrade: number;
      diaGrade: number;
    }[] = [];

    chavesSemanasOrdenadas.forEach((semanaIndex, semanaPos) => {
      const slotsDestaSemana = slotsPorSemana[semanaIndex] || [];
      // Para cada dia da semana (0=Segunda...6=Domingo)
      for (let dia = 0; dia < 7; dia++) {
        const slotsDesteDia = slotsDestaSemana.filter(
          (slot) => slot.dayIndex === dia
        );
        slotsDesteDia.forEach((slot) => {
          todosSlotsDaGradeSequencial.push({
            slot,
            posicaoNaGrade: semanaPos * 7 + dia, // Posição absoluta na grade
            semanaGrade: semanaPos,
            diaGrade: dia,
          });
        });
      }
    });

    const totalDiasNaGrade = semanasGrade * 7;

    // 3. Mapear cada dia do período para a posição correspondente na grade
    for (let diaOffset = 0; diaOffset < diasTotal; diaOffset++) {
      const dataAtual = new Date(dataInicioDate);
      dataAtual.setDate(dataInicioDate.getDate() + diaOffset);

      // Calcular posição na grade considerando o offset inicial
      const posicaoAbsolutaNaGrade =
        (diaInicialFrontend + diaOffset) % totalDiasNaGrade;

      // Buscar slots que correspondem a esta posição
      const slotsDoHoje = todosSlotsDaGradeSequencial.filter(
        (item) => item.posicaoNaGrade === posicaoAbsolutaNaGrade
      );

      // Processar slots do dia atual

      // Criar vagas para os slots encontrados
      slotsDoHoje.forEach((item, index) => {
        const slot = item.slot;

        // Processar slot

        // Obter weekStartHour para a semana que contém este slot
        const lineIndexDoSlot = slot.lineIndex!;
        const weekStartHour =
          grade.weekStartHours?.[lineIndexDoSlot] || grade.horarioInicial || 7;

        // Calcular data real considerando horários de dia seguinte
        const dataRealDaVaga = calcularDataRealDaVaga(
          dataAtual,
          slot.startHour,
          weekStartHour
        );

        // Se não há médicos atribuídos
        if (!slot.assignedVagas || slot.assignedVagas.length === 0) {
          vagasParaCriar.push({
            slot,
            medicoId: null,
            medicoNome: null,
            data: dataRealDaVaga,
          });
        } else {
          // Para cada médico atribuído
          slot.assignedVagas.forEach((medico: any) => {
            vagasParaCriar.push({
              slot,
              medicoId: medico.medicoId,
              medicoNome: medico.medicoNome,
              data: dataRealDaVaga,
            });
          });
        }
      });
    }

    // Agrupar vagas por padrão identical (mesmo slot + mesmo médico) para criar recorrências eficientes
    const recorrenciasPorPadrao: {
      [key: string]: {
        slot: TimeSlot;
        medicoId: string | null;
        medicoNome: string | null;
        datas: Date[];
      };
    } = {};

    vagasParaCriar.forEach((vaga) => {
      const key = `${vaga.slot.dayIndex}-${vaga.slot.startHour}-${
        vaga.slot.endHour
      }-${vaga.medicoId || "null"}`;

      if (!recorrenciasPorPadrao[key]) {
        recorrenciasPorPadrao[key] = {
          slot: vaga.slot,
          medicoId: vaga.medicoId,
          medicoNome: vaga.medicoNome,
          datas: [],
        };
      }

      recorrenciasPorPadrao[key].datas.push(vaga.data);
    });

    // Criando recorrencia_id único para todas as vagas

    // Criar uma recorrência master para toda a grade
    // Usar o primeiro slot como base para criar a recorrência
    const primeiroSlot = Object.values(recorrenciasPorPadrao)[0]?.slot;
    if (!primeiroSlot) {
      throw new Error("Nenhum slot encontrado para criar recorrência");
    }

    // Criando registro de recorrência
    // Gerar UUID único e criar registro na tabela de recorrência
    const recorrenciaId = crypto.randomUUID();

    // Criar registro na tabela vagas_recorrencia (required for FK constraint)
    const { error: recorrenciaError } = await supabase
      .from("vagas_recorrencias")
      .insert([
        {
          id: recorrenciaId,
          data_inicio: dataInicioDate.toISOString().slice(0, 10),
          data_fim: dataFimDate.toISOString().slice(0, 10),
          dias_semana: [], // Array vazio - vamos criar vagas individuais
          created_by: user.id,
          created_at: new Date().toISOString(),
          observacoes: `Grade ${grade.nome} - ${vagasParaCriar.length} vagas individuais`,
        },
      ]);

    if (recorrenciaError) {
      throw new Error(
        `Falha ao criar recorrência: ${recorrenciaError.message}`
      );
    }

    // Recorrência criada, iniciando criação das vagas individuais

    // Criar todas as vagas individuais com o mesmo recorrencia_id
    // Verificar conflitos ANTES de criar vagas
    const vagaPromises: Promise<any>[] = [];
    const conflitosDetectados: Array<{
      data: string;
      horario: string;
      medico: string;
      erro: string;
    }> = [];

    // Iniciando loop de criação de vagas
    for (const vaga of vagasParaCriar) {
      // Detectar período automaticamente
      const endHourNormalizado = vaga.slot.endHour % 24;
      const periodoInfo = detectarPeriodo(
        vaga.slot.startHour,
        endHourNormalizado
      );

      // Converter período para UUID do banco
      const periodoId = formatarPeriodoParaBanco(periodoInfo, periodos);
      if (!periodoId) {
        throw new Error(
          `Período '${periodoInfo.periodo}' não encontrado no banco de dados`
        );
      }

      // Calcular valor usando duração real do slot
      const duracaoReal =
        vaga.slot.endHour > vaga.slot.startHour
          ? vaga.slot.endHour - vaga.slot.startHour
          : 24 - vaga.slot.startHour + (vaga.slot.endHour % 24);
      const calculo = calcularValorPorHora(grade.configuracao!, duracaoReal);

      // Normalizar horários
      const startHourNum = Number(vaga.slot.startHour) % 24;
      const endHourNum = Number(vaga.slot.endHour) % 24;
      const horaInicioFormatada = `${startHourNum
        .toString()
        .padStart(2, "0")}:00`;
      const horaFimFormatada = `${endHourNum.toString().padStart(2, "0")}:00`;

      // VERIFICAR CONFLITO ANTES DE CRIAR VAGA se há médico designado
      if (vaga.medicoId) {
        try {
          const { verificarConflitoHorario } = await import(
            "@/services/vagasService"
          );
          await verificarConflitoHorario({
            medico_id: vaga.medicoId,
            data: vaga.data.toISOString().slice(0, 10),
            hora_inicio: horaInicioFormatada,
            hora_fim: horaFimFormatada,
          });
        } catch (error: any) {
          // Registrar conflito e pular esta vaga
          conflitosDetectados.push({
            data: vaga.data.toLocaleDateString("pt-BR"),
            horario: `${horaInicioFormatada} - ${horaFimFormatada}`,
            medico: vaga.medicoNome || "Médico desconhecido",
            erro: error.message || "Conflito de horário detectado",
          });
          continue; // Pular para próxima vaga
        }
      }

      const vagaInsert = {
        hospital_id: grade.hospital_id,
        periodo_id: periodoId,
        hora_inicio: horaInicioFormatada,
        hora_fim: horaFimFormatada,
        grade_id: grade.id, // Adicionar ID da grade
        valor: calculo.valorTotal,
        data: vaga.data.toISOString().slice(0, 10),
        data_pagamento: calcularDataPagamento(
          vaga.data,
          grade.configuracao!.diasPagamento!
        )
          .toISOString()
          .slice(0, 10),
        tipos_vaga_id: grade.configuracao!.tipoVaga!,
        observacoes: vaga.medicoNome
          ? `Médico designado via grade: ${vaga.medicoNome}`
          : grade.configuracao!.observacoesPadrao || "",
        setor_id: grade.setor_id,
        status: vaga.medicoId ? ("fechada" as const) : ("aberta" as const),
        total_candidaturas: 0,
        especialidade_id: grade.especialidade_id,
        forma_recebimento_id: grade.configuracao!.formaRecebimento || "",
        grupo_id: escalista.grupo_id,
        escalista_id: escalista.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        recorrencia_id: recorrenciaId, // MESMO ID para todas as vagas
      };

      // Configuração da vaga concluída - agora criar vaga e candidatura
      vagaPromises.push(
        createVaga({
          vagaInsert,
          selectedBeneficios: [], // Por enquanto sem benefícios
          selectedRequisitos: [], // Por enquanto sem requisitos
        }).then(async (vagaCriada: any) => {
          // Se há médico designado, criar candidatura aprovada
          if (vaga.medicoId && vagaCriada) {
            try {
              await createCandidatura({
                vaga_id: vagaCriada.id,
                medico_id: vaga.medicoId,
                status: "APROVADO",
                vaga_valor: calculo.valorTotal,
              });
            } catch (candidaturaError: any) {
              // Se falhou ao criar candidatura (provavelmente conflito de horário),
              // deletar a vaga órfã que foi criada
              console.error('[Publicação Grade] Erro ao criar candidatura, deletando vaga órfã:', candidaturaError);

              try {
                // Deletar a vaga usando a API route
                await fetch(`/api/vagas/${vagaCriada.id}`, {
                  method: 'DELETE',
                  credentials: 'include',
                });
              } catch (deleteError) {
                console.error('[Publicação Grade] Erro ao deletar vaga órfã:', deleteError);
              }

              // Re-lançar o erro para ser contabilizado nos conflitos
              throw candidaturaError;
            }
          }
          return vagaCriada;
        })
      );
    }

    // Loop de criação finalizado

    // Usar Promise.allSettled para capturar sucessos e falhas individuais
    const resultados = await Promise.allSettled(vagaPromises);

    // Coletar sucessos e outros erros
    const vagasCriadas = resultados.filter(
      (r) => r.status === "fulfilled"
    ).length;
    const errosOutros: string[] = [];

    resultados.forEach((resultado) => {
      if (resultado.status === "rejected") {
        const error = resultado.reason;
        errosOutros.push(error?.message || "Erro desconhecido");
      }
    });

    // Retornar informações sobre sucessos e conflitos (incluindo os detectados previamente)
    return {
      vagasCriadas,
      conflitos: conflitosDetectados.length,
      outrosErros: errosOutros.length,
    };
  };

  // Função para gerar vagas a partir da grade (usando API route)
  const handleGenerateVagas = async () => {
    if (!selectedGradeForGeneration) return;

    try {
      setGenerationLoading(true);

      // Formatar datas para API
      const dataInicioStr = generationStartDate.toISOString().slice(0, 10);
      const dataFimStr = generationEndDate.toISOString().slice(0, 10);

      // Chamar API route de publicação
      const resultado = await gradesService.publicarGrade(
        selectedGradeForGeneration.id,
        dataInicioStr,
        dataFimStr
      );

      console.log("Resultado da publicação de vagas:", resultado);

      // Toast de aviso para vagas removidas (sobrescrita)
      if (resultado.vagasRemovidas > 0) {
        toast.warning(
          `${resultado.vagasRemovidas} vaga(s) anterior(es) foram substituídas.`,
          { duration: 5000 }
        );
      }

      // Toast de sucesso para vagas criadas
      if (resultado.vagasCriadas > 0) {
        toast.success(
          `${resultado.vagasCriadas} vaga${
            resultado.vagasCriadas > 1 ? "s" : ""
          } ${
            resultado.vagasCriadas > 1 ? "foram criadas" : "foi criada"
          } com sucesso!`
        );
      }

      // Toast de aviso para conflitos (se houver)
      if (resultado.conflitos > 0) {
        toast.warning(
          `${resultado.conflitos} vaga${
            resultado.conflitos > 1 ? "s" : ""
          } não ${resultado.conflitos > 1 ? "puderam" : "pôde"} ser criada${
            resultado.conflitos > 1 ? "s" : ""
          } por conflito de horário.`,
          {
            duration: 8000,
            dismissible: true,
          }
        );
      }

      // Toast de erro para outros problemas (se houver)
      if (resultado.outrosErros > 0) {
        toast.error(
          `${resultado.outrosErros} vaga${
            resultado.outrosErros > 1 ? "s" : ""
          } ${
            resultado.outrosErros > 1 ? "falharam" : "falhou"
          } por erro no sistema.`
        );
      }

      // Se nada foi criado
      if (
        resultado.vagasCriadas === 0 &&
        resultado.conflitos === 0 &&
        resultado.outrosErros === 0
      ) {
        toast.info(
          "Nenhuma vaga foi criada. Verifique se há horários configurados na grade."
        );
      }

      closeGenerateModal();
    } catch (error) {
      console.error("Erro ao publicar grade:", error);
      toast.error(
        `Erro ao publicar grade: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setGenerationLoading(false);
    }
  };

  // Função otimizada para replicar dia para outros dias
  const replicateDayToOtherDays = useCallback(
    (fromDayIndex: number, toDayIndices: number[]) => {
      // Função simples de replicação
      const sourceSlots = slotsByDay[activeLineIndex]?.[fromDayIndex] || [];

      if (sourceSlots.length === 0) return;

      const newSlotsByDay = { ...slotsByDay };

      toDayIndices.forEach((targetDayIndex) => {
        if (!newSlotsByDay[activeLineIndex]) {
          newSlotsByDay[activeLineIndex] = {};
        }

        // Copiar slots do dia origem para o dia alvo
        newSlotsByDay[activeLineIndex][targetDayIndex] = sourceSlots.map(
          (slot) => ({
            ...slot,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dayIndex: targetDayIndex,
          })
        );
      });

      setSlotsByDay(newSlotsByDay);
      markUnsavedChanges();
    },
    [slotsByDay, activeLineIndex, markUnsavedChanges]
  );

  // MARK: INICIO DA RENDERIZAÇÃO DA TELA
  return (
    <TooltipProvider>
      <div>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-normal tracking-tight">Grades</h1>
            </div>
          </div>

          {/* Componente de formulário de criação de nova linha */}
          <GradeFormComponent
            novaLinha={novaLinha}
            setNovaLinha={setNovaLinha}
            especialidades={especialidades}
            especialidadesLoading={especialidadesLoading}
            setores={setores}
            setoresLoading={setoresLoading}
            hospitais={hospitais}
            hospitaisLoading={hospitaisLoading}
            onCreateGrade={adicionarLinha}
          />

          {/* Componente de abas de hospital */}
          <HospitalTabsComponent
            hospitais={hospitais}
            gradeLines={gradeLines}
            activeHospitalTab={activeHospitalTab}
            setActiveHospitalTab={setActiveHospitalTab}
          />

          {/* Conteúdo das Grades - Container do Fichário */}
          {dbLoading ||
          medicosLoading ||
          especialidadesLoading ||
          setoresLoading ||
          hospitaisLoading ? (
            <LoadingSpinner />
          ) : gradeLines.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-normal">Nenhuma grade criada ainda</p>
              <p className="text-sm">
                Crie sua primeira grade preenchendo os campos acima
              </p>
            </div>
          ) : (
            <div
              className={`bg-white border rounded-md shadow-sm rounded-tl-none  ${
                {
                  /*getHospitalsWithGrades().findIndex(h => h.hospital_id === activeHospitalTab) === 0 
          ? 'rounded-tl-none' 
          : '' */
                }
              }`}
            >
              <div className="p-6 space-y-6">
                {getGradesByHospital(activeHospitalTab).map((line) => (
                  <Card
                    key={line.id}
                    className={`w-full transition-all duration-200 ${
                      editingGradeId === null && editingDayIndex === null
                        ? "cursor-move"
                        : ""
                    } ${
                      draggedGradeId === line.id ? "opacity-50 scale-95" : ""
                    } ${
                      dragOverGradeId === line.id
                        ? "ring-2 ring-primary shadow-lg"
                        : ""
                    }`}
                    draggable={
                      editingGradeId === null && editingDayIndex === null
                    }
                    onDragStart={(e) => {
                      if (editingGradeId === null && editingDayIndex === null) {
                        handleDragStart(e, line.id);
                      }
                    }}
                    onDragOver={(e) => {
                      if (editingGradeId === null && editingDayIndex === null) {
                        handleDragOver(e, line.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (editingGradeId === null && editingDayIndex === null) {
                        handleDragLeave();
                      }
                    }}
                    onDrop={(e) => {
                      if (editingGradeId === null && editingDayIndex === null) {
                        handleDrop(e, line.id);
                      }
                    }}
                    onDragEnd={() => {
                      if (editingGradeId === null && editingDayIndex === null) {
                        handleDragEnd();
                      }
                    }}
                  >
                    {/* Ocultar cabeçalho quando editando um dia específico */}
                    {!(
                      editingGradeId === line.id && editingDayIndex !== null
                    ) && (
                      <CardHeader className="pb-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="flex items-center gap-2 font-normal text-lg">
                              <div className="flex items-center gap-2">
                                {/* Collapse/Expand toggle button - só aparece quando não está editando */}
                                {editingGradeId !== line.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                    onClick={() => toggleGradeCollapse(line.id)}
                                    title={
                                      collapsedGrades[line.id]
                                        ? "Expandir grade"
                                        : "Colapsar grade"
                                    }
                                  >
                                    {collapsedGrades[line.id] ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: line.cor }}
                                />
                                {line.nome}
                              </div>
                            </CardTitle>
                            <p className="text-sm text-gray-600 font-thin ml-4 flex items-center gap-2">
                              <span className="font-normal">
                                Especialidade:
                              </span>{" "}
                              {getEspecialidadeNome(line.especialidade_id)} •
                              <span className="font-normal"> Setor:</span>{" "}
                              {getSetorNome(line.setor_id)}
                              {editingGradeId === line.id && (
                                <button
                                  onClick={() => {
                                    setSelectedGradeForEdit(line);
                                    setShowEditGradeModal(true);
                                  }}
                                  className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Editar grade"
                                >
                                  <PenLine className="w-3 h-3" />
                                </button>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1 items-center">
                            {editingGradeId === line.id ? (
                              ""
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Verificar conflitos de médicos antes da publicação
                                    if (verificarConflitosNaGrade(line)) {
                                      toast.error("Publicação impedida!", {
                                        description:
                                          "Há conflitos de médicos na grade. Corrija os conflitos antes de publicar.",
                                        duration: 5000,
                                      });
                                      return; // Impedir a publicação
                                    }

                                    // Sem conflitos, prosseguir com a publicação
                                    setSelectedGradeForGeneration(line);
                                    setShowGenerateModal(true);
                                  }}
                                  className="h-full py-1 border rounded text-gray-600 border-gray-300 hover:border-current hover:text-current transition-all duration-200 group"
                                  style={
                                    {
                                      "--hover-color": line.cor,
                                    } as React.CSSProperties
                                  }
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor =
                                      line.cor;
                                    e.currentTarget.style.color = line.cor;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "";
                                    e.currentTarget.style.color = "";
                                  }}
                                  title="Gerar vagas de plantão a partir desta grade"
                                >
                                  <CalendarDays className="w-4 h-4" />
                                  <span className="ml-1">Publicar</span>
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-full py-1 border rounded text-gray-600 border-gray-300 hover:border-current hover:text-current transition-all duration-200 group"
                                      style={
                                        {
                                          "--hover-color": line.cor,
                                        } as React.CSSProperties
                                      }
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor =
                                          line.cor;
                                        e.currentTarget.style.color = line.cor;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "";
                                        e.currentTarget.style.color = "";
                                      }}
                                      title="Duplicar esta grade"
                                    >
                                      <Copy className="w-4 h-4" />
                                      <span className="ml-1">Duplicar</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        handleDuplicateGrade("fechada", line);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Users className="w-4 h-4 mr-2 text-blue-500" />
                                      <div>
                                        <div className="font-medium">
                                          Duplicar Fechada
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Com médicos designados
                                        </div>
                                      </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        handleDuplicateGrade("aberta", line);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Calendar className="w-4 h-4 mr-2 text-green-600" />
                                      <div>
                                        <div className="font-medium">
                                          Duplicar Aberta
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Apenas horários, sem médicos
                                        </div>
                                      </div>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}

                            {editingGradeId === line.id &&
                              hasUnsavedChanges[line.id] && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => salvarConfiguracaoGrade()}
                                  disabled={isSaving}
                                  className="h-full py-1 border rounded"
                                  style={{
                                    borderColor: line.cor,
                                    color: line.cor,
                                  }}
                                  title="Salvar alterações na grade"
                                >
                                  <Save className="w-4 h-4" />
                                  {isSaving ? "Salvando..." : "Salvar"}
                                </Button>
                              )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-full py-1 border rounded text-gray-600 border-gray-300 hover:border-current hover:text-current transition-all duration-200 group"
                              style={
                                {
                                  "--hover-color": line.cor,
                                } as React.CSSProperties
                              }
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = line.cor;
                                e.currentTarget.style.color = line.cor;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "";
                                e.currentTarget.style.color = "";
                              }}
                              onClick={() => {
                                if (editingGradeId === line.id) {
                                  // Verificar se há mudanças não salvas
                                  if (hasUnsavedChanges[line.id]) {
                                    setPendingGradeExit(line.id);
                                    setUnsavedChangesModalOpen(true);
                                  } else {
                                    // Sair do modo de edição (sem mudanças pendentes)
                                    setEditingGradeId(null);
                                    setSlotLines([[]]);
                                    setSelectedDays({
                                      0: new Array(7).fill(false),
                                    });
                                    setSlotsByDay({}); // Reset slots por dia
                                    setWeekStartHours({}); // Reset horários por semana
                                    setEditingPaymentGradeId(null); // Fechar configuração de pagamentos
                                    setEditingDayIndex(null); // Reset da visualização de dia
                                  }
                                } else {
                                  // Entrar em modo de edição
                                  setEditingGradeId(line.id);
                                  setEditingGradeHorario(
                                    line.horarioInicial || 7
                                  ); // Carregar horário específico da grade
                                  setEditingPaymentGradeId(null); // Fechar configuração de pagamentos quando trocar de grade
                                  setEditingDayIndex(null); // Começar com visualização geral

                                  // Carregar nomes das linhas salvos
                                  if (line.lineNames) {
                                    setLineNames((prev) => ({
                                      ...prev,
                                      [line.id]: line.lineNames || {},
                                    }));
                                  }

                                  // Carregar slots por dia salvos - apenas se não estivermos editando
                                  if (!editingDayIndex) {
                                    if (line.slotsByDay) {
                                      setSlotsByDay(line.slotsByDay);
                                    } else {
                                      setSlotsByDay({});
                                    }
                                  }

                                  // Carregar horários iniciais por semana
                                  if (line.weekStartHours) {
                                    setWeekStartHours(line.weekStartHours);
                                  } else {
                                    // Se não há weekStartHours salvo, inicializar com horário padrão para todas as semanas encontradas
                                    const initWeekHours: {
                                      [key: number]: number;
                                    } = {};
                                    if (
                                      line.slotsByDay &&
                                      Object.keys(line.slotsByDay).length > 0
                                    ) {
                                      const maxLineIndex = Math.max(
                                        ...Object.keys(line.slotsByDay).map(
                                          Number
                                        ),
                                        0
                                      );
                                      for (let i = 0; i <= maxLineIndex; i++) {
                                        initWeekHours[i] =
                                          line.horarioInicial || 7;
                                      }
                                    } else {
                                      initWeekHours[0] =
                                        line.horarioInicial || 7;
                                    }
                                    setWeekStartHours(initWeekHours);
                                  }

                                  // Carregar configuração de linhas por dia
                                  if (line.dayRowCounts) {
                                    setDayRowCounts(line.dayRowCounts);
                                  } else {
                                    setDayRowCounts({}); // Inicializar vazio
                                  }

                                  // Carregar slots existentes - priorizar slotsByDay se existir
                                  if (
                                    line.slotsByDay &&
                                    Object.keys(line.slotsByDay).length > 0
                                  ) {
                                    // Usar estrutura slotsByDay (nova)
                                    const maxLineIndex = Math.max(
                                      ...Object.keys(line.slotsByDay).map(
                                        Number
                                      ),
                                      0
                                    );
                                    const emptySlotLines: TimeSlot[][] = [];
                                    const lineDays: {
                                      [key: number]: boolean[];
                                    } = {};

                                    // Criar slotLines vazias para todas as semanas
                                    for (let i = 0; i <= maxLineIndex; i++) {
                                      emptySlotLines[i] = [];
                                      lineDays[i] = new Array(7).fill(false);
                                    }

                                    setSlotLines(emptySlotLines);

                                    // Carregar dias selecionados salvos ou usar padrão
                                    if (line.selectedDays) {
                                      setSelectedDays(line.selectedDays);
                                    } else {
                                      setSelectedDays(lineDays);
                                    }
                                  } else {
                                    setSlotLines([[]]);
                                    setSelectedDays({
                                      0: new Array(7).fill(false),
                                    });
                                  }
                                }
                              }}
                              title={
                                editingGradeId === line.id
                                  ? "Fechar edição"
                                  : "Editar esta grade"
                              }
                            >
                              {editingGradeId === line.id ? (
                                <>
                                  <X className="w-4 h-4" />
                                  <span className="ml-1">Fechar</span>
                                </>
                              ) : (
                                <>
                                  <SquarePen className="w-4 h-4" />
                                  <span className="ml-1">Editar</span>
                                </>
                              )}
                            </Button>
                            {editingGradeId === line.id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removerLinha(line.id)}
                                className="h-full py-1 border rounded text-red-600 border-red-300"
                                title="Remover esta grade"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remover
                              </Button>
                            ) : (
                              ""
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    )}

                    {/* CardContent com colapso condicional - só mostra quando não está colapsada OU quando está em edição */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden mb-4 ${
                        collapsedGrades[line.id] && editingGradeId !== line.id
                          ? "max-h-0 opacity-0"
                          : "max-h-none opacity-100"
                      }`}
                    >
                      <CardContent>
                        {editingGradeId === line.id ? (
                          <Suspense
                            fallback={
                              <div className="flex items-center justify-center p-8">
                                <div className="flex items-center gap-3">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                  <span className="text-gray-600">
                                    Carregando modo de edição...
                                  </span>
                                </div>
                              </div>
                            }
                          >
                            <GradeCardEditingMode
                              line={line}
                              editingPaymentGradeId={editingPaymentGradeId}
                              editingDayIndex={editingDayIndex}
                              activeLineIndex={activeLineIndex}
                              slotLines={slotLines}
                              selectedDays={selectedDays}
                              weekStartHours={weekStartHours}
                              dayRowCounts={dayRowCounts}
                              slotsByDay={slotsByDay}
                              editingGradeHorario={editingGradeHorario}
                              isDragging={isDragging}
                              dragRowIndex={dragRowIndex}
                              dragStart={dragStart}
                              dragEnd={dragEnd}
                              hasDragged={hasDragged}
                              showPlantaoMenu={showPlantaoMenu}
                              menuPosition={menuPosition}
                              menuClickedHour={menuClickedHour}
                              menuTargetRow={menuTargetRow}
                              medicos={medicos}
                              formasRecebimento={formasRecebimento}
                              tiposVaga={tiposVaga}
                              diasSemana={diasSemana}
                              setEditingPaymentGradeId={
                                setEditingPaymentGradeId
                              }
                              addNewSlotLine={addNewSlotLine}
                              updateGradeConfig={updateGradeConfig}
                              setWeekStartHours={setWeekStartHours}
                              clearWeek={clearWeek}
                              duplicateWeek={duplicateWeek}
                              removeSlotLine={removeSlotLine}
                              updateSlotMedico={updateSlotMedico}
                              addAdditionalHourLine={addAdditionalHourLine}
                              removeSlot={removeSlot}
                              addSlot={addSlot}
                              handleSlotResize={handleSlotResize}
                              setEditingDayIndex={setEditingDayIndex}
                              setActiveLineIndex={setActiveLineIndex}
                              updateDayRowCount={updateDayRowCount}
                              getDayRowCount={getDayRowCount}
                              cleanupEmptyRowsForDay={cleanupEmptyRowsForDay}
                              setIsDragging={setIsDragging}
                              setDragRowIndex={setDragRowIndex}
                              setDragStart={setDragStart}
                              setDragEnd={setDragEnd}
                              setHasDragged={setHasDragged}
                              setShowPlantaoMenu={setShowPlantaoMenu}
                              setMenuPosition={setMenuPosition}
                              setMenuClickedHour={setMenuClickedHour}
                              setMenuTargetRow={setMenuTargetRow}
                              handleDragEnd={handleDragEndSlot}
                              formatHourDisplay={formatHourDisplay}
                              replicateDayToOtherDays={replicateDayToOtherDays}
                            />
                          </Suspense>
                        ) : (
                          /* Visualização da grade salva - Organizada por dias da semana */
                          <div className="space-y-6 mt-6">
                            {(() => {
                              // Verificar se existe qualquer horário definido (estrutura nova ou antiga)
                              const hasSlotsByDay =
                                line.slotsByDay &&
                                Object.values(line.slotsByDay).some(
                                  (daySlots) =>
                                    Object.values(daySlots).some(
                                      (slots) => slots.length > 0
                                    )
                                );
                              return !hasSlotsByDay;
                            })() ? (
                              <div className="text-center py-8 text-gray-500">
                                <p>Nenhum horário definido</p>
                                <p className="text-sm">
                                  Clique em Editar para definir os horários
                                </p>
                              </div>
                            ) : (
                              /* Interface de visualização por dias da semana */
                              <div className="space-y-4">
                                {(() => {
                                  // Se existem slots por dia salvos, use essa estrutura
                                  if (
                                    line.slotsByDay &&
                                    Object.keys(line.slotsByDay).length > 0
                                  ) {
                                    return Object.keys(line.slotsByDay).map(
                                      (key) => {
                                        const lineIndex = parseInt(key);

                                        return (
                                          <div
                                            key={lineIndex}
                                            className="space-y-3"
                                          >
                                            {/* Header da linha */}
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="h-6 px-3 text-sm border rounded flex items-center shrink-0 font-normal"
                                                style={{
                                                  borderColor: line.cor,
                                                  color: line.cor,
                                                }}
                                              >
                                                Semana {lineIndex + 1}
                                              </div>
                                              {getLineName(
                                                line.id,
                                                lineIndex
                                              ) && (
                                                <div
                                                  className="h-6 px-3 text-sm rounded flex items-center font-normal"
                                                  style={{
                                                    backgroundColor:
                                                      line.cor + "15",
                                                    color: line.cor,
                                                  }}
                                                >
                                                  {getLineName(
                                                    line.id,
                                                    lineIndex
                                                  )}
                                                </div>
                                              )}
                                              <div className="flex items-center gap-1 ml-2">
                                                <Label className="text-xs font-thin text-gray-600">
                                                  Início:
                                                </Label>
                                                <div className="text-xs px-2 py-1 bg-gray-100 rounded border text-gray-700">
                                                  {(
                                                    line.weekStartHours?.[
                                                      lineIndex
                                                    ] ||
                                                    line.horarioInicial ||
                                                    7
                                                  )
                                                    .toString()
                                                    .padStart(2, "0")}
                                                  h
                                                </div>
                                              </div>
                                            </div>

                                            {/* Grid dos 7 dias da semana */}
                                            <div className="grid grid-cols-7 gap-2">
                                              {diasSemana.map(
                                                (dia, dayIndex) => {
                                                  // Slots para este dia
                                                  const daySlots =
                                                    line.slotsByDay?.[
                                                      lineIndex
                                                    ]?.[dayIndex] || [];

                                                  return (
                                                    <div
                                                      key={dayIndex}
                                                      className="p-2 rounded-md border-2 transition-all border-solid shadow-sm min-h-[120px] flex flex-col"
                                                      style={{
                                                        borderColor: line.cor,
                                                        backgroundColor:
                                                          line.cor + "08",
                                                      }}
                                                    >
                                                      {/* Nome do dia */}
                                                      <div className="text-center mb-2 flex-shrink-0">
                                                        <h4 className="text-sm font-normal text-gray-800">
                                                          {dia}
                                                        </h4>
                                                      </div>

                                                      {daySlots.length > 0 ? (
                                                        <div className="flex-1 flex flex-col justify-start space-y-1">
                                                          {/* Representação visual dos horários */}
                                                          <div className="space-y-1 overflow-hidden">
                                                            {(() => {
                                                              // Agrupar slots por horário (startHour-endHour)
                                                              const groupedSlots: {
                                                                [
                                                                  key: string
                                                                ]: TimeSlot[];
                                                              } = {};
                                                              daySlots.forEach(
                                                                (slot) => {
                                                                  const key = `${slot.startHour}-${slot.endHour}`;
                                                                  if (
                                                                    !groupedSlots[
                                                                      key
                                                                    ]
                                                                  ) {
                                                                    groupedSlots[
                                                                      key
                                                                    ] = [];
                                                                  }
                                                                  groupedSlots[
                                                                    key
                                                                  ].push(slot);
                                                                }
                                                              );

                                                              // Ordenar por hora de início e renderizar grupos
                                                              return Object.entries(
                                                                groupedSlots
                                                              )
                                                                .sort(
                                                                  (
                                                                    [keyA],
                                                                    [keyB]
                                                                  ) => {
                                                                    const [
                                                                      startA,
                                                                    ] = keyA
                                                                      .split(
                                                                        "-"
                                                                      )
                                                                      .map(
                                                                        Number
                                                                      );
                                                                    const [
                                                                      startB,
                                                                    ] = keyB
                                                                      .split(
                                                                        "-"
                                                                      )
                                                                      .map(
                                                                        Number
                                                                      );
                                                                    return (
                                                                      startA -
                                                                      startB
                                                                    );
                                                                  }
                                                                )
                                                                .map(
                                                                  ([
                                                                    timeKey,
                                                                    slotsGroup,
                                                                  ]) => {
                                                                    const [
                                                                      startHour,
                                                                      endHour,
                                                                    ] = timeKey
                                                                      .split(
                                                                        "-"
                                                                      )
                                                                      .map(
                                                                        Number
                                                                      );
                                                                    const stats =
                                                                      getSlotStats(
                                                                        daySlots,
                                                                        startHour,
                                                                        endHour
                                                                      );
                                                                    // Garantir intensidade baseada na presença de médico
                                                                    const intensidade =
                                                                      stats.fechadas ===
                                                                      0
                                                                        ? 80
                                                                        : 200;

                                                                    return (
                                                                      <TooltipProvider
                                                                        key={
                                                                          timeKey
                                                                        }
                                                                      >
                                                                        <Tooltip>
                                                                          <TooltipTrigger
                                                                            asChild
                                                                          >
                                                                            <div>
                                                                              {/* Barra visual do horário com todas as informações */}
                                                                              <div
                                                                                className="h-5 rounded flex items-center justify-center text-white font-normal text-xs px-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                                style={{
                                                                                  backgroundColor:
                                                                                    line.cor +
                                                                                    intensidade
                                                                                      .toString(
                                                                                        16
                                                                                      )
                                                                                      .padStart(
                                                                                        2,
                                                                                        "0"
                                                                                      ),
                                                                                  border: `1px solid ${line.cor}`,
                                                                                }}
                                                                              >
                                                                                <div className="flex justify-between w-full">
                                                                                  <span className="text-xs font-normal text-gray-700 truncate">
                                                                                    {formatHourDisplay(
                                                                                      startHour
                                                                                    )}

                                                                                    -
                                                                                    {formatHourDisplay(
                                                                                      endHour
                                                                                    )}
                                                                                  </span>
                                                                                  <span className="text-xs font-thin text-gray-700 ml-1">
                                                                                    {`${
                                                                                      stats.fechadas
                                                                                    }/${
                                                                                      stats.abertas +
                                                                                      stats.fechadas
                                                                                    }`}
                                                                                  </span>
                                                                                </div>
                                                                              </div>
                                                                            </div>
                                                                          </TooltipTrigger>
                                                                          <TooltipContent>
                                                                            <div className="space-y-1">
                                                                              <p className="font-normal">
                                                                                {formatHourDisplay(
                                                                                  startHour
                                                                                )}{" "}
                                                                                -{" "}
                                                                                {formatHourDisplay(
                                                                                  endHour
                                                                                )}
                                                                              </p>
                                                                              <div className="text-sm text-muted-foreground">
                                                                                <p>
                                                                                  Total:{" "}
                                                                                  {
                                                                                    stats.total
                                                                                  }{" "}
                                                                                  vagas
                                                                                </p>
                                                                                <p>
                                                                                  Fechadas:{" "}
                                                                                  {
                                                                                    stats.fechadas
                                                                                  }{" "}
                                                                                  •
                                                                                  Abertas:{" "}
                                                                                  {
                                                                                    stats.abertas
                                                                                  }
                                                                                </p>
                                                                                {slotsGroup.filter(
                                                                                  (
                                                                                    s
                                                                                  ) =>
                                                                                    s
                                                                                      .assignedVagas
                                                                                      .length >
                                                                                    0
                                                                                )
                                                                                  .length >
                                                                                  0 && (
                                                                                  <div className="mt-2">
                                                                                    <p className="text-xs font-normal">
                                                                                      Médicos:
                                                                                    </p>
                                                                                    {slotsGroup
                                                                                      .filter(
                                                                                        (
                                                                                          s
                                                                                        ) =>
                                                                                          s
                                                                                            .assignedVagas
                                                                                            .length >
                                                                                          0
                                                                                      )
                                                                                      .map(
                                                                                        (
                                                                                          s
                                                                                        ) =>
                                                                                          s
                                                                                            .assignedVagas[0]
                                                                                            .medicoNome
                                                                                      )
                                                                                      .map(
                                                                                        (
                                                                                          nome,
                                                                                          idx
                                                                                        ) => (
                                                                                          <p
                                                                                            key={
                                                                                              idx
                                                                                            }
                                                                                            className="text-xs"
                                                                                          >
                                                                                            •{" "}
                                                                                            {
                                                                                              nome
                                                                                            }
                                                                                          </p>
                                                                                        )
                                                                                      )}
                                                                                  </div>
                                                                                )}
                                                                              </div>
                                                                            </div>
                                                                          </TooltipContent>
                                                                        </Tooltip>
                                                                      </TooltipProvider>
                                                                    );
                                                                  }
                                                                );
                                                            })()}
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        /* Dia sem horários */
                                                        <div className="text-center py-4">
                                                          <p className="text-xs text-gray-400">
                                                            Sem plantões
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                    );
                                  } else {
                                    // Sem dados de slots por dia, mostrar mensagem
                                    return (
                                      <div className="text-center py-8 text-gray-500">
                                        <p>
                                          Nenhum horário específico definido
                                        </p>
                                        <p className="text-sm">
                                          Edite esta grade para definir horários
                                          por dia
                                        </p>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Modal para gerar vagas - Lazy Loading */}
          {showGenerateModal && (
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-700">Carregando modal...</span>
                    </div>
                  </div>
                </div>
              }
            >
              <GenerateVagasModal
                isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                selectedGrade={selectedGradeForGeneration}
                startDate={generationStartDate}
                endDate={generationEndDate}
                onStartDateChange={setGenerationStartDate}
                onEndDateChange={setGenerationEndDate}
                onGenerate={handleGenerateVagas}
                isLoading={generationLoading}
                getEspecialidadeNome={getEspecialidadeNome}
                getSetorNome={getSetorNome}
              />
            </Suspense>
          )}

          {/* Modal de Edição de Grade */}
          <EditGradeModal
            open={showEditGradeModal}
            onOpenChange={setShowEditGradeModal}
            grade={selectedGradeForEdit}
            onSave={handleGradeUpdate}
          />

          {/* Modal de Confirmação de Deleção de Grade */}
          <Dialog
            open={showDeleteConfirmModal}
            onOpenChange={setShowDeleteConfirmModal}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  Confirmar Exclusão da Grade
                </DialogTitle>
                <DialogDescription>
                  Você está prestes a excluir a grade &quot;
                  {selectedGradeForDeletion?.nome}&quot;.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {deleteConfirmData && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="font-normal text-yellow-800">
                        Vagas Existentes Detectadas
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-yellow-700">
                      <p>
                        Esta grade possui{" "}
                        <strong>{deleteConfirmData.totalVagas}</strong> vaga
                        {deleteConfirmData.totalVagas > 1 ? "s" : ""} já
                        publicada{deleteConfirmData.totalVagas > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-normal text-red-800">
                      Impacto da Exclusão
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-red-700">
                    <p>A grade será permanentemente removida do sistema.</p>
                    <p>
                      As vagas existentes não serão deletadas, mas perderão a
                      referência desta grade.
                    </p>
                    <p className="font-normal">
                      Esta ação não pode ser desfeita!
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={cancelDeleteGrade}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteGrade}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirmar Exclusão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <UnsavedChangesModal
            open={unsavedChangesModalOpen}
            onConfirm={() => {
              // Sair sem salvar - recarregar dados do banco
              if (pendingGradeExit) {
                // Recarregar dados do banco para descartar mudanças locais
                fetchGrades();

                // Reset todos os estados de edição
                setEditingGradeId(null);
                setSlotLines([[]]);
                setSelectedDays({ 0: new Array(7).fill(false) });
                setSlotsByDay({}); // Reset slots por dia
                setWeekStartHours({}); // Reset horários por semana
                setEditingPaymentGradeId(null); // Fechar configuração de pagamentos
                setEditingDayIndex(null); // Reset da visualização de dia

                // Limpar estado de mudanças não salvas
                clearUnsavedChanges(pendingGradeExit);
              }
              setUnsavedChangesModalOpen(false);
              setPendingGradeExit(null);
            }}
            onCancel={() => {
              setUnsavedChangesModalOpen(false);
              setPendingGradeExit(null);
            }}
          />
        </Card>
      </div>
    </TooltipProvider>
  );
}

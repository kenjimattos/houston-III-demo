"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SimpleCalendarToolbar } from "@/components/escala/simple-calendar-toolbar";
import { CustomCalendarWrapper } from "@/components/escala/custom-calendar-wrapper";
import { CreateJobModal } from "@/components/vagas/create-job-modal";
import { JobDetailsModal } from "@/components/vagas/job-details-modal";
import { JobApplicationsModal } from "@/components/vagas/job-applications-modal";
import { DeleteConfirmationModal } from "@/components/vagas/delete-confirmation-modal";
import { CancelConfirmationModal } from "@/components/vagas/cancel-confirmation-modal";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import moment from "moment";
import { EscalaFilters } from "@/components/escala/escala-filters";
// Constantes de visualização do calendário customizado
const VIEWS = {
  MONTH: "month",
  WEEK: "week",
} as const;
import {
  fetchHospitaisDasVagas,
  fetchEspecialidadesDasVagas,
  fetchSetoresDasVagas,
  fetchPeriodosDasVagas,
  fetchVagasCandidaturasParaEscala,
} from "@/services/vagasCandidaturasService";
import { gradesService, type Grade } from "@/services/gradesService";
import { Card, CardContent } from "@/components/ui/card";
import { updateVaga } from "@/services/vagasService";
import { getCurrentUser } from "@/services/authService";

import {
  cancelarCandidaturasDaVaga,
  reativarCandidaturasDaVaga,
} from "@/services/candidaturasService";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { VagasBulkActionsBar } from "@/components/vagas/bulk-actions/VagasBulkActionsBar";
import {
  VagasOperationsProvider,
  useVagasOperationsWithActions,
} from "@/components/vagas/providers/VagasOperationsProvider";
import { useVagasModals } from "@/hooks/vagas/useVagasModals";
import { useVagasActions } from "@/hooks/vagas/useVagasActions";
import { SquarePen, Megaphone, CircleX, Trash2, RotateCcw } from "lucide-react";
import {
  fetchBeneficios,
  fetchEspecialidades,
  fetchFormasRecebimento,
  fetchPeriodos,
  fetchRequisitos,
  fetchSetores,
  fetchTiposVaga,
} from "@/services/parametrosService";
import { fetchGruposComEscalistas } from "@/services/escalistasService";
import { fetchHospitais } from "@/services/hospitaisService";
import { fetchMedicos } from "@/services/medicosService";
//import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Garantir que o moment esteja configurado para português
moment.locale("pt-br");

// Função para obter o horário local do Brasil (UTC-3) no formato ISO para salvar no banco
function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

function EscalaPageContent() {
  const searchParams = useSearchParams();

  // Hooks unificados para operações de seleção e bulk actions
  const {
    selectedVagas,
    toggleVagaSelection,
    toggleAllVagas,
    clearSelection,
    getCommonDataFromSelectedVagas,
  } = useVagasOperationsWithActions({
    vagasData: [], // Será atualizado após computar vagasAgrupadas
    onRefreshData: async () => {
      await handleDataChange();
    },
    onBulkEdit: async () => {
      await handleBulkEdit();
    },
  });

  // Hooks unificados (mesmos da página de vagas)
  const {
    modalsState,
    selectedJob,
    selectedJobForDetails,
    selectedJobForApplications,
    selectedJobForDelete,
    openJobDetailsModal: openJobDetailsModalFromHook,
    openJobApplicationsModal: openJobApplicationsModalFromHook,
    openEditModal: openEditModalFromHook,
    openDeleteModal: openDeleteModalFromHook,
    closeEditModal,
    closeJobDetailsModal,
    closeJobApplicationsModal,
    closeDeleteModal,
    setIsEditModalOpen,
    setJobDetailsModalOpen,
    setJobApplicationsModalOpen,
    setDeleteModalOpen,
    setSelectedJob,
    setSelectedJobForDetails,
    setSelectedJobForApplications,
    setSelectedJobForDelete,
    setEditLoading,
  } = useVagasModals({
    grupos: [], // será definido quando os grupos forem carregados
    onRefreshData: async () => {
      await handleDataChange();
    },
  });

  const {
    handleCancelVaga: handleCancelVagaFromHook,
    handleDeleteVaga: handleDeleteVagaFromHook,
    handleAnnounceVaga: handleAnnounceVagaFromHook,
    handleReactivateVaga: handleReactivateVagaFromHook,
    handleCloseVaga,
  } = useVagasActions({
    onRefreshData: async () => {
      await handleDataChange();
    },
    onClearSelection: clearSelection,
  });

  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedPeriodos, setSelectedPeriodos] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [vagas, setVagas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => {
    // Carregar visão salva do localStorage ou usar mês como padrão
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("escala-view");
      return savedView || VIEWS.MONTH;
    }
    return VIEWS.MONTH;
  });
  const [date, setDate] = useState(new Date());
  const [clickedDay, setClickedDay] = useState<Date | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Estados para o modal de criação de vaga
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(
    undefined
  );
  const [modalInitialStartTime, setModalInitialStartTime] =
    useState<string>("");
  const [modalInitialEndTime, setModalInitialEndTime] = useState<string>("");

  // Estados para modais de ações - REMOVIDOS, agora usamos os hooks unificados
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);

  // Estados para dados pré-carregados do modal
  const [modalDataLoaded, setModalDataLoaded] = useState(false);
  const [modalData, setModalData] = useState<any>({});

  // Estados para seleção em lote - MIGRADO PARA HOOKS UNIFICADOS
  // const [selectedVagas, setSelectedVagas] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Estados para modal de cancelamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Função para converter string de data do banco em Date local (evita problema de timezone)
  function parseLocalDate(dateString: string): Date {
    if (!dateString) return new Date();

    // Se a string já tem horário, usar Date normal
    if (dateString.includes("T") || dateString.includes(" ")) {
      return new Date(dateString);
    }

    // Se é apenas data (YYYY-MM-DD), forçar interpretação como local
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Mês começa em 0
      const day = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    return new Date(dateString);
  }
  const [pendingCancellation, setPendingCancellation] = useState<{
    vagas: any[];
    count: number;
    isSingle: boolean;
    vagaIds?: string[];
  } | null>(null);

  // Estados para destaque de vaga específica
  const [highlightedVaga, setHighlightedVaga] = useState<string | null>(null);

  // Estados para gerenciar candidaturas em edição em massa
  const [, setShowBulkCandidaturaModal] = useState(false);
  const [pendingBulkUpdate, setPendingBulkUpdate] = useState<any>(null);
  const [vagasComCandidaturasAprovadas, setVagasComCandidaturasAprovadas] =
    useState<any[]>([]);
  const [bulkCandidaturaAction, setBulkCandidaturaAction] = useState<
    "PENDENTE" | "REPROVADO" | "EXCLUIR" | null
  >(null);

  // Estados para modal de conflito
  const [, setShowConflictModal] = useState(false);
  const [, setConflictMessage] = useState<string>("");

  // Hook para exportação PDF
  const { exportToPdf } = usePdfExport();
  function getCurrentDateRange(): {
    start_date: string;
    end_date: string;
  } {
    const startOfMonth = moment(date).startOf("month");
    const endOfMonth = moment(date).endOf("month");
    const startOfWeek = moment(startOfMonth).startOf("week");
    const endOfWeek = moment(endOfMonth).endOf("week");

    const days = [];
    const current = moment(startOfWeek);
    while (current.isSameOrBefore(endOfWeek)) {
      days.push({
        date: current.clone().toDate(),
        dayNumber: current.date(),
        isCurrentMonth: current.month() === moment(date).month(),
        isToday: current.isSame(moment(), "day"),
        dateKey: current.format("YYYY-MM-DD"),
      });
      current.add(1, "day");
    }

    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    const range = {
      start_date: firstDay.dateKey,
      end_date: lastDay.dateKey,
    };

    console.log("range--> ", range);
    return range;
  }
  // Capturar parâmetros da URL para destaque e navegação
  useEffect(() => {
    // Tentar pegar parâmetros via Next.js searchParams primeiro
    let dateParam = searchParams.get("date");
    let highlightParam = searchParams.get("highlight");

    // Fallback: pegar diretamente da URL do browser se searchParams não funcionar
    if (!dateParam && typeof window !== "undefined") {
      const urlSearchParams = new URLSearchParams(window.location.search);
      dateParam = urlSearchParams.get("date");
      highlightParam = urlSearchParams.get("highlight");
    }

    if (dateParam) {
      try {
        const urlDate = new Date(dateParam);

        if (!isNaN(urlDate.getTime())) {
          // Calcular o primeiro dia da semana da vaga para melhor direcionamento
          const startOfWeek = moment(urlDate).startOf("week").toDate();

          setDate(startOfWeek);
          setView(VIEWS.WEEK); // Sempre abrir na visão semanal quando vier de notificação
        }
      } catch (error) {
        console.error("Data inválida nos parâmetros da URL:", dateParam, error);
      }
    }

    if (highlightParam) {
      setHighlightedVaga(highlightParam);
      // Remover destaque após 10 segundos (aumentamos o tempo)
      setTimeout(() => {
        setHighlightedVaga(null);
      }, 10000);
    }
  }, [searchParams]);

  // Salvar visão selecionada no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("escala-view", view);
    }
  }, [view]);

  // Carregar filtros dinâmicos
  useEffect(() => {
    async function loadFilters() {
      try {
        const hospitalsData = await fetchHospitaisDasVagas();
        setHospitals(
          hospitalsData.sort((a, b) =>
            a.hospital_nome.localeCompare(b.hospital_nome)
          )
        );
        const specialtiesData = await fetchEspecialidadesDasVagas();
        setSpecialties(
          specialtiesData.sort((a, b) =>
            a.especialidade_nome.localeCompare(b.especialidade_nome)
          )
        );
        const sectorsData = await fetchSetoresDasVagas();
        setSectors(
          sectorsData.sort((a, b) => a.setor_nome.localeCompare(b.setor_nome))
        );
        const periodosData = await fetchPeriodosDasVagas();
        setPeriodos(
          periodosData.sort((a, b) =>
            a.periodo_nome.localeCompare(b.periodo_nome)
          )
        );

        // Carregar grades
        const gradesData = await gradesService.fetchGrades();
        // Usar ordenação que já vem do banco (hospital_id → ordem → created_at)
        setGrades(gradesData);
      } catch (error) {
        toast({
          title: "Erro ao carregar filtros",
          description: String(error),
          variant: "destructive",
        });
      }
    }
    loadFilters();
  }, []);

  // Pré-carregar dados do modal para melhor performance
  useEffect(() => {
    async function preloadModalData() {
      try {
        const [
          setoresData,
          especialidadesData,
          formasRecebimentoData,
          tiposVagaData,
          beneficiosData,
          requisitosData,
          periodosData,
          hospitaisData,
          medicosData,
          gruposData,
          gradesData,
        ] = await Promise.all([
          fetchSetores(),
          fetchEspecialidades(),
          fetchFormasRecebimento(),
          fetchTiposVaga(),
          fetchBeneficios(),
          fetchRequisitos(),
          fetchPeriodos(),
          fetchHospitais(),
          fetchMedicos(),
          fetchGruposComEscalistas(),
          gradesService.fetchGrades(),
        ]);

        setModalData({
          setores: setoresData,
          especialidades: especialidadesData,
          formasRecebimento: formasRecebimentoData,
          tiposVaga: tiposVagaData,
          beneficios: beneficiosData,
          requisitos: requisitosData,
          periodos: periodosData,
          hospitais: hospitaisData,
          medicos: medicosData,
          grupos: gruposData,
          grades: gradesData,
        });
        setGrupos(gruposData);
        setModalDataLoaded(true);
      } catch (error) {
        console.error("Erro ao pré-carregar dados do modal:", error);
      }
    }
    preloadModalData();
  }, []);

  // Função para carregar vagas baseada na visualização atual
  const loadVagas = async (
    _dataAtual: Date,
    _visualizacaoAtual: string,
    {
      start_date,
      end_date,
    }: {
      start_date: string;
      end_date: string;
    }
  ) => {
    setLoading(true);
    try {
      // Calcular range baseado na visualização atual

      const data = await fetchVagasCandidaturasParaEscala({
        data_inicio: start_date,
        data_fim: end_date,
      });
      setVagas(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar escala",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar vagas quando data ou view mudarem (consolidando todos os carregamentos)
  useEffect(() => {
    // Aguardar um tick para garantir que todos os states foram atualizados
    const timer = setTimeout(() => {
      var currentDateRange = getCurrentDateRange();
      loadVagas(date, view, currentDateRange);
    }, 0);

    return () => clearTimeout(timer);
  }, [date, view]);

  // Mapear vagas - os dados já vêm agrupados do service (groupCandidaturasByVaga)
  // então cada vaga já tem seu array de candidaturas preenchido
  const vagasAgrupadas = vagas.map((vaga) => ({
    ...vaga,
    // Usar candidaturas do service (já vem preenchido pelo groupCandidaturasByVaga)
    // e mapear para o formato esperado pelo resto do código
    candidaturas: (vaga.candidaturas || []).map((c: any) => ({
      candidatura_id: c.candidatura_id,
      candidatura_status: c.candidatura_status,
      medico_id: c.candidatura_medico_id || c.medico_id || null,
      medico_primeironome: c.medico_primeiro_nome || c.medico_nome?.split(' ')[0] || "",
      medico_sobrenome: c.medico_sobrenome || c.medico_nome?.split(' ').slice(1).join(' ') || "",
      medico_telefone: c.medico_telefone || c.medico_celular || "",
      medico_crm: c.medico_crm || "",
      medico_email: c.medico_email || "",
    })),
    candidatos: (vaga.candidaturas || []).length,
  }));

  // Criar mapeamento de candidaturas por vaga (usando dados já agrupados)
  const vagaCandidaturas = vagasAgrupadas.reduce((acc, vaga) => {
    acc[vaga.vaga_id] = vaga.candidaturas || [];
    return acc;
  }, {} as Record<string, any[]>);

  // Converter vagas agrupadas em eventos para o calendário
  const events = vagasAgrupadas.map((vaga) => {
    // Ajuste para garantir que a data seja interpretada no fuso local
    const [year, month, day] = vaga.vaga_data.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    if (vaga.vaga_horainicio) {
      const [h, m, s] = vaga.vaga_horainicio.split(":").map(Number);
      start.setHours(h, m, s || 0, 0);
    }
    const end = new Date(year, month - 1, day);
    if (vaga.vaga_horafim) {
      const [h, m, s] = vaga.vaga_horafim.split(":").map(Number);
      end.setHours(h, m, s || 0, 0);
    }

    // Buscar médico da candidatura aprovada (quando há múltiplas candidaturas,
    // o medico_nome no nível raiz pode não ser o correto)
    let doctorName: string | undefined = undefined;
    if (vaga.candidaturas && vaga.candidaturas.length > 0) {
      const candidaturaAprovada = vaga.candidaturas.find(
        (c: any) => c.candidatura_status === "APROVADO"
      );
      if (candidaturaAprovada) {
        const nome = `${candidaturaAprovada.medico_primeironome || ""} ${candidaturaAprovada.medico_sobrenome || ""}`.trim();
        doctorName = nome || undefined;
      }
    }
    // Fallback para medico_nome do nível raiz se não encontrou no array
    if (!doctorName && vaga.medico_nome) {
      doctorName = vaga.medico_nome;
    }

    return {
      id: vaga.vaga_id,
      title: vaga.hospital_nome + " - " + vaga.especialidade_nome,
      start,
      end,
      hospital: vaga.hospital_id,
      specialty: vaga.especialidade_id,
      sector: vaga.setor_id,
      status: vaga.vaga_status,
      doctor: doctorName,
      candidates: vaga.candidatos || 0,
      value: vaga.vaga_valor || 0,
      allDay: false,
      resource: vaga,
    };
  });

  // Aplicar filtros locais (igual à página de vagas)
  const filteredEvents = events.filter((event) => {
    if (
      selectedHospitals.length > 0 &&
      !selectedHospitals.includes(event.hospital)
    )
      return false;
    if (
      selectedSpecialties.length > 0 &&
      !selectedSpecialties.includes(event.specialty)
    )
      return false;
    if (selectedSectors.length > 0 && !selectedSectors.includes(event.sector))
      return false;
    if (
      selectedPeriodos.length > 0 &&
      !selectedPeriodos.includes(event.resource.periodo_id)
    )
      return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(event.status))
      return false;
    if (selectedGrades.length > 0) {
      // Filtro por grade - verificar se a vaga tem grade_id selecionada ou se "sem grade" foi selecionada
      const hasGradeId = event.resource?.grade_id;
      const semGradeSelecionada = selectedGrades.includes("sem-grade");
      const gradeCorresponde =
        hasGradeId && selectedGrades.includes(hasGradeId);

      if (!gradeCorresponde && !(semGradeSelecionada && !hasGradeId)) {
        return false;
      }
    }

    // Filtro de médicos: só aplicar para vagas fechadas e anunciadas que têm médico aprovado
    if (selectedDoctors.length > 0) {
      if (event.status === "fechada" || event.status === "anunciada") {
        // Para vagas fechadas/anunciadas, verificar se o médico está na seleção
        const vagaOriginal = vagas.find(
          (v) => v.vaga_id === event.id && v.candidatura_status === "APROVADO"
        );
        if (
          !vagaOriginal ||
          !vagaOriginal.medico_id ||
          !selectedDoctors.includes(vagaOriginal.medico_id)
        ) {
          return false;
        }
      } else {
        // Para vagas abertas/canceladas, não mostrar quando há filtro de médicos
        return false;
      }
    }

    return true;
  });

  // Funções intermediárias para tipos corretos da toolbar
  const handleNavigate = (d: Date) => {
    setDate(d);
    // O useEffect consolidado vai recarregar as vagas automaticamente
  };

  const handleViewChange = (v: string) => {
    const newView = v as typeof view;
    setView(newView);
    // Salvar a nova visão no localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("escala-view", newView);
    }
    // O useEffect consolidado vai recarregar as vagas automaticamente
  };

  // Função para lidar com clique no dia (navegar para visão semanal)
  const handleDayClick = (clickedDate: Date) => {
    setClickedDay(clickedDate);
    setDate(clickedDate);
    setView(VIEWS.WEEK);

    // Salvar a nova visão no localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("escala-view", VIEWS.WEEK);
    }

    // O useEffect consolidado vai recarregar as vagas automaticamente

    // Limpar o dia clicado após um tempo para remover o destaque
    setTimeout(() => {
      setClickedDay(null);
    }, 1000);
  };

  // Função para recarregar dados após ações de candidatura
  const handleDataChange = async () => {
    // Pequeno delay para garantir que o banco seja atualizado
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Recarregar vagas com a visualização atual
    var currentDateRange = getCurrentDateRange();
    await loadVagas(date, view, currentDateRange);

    // Pequeno delay adicional para garantir que a UI se atualize
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  // Função para abrir modal via botão "Nova Vaga"
  const handleCreateVaga = () => {
    setModalInitialDate(new Date());
    setModalInitialStartTime("07:00");
    setModalInitialEndTime("19:00");
    setIsCreateModalOpen(true);
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setSelectedHospitals([]);
    setSelectedSpecialties([]);
    setSelectedSectors([]);
    setSelectedPeriodos([]);
    setSelectedStatuses([]);
    setSelectedDoctors([]);
    setSelectedGrades([]);
  };

  // Função removida - substituída por chamada direta ao hook

  // Função híbrida para cancelar/reativar vaga unitária
  const handleCancelVaga = async (vagaId: string) => {
    const vaga = vagasAgrupadas.find((v) => v.vaga_id === vagaId);
    if (!vaga) return;

    const isCancelando =
      vaga.vaga_status === "aberta" ||
      vaga.vaga_status === "fechada" ||
      vaga.vaga_status === "anunciada";

    if (isCancelando) {
      // Usar modal para cancelamento
      const approvedCount =
        vaga.candidaturas?.filter(
          (c: any) => c.candidatura_status === "APROVADO"
        ).length || 0;
      setPendingCancellation({
        vagas: approvedCount > 0 ? [vaga] : [],
        count: 1,
        isSingle: true,
        vagaIds: [vagaId],
      });
      setCancelModalOpen(true);
      return;
    }

    // Reativar usando hook unificado
    try {
      await handleReactivateVagaFromHook(vagaId, vagasAgrupadas);
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  // Função simplificada usando hook unificado
  const handleAnnounceVaga = async (vagaId: string) => {
    try {
      await handleAnnounceVagaFromHook(vagaId, vagasAgrupadas);
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  // Função simplificada usando hook unificado
  const handleCloseVagaLocal = async (vagaId: string) => {
    try {
      await handleCloseVaga(vagaId, vagasAgrupadas);
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  // Função para abrir modal de confirmação de exclusão - SUBSTITUÍDA PELOS HOOKS
  const openDeleteModal = (vagaId: string) => {
    openDeleteModalFromHook(vagaId, vagasAgrupadas);
  };

  // Função removida - substituída por chamada direta ao hook

  // Funções para seleção em lote - MIGRADO PARA HOOKS UNIFICADOS
  const handleVagaSelection = (vagaId: string, isSelected: boolean) => {
    toggleVagaSelection(vagaId);
    // Gerenciar showBulkActions localmente até migração completa
    if (isSelected) {
      if (selectedVagas.length === 0) {
        setShowBulkActions(true);
      }
    } else {
      if (selectedVagas.length <= 1) {
        setShowBulkActions(false);
      }
    }
  };

  const handleSelectAllVisible = () => {
    let eventsToConsider = filteredEvents;

    // Se estiver na visualização semanal, filtrar apenas eventos da semana atual
    if (view === VIEWS.WEEK) {
      const startOfWeek = moment(date).startOf("week");
      const endOfWeek = moment(date).endOf("week");

      eventsToConsider = filteredEvents.filter((event) => {
        const eventDate = moment(event.start);
        return eventDate.isBetween(startOfWeek, endOfWeek, "day", "[]");
      });
    }

    const visibleVagaIds = eventsToConsider
      .filter(
        (event) =>
          event.status === "aberta" ||
          event.status === "fechada" ||
          event.status === "anunciada" ||
          event.status === "cancelada"
      )
      .map((event) => event.id);

    // MIGRADO PARA HOOKS: usar toggleAllVagas com lista de IDs
    toggleAllVagas(visibleVagaIds);
    setShowBulkActions(visibleVagaIds.length > 0);
  };

  const handleClearSelection = () => {
    clearSelection();
    setShowBulkActions(false);
  };

  // Ações em lote
  const handleBulkAnnounce = async () => {
    if (selectedVagas.length === 0) return;

    setEditLoading(true);
    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      // Processar vagas em paralelo
      await Promise.all(
        selectedVagas.map(async (vagaId) => {
          const vaga = vagasAgrupadas.find((v) => v.vaga_id === vagaId);
          if (vaga && vaga.vaga_status === "fechada") {
            await updateVaga({
              vaga_id: vagaId,
              vagaUpdate: {
                status: "anunciada",
                updated_at: now,
                updated_by: user.id,
              },
              selectedBeneficios: vaga.beneficios || [],
            });
          }
        })
      );

      await handleDataChange();
      handleClearSelection();

      toast({
        title: "Sucesso",
        description: `${selectedVagas.length} vaga(s) anunciada(s) com sucesso.`,
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: `Erro ao anunciar vagas: ${
          err instanceof Error ? err.message : String(err)
        }`,
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedVagas.length === 0) return;

    // Verificar se existem vagas com candidaturas aprovadas
    const vagasComAprovados = [];
    for (const vagaId of selectedVagas) {
      const vaga = vagasAgrupadas.find((v) => v.vaga_id === vagaId);
      if (
        vaga &&
        vaga.candidaturas?.some((c: any) => c.candidatura_status === "APROVADO")
      ) {
        vagasComAprovados.push(vaga);
      }
    }

    // Sempre mostrar modal de confirmação
    setPendingCancellation({
      vagas: vagasComAprovados,
      count: selectedVagas.length,
      isSingle: false,
    });
    setCancelModalOpen(true);
  };

  // Função para processar ação sobre candidaturas em massa
  const handleBulkCandidaturaAction = async (
    action?: "PENDENTE" | "REPROVADO" | "EXCLUIR"
  ) => {
    const actionToUse = action || bulkCandidaturaAction;
    if (!pendingBulkUpdate || !actionToUse) return;

    try {
      const { reprovarCandidatura, reconsiderarCandidatura } = await import(
        "@/services/candidaturasService"
      );
      const { supabase } = await import("@/services/supabaseClient");

      // Processar candidaturas antigas baseado na ação escolhida
      for (const vaga of vagasComCandidaturasAprovadas) {
        const candidaturasAprovadas =
          vaga.candidaturas?.filter(
            (c: any) => c.candidatura_status === "APROVADO"
          ) || [];

        for (const candidatura of candidaturasAprovadas) {
          if (actionToUse === "REPROVADO") {
            await reprovarCandidatura({
              candidatura_id: candidatura.candidatura_id,
            });
          } else if (actionToUse === "PENDENTE") {
            await reconsiderarCandidatura({
              candidatura_id: candidatura.candidatura_id,
            });
          } else if (actionToUse === "EXCLUIR") {
            // Excluir a candidatura permanentemente
            const { error } = await supabase
              .from("candidaturas")
              .delete()
              .eq("id", candidatura.candidatura_id);

            if (error) {
              console.error("Erro ao excluir candidatura:", error);
            }
          }
        }
      }

      // Continuar com a atualização em massa
      setShowBulkCandidaturaModal(false);
      setBulkCandidaturaAction(null);
      setVagasComCandidaturasAprovadas([]);
      await executeBulkUpdate(pendingBulkUpdate);
      setPendingBulkUpdate(null);
    } catch (error) {
      console.error("Erro ao processar candidaturas:", error);
      toast({
        title: "Erro ao processar candidaturas",
        description: "Não foi possível processar as candidaturas antigas.",
        variant: "destructive",
      });
    }
  };

  // Função para aplicar edições em lote
  const handleBulkUpdate = async ({
    vagaUpdate,
    selectedBeneficios,
    selectedRequisitos,
    medicoDesignado,
    prazoPagamento,
    dataFechamento,
  }: {
    vagaUpdate: any;
    selectedBeneficios: string[];
    selectedRequisitos: string[];
    medicoDesignado?: string;
    prazoPagamento?: string;
    dataFechamento?: Date;
  }) => {
    // Se há médico designado, primeiro verificar conflitos para TODAS as vagas
    if (medicoDesignado) {
      // Mostrar loading enquanto verifica conflitos
      setEditLoading(true);

      const vagasComConflito = [];
      const vagasComAprovadas = [];

      // Primeiro passar: verificar conflitos de horário
      for (const vagaId of selectedVagas) {
        const vaga = vagasAgrupadas.find((v: any) => v.vaga_id === vagaId);
        if (!vaga) continue;

        // Verificar conflito de horário
        try {
          const { verificarConflitoHorario } = await import(
            "@/services/vagasService"
          );
          await verificarConflitoHorario({
            medico_id: medicoDesignado,
            data: vaga.vaga_data,
            hora_inicio: vaga.vaga_horainicio,
            hora_fim: vaga.vaga_horafim,
          });
        } catch (error: any) {
          // Se houver conflito, adicionar à lista
          vagasComConflito.push({
            vaga,
            erro: error.message || "médico já possui plantão conflitante",
          });
        }

        // Verificar se tem candidaturas aprovadas
        if (
          vaga?.candidaturas?.some(
            (c: any) => c.candidatura_status === "APROVADO"
          )
        ) {
          vagasComAprovadas.push(vaga);
        }
      }

      // Se houver conflitos, mostrar modal e cancelar operação
      if (vagasComConflito.length > 0) {
        setEditLoading(false);

        // Preparar mensagem de conflito
        let mensagem = "";
        if (vagasComConflito.length === 1) {
          const conflito = vagasComConflito[0];
          mensagem = `O médico já possui um plantão conflitante no dia ${new Date(
            conflito.vaga.vaga_data
          ).toLocaleDateString("pt-BR")} das ${
            conflito.vaga.vaga_horainicio
          } às ${conflito.vaga.vaga_horafim} no ${
            conflito.vaga.hospital_nome
          }.`;
        } else {
          mensagem = `O médico já possui ${
            vagasComConflito.length
          } plantões conflitantes. O primeiro conflito é no dia ${new Date(
            vagasComConflito[0].vaga.vaga_data
          ).toLocaleDateString("pt-BR")} no ${
            vagasComConflito[0].vaga.hospital_nome
          }.`;
        }

        // Mostrar modal de conflito (mantendo modal de edição aberto)
        setConflictMessage(mensagem);
        setShowConflictModal(true);

        return; // Cancelar toda a operação
      }

      setEditLoading(false);

      // Se não há conflitos mas há candidaturas aprovadas, mostrar modal
      if (vagasComAprovadas.length > 0) {
        // Salvar dados para usar após confirmação
        setPendingBulkUpdate({
          vagaUpdate,
          selectedBeneficios,
          selectedRequisitos,
          medicoDesignado,
          prazoPagamento,
          dataFechamento,
        });
        setVagasComCandidaturasAprovadas(vagasComAprovadas);
        setShowBulkCandidaturaModal(true);
        return; // Esperar confirmação do usuário
      }
    }

    // Se não há candidaturas aprovadas ou não há médico designado, executar direto
    await executeBulkUpdate({
      vagaUpdate,
      selectedBeneficios,
      selectedRequisitos,
      medicoDesignado,
      prazoPagamento,
      dataFechamento,
    });
  };

  // Função auxiliar para executar a atualização em massa
  const executeBulkUpdate = async ({
    vagaUpdate,
    selectedBeneficios,
    selectedRequisitos,
    medicoDesignado,
    prazoPagamento,
    dataFechamento,
  }: any) => {
    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      // Aplicar atualizações para todas as vagas selecionadas
      for (const vagaId of selectedVagas) {
        const vagaAtual: any = vagasAgrupadas.find(
          (v: any) => v.vaga_id === vagaId
        );
        if (!vagaAtual) continue;

        let finalVagaUpdate = {
          ...vagaUpdate,
          updated_at: now,
          updated_by: user.id,
        };

        // Calcular data de pagamento individual para cada vaga se especificado
        if (
          prazoPagamento &&
          prazoPagamento !== "data_fechamento" &&
          prazoPagamento !== ""
        ) {
          if (vagaAtual?.vaga_data) {
            const dataVaga = new Date(vagaAtual.vaga_data);
            let dataPagamentoCalculada: Date;

            if (prazoPagamento === "vista") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 1
              );
            } else if (prazoPagamento === "30dias") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 30
              );
            } else if (prazoPagamento === "45dias") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 45
              );
            } else if (prazoPagamento === "60dias") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 60
              );
            } else {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 30
              ); // default
            }

            finalVagaUpdate.vaga_datapagamento = dataPagamentoCalculada
              .toISOString()
              .slice(0, 10);
          }
        } else if (prazoPagamento === "data_fechamento" && dataFechamento) {
          // Para data de fechamento, usar a data especificada para todas as vagas
          finalVagaUpdate.vaga_datapagamento = dataFechamento
            .toISOString()
            .slice(0, 10);
        }

        await updateVaga({
          vaga_id: vagaId,
          vagaUpdate: finalVagaUpdate,
          selectedBeneficios,
          selectedRequisitos,
        });

        // Se há médico designado e passou na verificação de conflito, atualizar status e criar candidatura
        if (medicoDesignado) {
          await updateVaga({
            vaga_id: vagaId,
            vagaUpdate: {
              status: "fechada",
              updated_at: now,
              updated_by: user.id,
            },
            selectedBeneficios: [],
          });

          // Criar candidatura aprovada
          try {
            const { createCandidatura, aprovarCandidatura } = await import(
              "@/services/candidaturasService"
            );

            const vagaValor = vagaAtual?.vaga_valor || 0;

            const novaCandidatura = await createCandidatura({
              vaga_id: vagaId,
              medico_id: medicoDesignado,
              vaga_valor: vagaValor,
            });

            // Corrigir: createCandidatura retorna um objeto, não apenas o ID
            if (novaCandidatura?.candidatura_id) {
              await aprovarCandidatura({
                candidatura_id: novaCandidatura.candidatura_id,
                vaga_id: vagaId,
              });
            }
          } catch (err: any) {
            // Verificar se é erro de conflito de horário do trigger
            const errorMessage =
              err?.message ||
              err?.details ||
              err?.hint ||
              err?.toString() ||
              "";
            const isConflictError =
              errorMessage.toUpperCase().includes("CONFLITO_HORARIO") ||
              errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO");

            if (isConflictError) {
              // Reverter status da vaga para aberta já que não conseguiu criar candidatura
              await updateVaga({
                vaga_id: vagaId,
                vagaUpdate: {
                  status: "aberta",
                  updated_at: now,
                  updated_by: user.id,
                },
                selectedBeneficios: [],
              });
              const conflictMatch = errorMessage.match(
                /Plantão já aprovado: ([^|]+)/
              );
              const conflictInfo = conflictMatch
                ? conflictMatch[1]
                : "horário conflitante";
              toast({
                title: "Conflito de Horário (Trigger)",
                description: `Não foi possível designar o médico para a vaga. O médico já possui ${conflictInfo}.`,
                variant: "destructive",
              });
            } else {
              throw err; // Re-throw se não for conflito
            }
          }
        }
      }

      // Recarregar dados
      await handleDataChange();

      // Fechar modal mas manter seleção
      closeEditModal();

      toast({
        title: "Edição em lote concluída!",
        description: `${selectedVagas.length} vaga${
          selectedVagas.length !== 1 ? "s foram" : " foi"
        } atualizada${selectedVagas.length !== 1 ? "s" : ""} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro na edição em lote:", error);
      toast({
        title: "Erro na edição em lote",
        description:
          "Ocorreu um erro ao aplicar as alterações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleBulkEdit = async () => {
    if (selectedVagas.length === 0) return;

    // Obter dados comuns entre as vagas selecionadas - MIGRADO PARA HOOKS
    const commonData = await getCommonDataFromSelectedVagas(
      selectedVagas,
      async (vagaIds) => {
        // Para escala, usamos os dados já carregados ao invés de buscar novos
        return vagasAgrupadas.filter((vaga) => vagaIds.includes(vaga.vaga_id));
      }
    );

    // Criar um objeto especial para edição em lote com dados comuns
    const bulkEditData = {
      ...commonData,
      isBulkEdit: true,
      selectedVagasIds: selectedVagas,
      bulkEditCount: selectedVagas.length,
    };
    // Usar setters diretos dos hooks para compatibilidade
    // setSelectedJob e setIsEditModalOpen já vem dos hooks unificados
    setSelectedJob(bulkEditData);
    setIsEditModalOpen(true);
  };

  // Função para exportar calendário em PDF
  const handleExportPdf = async () => {
    const appliedFilters = {
      hospitals: selectedHospitals,
      specialties: selectedSpecialties,
      sectors: selectedSectors,
      periods: selectedPeriodos,
      statuses: selectedStatuses,
      doctors: selectedDoctors,
      grades: selectedGrades,
    };

    // Mapear IDs selecionados para nomes reais
    const filterNames = {
      hospitalNames: selectedHospitals
        .map((id) => hospitals.find((h) => h.hospital_id === id)?.hospital_nome)
        .filter(Boolean),

      specialtyNames: selectedSpecialties
        .map(
          (id) =>
            specialties.find((s) => s.especialidade_id === id)
              ?.especialidade_nome
        )
        .filter(Boolean),

      sectorNames: selectedSectors
        .map((id) => sectors.find((s) => s.setor_id === id)?.setor_nome)
        .filter(Boolean),

      periodNames: selectedPeriodos
        .map(
          (id) => periodos.find((p) => p.periodo_id === id)?.periodo_nome
        )
        .filter(Boolean),

      statusNames: selectedStatuses.map((status) => {
        switch (status) {
          case "aberta":
            return "Aberta";
          case "fechada":
            return "Fechada";
          case "cancelada":
            return "Cancelada";
          case "anunciada":
            return "Anunciada";
          default:
            return status;
        }
      }),

      doctorNames: selectedDoctors, // Assumindo que já são nomes, não IDs

      gradeNames: selectedGrades
        .map((id) => {
          if (id === "sem-grade") return "Sem Grade";
          const grade = grades.find((g) => g.id === id);
          return grade ? grade.nome : id;
        })
        .filter(Boolean),
    };

    // Coletar dados dos médicos que aparecem na escala
    const medicosNaEscala = new Map<string, any>();

    // Preparar dados das vagas para o PDF
    const vagasData = filteredEvents.map((event) => {
      const vaga = event.resource;
      let medico_nome = "";
      let medico_crm = "";
      let medico_telefone = "";
      let candidaturas_pendentes = 0;

      // Buscar dados do médico aprovado
      if (vagaCandidaturas[event.id]) {
        const candidaturas = vagaCandidaturas[event.id];
        const candidaturaAprovada = candidaturas.find(
          (c: any) => c.candidatura_status === "APROVADO"
        );

        if (candidaturaAprovada) {
          medico_nome = `${candidaturaAprovada.medico_primeironome || ""} ${
            candidaturaAprovada.medico_sobrenome || ""
          }`.trim();
          medico_crm = candidaturaAprovada.medico_crm || "";
          medico_telefone = candidaturaAprovada.medico_telefone || "";

          // Adicionar médico à lista para a segunda página
          if (medico_nome && candidaturaAprovada.medico_id) {
            medicosNaEscala.set(candidaturaAprovada.medico_id, {
              id: candidaturaAprovada.medico_id,
              nome: medico_nome,
              telefone: medico_telefone,
              crm: medico_crm,
              email: candidaturaAprovada.medico_email || "",
            });
          }
        }

        // Contar candidaturas pendentes
        candidaturas_pendentes = candidaturas.filter(
          (c: any) => c.candidatura_status === "PENDENTE"
        ).length;
      }

      return {
        id: event.id,
        hospital_nome: vaga?.hospital_nome || event.hospital,
        especialidade_nome: vaga?.especialidade_nome || event.specialty,
        setor_nome: vaga?.setor_nome || event.sector,
        vaga_data: vaga?.vaga_data || event.start.toISOString().split("T")[0],
        vagas_horainicio:
          vaga?.vaga_horainicio || event.start.toTimeString().slice(0, 8),
        vagas_horafim:
          vaga?.vaga_horafim || event.end.toTimeString().slice(0, 8),
        vaga_status: event.status as
          | "aberta"
          | "fechada"
          | "cancelada"
          | "anunciada",
        vaga_valor: vaga?.vaga_valor || event.value,
        medico_nome,
        medico_crm,
        medico_telefone,
        candidaturas_pendentes,
        grade_cor: grades.find((g) => g.id === vaga?.grade_id)?.cor,
      };
    });

    // Converter Map para Array
    const doctorsData = Array.from(medicosNaEscala.values()).filter(
      (medico) => medico.nome && medico.nome !== ""
    );

    await exportToPdf("calendar-export-container", {
      date,
      view: view as "month" | "week",
      appliedFilters,
      filterNames,
      doctorsData,
      vagasData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar customizada do calendário */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-normal tracking-tight">Escala</h1>
        </div>
        <div className="flex-wrap items-center justify-between gap-2 p-4">
          <SimpleCalendarToolbar
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onViewChange={handleViewChange}
          />
        </div>

        {/* MARK: Seção de Filtros */}
        <div className="border-t p-4">
          <EscalaFilters
            hospitals={hospitals.map((h) => ({
              value: h.hospital_id,
              label: h.hospital_nome,
            }))}
            specialties={specialties.map((s) => ({
              value: s.especialidade_id,
              label: s.especialidade_nome,
            }))}
            sectors={sectors.map((s) => ({
              value: s.setor_id,
              label: s.setor_nome,
            }))}
            periods={periodos.map((p) => ({
              value: p.periodo_id,
              label: p.periodo_nome,
            }))}
            grades={(() => {
              // Filtrar grades baseado nos hospitais selecionados
              const filteredGrades = selectedHospitals.length > 0
                ? grades.filter((g) => selectedHospitals.includes(g.hospital_id))
                : grades;

              return [
                { value: "sem-grade", label: "Sem Grade" },
                ...filteredGrades.map((g) => ({
                  value: g.id,
                  label: g.nome,
                  color: g.cor,
                })),
              ];
            })()}
            doctors={[]}
            selectedHospitals={selectedHospitals}
            selectedSpecialties={selectedSpecialties}
            selectedSectors={selectedSectors}
            selectedPeriods={selectedPeriodos}
            selectedStatuses={selectedStatuses}
            selectedDoctors={selectedDoctors}
            selectedGrades={selectedGrades}
            isExpanded={isFiltersExpanded}
            onToggleExpanded={() => setIsFiltersExpanded(!isFiltersExpanded)}
            onHospitalsChange={(hospitalIds) => {
              setSelectedHospitals(hospitalIds);

              // Limpar grades selecionadas que não pertencem aos hospitais selecionados
              if (selectedGrades.length > 0 && hospitalIds.length > 0) {
                const validGrades = selectedGrades.filter((gradeId) => {
                  if (gradeId === "sem-grade") return true;
                  const grade = grades.find((g) => g.id === gradeId);
                  return grade && hospitalIds.includes(grade.hospital_id);
                });

                if (validGrades.length !== selectedGrades.length) {
                  setSelectedGrades(validGrades);
                }
              }
            }}
            onSpecialtiesChange={setSelectedSpecialties}
            onSectorsChange={setSelectedSectors}
            onPeriodsChange={setSelectedPeriodos}
            onStatusesChange={setSelectedStatuses}
            onDoctorsChange={setSelectedDoctors}
            onGradesChange={setSelectedGrades}
            onClearFilters={clearFilters}
            onCreateNew={handleCreateVaga}
            onExportPdf={handleExportPdf}
          />
        </div>

        {/* Barra de ações em lote */}
        {showBulkActions && view === VIEWS.WEEK && (
          <div className="border-t">
            <div className="p-4 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllVisible}
                className="text-primary-700 border-primary-200 hover:bg-primary-100 hover:text-primary-700"
              >
                Selecionar todas visíveis
              </Button>
            </div>
            <VagasBulkActionsBar
              vagasData={vagasAgrupadas}
              onRefreshData={async () => {
                await handleDataChange();
              }}
              onBulkEdit={async () => await handleBulkEdit()}
            />
          </div>
        )}
        {/* // MARK: Container do calendário */}
        <CardContent
          className="p-4 overflow-visible"
          style={{ height: "auto", maxHeight: "none" }}
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div
              style={{ height: "auto", maxHeight: "none", overflow: "visible" }}
            >
              {/* MARK: Calendarios */}
              <CustomCalendarWrapper
                events={filteredEvents}
                view={view}
                date={date}
                vagaCandidaturas={vagaCandidaturas}
                grades={grades}
                onViewDetails={(vagaId: string) => {
                  console.log("🔍 onViewDetails chamado com vagaId:", vagaId);
                  const vaga = vagasAgrupadas.find((v) => v.vaga_id === vagaId);
                  console.log("🔍 vaga encontrada:", vaga);
                  if (vaga) {
                    console.log("🔍 chamando openJobDetailsModalFromHook");
                    openJobDetailsModalFromHook(vaga);
                  }
                }}
                onViewApplications={(vagaId: string) =>
                  openJobApplicationsModalFromHook(vagaId, vagasAgrupadas)
                }
                onEditVaga={(vagaId: string) => {
                  console.log("✏️ onEditVaga chamado com vagaId:", vagaId);
                  console.log(
                    "✏️ vagasAgrupadas:",
                    vagasAgrupadas.length,
                    "vagas"
                  );
                  openEditModalFromHook(vagaId, vagasAgrupadas);
                }}
                onCancelVaga={handleCancelVaga}
                onAnnounceVaga={handleAnnounceVaga}
                onCloseVaga={handleCloseVagaLocal}
                onDeleteVaga={openDeleteModal}
                onDayClick={handleDayClick}
                clickedDay={clickedDay}
                selectedVagas={selectedVagas}
                onVagaSelection={handleVagaSelection}
                showBulkActions={showBulkActions}
                highlightedVaga={highlightedVaga}
                vagasData={vagasAgrupadas}
                onRefreshData={handleDataChange}
                className="custom-calendar-export-target"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de criação de vaga */}
      <CreateJobModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        initialDate={modalInitialDate}
        initialStartTime={modalInitialStartTime}
        initialEndTime={modalInitialEndTime}
        preloadedData={modalDataLoaded ? modalData : undefined}
        onVagaCreated={async () => {
          // Após criar vaga, recarregar dados e fechar modal
          setIsCreateModalOpen(false);
          await handleDataChange();
          toast({
            title: "Sucesso",
            description: "Vaga criada com sucesso",
          });
        }}
      />

      {/* Modal de edição de vaga */}
      {selectedJob && (
        <CreateJobModal
          open={modalsState.editModalOpen}
          onOpenChange={setIsEditModalOpen}
          editMode={true}
          editData={selectedJob}
          initialDate={
            selectedJob.vaga_data ? new Date(selectedJob.vaga_data) : undefined
          }
          initialStartTime={selectedJob.vaga_horainicio}
          initialEndTime={selectedJob.vaga_horafim}
          preloadedData={modalDataLoaded ? modalData : undefined}
          bulkEditMode={selectedJob.isBulkEdit}
          bulkEditCount={selectedJob.bulkEditCount}
          bulkEditCommonData={selectedJob.isBulkEdit ? selectedJob : undefined}
          onBulkUpdate={handleBulkUpdate}
          onUpdateVaga={async ({
            vaga_id,
            vagaUpdate,
            selectedBeneficios,
            selectedRequisitos,
          }) => {
            // Apenas atualizar a vaga - o modal gerenciará o fechamento e feedback
            await updateVaga({
              vaga_id,
              vagaUpdate,
              selectedBeneficios,
              selectedRequisitos,
            });
          }}
          onVagaCreated={async () => {
            // Recarregar vagas após qualquer operação bem-sucedida
            closeEditModal();
            await handleDataChange();
          }}
        />
      )}

      {/* Modal de detalhes de vaga */}
      {selectedJobForDetails && (
        <JobDetailsModal
          open={modalsState.detailsModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeJobDetailsModal();
            }
          }}
          job={selectedJobForDetails}
        />
      )}

      {/* Modal de candidaturas */}
      {selectedJobForApplications && (
        <JobApplicationsModal
          open={modalsState.applicationsModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeJobApplicationsModal();
            }
          }}
          vagaId={selectedJobForApplications.vaga_id}
          vagaInfo={{
            hospital_nome: selectedJobForApplications.hospital_nome,
            especialidade_nome: selectedJobForApplications.especialidade_nome,
            setor_nome: selectedJobForApplications.setor_nome,
            vaga_data: selectedJobForApplications.vaga_data,
            vaga_horainicio: selectedJobForApplications.vaga_horainicio,
            vaga_horafim: selectedJobForApplications.vaga_horafim,
            vaga_valor: selectedJobForApplications.vaga_valor,
          }}
          onApplicationsChange={handleDataChange}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      <DeleteConfirmationModal
        open={modalsState.deleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteModal();
          }
        }}
        onConfirm={async () => {
          if (!selectedJobForDelete) return;
          try {
            const isbulk = selectedJobForDelete.count !== undefined;
            const vagasIds = isbulk
              ? selectedJobForDelete.ids
              : [selectedJobForDelete.vaga_id];
            await handleDeleteVagaFromHook(vagasIds, vagasIds.length > 1);
          } finally {
            closeDeleteModal();
          }
        }}
        title={
          selectedJobForDelete?.count
            ? "Excluir Vagas Canceladas"
            : "Excluir Vaga Cancelada"
        }
        description={
          selectedJobForDelete?.count
            ? `Você está prestes a excluir definitivamente ${
                selectedJobForDelete.count
              } vaga${selectedJobForDelete.count > 1 ? "s" : ""} cancelada${
                selectedJobForDelete.count > 1 ? "s" : ""
              } do sistema.`
            : selectedJobForDelete &&
              `Você está prestes a excluir definitivamente a vaga de ${
                selectedJobForDelete.especialidade_nome
              } no ${selectedJobForDelete.hospital_nome} do dia ${new Date(
                selectedJobForDelete.vaga_data
              ).toLocaleDateString("pt-BR")}.`
        }
        vagasCount={selectedJobForDelete?.count || 1}
        isDeleting={deleteLoading}
      />

      {/* Modal de confirmação de cancelamento */}
      <CancelConfirmationModal
        open={cancelModalOpen}
        count={pendingCancellation?.count || 0}
        approvedCount={pendingCancellation?.vagas?.length || 0}
        isSingleItem={pendingCancellation?.isSingle || false}
        itemType="vagas"
        onConfirm={async () => {
          try {
            const vagaIds =
              pendingCancellation?.isSingle && pendingCancellation.vagaIds
                ? pendingCancellation.vagaIds
                : selectedVagas;
            await handleCancelVagaFromHook(vagaIds, vagasAgrupadas);
          } finally {
            setCancelModalOpen(false);
            setPendingCancellation(null);
          }
        }}
        onCancel={() => {
          setCancelModalOpen(false);
          setPendingCancellation(null);
        }}
      />
    </div>
  );
}

export default function EscalaPage() {
  return (
    <VagasOperationsProvider>
      <EscalaPageContent />
    </VagasOperationsProvider>
  );
}

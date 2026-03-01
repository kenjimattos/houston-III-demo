"use client";

import { CustomPagination } from "@/components/pagination/custom-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VagasBulkActionsBar } from "@/components/vagas/bulk-actions/VagasBulkActionsBar";
import { CancelConfirmationModal } from "@/components/vagas/cancel-confirmation-modal";
import { CreateJobModal } from "@/components/vagas/create-job-modal";
import { DeleteConfirmationModal } from "@/components/vagas/delete-confirmation-modal";
import { JobDetailsModal } from "@/components/vagas/job-details-modal";
import {
  VagasOperationsProvider,
  useVagasOperationsWithActions,
} from "@/components/vagas/providers/VagasOperationsProvider";
import { ReopenVacancyModal } from "@/components/vagas/reopen-vacancy-modal";
import { VagaTableRow } from "@/components/vagas/vaga-table-row";
import { VagasFilters } from "@/components/vagas/vagas-filters";
import { useGrades } from "@/hooks/grades/useGrades";
import { useTableSort } from "@/hooks/use-table-sort";
import { useVagasActions } from "@/hooks/vagas/useVagasActions";
import { useVagasData } from "@/hooks/vagas/useVagasData";
import { useVagasModals } from "@/hooks/vagas/useVagasModals";
import { fetchGruposComEscalistas } from "@/services/escalistasService";
import { fetchHospitais } from "@/services/hospitaisService";
import { fetchMedicos } from "@/services/medicosService";
import {
  fetchBeneficios,
  fetchEspecialidades,
  fetchFormasRecebimento,
  fetchPeriodos,
  fetchRequisitos,
  fetchSetores,
  fetchTiposVaga,
} from "@/services/parametrosService";
import {
  fetchEspecialidadesDasVagas,
  fetchHospitaisDasVagas,
  fetchPeriodosDasVagas,
  fetchSetoresDasVagas,
  fetchVagasCandidaturas,
} from "@/services/vagasCandidaturasService";
import { updateVaga } from "@/services/vagasService";
import { ShiftsSortField, SortDirection, VagaCandidatura } from "@/types";
import { ShiftsJobsFilterFields } from "@/types/shifts-jobs-filter";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

// Função para converter string de data do banco em Date local (evita problema de timezone)
function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString || typeof dateString !== "string") return new Date();

  // Se a string já tem horário, usar Date normal
  if (dateString.includes("T") || dateString.includes(" ")) {
    return new Date(dateString);
  }

  // Se é apenas data (YYYY-MM-DD), forçar interpretação como local
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months são 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Fallback para Date normal
  return new Date(dateString);
}

// Função para obter o horário local do Brasil (UTC-3) no formato ISO para salvar no banco
function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

function VagasPageContent() {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reopenVacancyModalOpen, setReopenVacancyModalOpen] = useState(false);
  const [pendingCancellation, setPendingCancellation] = useState<{
    vagas: any[];
    count: number;
    isSingle: boolean;
    vagaIds?: string[];
  } | null>(null);
  const [pendingReopenVacancy, setPendingReopenVacancy] = useState<any>(null);

  // Estados para dados comuns na edição em lote
  const [bulkEditData, setBulkEditData] = useState<any>(null);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // isEditModalOpen e selectedJob agora vêm do hook unificado
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<
    { hospital_id: string; hospital_nome: string }[]
  >([]);
  const [activeTab] = useState("todas");
  const [todasVagas, setTodasVagas] = useState<any[]>([]);
  const [vagasFiltradas, setVagasFiltradas] = useState<any[]>([]);
  const [_vagasLoading, setVagasLoading] = useState(true);
  const [_vagasError, setVagasError] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<
    { especialidade_id: string; especialidade_nome: string }[]
  >([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectors, setSectors] = useState<
    { setor_id: string; setor_nome: string }[]
  >([]);
  const [selectedPeriodos, setSelectedPeriodos] = useState<string[]>([]);
  const [periodos, setPeriodos] = useState<
    { periodo_id: string; periodo_nome: string }[]
  >([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  // jobDetailsModalOpen e selectedJobForDetails agora vêm do hook unificado
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);

  // Hook para carregar grades
  const { grades } = useGrades();

  // Estados para dados pré-carregados do modal
  const [modalDataLoaded, setModalDataLoaded] = useState(false);
  const [modalData, setModalData] = useState<any>({});

  // Estados para seleção múltipla - MIGRADO PARA HOOK
  // const [selectedVagas, setSelectedVagas] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  // Estados para modal de exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vagasToDelete, setVagasToDelete] = useState<string[]>([]);
  const [isDeletingVagas, setIsDeletingVagas] = useState(false);

  // Ref para controle de debounce
  // refreshTimeoutRef removido - gerenciado internamente pelo hook

  // Buscar hospitais, especialidades, setores e períodos existentes na view de vagas

  //* MARK: Estados removidos - agora vêm do useVagasData hook unificado
  // pagination, jobsShifts, filters, sortKey agora são fornecidos pelo hook

  // Hook unificado para dados (modo paginado) - APÓS declaração de sortKey e filters
  const {
    data: unifiedJobsShifts,
    loading: unifiedLoading,
    error: unifiedError,
    pagination: unifiedPagination,
    handlePageChange: unifiedHandlePageChange,
    filters: unifiedFilters,
    updateFilters: unifiedUpdateFilters,
    clearFilters: unifiedClearFilters,
    refreshData: unifiedRefreshData,
    sortKey: unifiedSortKey,
    updateSort: unifiedUpdateSort,
  } = useVagasData({
    paginated: true,
    pageSize: 25,
    initialSort: {
      key: ShiftsSortField.vaga_data,
      direction: SortDirection.ASC,
    },
    initialFilters: {},
  });

  // Hook unificado para operações de vagas (substitui lógica de seleção e bulk operations)
  const {
    selectedVagas,
    toggleVagaSelection,
    toggleAllVagas,
    clearSelection,
    getCommonDataFromSelectedVagas,
    // Agora incluindo todas as bulk operations
    handleBulkAnunciar,
    handleBulkCancelar,
    handleBulkFechar,
    handleBulkReativar,
    handleBulkDelete,
    handleBulkUpdate,
  } = useVagasOperationsWithActions({
    vagasData: unifiedJobsShifts,
    onRefreshData: unifiedRefreshData,
    onBulkEdit: async () => {
      const commonData = await getCommonDataFromSelectedVagas(
        selectedVagas,
        async (vagaIds) => {
          // Buscar dados atualizadas das vagas selecionadas
          return await fetchVagasCandidaturas({ vaga_ids: vagaIds });
        }
      );
      setBulkEditData(commonData);
      setIsBulkEditModalOpen(true);
    },
  });

  // Hook unificado para modals (usando refresh unificado)
  const {
    modalsState,
    selectedJob: selectedJobFromHook,
    selectedJobForDetails: selectedJobForDetailsFromHook,
    openJobDetailsModal: openJobDetailsModalFromHook,
    openEditModal: openEditModalFromHook,
    closeEditModal,
    closeJobDetailsModal,
    handleOperationSuccess,
  } = useVagasModals({
    grupos,
    onRefreshData: unifiedRefreshData,
  });

  // Hook unificado para ações (usando refresh unificado)
  const {
    actionLoading,
    handleCancelVaga: handleCancelVagaFromHook,
    handleDeleteVaga: handleDeleteVagaFromHook,
    handleAnnounceVaga,
    handleCloseVaga,
    handleReopenVaga,
  } = useVagasActions({
    onRefreshData: unifiedRefreshData,
    onClearSelection: clearSelection,
  });

  /**
   * Atualiza a paginação ao mudar de página.
   *
   * Busca os dados de vagas e candidaturas paginados para a página especificada,
   * atualiza o estado de paginação com a página atual e o total de páginas,
   * e exibe no console as vagas da página selecionada.
   *
   * @param page - Número da página a ser carregada.
   * @returns Uma Promise que atualiza o estado de paginação.
   */

  // Agora usando função unificada
  const handlePageChange = unifiedHandlePageChange;
  //* MARK: Funções removidas - substituídas pelo useVagasData hook unificado
  // handleShiftsFetching e debouncedRefresh agora são internas ao hook

  // Função helper que usa o hook unificado
  const handleFilterChanges = (
    fieldName: ShiftsJobsFilterFields,
    value: string[]
  ) => {
    const newFilters = { ...unifiedFilters };
    if (value.length === 0) {
      delete newFilters[fieldName];
    } else {
      (newFilters as any)[fieldName] = value;
    }
    unifiedUpdateFilters(newFilters);
  };
  // Função removida - dados iniciais agora vêm do hook
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
        setSectors(sectorsData);
        const periodosData = await fetchPeriodosDasVagas();
        setPeriodos(periodosData);
      } catch (error) {
        console.error("Erro ao carregar filtros:", error);
      }
    }
    // fetchInitialJobs removido - dados iniciais vêm automaticamente do hook
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
        });
        setModalDataLoaded(true);
      } catch (error) {
        console.error("Erro ao pré-carregar dados do modal:", error);
      }
    }
    preloadModalData();
  }, []);

  // Buscar todas as vagas apenas uma vez
  useEffect(() => {
    async function loadVagas() {
      setVagasLoading(true);
      setVagasError(null);
      try {
        const data = await fetchVagasCandidaturas({}); // sem filtros
        setTodasVagas(data || []);
      } catch (err: any) {
        setVagasError("Erro ao carregar vagas");
      } finally {
        setVagasLoading(false);
      }
    }
    loadVagas();
  }, []);

  // Aplicar filtros no frontend
  useEffect(() => {
    let filtradas = todasVagas;

    if (selectedHospitals.length > 0) {
      filtradas = filtradas.filter((vaga) =>
        selectedHospitals.includes(vaga.hospital_id)
      );
    }
    if (selectedSpecialties.length > 0) {
      filtradas = filtradas.filter((vaga) =>
        selectedSpecialties.includes(vaga.especialidade_id)
      );
    }
    if (selectedSectors.length > 0) {
      filtradas = filtradas.filter((vaga) =>
        selectedSectors.includes(vaga.setor_id)
      );
    }
    if (selectedPeriodos.length > 0) {
      filtradas = filtradas.filter((vaga) =>
        selectedPeriodos.includes(vaga.periodo_id)
      );
    }
    if (selectedStatuses.length > 0) {
      filtradas = filtradas.filter((vaga) =>
        selectedStatuses.includes(vaga.vaga_status)
      );
    }
    if (selectedGrades.length > 0) {
      filtradas = filtradas.filter((vaga) => {
        const hasGradeId = vaga.grade_id;
        const semGradeSelecionada = selectedGrades.includes("sem-grade");
        const gradeCorresponde =
          hasGradeId && selectedGrades.includes(hasGradeId);

        return gradeCorresponde || (semGradeSelecionada && !hasGradeId);
      });
    }
    if (selectedDoctors.length > 0) {
      filtradas = filtradas.filter((vaga) => {
        // Para filtro de médicos, só mostrar vagas fechadas/anunciadas que têm médico aprovado
        if (
          vaga.vaga_status === "fechada" ||
          vaga.vaga_status === "anunciada"
        ) {
          // Verificar se há um médico aprovado na lista selecionada
          // O medico_id vem do vw_vagas_candidaturas quando há candidatura aprovada
          return vaga.medico_id && selectedDoctors.includes(vaga.medico_id);
        } else {
          // Para vagas abertas/canceladas, não mostrar quando há filtro de médicos
          return false;
        }
      });
    }
    if (activeTab !== "todas") {
      filtradas = filtradas.filter(
        (vaga) => vaga.status === activeTab || vaga.vaga_status === activeTab
      );
    }
    if (dateRange && dateRange.from && dateRange.to) {
      const fromStr = dateRange.from.toISOString().slice(0, 10);
      const toStr = dateRange.to.toISOString().slice(0, 10);
      filtradas = filtradas.filter((vaga) => {
        if (!vaga.vaga_data) return false;
        return vaga.vaga_data >= fromStr && vaga.vaga_data <= toStr;
      });
    }
    setVagasFiltradas(filtradas);
  }, [
    todasVagas,
    selectedHospitals,
    selectedSpecialties,
    selectedSectors,
    selectedPeriodos,
    selectedStatuses,
    selectedGrades,
    selectedDoctors,
    activeTab,
    dateRange,
  ]);

  // Buscar grupos e escalistas
  useEffect(() => {
    async function loadGrupos() {
      try {
        const gruposData = await fetchGruposComEscalistas();
        setGrupos(gruposData);
      } catch (error) {
        console.error("Erro ao carregar grupos:", error);
      }
    }
    loadGrupos();
  }, []);

  //* MARK: useEffects removidos - o hook useVagasData gerencia automaticamente
  // os refetches quando filtros ou ordenação mudam

  // Reset bulk edit data when selection changes
  useEffect(() => {
    setBulkEditData(null);
  }, [selectedVagas]);

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
  };

  // Agora usando função unificada
  const clearFilters = () => {
    // Limpar filtros locais ainda necessários
    setSelectedHospitals([]);
    setSelectedSpecialties([]);
    setSelectedSectors([]);
    setSelectedPeriodos([]);
    setSelectedStatuses([]);
    setSelectedGrades([]);
    setSelectedDoctors([]);
    setDateRange(undefined);
    // Limpar filtros unificados
    unifiedClearFilters();
  };

  // Agrupar vagas por vaga_id e manter todas as candidaturas
  const vagasAgrupadas = Object.values(
    vagasFiltradas.reduce((acc, vaga) => {
      if (!acc[vaga.vaga_id]) {
        acc[vaga.vaga_id] = {
          ...vaga,
          candidatos: 0,
          candidaturas: [], // Array para armazenar todas as candidaturas
        };
      }

      // Adicionar candidatura se existir
      if (vaga.candidatura_status && vaga.medico_id) {
        // Verificar se já não foi adicionada (evitar duplicatas)
        const candidaturaExistente = acc[vaga.vaga_id].candidaturas.find(
          (c: any) => c.candidatura_id === vaga.candidatura_id
        );

        if (!candidaturaExistente) {
          acc[vaga.vaga_id].candidaturas.push({
            candidatura_id: vaga.candidatura_id,
            candidatura_status: vaga.candidatura_status,
            medico_id: vaga.medico_id,
            medico_primeironome: vaga.medico_primeironome,
            medico_sobrenome: vaga.medico_sobrenome,
            medico_crm: vaga.medico_crm,
            medico_telefone: vaga.medico_telefone,
          });
          acc[vaga.vaga_id].candidatos += 1;
        }
      }

      return acc;
    }, {} as Record<string, any>)
  );

  // Implementar ordenação
  const { sortedData: sortedShifts } = useTableSort(unifiedJobsShifts, {
    key: ShiftsSortField.vaga_data,
    direction: SortDirection.ASC,
  });

  //* MARK: SORT HANDLER - Usando função unificada do hook
  const handleJobShiftsSort = async (orderKey: ShiftsSortField) => {
    unifiedUpdateSort({
      key: orderKey,
      direction:
        orderKey == unifiedSortKey.key &&
        unifiedSortKey.direction === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC,
    });
  };

  return (
    <div>
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-normal tracking-tight">Vagas</h1>
          </div>
          {/* //* MARK:  FILTROS */}
          <VagasFilters
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
            selectedHospitals={unifiedFilters.hospital_ids || []}
            selectedSpecialties={unifiedFilters.specialty_ids || []}
            selectedSectors={unifiedFilters.sector_ids || []}
            selectedPeriods={unifiedFilters.period_ids || []}
            selectedStatuses={unifiedFilters.job_status_filter || []}
            selectedGrades={unifiedFilters.grade_ids || []}
            selectedDoctors={unifiedFilters.doctor_ids || []}
            grades={(() => {
              // Filtrar grades baseado nos hospitais selecionados
              const selectedHospitalIds = unifiedFilters.hospital_ids || [];
              const filteredGrades = selectedHospitalIds.length > 0
                ? grades.filter((g) => selectedHospitalIds.includes(g.hospital_id))
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
            dateRange={dateRange}
            onHospitalsChange={(hospitalIds) => {
              // Atualizar filtro de hospitais
              handleFilterChanges(
                ShiftsJobsFilterFields.HospitalIds,
                hospitalIds
              );

              // Limpar grades selecionadas que não pertencem aos hospitais selecionados
              const currentSelectedGrades = unifiedFilters.grade_ids || [];
              if (currentSelectedGrades.length > 0 && hospitalIds.length > 0) {
                const validGrades = currentSelectedGrades.filter((gradeId) => {
                  if (gradeId === "sem-grade") return true;
                  const grade = grades.find((g) => g.id === gradeId);
                  return grade && hospitalIds.includes(grade.hospital_id);
                });

                if (validGrades.length !== currentSelectedGrades.length) {
                  handleFilterChanges(ShiftsJobsFilterFields.GradeIds, validGrades);
                }
              }
            }}
            onSpecialtiesChange={(specialty_ids) =>
              handleFilterChanges(
                ShiftsJobsFilterFields.SpecialtyIds,
                specialty_ids
              )
            }
            onSectorsChange={(sector_ids) =>
              handleFilterChanges(ShiftsJobsFilterFields.SectorIds, sector_ids)
            }
            onPeriodsChange={(period_ids) =>
              handleFilterChanges(ShiftsJobsFilterFields.PeriodIds, period_ids)
            }
            onStatusesChange={(statuses) =>
              handleFilterChanges(
                ShiftsJobsFilterFields.JobStatusFilter,
                statuses
              )
            }
            onGradesChange={(grades) =>
              handleFilterChanges(ShiftsJobsFilterFields.GradeIds, grades)
            }
            // ADICIONAR MEDICOS NA LISTA
            onDoctorsChange={(doctors) =>
              handleFilterChanges(ShiftsJobsFilterFields.DoctorIds, doctors)
            }
            onDateRangeChange={(dateRange) => {
              setDateRange(dateRange);
              const newFilters = {
                ...unifiedFilters,
                start_date: dateRange?.from?.toISOString().slice(0, 10),
                end_date: dateRange?.to?.toISOString().slice(0, 10),
              };
              unifiedUpdateFilters(newFilters);
            }}
            onClearFilters={() => {
              dateRange && setDateRange(undefined);
              unifiedClearFilters();
            }}
            onCreateNew={() => setIsCreateModalOpen(true)}
          />

          {/* Barra de ações em lote unificada */}
          <VagasBulkActionsBar
            vagasData={unifiedJobsShifts}
            onRefreshData={unifiedRefreshData}
            onBulkEdit={async () => {
              const commonData = await getCommonDataFromSelectedVagas(
                selectedVagas,
                async (vagaIds) => {
                  return await fetchVagasCandidaturas({ vaga_ids: vagaIds });
                }
              );
              setBulkEditData(commonData);
              setIsBulkEditModalOpen(true);
            }}
          />

          {unifiedLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="rounded-md border mt-10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">
                      <Checkbox
                        checked={
                          selectedVagas.length === unifiedJobsShifts.length &&
                          unifiedJobsShifts.length > 0
                        }
                        onCheckedChange={() =>
                          toggleAllVagas(
                            unifiedJobsShifts.map((v) => v.vaga_id)
                          )
                        }
                        aria-label="Selecionar todas as vagas"
                      />
                    </TableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.vaga_data}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                    >
                      Data
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.HOSPITAL_NOME}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                    >
                      Hospital
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.SETOR_NOME}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                    >
                      Setor
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.ESPECIALIDADE_NOME}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                    >
                      Especialidade
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.PERIODO_NOME}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                    >
                      Período
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.VAGA_VALOR}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                      align="right"
                    >
                      Valor
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.vaga_status}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey={ShiftsSortField.TOTAL_CANDIDATURAS}
                      onSort={handleJobShiftsSort}
                      currentSort={unifiedSortKey}
                      align="center"
                    >
                      Candidatos
                    </SortableTableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {unifiedJobsShifts.map((vaga: VagaCandidatura) => (
                    <VagaTableRow
                      key={vaga.vaga_id}
                      vaga={vaga}
                      selectedVagas={selectedVagas}
                      expandedRow={expandedRow}
                      editLoading={editLoading}
                      onToggleRow={toggleRow}
                      onToggleVagaSelection={toggleVagaSelection}
                      onOpenJobDetailsModal={openJobDetailsModalFromHook}
                      onEditVaga={(vagaId) =>
                        openEditModalFromHook(vagaId, unifiedJobsShifts)
                      }
                      onSetSelectedJob={setSelectedJob}
                      onSetIsEditModalOpen={() => {}} // Não usado mais
                      onSetEditLoading={setEditLoading}
                      onSetTodasVagas={setTodasVagas}
                      onSetVagasToDelete={setVagasToDelete}
                      onSetDeleteModalOpen={setDeleteModalOpen}
                      onRefreshData={unifiedRefreshData}
                      currentPage={unifiedPagination?.currentPage || 1}
                      vagasData={unifiedJobsShifts}
                      vagaCandidaturas={{}}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {/* MARK: Pagination */}
          {/* MARK: COMPONENT PAGINATION CUSTOMIZADO */}
          {!unifiedLoading && (
            <div className="flex justify-center mt-6 px-2 sm:px-4">
              <div className="w-full max-w-4xl">
                <CustomPagination
                  pagination={{
                    currentPage: unifiedPagination?.currentPage || 1,
                    totalPages: unifiedPagination?.totalPages || 1,
                  }}
                  onPageChange={(page) => handlePageChange?.(page)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateJobModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        preloadedData={modalDataLoaded ? modalData : undefined}
        onVagaCreated={unifiedRefreshData}
      />
      {(selectedJob || selectedJobFromHook) && (
        <CreateJobModal
          open={modalsState.editModalOpen}
          onOpenChange={(open) => {
            if (!open) closeEditModal();
          }}
          editMode={true}
          editData={selectedJobFromHook || selectedJob}
          initialDate={
            (selectedJobFromHook || selectedJob)?.vaga_data
              ? parseLocalDate((selectedJobFromHook || selectedJob).vaga_data)
              : undefined
          }
          initialStartTime={
            (selectedJobFromHook || selectedJob)?.vagas_horainicio
          }
          initialEndTime={(selectedJobFromHook || selectedJob)?.vagas_horafim}
          preloadedData={modalDataLoaded ? modalData : undefined}
          onUpdateVaga={async ({
            vaga_id,
            vagaUpdate,
            selectedBeneficios,
            selectedRequisitos,
          }) => {
            await updateVaga({
              vaga_id,
              vagaUpdate,
              selectedBeneficios,
              selectedRequisitos,
            });
            // Recarregar vagas após edição
            await unifiedRefreshData();
          }}
          onVagaCreated={unifiedRefreshData}
        />
      )}

      {(selectedJobForDetails || selectedJobForDetailsFromHook) && (
        <JobDetailsModal
          open={modalsState.detailsModalOpen}
          onOpenChange={(open) => {
            if (!open) closeJobDetailsModal();
          }}
          job={selectedJobForDetailsFromHook || selectedJobForDetails}
        />
      )}

      {/* Modal de edição em lote */}
      <CreateJobModal
        open={isBulkEditModalOpen}
        onOpenChange={(open) => {
          setIsBulkEditModalOpen(open);
          if (!open) {
            setBulkEditData(null); // Limpar dados quando fechar
          }
        }}
        bulkEditMode={true}
        bulkEditCount={selectedVagas.length}
        bulkEditCommonData={bulkEditData}
        preloadedData={modalDataLoaded ? modalData : undefined}
        onBulkUpdate={async (params: any) => {
          // Usar a função do hook com os parâmetros corretos
          await handleBulkUpdate(
            selectedVagas,
            unifiedJobsShifts,
            unifiedRefreshData,
            params
          );
        }}
        onVagaCreated={unifiedRefreshData}
      />

      {/* Modal de confirmação de exclusão */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={async () => {
          setIsDeletingVagas(true);
          try {
            await handleDeleteVagaFromHook(
              vagasToDelete,
              vagasToDelete.length > 1
            );
            setDeleteModalOpen(false);
            setVagasToDelete([]);
          } finally {
            setIsDeletingVagas(false);
          }
        }}
        vagasCount={vagasToDelete.length}
        isDeleting={isDeletingVagas}
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
            await handleCancelVagaFromHook(vagaIds, unifiedJobsShifts);
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

      {/* Modal de confirmação para reabertura de vaga */}
      <ReopenVacancyModal
        open={reopenVacancyModalOpen}
        onConfirm={async () => {
          if (pendingReopenVacancy) {
            try {
              await handleReopenVaga(pendingReopenVacancy.vaga_id);
              await unifiedRefreshData();
            } catch (error) {
              console.error("Erro ao reabrir vaga:", error);
            } finally {
              setEditLoading(false);
              setReopenVacancyModalOpen(false);
              setPendingReopenVacancy(null);
            }
          }
        }}
        onCancel={() => {
          setEditLoading(false);
          setReopenVacancyModalOpen(false);
          setPendingReopenVacancy(null);
        }}
      />
    </div>
  );
}

// Componente principal com provider
export default function VagasPage() {
  return (
    <VagasOperationsProvider>
      <VagasPageContent />
    </VagasOperationsProvider>
  );
}

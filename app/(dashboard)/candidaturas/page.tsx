"use client";

import { CandidaturaTableRow } from "@/components/candidaturas/candidatura-table-row";
import { CandidaturasFilters } from "@/components/candidaturas/candidaturas-filters";
import { CustomPagination } from "@/components/pagination/custom-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobDetailsModal } from "@/components/vagas/job-details-modal";
import { useTableSort } from "@/hooks/use-table-sort";
import { fetchGruposComEscalistas } from "@/services/escalistasService";
import {
  fetchEspecialidadesDasVagas,
  fetchHospitaisDasVagas,
  fetchSetoresDasVagas,
  fetchVagasCandidaturas,
  getPaginatedApplications,
} from "@/services/vagasCandidaturasService";
import { ApplicationData, ShiftsSortField, SortDirection } from "@/types";
import {
  ShiftsJobsFilter,
  ShiftsJobsFilterFields,
} from "@/types/shifts-jobs-filter";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

export default function CandidaturasPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<
    { hospital_id: string; hospital_nome: string }[]
  >([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<
    { especialidade_id: string; especialidade_nome: string }[]
  >([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectors, setSectors] = useState<
    { setor_id: string; setor_nome: string }[]
  >([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [grupos, setGrupos] = useState<any[]>([]);

  //* MARK: INFORMAÇÕES DA PAGINAÇÃO

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
  });
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [filters, setFilters] = useState<ShiftsJobsFilter>({});
  const [sortKey, setSortKey] = useState<{
    key: ShiftsSortField;
    direction: SortDirection;
  }>({
    key: ShiftsSortField.vaga_data,
    direction: SortDirection.ASC,
  });
  const handleJobShiftsSort = async (orderKey: ShiftsSortField) => {
    setSortKey({
      key: orderKey,
      direction:
        orderKey == sortKey.key && sortKey.direction === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC,
    });
  };
  function handleFilterChanges(
    fieldName: ShiftsJobsFilterFields,
    value: String[]
  ) {
    if (value.length === 0) {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [fieldName]: null,
      }));
    } else {
      // Lógica para lidar com mudanças nos filtros
      setFilters((prevFilters) => ({
        ...prevFilters,
        [fieldName]: value,
      }));
    }
  }

  async function getApplications(page: number) {
    if (!page || page < 1) {
      console.warn("Página inválida fornecida:", page);
      return;
    }
    try {
      const { key, direction } = sortKey;
      let { data, pagination } = await getPaginatedApplications({
        pageNumber: page,
        pageSize: 50,
        orderBy: key,
        sortDirection: direction,
        filters,
      });
      const { current_page, total_pages } = pagination;

      if (total_pages > 0 && data.length === 0 && page > 1) {
        console.warn(
          `Página ${page} está vazia. Redirecionando para página 1.`
        );
        const fallbackResponse = await getPaginatedApplications({
          pageNumber: 1,
          pageSize: 50,
          orderBy: key,
          sortDirection: direction,
          filters,
        });
        data = fallbackResponse.data;
        pagination = fallbackResponse.pagination;
      }

      setApplications(data);
      setPagination({
        currentPage: pagination.current_page,
        totalPages: pagination.total_pages,
      });
      console.info("Candidaturas buscadas com sucesso:", applications);
    } catch (error) {
      console.error("Erro ao buscar candidaturas:", error);
    }
  }

  async function handlePageChange(page: number) {
    await getApplications(page);
  }

  // MARK: ALL USEFFECTS

  //  useEffect(() => {
  //     if (sortKey !== null) {
  //       console.log("Sorting by in UseEffect:", sortKey);
  //       getApplications(pagination.currentPage);
  //     }
  //   }, [sortKey]);
  useEffect(() => {
    async function fetchData() {
      await getApplications(1);
    }
    fetchData();
  }, []);
  // Buscar hospitais
  useEffect(() => {
    async function loadHospitals() {
      try {
        const hospitalsData = await fetchHospitaisDasVagas();
        setHospitals(hospitalsData);
      } catch (error) {
        console.error("Erro ao carregar hospitais:", error);
      }
    }
    loadHospitals();
  }, []);
  useEffect(() => {
    getApplications(pagination.currentPage);
  }, [filters, sortKey]);

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

  // Buscar especialidades e setores
  useEffect(() => {
    async function loadFilters() {
      try {
        const specialtiesData = await fetchEspecialidadesDasVagas();
        setSpecialties(
          specialtiesData.sort((a, b) =>
            a.especialidade_nome.localeCompare(b.especialidade_nome)
          )
        );
        const sectorsData = await fetchSetoresDasVagas();
        setSectors(sectorsData);
      } catch (error) {
        console.error(
          "Erro ao carregar filtros de especialidade/setor:",
          error
        );
      }
    }
    loadFilters();
  }, []);

  // Buscar candidaturas reais
  useEffect(() => {
    async function loadCandidaturas() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchVagasCandidaturas({});
        setCandidaturas(data || []);
      } catch (err) {
        setError("Erro ao carregar candidaturas");
      } finally {
        setLoading(false);
      }
    }
    loadCandidaturas();
  }, []);

  const openDetailsModal = (application: ApplicationData) => {
    // Buscar informações do grupo e escalista

    // Verificar se os campos estão disponíveis (podem estar como grupo_id ou vagas_grupo_id)
    const grupoId = application.grupo?.id || application.grupo?.id;
    const escalistaId =
      application.escalista?.id ||
      application.escalista?.id;

    setSelectedCandidate({
      id: application.candidatura_id,
      date: application.candidatura_createdate
        ? format(parseISO(application.candidatura_createdate), "dd/MM/yyyy")
        : "-",
      doctor: {
        id: application.medico.medico_id,
        name: `${application.medico.medico_primeiro_nome} ${application.medico.medico_sobrenome}`,
        crm: application.medico.medico_crm,
        specialty: application.especialidade.especialidade_nome,
        phone: application.medico.medico_telefone,
        email: application.medico.medico_email,
      },
      hospital: application.hospital.hospital_nome,
      jobDate: application.vaga.vaga_data
        ? format(parseISO(application.vaga.vaga_data), "dd/MM/yyyy")
        : "-",
      value: application.vaga.vaga_valor,
      status: application.candidatura_status,
      job: {
        id: application.vaga.vaga_id,
        hospital: application.hospital.hospital_nome,
        date: application.vaga.vaga_data
          ? format(parseISO(application.vaga.vaga_data), "dd/MM/yyyy")
          : "-",
        sector: application.setor.setor_nome,
        specialty: application.especialidade.especialidade_nome,
        startTime: application.vaga.vagas_horainicio,
        endTime: application.vaga.vagas_horafim,
        value: application.vaga.vaga_valor,
        // paymentDate: application.vaga.vaga_datapagamento
        //   ? format(parseISO(application.vaga.vaga_datapagamento), "dd/MM/yyyy")
        //   : "-",
        paymentDate: format(
          parseISO(application.vaga.vaga_datapagamento),
          "dd/MM/yyyy"
        ),
        periodo: application.vaga.periodo_nome,
        grupoNome: application.vaga.grupo_nome,
        escalistaNome: application.vaga.escalista_nome,
      },
    });
    setDetailsModalOpen(true);
  };

  // Função para atualizar os dados após ações nas candidaturas
  const handleDataRefresh = async () => {
    await getApplications(pagination.currentPage);
    // Também atualizar os dados legados se necessário
    const data = await fetchVagasCandidaturas({});
    setCandidaturas(data || []);
  };

  // Função para limpar filtros
  const clearFilters = async () => {
    setDateRange(undefined);
    setFilters({}); // Limpar também o estado de filtros para a API
  };

  // Filtrar candidaturas
  const filteredApplications = candidaturas
    .filter((app) => app.candidatura_id) // Só linhas com candidatura
    .filter((app) => {
      // Filtrar por hospital
      if (
        selectedHospitals.length > 0 &&
        !selectedHospitals.includes(app.hospital_id)
      ) {
        return false;
      }
      // Filtrar por especialidade
      if (
        selectedSpecialties.length > 0 &&
        !selectedSpecialties.includes(app.especialidade_id)
      ) {
        return false;
      }
      // Filtrar por setor
      if (
        selectedSectors.length > 0 &&
        !selectedSectors.includes(app.setor_id)
      ) {
        return false;
      }
      // Filtrar por status
      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.includes(app.candidatura_status)
      ) {
        return false;
      }
      // Filtrar por médicos
      if (
        selectedDoctors.length > 0 &&
        !selectedDoctors.includes(app.medico_id)
      ) {
        return false;
      }
      // Filtrar por intervalo de datas
      if (
        dateRange &&
        dateRange.from &&
        dateRange.to &&
        app.candidatura_createdate
      ) {
        const dataCriacao = parseISO(app.candidatura_createdate);
        if (dataCriacao < dateRange.from || dataCriacao > dateRange.to) {
          return false;
        }
      }
      return true;
    });

  // Implementar ordenação
  // const {
  //   sortedData: candidaturasOrdenadas,
  //   sortConfig,
  //   handleSort,
  // } = useTableSort(filteredApplications, {
  //   key: "candidatos_createdate",
  //   direction: "desc",
  // });

  // Função placeholder para criar nova candidatura (não implementada)
  const handleCreateNew = () => {
    // Por enquanto, candidaturas são criadas pelos médicos, não pelo admin
    // Creation of candidatura not implemented for admins
  };

  //* MARK: COMEÇO DA RENDERIZÇÃO

  return (
    <div>
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-normal tracking-tight">
              Candidaturas
            </h1>
          </div>
          {/* //* MARK: FILTROS */}
          <CandidaturasFilters
            specialties={specialties.map((s) => ({
              value: s.especialidade_id,
              label: s.especialidade_nome,
            }))}
            sectors={sectors.map((s) => ({
              value: s.setor_id,
              label: s.setor_nome,
            }))}
            doctors={[]} // DoctorSelector will load doctors internally
            selectedHospitals={filters.hospital_ids || []}
            selectedSpecialties={filters.specialty_ids || []}
            selectedSectors={filters.sector_ids || []}
            selectedStatuses={filters.application_status_filter || []}
            selectedDoctors={filters.doctor_ids || []}
            dateRange={dateRange}
            onHospitalsChange={(ids) =>
              handleFilterChanges(ShiftsJobsFilterFields.HospitalIds, ids)
            }
            onSpecialtiesChange={(ids) =>
              handleFilterChanges(ShiftsJobsFilterFields.SpecialtyIds, ids)
            }
            onSectorsChange={(ids) =>
              handleFilterChanges(ShiftsJobsFilterFields.SectorIds, ids)
            }
            onStatusesChange={(ids) =>
              handleFilterChanges(
                ShiftsJobsFilterFields.ApplicationStatusFilter,
                ids
              )
            }
            onDoctorsChange={(ids) =>
              handleFilterChanges(ShiftsJobsFilterFields.DoctorIds, ids)
            }
            onDateRangeChange={(dateRange) => {
              setDateRange(dateRange);
              const newFilters = {
                ...filters,
                start_date: dateRange?.from?.toISOString().slice(0, 10),
                end_date: dateRange?.to?.toISOString().slice(0, 10),
              };
              setFilters(newFilters);
            }}
            onClearFilters={clearFilters}
          />
          {/* //* MARK: ORDENADORES - TABLE HEADER */}
          <div className="rounded-sm border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey={ShiftsSortField.CANDIDATOS_CREATEDATE}
                    currentSort={sortKey}
                    onSort={handleJobShiftsSort}
                  >
                    Data
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={ShiftsSortField.MEDICO_PRIMEIRO_NOME}
                    currentSort={sortKey}
                    onSort={handleJobShiftsSort}
                  >
                    Médico
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={ShiftsSortField.HOSPITAL_NOME}
                    onSort={handleJobShiftsSort}
                    currentSort={sortKey}
                  >
                    Hospital
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={ShiftsSortField.SETOR_NOME}
                    onSort={handleJobShiftsSort}
                    currentSort={sortKey}
                  >
                    Setor
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={ShiftsSortField.vaga_data}
                    currentSort={sortKey}
                    onSort={handleJobShiftsSort}
                  >
                    Data do Plantão
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={ShiftsSortField.VAGA_VALOR}
                    onSort={handleJobShiftsSort}
                    currentSort={sortKey}
                    align="right"
                  >
                    Valor
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={ShiftsSortField.CANDIDATURA_STATUS}
                    onSort={handleJobShiftsSort}
                    currentSort={sortKey}
                  >
                    Status
                  </SortableTableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* //* MARK: LISTA DE CANDIDATURAS */}
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8}>{error}</TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      Nenhuma candidatura encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((application) => (
                    <CandidaturaTableRow
                      key={application.candidatura_id}
                      application={application}
                      onDetailsModalOpen={openDetailsModal}
                      onDataRefresh={handleDataRefresh}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {applications.length > 0 && (
          <CustomPagination
            pagination={{
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
            }}
            onPageChange={handlePageChange}
          />
        )}
      </Card>

      {selectedCandidate && (
        <JobDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          job={selectedCandidate.job}
        />
      )}
    </div>
  );
}

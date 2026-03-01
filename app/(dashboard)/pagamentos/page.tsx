"use client";

import { PagamentosTableRow } from "@/components/pagamentos/pagamento-table-row";
import { PagamentosBulkActionsBar } from "@/components/pagamentos/bulk-actions";
import { PagamentosFilters } from "@/components/pagamentos/pagamentos-filters";
import { CustomPagination } from "@/components/pagination/custom-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePagamentosSelection } from "@/hooks/pagamentos/usePagamentosSelection";
import { usePagamentosBulkOperations } from "@/hooks/pagamentos/usePagamentosBulkOperations";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  fetchEspecialidadesDasVagas,
  fetchSetoresDasVagas,
} from "@/services/vagasCandidaturasService";
import { fetchPagamentos } from "@/services/pagamentosService";
import {
  PagamentosData,
  PagamentosFilters as PagamentosFiltersType,
  PagamentosSortField,
  PagamentosStatus,
} from "@/types/pagamentos";
import { Permission } from "@/types/permission";
import { SortDirection } from "@/types";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

const PAGAMENTO_STATUS_OPTIONS = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "AUTORIZADO", label: "Autorizado" },
  { value: "PAGO", label: "Pago" },
];

// Roles que podem marcar pagamento como pago
const ROLES_CAN_PAY = ['administrador', 'moderador'];

export default function PagamentosPage() {
  const { has } = usePermissions();
  const { userRole } = useCurrentUser();
  const canEditPagamento = has(Permission.PAGAMENTOS_UPDATE) || has(Permission.REPORTS_UPDATE);
  const canMarcarPago = canEditPagamento && ROLES_CAN_PAY.includes(userRole || '');

  const [pagamentos, setPagamentos] = useState<PagamentosData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [specialties, setSpecialties] = useState<
    { especialidade_id: string; especialidade_nome: string }[]
  >([]);
  const [sectors, setSectors] = useState<
    { setor_id: string; setor_nome: string }[]
  >([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filters, setFilters] = useState<PagamentosFiltersType>({});

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
  });

  const [sortKey, setSortKey] = useState<{
    key: PagamentosSortField;
    direction: SortDirection;
  }>({
    key: PagamentosSortField.VAGA_DATA,
    direction: SortDirection.DESC,
  });

  // Hooks de seleção e bulk operations
  const {
    selectedPagamentos,
    togglePagamentoSelection,
    toggleAllPagamentos,
    clearSelection,
    isAllSelected,
  } = usePagamentosSelection();

  const {
    loading: bulkLoading,
    handleBulkAutorizar,
    handleBulkPagar,
    handleBulkConfirmarCheckin,
    handleBulkConfirmarPagamento,
  } = usePagamentosBulkOperations();

  const handleSort = async (orderKey: PagamentosSortField) => {
    setSortKey({
      key: orderKey,
      direction:
        orderKey === sortKey.key && sortKey.direction === SortDirection.ASC
          ? SortDirection.DESC
          : SortDirection.ASC,
    });
  };

  function handleFilterChange<K extends keyof PagamentosFiltersType>(
    field: K,
    value: PagamentosFiltersType[K]
  ) {
    setFilters((prev) => ({
      ...prev,
      [field]: Array.isArray(value) && value.length === 0 ? undefined : value,
    }));
  }

  async function loadPagamentos(page: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPagamentos({
        pageNumber: page,
        pageSize: 50,
        orderBy: sortKey.key,
        sortDirection: sortKey.direction,
        filters,
      });
      setPagamentos(response.data);
      setPagination({
        currentPage: response.pagination.current_page,
        totalPages: response.pagination.total_pages,
      });
    } catch {
      setError("Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  }

  async function handlePageChange(page: number) {
    await loadPagamentos(page);
  }

  const handleDataRefresh = async () => {
    await loadPagamentos(pagination.currentPage);
  };

  const handleBulkAutorizarWithFeedback = async (pagamentosList: PagamentosData[]) => {
    const result = await handleBulkAutorizar(pagamentosList, handleDataRefresh);
    if (result.success > 0) {
      toast.success(`${result.success} pagamento(s) autorizado(s) com sucesso`);
    }
    if (result.skipped > 0) {
      toast.info(`${result.skipped} pagamento(s) ignorado(s) (não elegíveis)`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} falha(s) ao autorizar`);
    }
  };

  const handleBulkPagarWithFeedback = async (pagamentosList: PagamentosData[]) => {
    const result = await handleBulkPagar(pagamentosList, handleDataRefresh);
    if (result.success > 0) {
      toast.success(`${result.success} pagamento(s) marcado(s) como pago`);
    }
    if (result.skipped > 0) {
      toast.info(`${result.skipped} pagamento(s) ignorado(s) (não autorizados)`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} falha(s) ao marcar como pago`);
    }
  };

  const handleBulkConfirmarCheckinWithFeedback = async (pagamentosList: PagamentosData[]) => {
    const result = await handleBulkConfirmarCheckin(pagamentosList, handleDataRefresh);
    if (result.success > 0) {
      toast.success(`${result.success} check-in/out confirmado(s)`);
    }
    if (result.skipped > 0) {
      toast.info(`${result.skipped} pagamento(s) já possuem check-in`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} falha(s) ao confirmar check-in`);
    }
  };

  const handleBulkConfirmarPagamentoWithFeedback = async (pagamentosList: PagamentosData[]) => {
    const result = await handleBulkConfirmarPagamento(pagamentosList, handleDataRefresh);
    if (result.success > 0) {
      toast.success(`${result.success} valor(es) de pagamento confirmado(s)`);
    }
    if (result.skipped > 0) {
      toast.info(`${result.skipped} pagamento(s) já possuem valor`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} falha(s) ao confirmar valor`);
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setFilters({});
  };

  useEffect(() => {
    loadPagamentos(1);
  }, []);

  useEffect(() => {
    loadPagamentos(pagination.currentPage);
  }, [filters, sortKey]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [specialtiesData, sectorsData] = await Promise.all([
          fetchEspecialidadesDasVagas(),
          fetchSetoresDasVagas(),
        ]);
        setSpecialties(
          specialtiesData.sort((a, b) =>
            a.especialidade_nome.localeCompare(b.especialidade_nome)
          )
        );
        setSectors(sectorsData);
      } catch {
        console.error("Erro ao carregar filtros");
      }
    }
    loadFilters();
  }, []);

  return (
    <div>
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-normal tracking-tight">Pagamentos</h1>
          </div>

          <PagamentosFilters
            specialties={specialties.map((s) => ({
              value: s.especialidade_id,
              label: s.especialidade_nome,
            }))}
            sectors={sectors.map((s) => ({
              value: s.setor_id,
              label: s.setor_nome,
            }))}
            selectedHospitals={filters.hospital_ids || []}
            selectedSpecialties={filters.especialidade_ids || []}
            selectedSectors={filters.setor_ids || []}
            selectedPagamentoStatuses={filters.status_pagamento || []}
            selectedDoctors={filters.medico_ids || []}
            dateRange={dateRange}
            onHospitalsChange={(ids) => handleFilterChange("hospital_ids", ids)}
            onSpecialtiesChange={(ids) =>
              handleFilterChange("especialidade_ids", ids)
            }
            onSectorsChange={(ids) => handleFilterChange("setor_ids", ids)}
            onPagamentoStatusesChange={(ids) =>
              handleFilterChange("status_pagamento", ids as PagamentosStatus[])
            }
            onDoctorsChange={(ids) => handleFilterChange("medico_ids", ids)}
            onDateRangeChange={(range) => {
              setDateRange(range);
              setFilters((prev) => ({
                ...prev,
                data_inicio: range?.from?.toISOString().slice(0, 10),
                data_fim: range?.to?.toISOString().slice(0, 10),
              }));
            }}
            onClearFilters={clearFilters}
            pagamentoStatusOptions={PAGAMENTO_STATUS_OPTIONS}
          />

          {canEditPagamento && selectedPagamentos.length > 0 && (
            <PagamentosBulkActionsBar
              selectedPagamentos={selectedPagamentos}
              pagamentos={pagamentos}
              onClearSelection={clearSelection}
              onBulkAutorizar={handleBulkAutorizarWithFeedback}
              onBulkPagar={handleBulkPagarWithFeedback}
              onBulkConfirmarCheckin={handleBulkConfirmarCheckinWithFeedback}
              onBulkConfirmarPagamento={handleBulkConfirmarPagamentoWithFeedback}
              loading={bulkLoading}
              canMarcarPago={canMarcarPago}
            />
          )}

          <div className="rounded-sm border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {canEditPagamento && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected(pagamentos.map((p) => p.candidatura_id))}
                        onCheckedChange={(checked) =>
                          toggleAllPagamentos(
                            pagamentos.map((p) => p.candidatura_id),
                            !!checked
                          )
                        }
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                  )}
                  <SortableTableHead
                    sortKey={PagamentosSortField.VAGA_DATA}
                    currentSort={sortKey}
                    onSort={handleSort}
                  >
                    Data
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={PagamentosSortField.MEDICO_NOME}
                    currentSort={sortKey}
                    onSort={handleSort}
                  >
                    Médico
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey={PagamentosSortField.HOSPITAL_NOME}
                    currentSort={sortKey}
                    onSort={handleSort}
                  >
                    Hospital
                  </SortableTableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Horário</TableHead>
                  <SortableTableHead
                    sortKey={PagamentosSortField.VAGA_VALOR}
                    currentSort={sortKey}
                    onSort={handleSort}
                    align="right"
                  >
                    Valor
                  </SortableTableHead>
                  <TableHead className="whitespace-nowrap">Check-in/out</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <SortableTableHead
                    sortKey={PagamentosSortField.PAGAMENTO_STATUS}
                    currentSort={sortKey}
                    onSort={handleSort}
                  >
                    Status
                  </SortableTableHead>
                  <TableHead>Autorizado em</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canEditPagamento ? 12 : 11}>
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={canEditPagamento ? 12 : 11}>{error}</TableCell>
                  </TableRow>
                ) : pagamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEditPagamento ? 12 : 11}>Nenhum pagamento encontrado</TableCell>
                  </TableRow>
                ) : (
                  pagamentos.map((pagamento) => (
                    <PagamentosTableRow
                      key={pagamento.id}
                      pagamento={pagamento}
                      onDataRefresh={handleDataRefresh}
                      showCheckbox={canEditPagamento}
                      isSelected={selectedPagamentos.includes(pagamento.candidatura_id)}
                      onSelectionChange={togglePagamentoSelection}
                      canMarcarPago={canMarcarPago}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {pagamentos.length > 0 && (
          <CustomPagination
            pagination={{
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
            }}
            onPageChange={handlePageChange}
          />
        )}
      </Card>
    </div>
  );
}

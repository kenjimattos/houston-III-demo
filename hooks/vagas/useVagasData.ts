"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  fetchVagasCandidaturas,
  getPaginatedVagasCandidaturas,
  fetchVagasCandidaturasParaEscala,
} from "@/services/vagasCandidaturasService";
import {
  ShiftsJobsFilter,
  ShiftsJobsFilterFields,
} from "@/types/shifts-jobs-filter";
import {
  ShiftsSortField,
  SortDirection,
  VagaCandidatura,
} from "@/types";

interface UseVagasDataOptions {
  paginated?: boolean;
  pageSize?: number;
  autoRefresh?: boolean;
  initialFilters?: ShiftsJobsFilter;
  initialSort?: {
    key: ShiftsSortField;
    direction: SortDirection;
  };
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export function useVagasData(options: UseVagasDataOptions = {}) {
  const {
    paginated = false,
    pageSize = 25,
    autoRefresh = false,
    initialFilters = {},
    initialSort = {
      key: ShiftsSortField.vaga_data,
      direction: SortDirection.ASC,
    },
  } = options;

  // Estados principais
  const [data, setData] = useState<VagaCandidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginação (apenas para modo paginado)
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
  });

  // Estados de filtros e ordenação
  const [filters, setFilters] = useState<ShiftsJobsFilter>(initialFilters);
  const [sortKey, setSortKey] = useState(initialSort);

  // Ref para controle de debounce
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref para evitar double fetch na montagem inicial
  const isInitialMount = useRef(true);

  // Ref para rastrear mudança de página (não deve disparar o useEffect de filtros)
  const isPageChange = useRef(false);

  // Ref para a página atual (evita recriar callbacks quando página muda)
  const currentPageRef = useRef(1);

  // Função para buscar dados paginados (página de vagas)
  const fetchPaginatedData = useCallback(async (page: number) => {
    if (!page || page < 1) {
      console.warn("Página inválida fornecida:", page);
      return;
    }

    try {
      setError(null);
      const { key, direction } = sortKey;

      const response = await getPaginatedVagasCandidaturas({
        pageNumber: page,
        pageSize,
        filters,
        orderBy: key,
        sortDirection: direction,
      });

      const { current_page, total_pages, total_count } = response.pagination;
      let { data: jobs } = response;

      // Verificar se a página atual está vazia mas há dados em outras páginas
      if (total_pages > 0 && jobs.length === 0 && page > 1) {
        console.warn(`Página ${page} está vazia. Redirecionando para página 1.`);

        // Buscar primeira página como fallback
        const fallbackResponse = await getPaginatedVagasCandidaturas({
          pageNumber: 1,
          pageSize,
          filters,
          orderBy: key,
          sortDirection: direction,
        });

        jobs = fallbackResponse.data;
        currentPageRef.current = 1;
        setPagination({
          currentPage: 1,
          totalPages: fallbackResponse.pagination.total_pages,
          totalCount: fallbackResponse.pagination.total_count,
        });
      } else {
        // Atualizar paginação normalmente
        currentPageRef.current = current_page;
        setPagination({
          currentPage: current_page,
          totalPages: total_pages,
          totalCount: total_count,
        });
      }

      setData(jobs);

      // Log para debug em desenvolvimento
      if (process.env.NODE_ENV === "development") {
        console.log(`Carregadas ${jobs.length} vagas da página ${current_page}/${total_pages}`);
      }
    } catch (err) {
      console.error("Erro ao buscar vagas paginadas:", err);
      setError("Erro ao carregar vagas. Tente novamente.");

      toast({
        title: "Erro ao carregar vagas",
        description: "Não foi possível carregar as vagas. Tente novamente.",
        variant: "destructive",
      });

      // Se for a primeira página, limpar dados para não mostrar dados antigos
      if (page === 1) {
        setData([]);
        setPagination({ currentPage: 1, totalPages: 0, totalCount: 0 });
      }
    }
  }, [sortKey, filters]);

  // Função para buscar todos os dados (página de escala)
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);

      // Para escala, usar a função específica que agrupa dados
      const vagasData = await fetchVagasCandidaturasParaEscala({
        data_inicio: filters.start_date || new Date().toISOString().split('T')[0],
        data_fim: filters.end_date || new Date().toISOString().split('T')[0],
        filtros: {
          // Usando campos genéricos do filtro para mapear para os específicos da função
        }
      });

      setData(vagasData || []);

      // Log para debug em desenvolvimento
      if (process.env.NODE_ENV === "development") {
        console.log(`Carregadas ${vagasData?.length || 0} vagas para calendário`);
      }
    } catch (err) {
      console.error("Erro ao buscar vagas para escala:", err);
      setError("Erro ao carregar dados do calendário. Tente novamente.");

      toast({
        title: "Erro ao carregar calendário",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive",
      });

      setData([]);
    }
  }, [filters]);

  // Função principal para buscar dados
  const handleDataChange = useCallback(async (page?: number) => {
    setLoading(true);

    try {
      if (paginated) {
        // Usar página passada como parâmetro, ou a ref da página atual
        const targetPage = page ?? currentPageRef.current;
        await fetchPaginatedData(targetPage);
      } else {
        await fetchAllData();
      }
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [paginated, fetchPaginatedData, fetchAllData]);

  // Função para mudança de página (apenas modo paginado)
  const handlePageChange = useCallback(async (page: number) => {
    if (!paginated) {
      console.warn("handlePageChange chamado em modo não paginado");
      return;
    }

    // Atualizar ref da página atual
    currentPageRef.current = page;

    // Marcar que é mudança de página para evitar double fetch
    isPageChange.current = true;
    await handleDataChange(page);
    isPageChange.current = false;
  }, [paginated, handleDataChange]);

  // Função para refresh dos dados
  const refreshData = useCallback(async () => {
    await handleDataChange();
  }, [handleDataChange]);

  // Versão debounced para evitar calls excessivos
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      await handleDataChange();
    }, 300);
  }, [handleDataChange]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: ShiftsJobsFilter) => {
    setFilters(newFilters);
    // Resetar para primeira página quando filtros mudam
    if (paginated) {
      currentPageRef.current = 1;
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [paginated]);

  // Função para limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    // Resetar para primeira página
    if (paginated) {
      currentPageRef.current = 1;
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [paginated]);

  // Função para atualizar ordenação
  const updateSort = useCallback((newSort: { key: ShiftsSortField; direction: SortDirection }) => {
    setSortKey(newSort);
  }, []);

  // Função helper para filtros
  const handleFilterChanges = useCallback((
    fieldName: ShiftsJobsFilterFields,
    value: string[]
  ) => {
    const newFilters = { ...filters };

    if (value.length === 0) {
      delete newFilters[fieldName];
    } else {
      (newFilters as any)[fieldName] = value;
    }

    updateFilters(newFilters);
  }, [filters, updateFilters]);

  // Effect para carregar dados iniciais
  useEffect(() => {
    handleDataChange();
    isInitialMount.current = false;
  }, []); // Apenas na montagem inicial

  // Effect para recarregar quando filtros ou ordenação mudam
  useEffect(() => {
    // Ignorar na montagem inicial (já carregado acima)
    if (isInitialMount.current) {
      return;
    }

    // Ignorar se for mudança de página (já tratado em handlePageChange)
    if (isPageChange.current) {
      return;
    }

    debouncedRefresh();
  }, [filters, sortKey, debouncedRefresh]);

  // Effect para auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Dados principais
    data,
    loading,
    error,

    // Paginação (apenas se paginated: true)
    ...(paginated && {
      pagination,
      handlePageChange,
    }),

    // Filtros e ordenação
    filters,
    sortKey,
    updateFilters,
    clearFilters,
    updateSort,
    handleFilterChanges,

    // Funções de controle
    handleDataChange,
    refreshData,
    debouncedRefresh,

    // Configurações
    paginated,
    pageSize,

    // Setters diretos (para compatibilidade)
    setData,
    setLoading,
    setError,
    setPagination,
    setFilters,
    setSortKey,
  };
}
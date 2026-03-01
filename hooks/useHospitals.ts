import { useState, useEffect, useCallback, useRef } from "react";
import { Hospital } from "@/types/user-roles-shared";
import { UserHospitalService } from "@/services/userHospitalService";

interface UseHospitalsOptions {
  search?: string;
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
}

interface UseHospitalsReturn {
  hospitals: Hospital[];
  loading: boolean;
  error: string | null;
  count: number;
  loadHospitals: () => Promise<void>;
  refetch: () => Promise<void>;
  hasMore: boolean;
}

export function useHospitals(
  options: UseHospitalsOptions = {}
): UseHospitalsReturn {
  const { search = "", limit, offset = 0, autoLoad = true } = options;

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Ref para controlar se já há uma requisição em andamento
  const loadingRef = useRef(false);

  const loadHospitals = useCallback(async () => {
    // Se já está carregando, retornar sem fazer nova requisição
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Usar o serviço diretamente
      const result = await UserHospitalService.getHospitals({
        search: search || undefined,
        limit,
        offset: offset > 0 ? offset : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Erro ao carregar hospitais");
      }

      // Se tem offset, significa que é paginação - adicionar aos hospitais existentes
      if (offset > 0) {
        setHospitals((prevHospitals) => [...prevHospitals, ...result.data]);
      } else {
        // Nova busca - substituir hospitais
        setHospitals(result.data || []);
      }

      setCount(result.data?.length || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao carregar hospitais";
      setError(errorMessage);
      console.error("Erro ao carregar hospitais:", err);

      // Se é a primeira carga, limpar hospitais
      if (offset === 0) {
        setHospitals([]);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [search, limit, offset]);

  const refetch = useCallback(async () => {
    setHospitals([]);
    setCount(0);
    await loadHospitals();
  }, [loadHospitals]);

  // Carregar automaticamente quando as dependências mudarem
  useEffect(() => {
    if (autoLoad) {
      loadHospitals();
    }
  }, [autoLoad, loadHospitals]);

  // Calcular se há mais itens para carregar (usado em paginação)
  const hasMore = limit ? hospitals.length < count : false;

  return {
    hospitals,
    loading,
    error,
    count,
    loadHospitals,
    refetch,
    hasMore,
  };
}

// Hook específico para buscar hospitais com debounce
export function useHospitalsSearch(searchTerm: string, delay: number = 300) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return useHospitals({
    search: debouncedSearchTerm,
    autoLoad: true,
  });
}

// Hook para hospitais sem paginação (para dropdowns) - sem auto-load
export function useHospitalsDropdown() {
  return useHospitals({
    autoLoad: false, // Não carregar automaticamente
    // Sem limit para carregar todos os hospitais
  });
}

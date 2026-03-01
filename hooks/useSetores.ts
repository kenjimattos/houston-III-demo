import { useState, useEffect, useCallback, useRef } from "react";
import { Setor } from "@/types/user-roles-shared";
import { UserSetorService } from "@/services/userSetorService";

interface UseSetoresOptions {
  search?: string;
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
}

interface UseSetoresReturn {
  setores: Setor[];
  loading: boolean;
  error: string | null;
  count: number;
  loadSetores: () => Promise<void>;
  refetch: () => Promise<void>;
  hasMore: boolean;
}

export function useSetores(options: UseSetoresOptions = {}): UseSetoresReturn {
  const { search = "", limit, offset = 0, autoLoad = true } = options;

  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Ref para controlar se já há uma requisição em andamento
  const loadingRef = useRef(false);

  const loadSetores = useCallback(async () => {
    // Se já está carregando, retornar sem fazer nova requisição
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Usar o serviço diretamente
      const result = await UserSetorService.getSetores({
        search: search || undefined,
        limit,
        offset: offset > 0 ? offset : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Erro ao carregar setores");
      }

      const setoresData = result.data || [];

      // Se tem offset, significa que é paginação - adicionar aos setores existentes
      if (offset > 0) {
        setSetores((prevSetores) => [...prevSetores, ...setoresData]);
      } else {
        // Nova busca - substituir setores
        setSetores(setoresData);
      }

      setCount(result.count || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao carregar setores";
      setError(errorMessage);
      console.error("Erro ao carregar setores:", err);

      // Se é a primeira carga, limpar setores
      if (offset === 0) {
        setSetores([]);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [search, limit, offset]);

  const refetch = useCallback(async () => {
    setSetores([]);
    setCount(0);
    await loadSetores();
  }, [loadSetores]);

  // Carregar automaticamente quando as dependências mudarem
  useEffect(() => {
    if (autoLoad) {
      loadSetores();
    }
  }, [autoLoad, loadSetores]);

  // Calcular se há mais itens para carregar (usado em paginação)
  const hasMore = limit ? setores.length < count : false;

  return {
    setores,
    loading,
    error,
    count,
    loadSetores,
    refetch,
    hasMore,
  };
}

// Hook específico para buscar setores com debounce
export function useSetoresSearch(searchTerm: string, delay: number = 300) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return useSetores({
    search: debouncedSearchTerm,
    autoLoad: true,
  });
}

// Hook para setores sem paginação (para dropdowns) - sem auto-load
export function useSetoresDropdown() {
  return useSetores({
    autoLoad: false, // Não carregar automaticamente
    // Sem limit para carregar todos os setores
  });
}

import { useState, useEffect, useCallback, useRef } from "react";
import { Group } from "@/types/user-roles-shared";
import { UserGroupService } from "@/services/userGroupService";

interface UseGroupsOptions {
  search?: string;
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
}

interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  error: string | null;
  count: number;
  loadGroups: () => Promise<void>;
  refetch: () => Promise<void>;
  hasMore: boolean;
}

export function useGroups(options: UseGroupsOptions = {}): UseGroupsReturn {
  const { search = "", limit, offset = 0, autoLoad = true } = options;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Ref para controlar se já há uma requisição em andamento
  const loadingRef = useRef(false);

  const loadGroups = useCallback(async () => {
    // Se já está carregando, retornar sem fazer nova requisição
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Usar o serviço diretamente
      const result = await UserGroupService.getGroups({
        search: search || undefined,
        limit,
        offset: offset > 0 ? offset : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Erro ao carregar grupos");
      }

      // Se tem offset, significa que é paginação - adicionar aos grupos existentes
      if (offset > 0) {
        setGroups((prevGroups) => [...prevGroups, ...result.data]);
      } else {
        // Nova busca - substituir grupos
        setGroups(result.data || []);
      }

      setCount(result.data?.length || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao carregar grupos";
      setError(errorMessage);
      console.error("Erro ao carregar grupos:", err);

      // Se é a primeira carga, limpar grupos
      if (offset === 0) {
        setGroups([]);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [search, limit, offset]);

  const refetch = useCallback(async () => {
    setGroups([]);
    setCount(0);
    await loadGroups();
  }, [loadGroups]);

  // Carregar automaticamente quando as dependências mudarem
  useEffect(() => {
    if (autoLoad) {
      loadGroups();
    }
  }, [autoLoad, loadGroups]);

  // Calcular se há mais itens para carregar (usado em paginação)
  const hasMore = limit ? groups.length < count : false;

  return {
    groups,
    loading,
    error,
    count,
    loadGroups,
    refetch,
    hasMore,
  };
}

// Hook específico para buscar grupos com debounce
export function useGroupsSearch(searchTerm: string, delay: number = 300) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return useGroups({
    search: debouncedSearchTerm,
    autoLoad: true,
  });
}

// Hook para grupos sem paginação (para dropdowns) - sem auto-load
export function useGroupsDropdown() {
  return useGroups({
    autoLoad: false, // Não carregar automaticamente
    // Sem limit para carregar todos os grupos
  });
}

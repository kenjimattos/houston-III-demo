"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAllPermissions,
  hasPermission,
  hasEveryPermission,
  hasSomePermission,
  subscribe,
  ensurePermissionsLoaded,
  isInitialized,
} from "@/services/permissionsService";
import { Permission } from "@/types/permission";

/**
 * Resultado principal do hook usePermissions
 */
export interface UsePermissionsResult {
  permissions: string[];
  initialized: boolean;
  has: (perm: Permission) => boolean;
  hasEvery: (perms: Permission[]) => boolean;
  hasSome: (perms: Permission[]) => boolean;
  refresh: () => Promise<void>;
  waitUntil: (
    predicate: (perms: string[]) => boolean,
    timeoutMs?: number
  ) => Promise<boolean>;
  // Estado de erro de carregamento inicial (não bloqueante)
  error: Error | null;
}

/**
 * Hook para consumir permissões carregadas pelo permissionsService.
 * - Usa useState + useEffect para sincronizar com o service
 * - Auto-carrega permissões (padrão) se ainda não inicializadas
 * - Fornece helpers: has, hasEvery, hasSome
 * - Função waitUntil para aguardar presença de permissão de forma assíncrona
 */
export function usePermissions(
  options: { autoLoad?: boolean } = {}
): UsePermissionsResult {
  const { autoLoad = true } = options;
  const loadErrorRef = useRef<Error | null>(null);

  // Estado local para as permissões
  const [permissions, setPermissions] = useState<string[]>(() =>
    getAllPermissions()
  );

  // Sincronizar com o service
  useEffect(() => {
    // Função para atualizar o estado local quando o service mudar
    const handlePermissionsChange = () => {
      setPermissions(getAllPermissions());
    };

    // Sincronizar estado inicial
    handlePermissionsChange();

    // Subscrever mudanças
    const unsubscribe = subscribe(handlePermissionsChange);

    return unsubscribe;
  }, []);

  const initialized = isInitialized();

  useEffect(() => {
    if (autoLoad && !initialized) {
      ensurePermissionsLoaded().catch((e: any) => {
        // Guardar erro sem forçar re-render separado (estado será exposto via ref após mudança natural)
        loadErrorRef.current =
          e instanceof Error ? e : new Error("Falha ao carregar permissões");
      });
    }
  }, [autoLoad, initialized]);

  const refresh = useCallback(async () => {
    await ensurePermissionsLoaded(true).catch((e: any) => {
      loadErrorRef.current =
        e instanceof Error ? e : new Error("Falha ao recarregar permissões");
    });
  }, []);

  const waitUntil = useCallback(
    async (
      predicate: (perms: string[]) => boolean,
      timeoutMs: number = 5000
    ) => {
      const start = Date.now();
      return new Promise<boolean>((resolve) => {
        // Checagem imediata
        if (predicate(getAllPermissions())) return resolve(true);

        const unsub = subscribe(() => {
          if (predicate(getAllPermissions())) {
            unsub();
            resolve(true);
          } else if (Date.now() - start >= timeoutMs) {
            unsub();
            resolve(false);
          }
        });

        // Timeout de segurança (caso nenhum evento aconteça)
        setTimeout(() => {
          try {
            unsub();
          } catch {}
          resolve(predicate(getAllPermissions()));
        }, timeoutMs);
      });
    },
    []
  );

  return {
    permissions,
    initialized,
    has: hasPermission,
    hasEvery: hasEveryPermission,
    hasSome: hasSomePermission,
    refresh,
    waitUntil,
    error: loadErrorRef.current,
  };
}

export default usePermissions;

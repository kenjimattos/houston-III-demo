"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser } from "@/services/authService";
import usePermissions from "@/hooks/usePermissions";
import { Permission } from "@/types/permission";

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Se definir, valida permissões antes de renderizar
  requiredPermissions?: Permission[];
  // true = todas; false = pelo menos uma
  requireAll?: boolean;
  // Conteúdo custom enquanto carrega
  loadingFallback?: React.ReactNode;
  // Conteúdo se faltar permissão (default: null)
  noAccessFallback?: React.ReactNode;
  // Redirecionar se sem permissão? (default: false)
  redirectIfNoAccess?: boolean;
  // Caminho para onde redireciona se sem acesso
  noAccessRedirectTo?: string;
}

// Memória de módulo para última rota válida
let lastAllowedRoute: string | null = null;
const LAST_ALLOWED_STORAGE_KEY = "houston.lastAllowedRoute";

function getStoredLastAllowed(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(LAST_ALLOWED_STORAGE_KEY) ||
    localStorage.getItem(LAST_ALLOWED_STORAGE_KEY)
  );
}

function storeLastAllowed(path: string) {
  if (typeof window === "undefined") return;
  // Usa sessionStorage (escopo da sessão); limpa localStorage se existir
  try {
    sessionStorage.setItem(LAST_ALLOWED_STORAGE_KEY, path);
    localStorage.removeItem(LAST_ALLOWED_STORAGE_KEY);
  } catch {}
}

export function ProtectedRoute({
  children,
  requiredPermissions,
  requireAll = true,
  loadingFallback = (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Verificando acesso...</p>
      </div>
    </div>
  ),
  noAccessFallback = null,
  redirectIfNoAccess = false,
  noAccessRedirectTo = "/auth/login",
}: ProtectedRouteProps): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const { initialized: permsInit, has, hasEvery, hasSome } = usePermissions();
  const [restoredRouteChecked, setRestoredRouteChecked] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  // Restaurar última rota válida em memória (apenas 1x)
  useEffect(() => {
    if (!restoredRouteChecked) {
      const stored = getStoredLastAllowed();
      if (stored && !lastAllowedRoute) {
        lastAllowedRoute = stored;
      }
      setRestoredRouteChecked(true);
    }
  }, [restoredRouteChecked]);

  // 1. Checar sessão
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await getCurrentUser();
        if (!active) return;
        setAuthenticated(true);
      } catch {
        if (!active) return;
        setAuthenticated(false);
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 2. Effect para fazer redirecionamentos (evita setState durante render)
  useEffect(() => {
    if (shouldRedirect) {
      router.replace(shouldRedirect);
      setShouldRedirect(null);
    }
  }, [shouldRedirect, router]);

  // 3. Enquanto checa auth
  if (!authChecked || authenticated === null || !restoredRouteChecked) {
    return <>{loadingFallback}</>;
  }

  // 4. Não autenticado => redirecionar
  if (authChecked && authenticated === false) {
    // Preservar destino (se quiser usar depois) via query param
    if (pathname !== "/auth/login" && !shouldRedirect) {
      setShouldRedirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
    return null;
  }

  // 5. Verificar permissão específica da página de vagas
  if (pathname === "/vagas" && permsInit && !has(Permission.JOBS_READ)) {
    if (!shouldRedirect) {
      setShouldRedirect("/");
    }
    return null;
  }

  // 4. Verificar permissões (se exigidas)
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!permsInit) {
      // Ainda carregando permissões => fallback de loading
      return <>{loadingFallback}</>;
    }

    const ok = requireAll
      ? hasEvery(requiredPermissions)
      : hasSome(requiredPermissions);

    if (!ok) {
      // Decidir rota fallback: última válida ou permanecer
      const fallback =
        lastAllowedRoute && lastAllowedRoute !== pathname
          ? lastAllowedRoute
          : lastAllowedRoute || "/";

      if (redirectIfNoAccess && !shouldRedirect) {
        setShouldRedirect(fallback);
        return null;
      }

      // Mesmo que não esteja redirecionando explicitamente, devolver null para evitar conteúdo
      return <>{noAccessFallback || null}</>;
    } else {
      // Atualiza rota válida
      if (pathname !== lastAllowedRoute) {
        lastAllowedRoute = pathname;
        storeLastAllowed(pathname);
      }
    }
  } else {
    // Não exige permissão específica: toda rota acessível é considerada válida
    if (pathname !== lastAllowedRoute) {
      lastAllowedRoute = pathname;
      storeLastAllowed(pathname);
    }
  }

  // 5. Acesso liberado
  return <>{children as React.ReactNode}</>;
}

export default ProtectedRoute;

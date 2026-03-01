"use client";
import usePermissions from "@/hooks/usePermissions";
import { Permission } from "@/types/permission";
import React from "react";


interface RequirePermissionProps {
  permission?: Permission;
  every?: Permission[];
  some?: Permission[];
  not?: Permission | Permission[]; // Permite negar permissões específicas
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  children: React.ReactNode;
}

// Componente para render condicional baseado em permissões
export function RequirePermission({
  permission,
  every,
  some,
  not,
  fallback = null,
  loading = null,
  children,
}: RequirePermissionProps) {
  const { has, hasEvery, hasSome, initialized } = usePermissions();

  if (!initialized) return <>{loading}</>;

  let allowed = true;

  if (permission) allowed = allowed && has(permission);
  if (every && every.length > 0) allowed = allowed && hasEvery(every);
  if (some && some.length > 0) allowed = allowed && hasSome(some);

  if (not) {
    const denyList = Array.isArray(not) ? not : [not];
    if (denyList.some((p) => has(p))) allowed = false;
  }

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

export default RequirePermission;

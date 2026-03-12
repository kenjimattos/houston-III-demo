"use client"

import { ReactNode } from "react";
import { useUserSession } from "@/hooks/useUserSession";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";

export function CurrentUserProviderContainer({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useUserSession();

  return (
    <CurrentUserProvider
      value={{
        user: data ? { id: data.id, email: data.email } : null,
        userName: data?.userName ?? null,
        grupoId: data?.grupoId ?? null,
        userRole: data?.userRole ?? null,
        permissions: data?.permissions ?? [],
        isAdmin: data?.isAdmin ?? false,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </CurrentUserProvider>
  );
}

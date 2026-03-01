"use client"

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { getCurrentUserWithPermissions } from "@/services/authService";
import { getSupabaseClient } from "@/services/supabaseClient";

// Tipo do contexto
interface CurrentUserContextType {
  user: any | null;
  userName: string | null;
  grupoId: string | null;
  userRole: string | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Criar contexto
const CurrentUserContext = createContext<CurrentUserContextType | null>(null);

// Provider
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getCurrentUserWithPermissions();
      const { user: currentUser, permissions: perms, userRole } = result || {};

      setUser(currentUser || null);

      // Buscar nome e grupo_id do escalista na tabela
      let nomeUsuario: string | null = null;
      let grupoUsuario: string | null = null;
      if (currentUser?.id) {
        const supabase = getSupabaseClient();
        const { data: escalista } = await supabase
          .from("escalistas")
          .select("nome, grupo_id")
          .eq("id", currentUser.id)
          .single();

        nomeUsuario = escalista?.nome || null;
        grupoUsuario = escalista?.grupo_id || null;
      }

      // Fallback para email ou full_name se não encontrar na tabela
      setUserName(nomeUsuario || currentUser?.user_metadata?.full_name || currentUser?.email || null);
      setGrupoId(grupoUsuario);
      setUserRole(userRole || null);
      setPermissions(perms || []);
      setIsAdmin(Boolean(userRole === "administrador" || (perms || []).includes("administrador")));
    } catch (err) {
      console.error("Erro ao buscar usuário atual:", err);
      setError(err instanceof Error ? err.message : String(err));
      setUser(null);
      setUserName(null);
      setGrupoId(null);
      setUserRole(null);
      setPermissions([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <CurrentUserContext.Provider
      value={{ user, userName, grupoId, userRole, permissions, isAdmin, loading, error, refetch: fetch }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

// Hook para usar o contexto
export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return context;
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/services/supabaseClient";
import { UserRoleType } from "@/types/user-roles-shared";

interface RoleOption {
  value: UserRoleType;
  display: string;
}

interface UseUserRoleHierarchyReturn {
  currentUserRole: UserRoleType | null;
  availableRoles: RoleOption[];
  loading: boolean;
  error: string | null;
  canAssignRole: (targetRole: UserRoleType) => boolean;
  canManageEscalista: (escalistaRole: UserRoleType) => boolean;
  refreshUserRole: () => Promise<void>;
}

// Lista estática de todas as roles com hierarquia - não muda nunca
export const ALL_ROLES = [
  {
    value: "escalista" as UserRoleType,
    display: "Escalista",
    hierarchy: 0,
  },
  {
    value: "coordenador" as UserRoleType,
    display: "Coordenador",
    hierarchy: 1,
  },
  { value: "gestor" as UserRoleType, display: "Gestor", hierarchy: 2 },
  {
    value: "moderador" as UserRoleType,
    display: "Moderador",
    hierarchy: 3,
  },
  {
    value: "administrador" as UserRoleType,
    display: "Administrador",
    hierarchy: 4,
  },
] as const;

// 🚀 Hook SUPER RÁPIDO que tenta token síncrono primeiro
export const useFastUserRole = (): {
  currentUserRole: UserRoleType | null;
  loading: boolean;
} => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleType | null>(
    () => {
      // 🚀 Tentativa síncrona no estado inicial
      try {
        const session = supabase.auth.getSession();
        // Se getSession retornar dados síncronos, usa-os
        if (session && typeof session === "object" && "then" in session) {
          // É uma Promise, deixa para o useEffect
          return null;
        }
        return null; // Fallback para assíncrono
      } catch {
        return null;
      }
    }
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      try {
        // 🚀 SUPER RÁPIDO: tenta token JWT primeiro
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          try {
            // Decodifica o token JWT para pegar a role
            const tokenPayload = JSON.parse(
              atob(session.access_token.split(".")[1])
            );
            const tokenRole =
              tokenPayload.user_role ||
              tokenPayload.role ||
              tokenPayload.user_metadata?.role ||
              tokenPayload.app_metadata?.role;

            if (tokenRole) {
              setCurrentUserRole(tokenRole as UserRoleType);
              setLoading(false);
              return;
            }
          } catch (tokenError) {
            console.warn("Erro ao decodificar token:", tokenError);
          }
        }

        // Fallback para user_metadata
        if (session?.user?.user_metadata?.role) {
          setCurrentUserRole(session.user.user_metadata.role as UserRoleType);
          setLoading(false);
          return;
        }

        // Último fallback para claims
        const { data } = await supabase.auth.getClaims();
        const userRole = data?.claims["user_role"] as UserRoleType;
        setCurrentUserRole(userRole || "escalista");
      } catch (error) {
        console.error("Erro ao carregar role:", error);
        setCurrentUserRole("escalista");
      } finally {
        setLoading(false);
      }
    };

    // Se já não temos a role, carrega assincronamente
    if (!currentUserRole) {
      loadRole();
    } else {
      setLoading(false);
    }
  }, [currentUserRole]);

  return { currentUserRole, loading };
};

// 🚀 Hook otimizado para obter apenas a role atual (mais rápido)
export const useCurrentUserRole = (): {
  currentUserRole: UserRoleType | null;
  loading: boolean;
} => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleType | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      try {
        // 🚀 SUPER RÁPIDO: tenta token JWT primeiro
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          try {
            // Decodifica o token JWT para pegar a role
            const tokenPayload = JSON.parse(
              atob(session.access_token.split(".")[1])
            );
            const tokenRole =
              tokenPayload.user_role ||
              tokenPayload.role ||
              tokenPayload.user_metadata?.role ||
              tokenPayload.app_metadata?.role;

            if (tokenRole) {
              setCurrentUserRole(tokenRole as UserRoleType);
              setLoading(false);
              return;
            }
          } catch (tokenError) {
            console.warn(
              "Erro ao decodificar token, usando fallback:",
              tokenError
            );
          }
        }

        // Fallback para user_metadata
        if (session?.user?.user_metadata?.role) {
          setCurrentUserRole(session.user.user_metadata.role as UserRoleType);
          setLoading(false);
          return;
        }

        // Último fallback para claims
        const { data } = await supabase.auth.getClaims();
        const userRole = data?.claims["user_role"] as UserRoleType;
        setCurrentUserRole(userRole || "escalista");
      } catch (error) {
        console.error("Erro ao carregar role:", error);
        setCurrentUserRole("escalista");
      } finally {
        setLoading(false);
      }
    };

    loadRole();
  }, []);

  return { currentUserRole, loading };
};

// Função utilitária otimizada para verificar se o usuário atual pode gerenciar um escalista
export const checkCanManageEscalista = async (
  escalistaRole: UserRoleType
): Promise<boolean> => {
  try {
    // 🚀 OTIMIZAÇÃO: Primeiro tenta a sessão local (mais rápido)
    const {
      data: { session },
    } = await supabase.auth.getSession();
    let userRole: UserRoleType | undefined;

    if (session?.user) {
      userRole = session.user.user_metadata?.role as UserRoleType;
    }

    // 🚀 Fallback para getClaims se não encontrou na sessão
    if (!userRole) {
      const sessionResp = await supabase.auth.getClaims();
      userRole = sessionResp.data?.claims["user_role"] as UserRoleType;
    }

    if (!userRole) return false;

    const getUserHierarchy = (role: UserRoleType): number => {
      const roleData = ALL_ROLES.find((r) => r.value === role);
      return roleData?.hierarchy ?? 0;
    };

    const currentHierarchy = getUserHierarchy(userRole);
    const escalistaHierarchy = getUserHierarchy(escalistaRole);

    // O usuário pode gerenciar se sua hierarquia for MAIOR que a do escalista
    return currentHierarchy > escalistaHierarchy;
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return false;
  }
};

export const useUserRoleHierarchy = (): UseUserRoleHierarchyReturn => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleType | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚀 OTIMIZAÇÃO: Função de hierarquia mais rápida usando mapa
  const getRoleHierarchy = useCallback((role: UserRoleType): number => {
    const roleData = ALL_ROLES.find((r) => r.value === role);
    return roleData?.hierarchy ?? 0;
  }, []);

  // 🎯 OTIMIZAÇÃO: Calcular availableRoles apenas quando currentUserRole mudar
  const availableRoles = useMemo((): RoleOption[] => {
    if (!currentUserRole) {
      // Se não há role definida, permitir apenas escalista
      return [{ value: "escalista", display: "Escalista" }];
    }

    const currentUserHierarchy = getRoleHierarchy(currentUserRole);

    // Filtrar roles que o usuário atual pode atribuir (mesma hierarquia ou menor)
    return ALL_ROLES.filter(
      (role) => role.hierarchy <= currentUserHierarchy
    ).map((role) => ({ value: role.value, display: role.display }));
  }, [currentUserRole, getRoleHierarchy]);

  // 🚀 OTIMIZAÇÃO: Carregamento mais rápido com cache de sessão
  const loadCurrentUserRole = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 🚀 Primeiro tenta pegar da sessão local (mais rápido)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Verifica se já tem a role nos claims da sessão
        const userRole = session.user.user_metadata?.role as UserRoleType;

        if (userRole) {
          setCurrentUserRole(userRole);
          setLoading(false);
          return;
        }
      }

      // 🚀 Se não encontrou na sessão, busca via getClaims (fallback)
      const sessionResp = await supabase.auth.getClaims();
      const userRole = sessionResp.data?.claims["user_role"] as UserRoleType;

      setCurrentUserRole(userRole || "escalista"); // Default para escalista
    } catch (err) {
      console.error("Erro ao carregar role do usuário:", err);
      setError("Erro ao carregar permissões do usuário");
      setCurrentUserRole("escalista"); // Default em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para verificar se o usuário atual pode atribuir uma role específica
  const canAssignRole = useCallback(
    (targetRole: UserRoleType): boolean => {
      if (!currentUserRole) return false;

      const currentHierarchy = getRoleHierarchy(currentUserRole);
      const targetHierarchy = getRoleHierarchy(targetRole);

      return targetHierarchy <= currentHierarchy;
    },
    [currentUserRole, getRoleHierarchy]
  );

  // Função para verificar se o usuário atual pode gerenciar um escalista específico
  const canManageEscalista = useCallback(
    (escalistaRole: UserRoleType): boolean => {
      if (!currentUserRole) return false;

      const currentHierarchy = getRoleHierarchy(currentUserRole);
      const escalistaHierarchy = getRoleHierarchy(escalistaRole);

      // O usuário pode gerenciar se sua hierarquia for MAIOR que a do escalista
      return currentHierarchy > escalistaHierarchy;
    },
    [currentUserRole, getRoleHierarchy]
  );

  // Carregar role ao montar o hook
  useEffect(() => {
    loadCurrentUserRole();
  }, [loadCurrentUserRole]);

  return {
    currentUserRole,
    availableRoles,
    loading,
    error,
    canAssignRole,
    canManageEscalista,
    refreshUserRole: loadCurrentUserRole,
  };
};

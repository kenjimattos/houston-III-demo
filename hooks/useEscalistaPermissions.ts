import { useMemo, useEffect, useState } from "react";
import { usePermissions } from "./usePermissions";
import { useCurrentUser } from "./useCurrentUser";
import { getCurrentUser } from "@/services/authService";

/**
 * Hook para gerenciar permissões específicas de escalistas
 * Integra com o sistema existente de permissões JWT
 */
export function useEscalistaPermissions() {
  const { permissions, initialized } = usePermissions();
  const { userName, loading: userLoading } = useCurrentUser();
  const [user, setUser] = useState<any>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);

  // Buscar dados completos do usuário
  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
      } finally {
        setUserDataLoading(false);
      }
    }

    if (userName && !userLoading) {
      fetchUser();
    }
  }, [userName, userLoading]);

  const escalistaPermissions = useMemo(() => {
    if (!permissions || !user) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canManageRoles: false,
        canViewAll: false,
      };
    }

    // Verificar permissões específicas de escalistas
    const canView =
      permissions.includes("escalistas.view") ||
      permissions.includes("admin.full");
    const canCreate =
      permissions.includes("escalistas.create") ||
      permissions.includes("admin.full");
    const canEdit =
      permissions.includes("escalistas.edit") ||
      permissions.includes("admin.full");
    const canDelete =
      permissions.includes("escalistas.delete") ||
      permissions.includes("admin.full");
    const canManageRoles =
      permissions.includes("escalistas.manage_roles") ||
      permissions.includes("admin.full");

    // Admins podem ver todos os escalistas, outros usuários só do seu grupo
    const canViewAll =
      permissions.includes("admin.full") || user.user_role === "admin";

    return {
      canView,
      canCreate,
      canEdit,
      canDelete,
      canManageRoles,
      canViewAll,
    };
  }, [permissions, user]);

  const isLoading = !initialized || userLoading || userDataLoading;

  /**
   * Verifica se o usuário pode realizar uma ação específica em um escalista
   */
  const canPerformAction = (
    action: "view" | "edit" | "delete" | "manage_roles",
    escalistaId?: string
  ) => {
    if (isLoading) return false;

    switch (action) {
      case "view":
        return escalistaPermissions.canView;
      case "edit":
        return escalistaPermissions.canEdit;
      case "delete":
        return escalistaPermissions.canDelete;
      case "manage_roles":
        return escalistaPermissions.canManageRoles;
      default:
        return false;
    }
  };

  /**
   * Retorna uma mensagem explicativa para permissões negadas
   */
  const getPermissionMessage = (action: string) => {
    if (!user) return "Usuário não autenticado";

    const messages: Record<string, string> = {
      view: "Você não tem permissão para visualizar escalistas",
      create: "Você não tem permissão para criar escalistas",
      edit: "Você não tem permissão para editar escalistas",
      delete: "Você não tem permissão para excluir escalistas",
      manage_roles: "Você não tem permissão para gerenciar roles de escalistas",
    };

    return messages[action] || "Permissão negada";
  };

  return {
    ...escalistaPermissions,
    canPerformAction,
    getPermissionMessage,
    isLoading,
    userRole: user?.user_role,
  };
}

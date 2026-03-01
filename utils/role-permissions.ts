/**
 * Utilitários para verificação de permissões de roles
 */

import { checkCanManageEscalista } from "@/hooks/useUserRoleHierarchy";
import { UserRoleType } from "@/types/user-roles-shared";

/**
 * Exemplo de uso da função checkCanManageEscalista
 * Para verificações pontuais fora do contexto de componentes React
 */

// Exemplo: Verificar antes de permitir edição de um escalista
export async function validateEscalistaEditPermission(
  escalistaRole: UserRoleType
): Promise<{
  canEdit: boolean;
  message?: string;
}> {
  try {
    const canManage = await checkCanManageEscalista(escalistaRole);

    if (!canManage) {
      return {
        canEdit: false,
        message:
          "Você não tem permissão para editar este escalista. Sua hierarquia deve ser superior à dele.",
      };
    }

    return { canEdit: true };
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return {
      canEdit: false,
      message: "Erro ao verificar permissões. Tente novamente.",
    };
  }
}

// Exemplo: Verificar múltiplos escalistas de uma vez
export async function filterEditableEscalistas<
  T extends { role: UserRoleType }
>(escalistas: T[]): Promise<T[]> {
  const editableEscalistas: T[] = [];

  for (const escalista of escalistas) {
    const canManage = await checkCanManageEscalista(escalista.role);
    if (canManage) {
      editableEscalistas.push(escalista);
    }
  }

  return editableEscalistas;
}

// Exemplo: Middleware para APIs que precisam verificar permissões
export async function requireEscalistaManagementPermission(
  escalistaRole: UserRoleType
): Promise<void> {
  const canManage = await checkCanManageEscalista(escalistaRole);

  if (!canManage) {
    throw new Error(
      "Acesso negado: Hierarquia insuficiente para gerenciar este escalista"
    );
  }
}

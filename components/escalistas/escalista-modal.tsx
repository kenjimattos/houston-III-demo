"use client";

/**
 * Sistema de Modal de Escalistas
 *
 * Componente principal que orquestra todo o fluxo de criação e edição de escalistas.
 * Suporta dois modos de operação:
 *
 * 1. MODO CRIAÇÃO (escalista = null):
 *    - Exibe apenas formulário de dados pessoais
 *    - Envia convite por email para o novo escalista
 *    - Não exibe seletor de cargo nem abas de atribuições
 *
 * 2. MODO EDIÇÃO (escalista != null):
 *    - Exibe formulário completo com seletor de cargo
 *    - Avalia hierarquia: usuário só pode editar escalistas com cargo inferior
 *    - Campos ficam desabilitados se não tiver permissão hierárquica
 *    - Exibe abas para gerenciar atribuições (grupos, hospitais, setores)
 *    - Permite editar dados existentes e gerenciar permissões
 *
 * Arquitetura modular com hooks especializados:
 * - useEscalistaForm: Gerencia formulário, validações e submissão
 * - useEscalistaAssignments: Gerencia atribuições e configuração de abas
 * - useUserRoleHierarchy: Fornece roles disponíveis baseadas na hierarquia
 */

import { CustomTab } from "@/components/custom-tab/custom-tab";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserRoleManager,
  UserRoleType,
} from "@/components/users/user-role-manager";
import { useEscalistaAssignments } from "@/hooks/useEscalistaAssignments";
import { useEscalistaForm } from "@/hooks/useEscalistaForm";
import { useUserRoleHierarchy } from "@/hooks/useUserRoleHierarchy";
import { useState } from "react";
import { EscalistaModalFooter } from "./escalista-modal-footer";
import { EscalistaPersonalForm } from "./escalista-personal-form";

/**
 * Props do EscalistaModal
 */
interface EscalistaModalProps {
  /** Controla se o modal está aberto */
  open: boolean;
  /** Callback chamado quando o estado do modal muda */
  onOpenChange: (open: boolean) => void;
  /**
   * Dados do escalista para edição.
   * Se null/undefined = modo criação
   * Se preenchido = modo edição
   */
  escalista?: {
    id: string;
    nome: string;
    escalista_telefone?: string;
    email: string;
    role?: string; // Role atual do escalista
  } | null;
  /** ID do grupo para pré-seleção (usado no modo criação) */
  grupoId?: string;
  /** Callback para salvar dados (modo edição) */
  onSave: (data: {
    nome: string;
    telefone: string;
    email: string;
    grupo_id?: string;
    id: string;
    role?: UserRoleType; // Role selecionada no selector de cargo
  }) => Promise<void>;
  /** Callback para deletar escalista (opcional, só no modo edição) */
  onDelete?: (escalistaId: string) => Promise<void>;
  /** Callback executado após envio bem-sucedido de convite */
  onInviteSuccess?: () => void;
}

/**
 * Componente Modal de Escalistas
 *
 * Componente principal que coordena toda a interface de criação/edição de escalistas.
 * Utiliza uma arquitetura baseada em hooks para separar lógica de apresentação.
 */
export function EscalistaModal({
  open,
  onOpenChange,
  escalista,
  grupoId,
  onSave,
  onDelete,
  onInviteSuccess,
}: EscalistaModalProps) {
  // Estado local para controlar modal de gerenciamento de roles
  const [showRoleManager, setShowRoleManager] = useState(false);

  // Hook principal para gerenciar formulário, validações e submissão
  // Centraliza toda a lógica relacionada ao formulário de dados pessoais
  const {
    telefone, // Telefone formatado para exibição
    phoneError, // Mensagem de erro de validação do telefone
    selectedRole, // Role selecionada no CustomSelector
    isLoading, // Estado de carregamento durante operações
    isEditing, // Determina se está em modo edição ou criação
    hasChanges, // Indica se houve mudanças nos dados
    handlePhoneChange, // Handler para formatação do telefone
    handleRoleSelect, // Handler para seleção de role
    handleSubmit, // Handler principal de submissão do formulário
    handleTableSelect, // Handler para seleção de tabela
    handleInputChange, // Handler para mudanças nos inputs
  } = useEscalistaForm({
    escalista,
    grupoId,
    onSave,
    onSuccess: () => {
      onOpenChange(false);
      if (onInviteSuccess) {
        onInviteSuccess();
      }
    },
  });

  // Hook para gerenciar atribuições (grupos, hospitais, setores)
  // Agora recebe o selectedRole atualizado do formulário
  const { tabsMenu, refetchAssignments, currentAssignments } =
    useEscalistaAssignments({
      escalista,
      open,
      isLoading,
      defaultRole: selectedRole || "escalista", // Usa o selectedRole do formulário
    });

  // Função combinada para mudança de role com refetch
  const handleRoleChangeWithRefetch = async (newRole: UserRoleType) => {
    // Primeiro atualiza a role
    await handleRoleSelect(newRole);
    // Depois refaz o fetch dos assignments
    await refetchAssignments();
  };

  // Hook para obter roles disponíveis baseadas na hierarquia do usuário atual
  const { availableRoles: roleHierarchyRoles, currentUserRole } =
    useUserRoleHierarchy();

  /**
   * Handler para deletar escalista
   * Executa o callback onDelete passado como prop
   */
  const handleDelete = async () => {
    if (escalista && onDelete) {
      await onDelete(escalista.id);
    }
  };
  return (
    <>
      {/* Modal Principal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {/* Cabeçalho dinâmico baseado no modo de operação */}
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              {isEditing ? "Editar Escalista" : "Novo Escalista"}
            </DialogTitle>
            {/* Descrição adicional apenas no modo criação */}
            {!isEditing && (
              <p className="text-sm text-gray-600 mt-1">
                Preencha os dados para cadastrar um novo escalista
              </p>
            )}
          </DialogHeader>

          {/* Formulário principal */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Formulário de dados pessoais */}
            <EscalistaPersonalForm
              escalista={escalista}
              telefone={telefone}
              phoneError={phoneError}
              selectedRole={selectedRole}
              availableRoles={roleHierarchyRoles}
              isLoading={isLoading}
              onPhoneChange={handlePhoneChange}
              onRoleSelect={handleRoleChangeWithRefetch} // Usa função combinada que refaz fetch
              onInputChange={handleInputChange} // Handler para mudanças nos inputs
              isEditing={isEditing} // Controla exibição do CustomSelector
            />

            {/* Abas de atribuições - apenas no modo edição */}
            {isEditing && <CustomTab tabs={tabsMenu} />}

            {/* Rodapé com botões de ação */}
            <EscalistaModalFooter
              isEditing={isEditing}
              isLoading={isLoading}
              hasChanges={isEditing ? hasChanges : true} // No modo criação, sempre permite submissão
              onDelete={onDelete ? handleDelete : undefined}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Gerenciamento de Roles - apenas no modo edição */}
      {isEditing && escalista && (
        <UserRoleManager
          open={showRoleManager}
          onOpenChange={setShowRoleManager}
          user={{
            id: escalista.id,
            email: escalista.email,
            name: escalista.nome,
          }}
          onSuccess={async () => {
            await refetchAssignments();
          }}
        />
      )}
    </>
  );
}

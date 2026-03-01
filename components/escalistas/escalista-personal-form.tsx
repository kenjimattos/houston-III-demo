/**
 * Formulário de Dados Pessoais do Escalista
 *
 * Componente responsável por renderizar os campos de entrada para dados pessoais
 * do escalista, incluindo validação em tempo real e formatação automática.
 *
 * Características principais:
 * - Validação e formatação automática de telefone
 * - Seletor de cargo condicional (apenas no modo edição)
 * - Controle de permissões baseado na hierarquia: usuário só pode editar escalistas com cargo inferior
 * - Feedback visual para erros de validação e restrições de permissão
 * - Integração com sistema de roles e hierarquia
 */

import CustomSelector from "@/components/custom-selector/custom-selector";
import { Input } from "@/components/ui/input";
import { UserRoleType } from "@/components/users/user-role-manager";
import { useFastUserRole } from "@/hooks/useUserRoleHierarchy";
import { canManageEscalistaFast } from "@/utils/role-cache";
import { useEffect, useState } from "react";

/**
 * Props do EscalistaPersonalForm
 */
interface EscalistaPersonalFormProps {
  /** Dados do escalista existente (null no modo criação) */
  escalista?: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
    role?: string;
  } | null;
  /** Valor do telefone formatado para exibição */
  telefone: string;
  /** Mensagem de erro de validação do telefone */
  phoneError: string;
  /** Role atualmente selecionada no CustomSelector */
  selectedRole: UserRoleType | "";
  /** Lista de roles disponíveis baseadas na hierarquia do usuário */
  availableRoles: Array<{ display: string; value: string }>;
  /** Estado de carregamento para desabilitar campos */
  isLoading: boolean;
  /** Indica se está no modo edição (controla exibição do CustomSelector) */
  isEditing?: boolean;
  /** Callback para mudanças no campo telefone */
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback para seleção de role no CustomSelector */
  onRoleSelect: (role: UserRoleType) => void;
  /** Callback para mudanças nos campos de input (nome e email) */
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Componente Formulário de Dados Pessoais
 *
 * Renderiza os campos essenciais para dados pessoais do escalista com
 * validação em tempo real e formatação automática.
 */
export function EscalistaPersonalForm({
  escalista,
  telefone,
  phoneError,
  selectedRole,
  availableRoles,
  isLoading,
  isEditing = false, // Valor padrão: modo criação
  onPhoneChange,
  onRoleSelect,
  onInputChange,
}: EscalistaPersonalFormProps) {
  const { currentUserRole, loading: roleLoading } = useFastUserRole();
  const [canEditEscalista, setCanEditEscalista] = useState(true);
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isEditing || !selectedRole || roleLoading) {
        setCanEditEscalista(true);
        return;
      }

      const escalistaRole = selectedRole || "escalista";
      const canManage = await canManageEscalistaFast(
        escalistaRole as UserRoleType
      );
      setCanEditEscalista(canManage);
    };

    checkPermissions();
  }, [selectedRole, isEditing, currentUserRole, roleLoading]);
  console.log("🔐 escalista Email :", escalista?.email);
  return (
    <div className="space-y-4">
      {/* Campo Nome - obrigatório */}
      <Input
        label="Nome *"
        id="nome"
        name="nome"
        placeholder="Nome do escalista"
        defaultValue={escalista?.nome || ""}
        onChange={onInputChange}
        required
        disabled={isLoading || !canEditEscalista}
      />

      {/* Campo Telefone - com validação e formatação */}
      <div>
        <Input
          label="Telefone"
          id="telefone"
          name="telefone"
          placeholder="(XX) XXXXX-XXXX"
          value={telefone} // Valor controlado para formatação
          onChange={onPhoneChange} // Handler com formatação automática
          maxLength={15} // Limite para formato brasileiro
          className={phoneError ? "border-red-500" : ""} // Feedback visual de erro
          disabled={isLoading || !canEditEscalista}
        />
        {/* Exibição do erro de validação */}
        {phoneError && (
          <p className="text-red-500 text-sm mt-1">{phoneError}</p>
        )}
      </div>

      {/* Campo Email */}
      <Input
        label="E-mail"
        id="email"
        name="email"
        type="email"
        placeholder="E-mail"
        defaultValue={escalista?.email || ""}
        onChange={onInputChange}
        disabled={isEditing || isLoading || !canEditEscalista}
      />

      {/* Seletor de Cargo - apenas no modo edição */}
      {isEditing && (
        <CustomSelector
          label="Cargo"
          options={availableRoles}
          selectedValue={selectedRole}
          onValueChange={(role) => {
            onRoleSelect(role as UserRoleType);
          }}
          placeholder={escalista?.role}
          disabled={isLoading || !canEditEscalista}
        />
      )}

      {/* Mensagem informativa quando não pode editar */}
      {!canEditEscalista && isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="text-amber-800 text-sm">
            <strong>Permissão limitada:</strong> Você não pode editar este
            escalista pois ele possui hierarquia igual ou superior à sua.
          </p>
        </div>
      )}
    </div>
  );
}

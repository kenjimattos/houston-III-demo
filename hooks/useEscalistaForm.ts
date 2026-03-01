/**
 * Hook de Gerenciamento do Formulário de Escalistas
 *
 * Hook personalizado que centraliza toda a lógica relacionada ao formulário
 * de escalistas, incluindo validação, formatação, submissão e controle de estados.
 *
 * Funcionalidades principais:
 * - Formatação automática de telefone com validação em tempo real
 * - Submissão diferenciada para criação (convite) vs edição (atualização)
 * - Gerenciamento de estados de carregamento e feedback via toast
 * - Integração com serviços de convite e validação
 * - Captura de role selecionada no selector de cargo para atualização
 *
 * Fluxos suportados:
 * 1. CRIAÇÃO: Envia convite por email usando inviteService
 * 2. EDIÇÃO: Atualiza dados existentes + role usando callback onSave
 *
 * Feedback do usuário:
 * - Toast de sucesso para operações bem-sucedidas
 * - Toast de erro para falhas de operação
 * - Toast de erro para validação e erros inesperados
 */

import { UserRoleType } from "@/components/users/user-role-manager";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  formatPhoneDisplay,
  formatPhoneNumber,
  unformatPhoneNumber,
  validatePhone,
} from "@/lib/formatters/phone-formatter";
import { inviteUser } from "@/services/inviteService";
import { InviteUserData } from "@/types/invite";
import { BadgeAlert } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Estrutura de dados para salvamento de escalista
 */
interface EscalistaFormData {
  nome: string;
  telefone: string;
  email: string;
  grupo_id?: string;
  id: string;
  role?: UserRoleType; // Role selecionada no selector de cargo
}

/**
 * Props para configuração do hook useEscalistaForm
 */
interface UseEscalistaFormProps {
  /** Dados do escalista para edição (null = modo criação) */
  escalista?: {
    id: string;
    nome: string;
    telefone?: string;
    escalista_telefone?: string;
    email?: string;
    escalista_email?: string;
  } | null;
  /** ID do grupo para pré-seleção (usado no modo criação) */
  grupoId?: string;
  /** Callback para salvar dados no modo edição */
  onSave: (data: EscalistaFormData) => Promise<void>;
  /** Callback executado após operação bem-sucedida */
  onSuccess?: () => void;
  /** Callback executado após mudança de role bem-sucedida */
  onRoleChange?: () => Promise<void>;
}

/**
 * Hook de Formulário de Escalistas
 *
 * Gerencia todo o estado e lógica do formulário de escalistas, incluindo
 * validação, formatação e submissão diferenciada por modo de operação.
 */
export const useEscalistaForm = ({
  escalista,
  grupoId,
  onSave,
  onSuccess,
  onRoleChange,
}: UseEscalistaFormProps) => {
  // Log de debug para verificar os dados recebidos
  console.log("🔧 useEscalistaForm executed with:", {
    escalista,
    grupoId,
  });

  // Determinar modo de operação baseado na presença de dados do escalista
  const isEditing = !!escalista;

  // Hook para buscar role padrão da tabela houston.user_roles
  const {
    userRole,
    loading: roleLoading,
    error: roleError,
    updateRole,
  } = useUserRole(escalista?.id, isEditing);

  // Estados do formulário
  const [telefone, setTelefone] = useState(
    formatPhoneDisplay(
      escalista?.telefone || escalista?.escalista_telefone || ""
    )
  );
  const [phoneError, setPhoneError] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRoleType | "">("");
  const [selectedTable, setSelectedTable] = useState<string | "">("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para controle de mudanças
  const [originalValues, setOriginalValues] = useState({
    nome: escalista?.nome || "",
    telefone: formatPhoneDisplay(
      escalista?.telefone || escalista?.escalista_telefone || ""
    ),
    email: escalista?.email,
    role: "" as UserRoleType | "",
  });
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Sincronizar dados quando escalista ou userRole mudarem
   */
  useEffect(() => {
    const newTelefone = formatPhoneDisplay(
      escalista?.telefone || escalista?.escalista_telefone || ""
    );
    setTelefone(newTelefone);
    setPhoneError("");

    // Atualizar valores originais
    const newOriginalValues = {
      nome: escalista?.nome || "",
      telefone: newTelefone,
      email: escalista?.email,
      role: "" as UserRoleType | "",
    };

    // Popular role padrão a partir da tabela houston.user_roles
    if (isEditing && userRole?.role) {
      setSelectedRole(userRole.role);
      newOriginalValues.role = userRole.role;
      console.log(
        `Role padrão carregada da houston.user_roles: ${userRole.role}`
      );
    } else if (!isEditing) {
      // Limpar role quando não estiver editando
      setSelectedRole("");
    }

    setOriginalValues(newOriginalValues);
    setHasChanges(false); // Reset do estado de mudanças
  }, [escalista, isEditing, userRole]);

  /**
   * Efeito para mostrar erros de carregamento de role
   */
  useEffect(() => {
    if (roleError) {
      console.warn("Erro ao carregar role padrão:", roleError);
      // Não exibir toast de erro, apenas log para debug
      // O usuário pode selecionar manualmente se necessário
    }
  }, [roleError]);

  /**
   * Função para verificar se houve mudanças nos campos
   */
  const checkForChanges = (currentValues: {
    nome?: string;
    telefone?: string;
    email?: string;
    role?: UserRoleType | "";
  }) => {
    const changes =
      (currentValues.nome !== undefined &&
        currentValues.nome !== originalValues.nome) ||
      (currentValues.telefone !== undefined &&
        currentValues.telefone !== originalValues.telefone) ||
      (currentValues.email !== undefined &&
        currentValues.email !== originalValues.email) ||
      (currentValues.role !== undefined &&
        currentValues.role !== originalValues.role);

    setHasChanges(changes);
    return changes;
  };

  /**
   * Handler para mudança de telefone
   * Aplica formatação automática e validação em tempo real
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setTelefone(formatted);

    const error = validatePhone(formatted);
    setPhoneError(error);

    // Verificar mudanças
    if (isEditing) {
      checkForChanges({ telefone: formatted });
    }
  };

  /**
   * Handler para seleção de role
   * Atualiza estado da role selecionada no CustomSelector
   * E automaticamente salva na tabela houston.user_roles quando em modo edição
   */
  const handleRoleSelect = async (role: UserRoleType) => {
    setSelectedRole(role);
    console.log("Role selecionada-->:", role);
    console.log("Role selecionada--> selectedRole:", selectedRole);

    // Verificar mudanças
    if (isEditing) {
      checkForChanges({ role });
    }

    // Se estiver no modo edição, salvar automaticamente usando o serviço
    if (isEditing && escalista) {
      try {
        const success = await updateRole(role);

        if (!success) {
          toast({
            title: "⚠️ Aviso",
            description: `Não foi possível atualizar o cargo automaticamente.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "✅ Cargo Atualizado!",
            description: `Cargo alterado para "${role}" com sucesso.`,
          });
          console.log(
            `Role atualizada automaticamente na houston.user_roles: ${role}`
          );

          // Chamar callback para refetch dos assignments
          if (onRoleChange) {
            await onRoleChange();
          }
        }
      } catch (error) {
        console.error("Erro inesperado ao atualizar role:", error);
        toast({
          title: "Erro",
          description: "Erro inesperado ao atualizar cargo.",
          variant: "destructive",
        });
      }
    }
  };

  const handleTableSelect = (table: string) => {
    setSelectedTable(table);
  };

  /**
   * Handler para mudanças nos campos de input (nome e email)
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔧 handleInputChange called:", {
      name: e.target.name,
      value: e.target.value,
    });
    if (isEditing) {
      const { name, value } = e.target;
      checkForChanges({ [name]: value });
    }
  };

  /**
   * Handler principal para submissão do formulário
   *
   * Executa fluxos diferentes baseado no modo de operação:
   * - CRIAÇÃO: Envia convite usando inviteService
   * - EDIÇÃO: Atualiza dados usando callback onSave
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validação final do telefone antes da submissão
    const phoneValidationError = validatePhone(telefone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return;
    }

    setIsLoading(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      console.log("📋 FormData entries:");
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: "${value}"`);
      }

      // Log específico para email (campos desabilitados não aparecem no FormData)
      const emailFromForm = formData.get("email") as string;
      const emailFallback =
        escalista?.email || escalista?.escalista_email || "";
      console.log("📧 Email debug:", {
        fromFormData: emailFromForm,
        fromEscalista: emailFallback,
        finalValue: emailFromForm || emailFallback,
      });

      if (isEditing && escalista) {
        // MODO EDIÇÃO - Atualizar dados existentes
        const updateData: EscalistaFormData = {
          nome: formData.get("nome") as string,
          telefone: unformatPhoneNumber(telefone),
          email:
            (formData.get("email") as string) ||
            escalista.email ||
            escalista.escalista_email ||
            "",
          grupo_id: grupoId,
          id: escalista.id,
          // Role não é incluída aqui pois já foi salva automaticamente pelo handleRoleSelect
        };
        console.log("Dados para atualização:", updateData);
        await onSave(updateData);

        // No modo de edição, o toast e reload são gerenciados pelo handleSaveEscalista
        // Não chamamos onSuccess para manter o modal aberto
      } else {
        // MODO CRIAÇÃO - Enviar convite para novo escalista
        const finalData: InviteUserData = {
          platform: "houston",
          name: formData.get("nome") as string,
          phone: unformatPhoneNumber(telefone),
          email: formData.get("email") as string,
          grupo_id: grupoId || "",
          role: "escalista",
        };

        const result = await inviteUser(finalData);

        if (result.error) {
          console.error("Erro ao enviar convite:", result.error);
          // Exibir toast de erro

          toast({
            icon: BadgeAlert,
            title: "Erro ao Enviar Convite",
            description:
              typeof result.error === "string"
                ? result.error
                : "Ocorreu um erro inesperado ao enviar o convite.",
            variant: "destructive", // Toast vermelho para erro
          });
          return;
        }

        console.log("Convite enviado com sucesso:", result.data);

        // Exibir toast de sucesso para convite
        toast({
          title: "✅ Convite Enviado!",
          description:
            "O convite foi enviado com sucesso para o email do escalista. Ele receberá as instruções para criar sua conta.",
          // Sem variant = toast verde (padrão de sucesso)
        });

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
      // Exibir toast de erro geral
      toast({
        title: "❌ Erro Inesperado",
        description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
        variant: "destructive", // Toast vermelho para erro
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Retorno do hook - interface pública
  return {
    // Estados principais
    telefone, // Telefone formatado para exibição
    phoneError, // Mensagem de erro de validação do telefone
    selectedRole, // Role selecionada no CustomSelector (populated from houston.user_roles)
    isLoading: isLoading || roleLoading, // Estado de carregamento durante operações (incluindo loading da role)
    isEditing, // Modo de operação (criação vs edição)
    hasChanges, // Indica se houve mudanças nos dados (apenas no modo edição)

    // Handlers de eventos
    handlePhoneChange, // Handler para formatação do telefone
    handleRoleSelect, // Handler para seleção de role
    handleSubmit, // Handler principal de submissão
    handleTableSelect, // Handler para seleção de tabela
    handleInputChange, // Handler para mudanças nos inputs de nome e email

    // Estados extras do userRole hook
    userRole, // Dados completos da role da tabela houston.user_roles
    roleError, // Erro de carregamento da role (para debug)
  };
};

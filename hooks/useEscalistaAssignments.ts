/**
 * Hook de Gerenciamento de Atribuições de Escalistas
 *
 * Hook personalizado que gerencia todas as atribuições de escalistas a grupos,
 * hospitais e setores. Configura dinamicamente abas de interface e integra
 * com múltiplos hooks especializados para operações de CRUD.
 *
 * Responsabilidades principais:
 * - Carregar dados de dropdowns (grupos, hospitais, setores)
 * - Gerenciar atribuições atuais do escalista
 * - Configurar estrutura dinâmica de abas
 * - Coordenar operações de adicionar/remover atribuições
 * - Integrar com useUserAssignmentManager para operações de backend
 * - Verificar permissões para mostrar/ocultar funcionalidades de atribuição
 *
 * Apenas utilizado no modo edição - otimizado para carregamento sob demanda.
 * Requer permissão MEMBERS_UPDATE para exibir as abas de atribuições.
 */

import {
  CustomTabContent,
  CustomTabList,
} from "@/components/custom-tab/custom-tab";
import { AssignmentsRowProps } from "@/components/escalistas/assigments-row";
import { toast } from "@/hooks/use-toast";
import { UserRoleType } from "@/components/users/user-role-manager";
import { useGroups } from "@/hooks/useGroups";
import { useHospitals } from "@/hooks/useHospitals";
import { usePermissions } from "@/hooks/usePermissions";
import { useSetores } from "@/hooks/useSetores";
import {
  ActionResponse,
  useUserAssignmentManager,
} from "@/hooks/useUserAssignmentManager";
import { Permission } from "@/types/permission";
import { Group, Hospital, Setor } from "@/types/user-roles-shared";
import { Building2, MapPin, Users } from "lucide-react";
import React, { useEffect } from "react";

/**
 * Props para configuração do hook useEscalistaAssignments
 */
interface UseEscalistaAssignmentsProps {
  /** Dados do escalista (necessário para carregar atribuições) */
  escalista?: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
  } | null;
  /** Estado de abertura do modal (otimização de carregamento) */
  open: boolean;
  /** Estado de carregamento geral (desabilita ações) */
  isLoading: boolean;

  defaultRole?: UserRoleType; // Padrão: "escalista"
}

/**
 * Hook de Atribuições de Escalistas
 *
 * Coordena todos os aspectos relacionados às atribuições de escalistas,
 * desde o carregamento de dados até a configuração da interface de abas.
 *
 * Sistema de Permissões:
 * - Integra com usePermissions() para verificar Permission.MEMBERS_UPDATE
 * - Retorna hasAssignmentPermission para controle condicional no UI
 * - Quando sem permissão, as abas são ocultadas e feedback é exibido
 */
export const useEscalistaAssignments = ({
  escalista,
  open,
  isLoading,
  defaultRole = "escalista",
}: UseEscalistaAssignmentsProps) => {
  // Hook de permissões para controlar visibilidade das abas
  const { has } = usePermissions();
  const canUpdateMembers = has(Permission.MEMBERS_UPDATE);

  // Hooks especializados para carregamento de dados dos dropdowns
  const {
    groups: availableGroups,
    loading: groupsLoading,
    error: groupsError,
    loadGroups,
  } = useGroups();

  const {
    hospitals: availableHospitals,
    loading: hospitalsLoading,
    error: hospitalsError,
    loadHospitals,
  } = useHospitals();

  const {
    setores: availableSetores,
    loading: setoresLoading,
    error: setoresError,
    loadSetores,
  } = useSetores({ autoLoad: false });

  // Hook para gerenciar atribuições
  const {
    currentAssignments,
    getGroupName,
    handleRemoveFromGroup,
    getHospitalName,
    handleRemoveFromHospital,
    getSetorName,
    handleRemoveFromSetor,
    availableRoles: assignmentAvailableRoles,
    handleAddToGroup,
    handleAddToHospital,
    handleAddToSetor,
    isValidGroup,
    isValidHospital,
    isValidSetor,
    selectedRole: assignmentSelectedRole,
    selectedGroup: assignmentSelectedGroup,
    selectedHospital: assignmentSelectedHospital,
    selectedSetor: assignmentSelectedSetor,
    setSelectedRole: setAssignmentSelectedRole,
    setSelectedGroup: setAssignmentSelectedGroup,
    setSelectedHospital: setAssignmentSelectedHospital,
    setSelectedSetor: setAssignmentSelectedSetor,
    successMessage,
    refetchAssignments,
  } = useUserAssignmentManager(
    {
      id: escalista?.id ?? "",
      email: escalista?.email ?? "",
      name: escalista?.nome,
    },
    open
  );

  // Carregar dados dos dropdowns quando modal abrir
  useEffect(() => {
    if (open) {
      if (availableGroups.length === 0) {
        loadGroups();
      }
      if (availableHospitals.length === 0) {
        loadHospitals();
      }
      if (availableSetores.length === 0) {
        loadSetores();
      }
    }
  }, [
    open,
    availableGroups.length,
    availableHospitals.length,
    availableSetores.length,
    loadGroups,
    loadHospitals,
    loadSetores,
  ]);

  // Handlers para adicionar atribuições
  const handleGroupAdd = async (): Promise<ActionResponse> => {
    console.log("🚀 handleGroupAdd called");
    const response = await handleAddToGroup(defaultRole);
    console.log("📊 Response:", response);

    // Exibir toast baseado na resposta
    if (response.success) {
      console.log("✅ Calling success toast");
      toast({
        title: "Sucesso",
        description:
          response.message || "Usuário adicionado ao grupo com sucesso!",
        variant: "default",
      });
      console.log("✅ Success toast called");
    } else {
      console.log("❌ Calling error toast");
      toast({
        title: "Erro",
        description: response.message || "Erro ao adicionar usuário ao grupo.",
        variant: "destructive",
      });
      console.log("❌ Error toast called");
    }

    return response;
  };

  const handleHospitalAdd = async (): Promise<ActionResponse> => {
    const response = await handleAddToHospital(defaultRole);

    // Exibir toast baseado na resposta
    if (response.success) {
      toast({
        title: "Sucesso",
        description:
          response.message || "Usuário adicionado ao hospital com sucesso!",
        variant: "default",
      });
    } else {
      toast({
        title: "Erro",
        description:
          response.message || "Erro ao adicionar usuário ao hospital.",
        variant: "destructive",
      });
    }

    return response;
  };

  const handleSetorAdd = async (): Promise<ActionResponse> => {
    const response = await handleAddToSetor(defaultRole);

    // Exibir toast baseado na resposta
    if (response.success) {
      toast({
        title: "Sucesso",
        description:
          response.message || "Usuário adicionado ao setor com sucesso!",
        variant: "default",
      });
    } else {
      toast({
        title: "Erro",
        description: response.message || "Erro ao adicionar usuário ao setor.",
        variant: "destructive",
      });
    }

    return response;
  };

  // Função para organizar atribuições por tipo
  const getAllAssignments = () => {
    const groups = currentAssignments.map((assignment) =>
      assignment.grupo_ids.map((groupId: string) => {
        const currentAssignment: AssignmentsRowProps = {
          assignment,
          table: {
            id: groupId,
            name: getGroupName(groupId),
          },
          handleRemove: async (role, groupId) => {
            const response = await handleRemoveFromGroup(role, groupId);

            // Exibir toast baseado na resposta
            if (response.success) {
              toast({
                title: "Sucesso",
                description:
                  response.message || "Usuário removido do grupo com sucesso!",
                variant: "default",
              });
            } else {
              toast({
                title: "Erro",
                description:
                  response.message || "Erro ao remover usuário do grupo.",
                variant: "destructive",
              });
            }
          },
          isLoading,
        };
        return currentAssignment;
      })
    );

    const hospitals = currentAssignments.map((assignment) =>
      assignment.hospital_ids.map((hospitalId) => {
        const currentAssignment: AssignmentsRowProps = {
          assignment,
          table: {
            id: hospitalId,
            name: getHospitalName(hospitalId),
          },
          handleRemove: async (role, hospitalId) => {
            const response = await handleRemoveFromHospital(role, hospitalId);

            // Exibir toast baseado na resposta
            if (response.success) {
              toast({
                title: "Sucesso",
                description:
                  response.message ||
                  "Usuário removido do hospital com sucesso!",
                variant: "default",
              });
            } else {
              toast({
                title: "Erro",
                description:
                  response.message || "Erro ao remover usuário do hospital.",
                variant: "destructive",
              });
            }
          },
          isLoading,
        };
        return currentAssignment;
      })
    );

    const setores = currentAssignments.map((assignment) =>
      assignment.setor_ids.map((setorId) => {
        const currentAssignment: AssignmentsRowProps = {
          assignment,
          table: {
            id: setorId,
            name: getSetorName(setorId),
          },
          handleRemove: async (role, setorId) => {
            const response = await handleRemoveFromSetor(role, setorId);

            // Exibir toast baseado na resposta
            if (response.success) {
              toast({
                title: "Sucesso",
                description:
                  response.message || "Usuário removido do setor com sucesso!",
                variant: "default",
              });
            } else {
              toast({
                title: "Erro",
                description:
                  response.message || "Erro ao remover usuário do setor.",
                variant: "destructive",
              });
            }
          },
          isLoading,
        };
        return currentAssignment;
      })
    );

    return {
      assignedGroup: groups.flat(),
      assignedHospitals: hospitals.flat(),
      assignedSetors: setores.flat(),
    };
  };

  const { assignedGroup, assignedHospitals, assignedSetors } =
    getAllAssignments();
  // Configuração dos menus das tabs
  const tabsMenu: CustomTabList[] = [
    {
      value: "groups",
      label: "Grupos",
      icon: React.createElement(Users),
      content: has(Permission.GROUP_ADD)
        ? {
            placeHolder: "Selecione um grupo...",
            assigmentLabel: "Grupos",
            assignments: assignedGroup,
            handleActionClick: handleGroupAdd,
            label: "Adicionar a Grupo",
            disabledActionButton:
              !defaultRole ||
              !assignmentSelectedGroup ||
              !isValidGroup(assignmentSelectedGroup) ||
              isLoading,
            secondFieldOptions: {
              options: availableGroups.map((group: Group) => ({
                display: group.name,
                value: group.id,
              })),
              selectedValue: assignmentSelectedGroup,
              onValueChange: (value: string) => {
                if (isValidGroup(value)) {
                  setAssignmentSelectedGroup(value);
                }
              },
            },
          }
        : undefined,
    },
    {
      value: "hospitals",
      label: "Hospitais",
      icon: React.createElement(Building2),
      content: {
        placeHolder: "Selecione um hospital...",
        assigmentLabel: "Hospitais",
        assignments: assignedHospitals,

        handleActionClick: handleHospitalAdd,
        label: "Adicionar a Hospital",
        disabledActionButton:
          !defaultRole ||
          !assignmentSelectedHospital ||
          !isValidHospital(assignmentSelectedHospital) ||
          isLoading,
        secondFieldOptions: {
          options: availableHospitals.map((hospital: Hospital) => ({
            display: hospital.name,
            value: hospital.id,
          })),
          selectedValue: assignmentSelectedHospital,
          onValueChange: (value: string) => {
            if (isValidHospital(value)) {
              setAssignmentSelectedHospital(value);
            }
          },
        },
      },
    },
    {
      value: "setores",
      label: "Setores",
      icon: React.createElement(MapPin),
      content: {
        placeHolder: "Selecione um setor...",
        assigmentLabel: "Setores",
        assignments: assignedSetors,
        handleActionClick: handleSetorAdd,
        label: "Adicionar a Setor",
        disabledActionButton:
          !defaultRole ||
          !assignmentSelectedSetor ||
          !isValidSetor(assignmentSelectedSetor) ||
          isLoading,
        secondFieldOptions: {
          options: availableSetores.map((setor: Setor) => ({
            display: setor.name,
            value: setor.id,
          })),
          selectedValue: assignmentSelectedSetor,
          onValueChange: (value: string) => {
            if (isValidSetor(value)) {
              setAssignmentSelectedSetor(value);
            }
          },
        },
      },
    },
  ];

  // Configuração do conteúdo das tabs
  const tabContent: CustomTabContent[] = [
    ...(has(Permission.MEMBERS_UPDATE)
      ? [
          {
            placeHolder: "Selecione um grupo...",
            assigmentLabel: "Grupos",
            assignments: assignedGroup,
            handleActionClick: handleGroupAdd,
            label: "Adicionar a Grupo",
            disabledActionButton:
              !defaultRole ||
              !assignmentSelectedGroup ||
              !isValidGroup(assignmentSelectedGroup) ||
              isLoading,
            secondFieldOptions: {
              options: availableGroups.map((group: Group) => ({
                display: group.name,
                value: group.id,
              })),
              selectedValue: assignmentSelectedGroup,
              onValueChange: (value: string) => {
                if (isValidGroup(value)) {
                  setAssignmentSelectedGroup(value);
                }
              },
            },
          },
        ]
      : []),
    {
      placeHolder: "Selecione um hospital...",
      assigmentLabel: "Hospitais",
      assignments: assignedHospitals,

      handleActionClick: handleHospitalAdd,
      label: "Adicionar a Hospital",
      disabledActionButton:
        !defaultRole ||
        !assignmentSelectedHospital ||
        !isValidHospital(assignmentSelectedHospital) ||
        isLoading,
      secondFieldOptions: {
        options: availableHospitals.map((hospital: Hospital) => ({
          display: hospital.name,
          value: hospital.id,
        })),
        selectedValue: assignmentSelectedHospital,
        onValueChange: (value: string) => {
          if (isValidHospital(value)) {
            setAssignmentSelectedHospital(value);
          }
        },
      },
    },
    {
      assigmentLabel: "Setores",
      placeHolder: "Selecione um setor...",
      assignments: assignedSetors,

      handleActionClick: handleSetorAdd,
      label: "Adicionar a Setor",
      disabledActionButton:
        !defaultRole ||
        !assignmentSelectedSetor ||
        !isValidSetor(assignmentSelectedSetor) ||
        isLoading,
      secondFieldOptions: {
        options: availableSetores.map((setor: Setor) => ({
          display: setor.name,
          value: setor.id,
        })),
        selectedValue: assignmentSelectedSetor,
        onValueChange: (value: string) => {
          if (isValidSetor(value)) {
            setAssignmentSelectedSetor(value);
          }
        },
      },
    },
  ];

  return {
    tabsMenu,
    currentAssignments,
    refetchAssignments,
  };
};

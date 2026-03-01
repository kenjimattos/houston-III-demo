import { useState, useEffect, useCallback, useRef } from "react";
import {
  UserRoleType,
  UserWithRoles,
  UserAssignment,
} from "@/types/user-roles-shared";
import { useGroups } from "./useGroups";
import { useHospitals } from "./useHospitals";
import { useSetoresDropdown } from "./useSetores";
import { useUserRoleHierarchy } from "./useUserRoleHierarchy";
import { useUserRoles } from "./useUserRoles";
import { UserGroupService } from "@/services/userGroupService";
import { UserHospitalService } from "@/services/userHospitalService";
import { UserRoleService } from "@/services/userRoleService";
import { UserSetorService } from "@/services/userSetorService";

export interface ActionResponse {
  success: boolean;
  message?: string;
}
interface UseUserAssignmentManagerReturn {
  // Estados principais
  currentAssignments: UserAssignment[];
  isLoading: boolean;
  showSuccessModal: boolean;
  successMessage: string;

  // Seleções
  selectedRole: UserRoleType;
  selectedGroup: string;
  selectedHospital: string;
  selectedSetor: string;

  // Dados dos dropdowns
  availableGroups: any[];
  availableHospitals: any[];
  availableSetores: any[];
  availableRoles: any[];
  groupsLoading: boolean;
  hospitalsLoading: boolean;
  setoresLoading: boolean;
  groupsError: string | null;
  hospitalsError: string | null;
  setoresError: string | null;

  // Actions
  setSelectedRole: (role: UserRoleType) => void;
  setSelectedGroup: (groupId: string) => void;
  setSelectedHospital: (hospitalId: string) => void;
  setSelectedSetor: (setorId: string) => void;
  setShowSuccessModal: (show: boolean) => void;

  // Assignment operations
  handleAddToGroup: (role?: UserRoleType) => Promise<ActionResponse>;
  handleRemoveFromGroup: (
    role: UserRoleType,
    groupId: string
  ) => Promise<ActionResponse>;
  handleAddToHospital: (role?: UserRoleType) => Promise<ActionResponse>;
  handleRemoveFromHospital: (
    role: UserRoleType,
    hospitalId: string
  ) => Promise<ActionResponse>;
  handleAddToSetor: (role?: UserRoleType) => Promise<ActionResponse>;
  handleRemoveFromSetor: (
    role: UserRoleType,
    setorId: string
  ) => Promise<ActionResponse>;

  // Helper functions
  isValidGroup: (groupId: string) => boolean;
  isValidHospital: (hospitalId: string) => boolean;
  isValidSetor: (setorId: string) => boolean;
  getGroupName: (groupId: string) => string;
  getHospitalName: (hospitalId: string) => string;
  getSetorName: (setorId: string) => string;
  updateUserRole: (newRole: UserRoleType) => Promise<void>;
  refetchAssignments: () => Promise<void>;
  deafaultRole?: UserRoleType;
}

export const useUserAssignmentManager = (
  user: UserWithRoles | null,
  open: boolean,
  role?: UserRoleType
): UseUserAssignmentManagerReturn => {
  // Hook otimizado para carregar roles do usuário
  const {
    userRoles: currentAssignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useUserRoles({
    userId: user?.id,
    autoLoad: open && !!user?.id,
    loadOnUserChange: true,
  });

  // Hooks para carregar dados dinamicamente
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
  } = useSetoresDropdown();

  // Hook para gerenciar hierarquia de roles
  const { availableRoles } = useUserRoleHierarchy();

  // Estados locais
  const [selectedRole, setSelectedRole] = useState<UserRoleType>("escalista");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [selectedSetor, setSelectedSetor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Combinar estados de loading
  const combinedLoading = isLoading || assignmentsLoading;

  // Refs para controlar carregamentos únicos e evitar requisições desnecessárias
  const hasLoadedGroups = useRef(false);
  const hasLoadedHospitals = useRef(false);
  const hasLoadedSetores = useRef(false);

  // Atualizar selectedRole quando availableRoles mudar
  useEffect(() => {
    if (
      availableRoles.length > 0 &&
      !availableRoles.some((role) => role.value === selectedRole)
    ) {
      setSelectedRole(availableRoles[0].value as UserRoleType);
    }
  }, [availableRoles, selectedRole]);

  // Funções helper para validar seleções
  const isValidGroup = useCallback((groupId: string): boolean => {
    return Boolean(groupId && !groupId.startsWith("__"));
  }, []);

  const isValidHospital = useCallback((hospitalId: string): boolean => {
    return Boolean(hospitalId && !hospitalId.startsWith("__"));
  }, []);

  const isValidSetor = useCallback((setorId: string): boolean => {
    return Boolean(setorId && !setorId.startsWith("__"));
  }, []);

  // Carregar dados quando modal abrir - OTIMIZADO para evitar requisições desnecessárias
  useEffect(() => {
    if (!open || !user) return;

    // Carregar dados dos dropdowns apenas uma vez por sessão
    if (!hasLoadedGroups.current && availableGroups.length === 0) {
      loadGroups();
      hasLoadedGroups.current = true;
    }

    if (!hasLoadedHospitals.current && availableHospitals.length === 0) {
      loadHospitals();
      hasLoadedHospitals.current = true;
    }

    if (!hasLoadedSetores.current && availableSetores.length === 0) {
      loadSetores();
      hasLoadedSetores.current = true;
    }
  }, [
    open,
    user?.id,
    availableGroups.length,
    availableHospitals.length,
    availableSetores.length,
    loadGroups,
    loadHospitals,
    loadSetores,
  ]);

  // Operações de grupo
  const handleAddToGroup = useCallback(
    async (role?: UserRoleType): Promise<ActionResponse> => {
      if (!user || !selectedRole || !isValidGroup(selectedGroup)) {
        return {
          success: false,
          message: "Dados inválidos para adicionar usuário ao grupo.",
        };
      }
      const getGroupName = availableGroups.find(
        (g: any) => g.id === selectedGroup
      )?.name;
      setIsLoading(true);

      try {
        // Verificar se assignment já existe
        const assigmentAlreadyExists = currentAssignments.some((assignment) =>
          assignment.grupo_ids.includes(selectedGroup)
        );

        if (assigmentAlreadyExists) {
          setIsLoading(false);
          setSuccessMessage(`Usuário já está atribuído ao ${getGroupName}.`);
          setShowSuccessModal(true);
          return {
            success: false,
            message: `Usuário já está atribuído ao ${getGroupName}.`,
          };
        }
        const result = await UserGroupService.addUserToGroup({
          user_id: user.id,
          role: role || selectedRole,
          grupo_id: selectedGroup,
        });

        if (result.success) {
          setSuccessMessage("Usuário adicionado ao grupo com sucesso!");
          setShowSuccessModal(true);
          setSelectedGroup("");
          await refetchAssignments();

          return {
            success: true,
            message: `Usuário adicionado ao ${getGroupName} com sucesso!`,
          };
        } else {
          console.error("Erro ao adicionar usuário ao grupo:", result.error);
          return {
            success: false,
            message: "Erro ao adicionar usuário ao grupo.",
          };
        }
      } catch (error) {
        console.error("Erro ao adicionar usuário ao grupo:", error);
        return {
          success: false,
          message: "Erro ao adicionar usuário ao grupo.",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, selectedRole, selectedGroup, isValidGroup, refetchAssignments]
  );

  const handleRemoveFromGroup = useCallback(
    async (role: UserRoleType, groupId: string): Promise<ActionResponse> => {
      if (!user) {
        return {
          success: false,
          message: "Usuário não encontrado.",
        };
      }

      setIsLoading(true);
      try {
        const result = await UserGroupService.removeUserFromGroup(
          user.id,
          role,
          groupId
        );

        if (result.success) {
          setSuccessMessage("Usuário removido do grupo com sucesso!");
          setShowSuccessModal(true);
          await refetchAssignments();
          return {
            success: true,
            message: "Usuário removido do grupo com sucesso!",
          };
        } else {
          console.error("Erro ao remover usuário do grupo:", result.error);
          return {
            success: false,
            message: "Erro ao remover usuário do grupo.",
          };
        }
      } catch (error) {
        console.error("Erro ao remover usuário do grupo:", error);
        return {
          success: false,
          message: "Erro ao remover usuário do grupo.",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, refetchAssignments]
  );

  // Operações de hospital
  const handleAddToHospital = useCallback(
    async (role?: UserRoleType): Promise<ActionResponse> => {
      if (!user || !selectedRole || !isValidHospital(selectedHospital)) {
        return {
          success: false,
          message: "Dados inválidos para adicionar usuário ao hospital.",
        };
      }

      setIsLoading(true);
      try {
        // Verificar se assignment já existe
        const getHospitalName = availableHospitals.find(
          (h: any) => h.id === selectedHospital
        )?.name;
        const assigmentAlreadyExists = currentAssignments.some((assignment) =>
          assignment.hospital_ids.includes(selectedHospital)
        );

        if (assigmentAlreadyExists) {
          setIsLoading(false);
          setSuccessMessage("Usuário já está atribuído a este hospital.");
          return {
            success: false,
            message: `Usuário já está atribuído ao ${getHospitalName}.`,
          };
        }
        const result = await UserHospitalService.addUserToHospital({
          user_id: user.id,
          role: role ?? selectedRole ?? "escalista",
          hospital_id: selectedHospital,
        });

        if (result.success) {
          setSuccessMessage("Usuário adicionado ao hospital com sucesso!");
          setShowSuccessModal(true);
          setSelectedHospital("");
          await refetchAssignments();
          return {
            success: true,
            message: `Usuário adicionado ao ${getHospitalName} com sucesso!`,
          };
        } else {
          console.error("Erro ao adicionar usuário ao hospital:", result.error);
          return {
            success: false,
            message: `Erro ao adicionar usuário ao ${getHospitalName}.`,
          };
        }
      } catch (error) {
        console.error("Erro ao adicionar usuário ao hospital:", error);
        return {
          success: false,
          message: "Erro ao adicionar usuário ao hospital.",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [
      user?.id,
      selectedRole,
      selectedHospital,
      isValidHospital,
      refetchAssignments,
    ]
  );

  const handleRemoveFromHospital = useCallback(
    async (role: UserRoleType, hospitalId: string): Promise<ActionResponse> => {
      if (!user) {
        return {
          success: false,
          message: "Usuário não encontrado.",
        };
      }

      setIsLoading(true);
      try {
        const result = await UserHospitalService.removeUserFromHospital(
          user.id,
          role,
          hospitalId
        );

        if (result.success) {
          setSuccessMessage("Usuário removido do hospital com sucesso!");
          setShowSuccessModal(true);
          await refetchAssignments();
          return {
            success: true,
            message: "Usuário removido do hospital com sucesso!",
          };
        } else {
          console.error("Erro ao remover usuário do hospital:", result.error);
          return {
            success: false,
            message: "Erro ao remover usuário do hospital.",
          };
        }
      } catch (error) {
        console.error("Erro ao remover usuário do hospital:", error);
        return {
          success: false,
          message: "Erro ao remover usuário do hospital.",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, refetchAssignments]
  );

  // Operações de setor
  const handleAddToSetor = useCallback(
    async (role?: UserRoleType): Promise<ActionResponse> => {
      if (!user || !selectedRole || !isValidSetor(selectedSetor)) {
        return {
          success: false,
          message: "Dados inválidos para adicionar usuário ao setor.",
        };
      }

      setIsLoading(true);
      try {
        const getSetorName = availableSetores.find(
          (s: any) => s.id === selectedSetor
        )?.name;
        const assigmentAlreadyExists = currentAssignments[0].setor_ids.some(
          (assignment) => {
            return assignment === selectedSetor;
          }
        );

        if (assigmentAlreadyExists) {
          setIsLoading(false);
          setSuccessMessage("Usuário já está atribuído a este setor.");
          return {
            success: false,
            message: `Usuário já está atribuído a este ${getSetorName}.`,
          };
        }
        const result = await UserSetorService.addUserToSetor({
          user_id: user.id,
          role: role || selectedRole,
          setor_id: selectedSetor,
        });

        if (result.success) {
          setSuccessMessage("Usuário adicionado ao setor com sucesso!");
          setShowSuccessModal(true);
          setSelectedSetor("");
          await refetchAssignments();
          return {
            success: true,
            message: `Usuário adicionado ao ${getSetorName} com sucesso!`,
          };
        } else {
          console.error("Erro ao adicionar usuário ao setor:", result.error);
          return {
            success: false,
            message: `Erro ao adicionar usuário ao ${getSetorName}.`,
          };
        }
      } catch (error) {
        console.error("Erro ao adicionar usuário ao setor:", error);
        return {
          success: false,
          message: `Erro ao adicionar usuário ao ${getSetorName}.`,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, selectedRole, selectedSetor, isValidSetor, refetchAssignments]
  );

  const handleRemoveFromSetor = useCallback(
    async (role: UserRoleType, setorId: string): Promise<ActionResponse> => {
      if (!user) {
        return {
          success: false,
          message: "Usuário não encontrado.",
        };
      }

      setIsLoading(true);
      try {
        const result = await UserSetorService.removeUserFromSetor(
          user.id,
          role,
          setorId
        );

        if (result.success) {
          setSuccessMessage("Usuário removido do setor com sucesso!");
          setShowSuccessModal(true);
          await refetchAssignments();
          return {
            success: true,
            message: "Usuário removido do setor com sucesso!",
          };
        } else {
          console.error("Erro ao remover usuário do setor:", result.error);
          return {
            success: false,
            message: "Erro ao remover usuário do setor.",
          };
        }
      } catch (error) {
        console.error("Erro ao remover usuário do setor:", error);
        return {
          success: false,
          message: "Erro ao remover usuário do setor.",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, refetchAssignments]
  );

  // Helper functions para obter nomes
  const getGroupName = useCallback(
    (groupId: string) => {
      return (
        availableGroups.find((g: any) => g.id === groupId)?.name || groupId
      );
    },
    [availableGroups]
  );

  const getHospitalName = useCallback(
    (hospitalId: string) => {
      return (
        availableHospitals.find((h: any) => h.id === hospitalId)?.name ||
        hospitalId
      );
    },
    [availableHospitals]
  );

  const getSetorName = useCallback(
    (setorId: string) => {
      return availableSetores.find((s) => s.id === setorId)?.name || setorId;
    },
    [availableSetores]
  );
  const updateUserRole = useCallback(
    async (newRole: UserRoleType) => {
      if (!user) return;

      setIsLoading(true);
      try {
        const result = await UserRoleService.updateUserRole(user.id, newRole);

        if (result.success) {
          setSuccessMessage("User role updated successfully!");
          setShowSuccessModal(true);
          await refetchAssignments();
        } else {
          console.error("Erro ao atualizar role do usuário:", result.error);
        }
      } catch (error) {
        console.error("Erro ao atualizar role do usuário:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, refetchAssignments]
  );

  return {
    updateUserRole,
    // Estados principais
    currentAssignments,
    isLoading: combinedLoading,
    showSuccessModal,
    successMessage,

    // Seleções
    selectedRole,
    selectedGroup,
    selectedHospital,
    selectedSetor,

    // Dados dos dropdowns
    availableGroups,
    availableHospitals,
    availableSetores,
    availableRoles,
    groupsLoading,
    hospitalsLoading,
    setoresLoading,
    groupsError,
    hospitalsError,
    setoresError,

    // Actions
    setSelectedRole,
    setSelectedGroup,
    setSelectedHospital,
    setSelectedSetor,
    setShowSuccessModal,

    // Assignment operations
    handleAddToGroup,
    handleRemoveFromGroup,
    handleAddToHospital,
    handleRemoveFromHospital,
    handleAddToSetor,
    handleRemoveFromSetor,

    // Helper functions
    isValidGroup,
    isValidHospital,
    isValidSetor,
    getGroupName,
    getHospitalName,
    getSetorName,

    // Refetch function
    refetchAssignments,
  };
};

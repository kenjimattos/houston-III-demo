"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCheck, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useUserRoleHierarchy } from "@/hooks/useUserRoleHierarchy";

// Tipos de roles disponíveis
export type UserRoleType =
  | "administrador"
  | "moderador"
  | "gestor"
  | "coordenador"
  | "escalista";

// Interface para o usuário
interface User {
  id: string;
  email: string;
  name?: string;
  currentRoles?: UserRoleType[];
}

interface UserRoleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onRoleChange?: (
    userId: string,
    newRole: UserRoleType,
    oldRole?: UserRoleType
  ) => void;
  onSuccess?: () => void;
}

// Configuração das roles com labels e descrições
const ROLE_CONFIG: Record<
  UserRoleType,
  { label: string; description: string; color: string }
> = {
  escalista: {
    label: "Escalista",
    description: "Usuário padrão com acesso básico",
    color: "bg-blue-100 text-blue-800",
  },
  administrador: {
    label: "Administrador",
    description: "Acesso administrativo completo",
    color: "bg-purple-100 text-purple-800",
  },
  moderador: {
    label: "Moderador",
    description: "Usuário com permissões de moderação",
    color: "bg-green-100 text-green-800",
  },
  gestor: {
    label: "Gestor",
    description: "Gestor com permissões avançadas",
    color: "bg-yellow-100 text-yellow-800",
  },
  coordenador: {
    label: "Coordenador",
    description: "Coordenador de equipe",
    color: "bg-indigo-100 text-indigo-800",
  },
};

export function UserRoleManager({
  open,
  onOpenChange,
  user,
  onRoleChange,
  onSuccess,
}: UserRoleManagerProps) {
  const [selectedRole, setSelectedRole] = useState<UserRoleType | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRoleSelect = (role: UserRoleType) => {
    setSelectedRole(role);
  };

  const handleConfirmChange = () => {
    if (!selectedRole || !user) return;
    setShowConfirmDialog(true);
  };

  const handleRoleChange = async () => {
    if (!selectedRole || !user) return;

    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      // Aqui você fará a chamada para a API
      const response = await fetch("/api/users/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          role: selectedRole,
          grupo_ids: [],
          hospital_ids: [],
          setor_ids: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao alterar role do usuário");
      }

      // Callback para o componente pai
      if (onRoleChange) {
        onRoleChange(user.id, selectedRole);
      }

      onOpenChange(false);
      setShowSuccessModal(true);
      setSelectedRole("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao alterar role:", error);
      // Aqui você pode adicionar um toast de erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
  };

  const currentRoles = user?.currentRoles || [];
  const hasSelectedRole = currentRoles.includes(selectedRole as UserRoleType);
  const {
    currentUserRole,
    availableRoles,
    loading: roleHierarchyLoading,
    error: roleHierarchyError,
    canAssignRole,
    refreshUserRole,
  } = useUserRoleHierarchy();
  return (
    <>
      {/* Modal Principal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Alterar Role do Usuário
            </DialogTitle>
          </DialogHeader>

          {user && (
            <div className="space-y-4">
              {/* Informações do usuário */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{user.name || user.email}</p>
                <p className="text-xs text-gray-600">{user.email}</p>
              </div>

              {/* Roles atuais */}
              {currentRoles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Roles Atuais:</p>
                  <div className="flex flex-wrap gap-1">
                    {currentRoles.map((role) => (
                      <Badge
                        key={role}
                        className={ROLE_CONFIG[role].color}
                        variant="secondary"
                      >
                        {ROLE_CONFIG[role].label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Seletor de nova role */}
              <div>
                <p className="text-sm font-medium mb-2">Nova Role:</p>
                <Select
                  value={selectedRole}
                  onValueChange={handleRoleSelect}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{role.display}</span>
                          {currentRoles.includes(
                            role.value as UserRoleType
                          ) && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Atual
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Descrição da role selecionada */}
                {selectedRole && (
                  <p className="text-xs text-gray-600 mt-1">
                    {ROLE_CONFIG[selectedRole as UserRoleType].description}
                  </p>
                )}

                {/* Aviso se a role já existe */}
                {hasSelectedRole && selectedRole && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-yellow-700">
                      Usuário já possui esta role
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmChange}
              disabled={!selectedRole || isLoading || hasSelectedRole}
            >
              {isLoading ? "Alterando..." : "Alterar Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Confirmar Alteração
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Deseja realmente alterar a role do usuário{" "}
              <strong>{user?.name || user?.email}</strong> para:
            </p>
            {selectedRole && (
              <Badge
                className={ROLE_CONFIG[selectedRole as UserRoleType].color}
              >
                {ROLE_CONFIG[selectedRole as UserRoleType].label}
              </Badge>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleRoleChange} disabled={isLoading}>
              {isLoading ? "Alterando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso */}
      <SuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        title="Role Alterada!"
        description={`A role do usuário foi alterada para ${
          selectedRole ? ROLE_CONFIG[selectedRole as UserRoleType].label : ""
        } com sucesso.`}
        buttonText="Entendi"
        onClose={handleSuccessModalClose}
      />
    </>
  );
}

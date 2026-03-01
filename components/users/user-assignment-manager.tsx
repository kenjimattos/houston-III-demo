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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Settings, Plus, Minus, MapPin } from "lucide-react";
import {
  UserRoleType,
  UserWithRoles,
  ROLE_CONFIG,
} from "@/types/user-roles-shared";
import { useUserAssignmentManager } from "@/hooks/useUserAssignmentManager";

interface UserAssignmentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  onSuccess?: () => void;
}

export function UserAssignmentManager({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserAssignmentManagerProps) {
  // Hook principal que encapsula toda a lógica
  const {
    // Estados principais
    currentAssignments,
    isLoading,
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
  } = useUserAssignmentManager(user, open);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Gerenciar Atribuições do Usuário
            </DialogTitle>
          </DialogHeader>

          {user && (
            <div className="space-y-4">
              {/* Informações do usuário */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{user.name || user.email}</p>
                <p className="text-xs text-gray-600">{user.email}</p>
              </div>

              <Tabs defaultValue="groups" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger
                    value="groups"
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Grupos
                  </TabsTrigger>
                  <TabsTrigger
                    value="hospitals"
                    className="flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Hospitais
                  </TabsTrigger>
                  <TabsTrigger
                    value="setores"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Setores
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="groups" className="space-y-4">
                  {/* Adicionar a grupo */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">
                      Adicionar a Grupo
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={selectedRole}
                        onValueChange={(value) =>
                          setSelectedRole(value as UserRoleType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.display}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedGroup}
                        onValueChange={(value) => {
                          // Só atualizar se for um valor válido
                          if (isValidGroup(value)) {
                            setSelectedGroup(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              groupsLoading ? "Carregando..." : "Grupo"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {groupsLoading ? (
                            <SelectItem value="__loading__" disabled>
                              Carregando grupos...
                            </SelectItem>
                          ) : groupsError ? (
                            <SelectItem value="__error__" disabled>
                              Erro ao carregar grupos
                            </SelectItem>
                          ) : availableGroups.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              Nenhum grupo encontrado
                            </SelectItem>
                          ) : (
                            availableGroups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() => handleAddToGroup()}
                        disabled={!isValidGroup(selectedGroup) || isLoading}
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Grupos atuais */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">Grupos Atuais</h3>
                    <div className="space-y-2">
                      {currentAssignments.map((assignment) =>
                        assignment.grupo_ids.map((groupId: string) => (
                          <div
                            key={`${assignment.role}-${groupId}`}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={ROLE_CONFIG[assignment.role].color}
                              >
                                {ROLE_CONFIG[assignment.role].label}
                              </Badge>
                              <span className="text-sm">
                                {getGroupName(groupId)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRemoveFromGroup(assignment.role, groupId)
                              }
                              disabled={isLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      {currentAssignments.every(
                        (a) => a.grupo_ids.length === 0
                      ) && (
                        <p className="text-sm text-gray-500">
                          Nenhum grupo atribuído
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hospitals" className="space-y-4">
                  {/* Adicionar a hospital */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">
                      Adicionar a Hospital
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={selectedRole}
                        onValueChange={(value) =>
                          setSelectedRole(value as UserRoleType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.display}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedHospital}
                        onValueChange={(value) => {
                          // Só atualizar se for um valor válido
                          if (isValidHospital(value)) {
                            setSelectedHospital(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              hospitalsLoading ? "Carregando..." : "Hospital"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {hospitalsLoading ? (
                            <SelectItem value="__loading__" disabled>
                              Carregando hospitais...
                            </SelectItem>
                          ) : hospitalsError ? (
                            <SelectItem value="__error__" disabled>
                              Erro ao carregar hospitais
                            </SelectItem>
                          ) : availableHospitals.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              Nenhum hospital encontrado
                            </SelectItem>
                          ) : (
                            availableHospitals.map((hospital) => (
                              <SelectItem key={hospital.id} value={hospital.id}>
                                {hospital.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() => handleAddToHospital()}
                        disabled={
                          !isValidHospital(selectedHospital) || isLoading
                        }
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Hospitais atuais */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">
                      Hospitais Atuais
                    </h3>
                    <div className="space-y-2">
                      {currentAssignments.map((assignment) =>
                        assignment.hospital_ids.map((hospitalId) => (
                          <div
                            key={`${assignment.role}-${hospitalId}`}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={ROLE_CONFIG[assignment.role].color}
                              >
                                {ROLE_CONFIG[assignment.role].label}
                              </Badge>
                              <span className="text-sm">
                                {getHospitalName(hospitalId)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRemoveFromHospital(
                                  assignment.role,
                                  hospitalId
                                )
                              }
                              disabled={isLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      {currentAssignments.every(
                        (a) => a.hospital_ids.length === 0
                      ) && (
                        <p className="text-sm text-gray-500">
                          Nenhum hospital atribuído
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="setores" className="space-y-4">
                  {/* Adicionar a setor */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">
                      Adicionar a Setor
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={selectedRole}
                        onValueChange={(value) =>
                          setSelectedRole(value as UserRoleType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.display}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedSetor}
                        onValueChange={(value) => {
                          // Só atualizar se for um valor válido
                          if (isValidSetor(value)) {
                            setSelectedSetor(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              setoresLoading ? "Carregando..." : "Setor"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {setoresLoading ? (
                            <SelectItem value="__loading__" disabled>
                              Carregando setores...
                            </SelectItem>
                          ) : setoresError ? (
                            <SelectItem value="__error__" disabled>
                              Erro ao carregar setores
                            </SelectItem>
                          ) : availableSetores.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              Nenhum setor encontrado
                            </SelectItem>
                          ) : (
                            availableSetores.map((setor) => (
                              <SelectItem key={setor.id} value={setor.id}>
                                {setor.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={() => handleAddToSetor()}
                        disabled={!isValidSetor(selectedSetor) || isLoading}
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Setores atuais */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-3">Setores Atuais</h3>
                    <div className="space-y-2">
                      {currentAssignments.map((assignment) =>
                        assignment.setor_ids.map((setorId) => (
                          <div
                            key={`${assignment.role}-${setorId}`}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={ROLE_CONFIG[assignment.role].color}
                              >
                                {ROLE_CONFIG[assignment.role].label}
                              </Badge>
                              <span className="text-sm">
                                {getSetorName(setorId)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRemoveFromSetor(assignment.role, setorId)
                              }
                              disabled={isLoading}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      {currentAssignments.every(
                        (a) => a.setor_ids.length === 0
                      ) && (
                        <p className="text-sm text-gray-500">
                          Nenhum setor atribuído
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso */}
      <SuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        title="Operação Realizada!"
        description={successMessage}
        buttonText="Entendi"
        onClose={() => {
          setShowSuccessModal(false);
          if (onSuccess) onSuccess();
        }}
      />
    </>
  );
}

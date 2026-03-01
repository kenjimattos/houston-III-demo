"use client";

import { EscalistaModal } from "@/components/escalistas/escalista-modal";
import { EscalistaTable } from "@/components/escalistas/escalista-table";
import { GroupActionsDropdown } from "@/components/escalistas/group-actions-dropdown";
import { GroupDeleteConfirmationModal } from "@/components/escalistas/group-delete-confirmation-modal";
import { GroupDeleteModal } from "@/components/escalistas/group-delete-modal";
import RequirePermission from "@/components/permissions/RequirePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  addEscalista,
  addGrupo,
  deleteEscalista,
  deleteGrupo,
  Escalista,
  fetchGruposComEscalistas,
  Grupo,
  updateEscalista,
  updateGrupo,
} from "@/services/escalistasService";
import { deleteUser } from "@/services/userService";
import { Permission } from "@/types/permission";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";

// Defina o UUID do grupo "Não informado"
const GRUPO_NAO_INFORMADO_ID = "59f5120a-ac2a-4c5f-a7f3-b5083982b5c6";

// Função para formatar telefone brasileiro
function formatPhoneDisplay(phone: string) {
  if (!phone) return "-";
  const numbers = phone.replace(/\D/g, "");

  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

export default function EscalistasPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalGrupo, setModalGrupo] = useState<{
    open: boolean;
    edit?: Grupo | null;
  }>({ open: false, edit: null });
  const [modalEscalista, setModalEscalista] = useState<{
    open: boolean;
    grupoId?: string;
    edit?: any;
  }>({ open: false, grupoId: undefined });
  const [modalDeleteGrupo, setModalDeleteGrupo] = useState<{
    open: boolean;
    grupo?: Grupo | null;
  }>({ open: false, grupo: null });
  const [modalDeleteGrupoOption, setModalDeleteGrupoOption] = useState<{
    open: boolean;
    grupo?: Grupo | null;
  }>({ open: false, grupo: null });

  function toggleExpand(grupo_id: string) {
    setExpanded(expanded === grupo_id ? null : grupo_id);
  }

  useEffect(() => {
    setLoading(true);
    fetchGruposComEscalistas().then((grupos) => {
      setGrupos(grupos);
      setLoading(false);
    });
  }, []);

  async function handleSaveGrupo(values: any) {
    if (modalGrupo.edit) {
      await updateGrupo(modalGrupo.edit.id, values);
    } else {
      await addGrupo(values);
    }
    setModalGrupo({ open: false, edit: null });
    reload();
  }

  async function handleDeleteGrupo(grupo: Grupo, deleteEscalistas: boolean) {
    if (deleteEscalistas) {
      for (const esc of grupo.escalistas) {
        await deleteUser(esc.id);
      }
    } else {
      for (const esc of grupo.escalistas) {
        await updateEscalista(esc.id, { grupo_id: GRUPO_NAO_INFORMADO_ID });
        await updateEscalista(esc.id, {
          grupo_id: GRUPO_NAO_INFORMADO_ID,
        });
      }
    }
    await deleteGrupo(grupo.id);
    setModalDeleteGrupo({ open: false, grupo: null });
    setModalDeleteGrupoOption({ open: false, grupo: null });
    reload();
  }

  async function handleSaveEscalista(values: any) {
    try {
      if (modalEscalista.edit) {
        console.log("Salvando escalista em modo edição:", modalEscalista.edit);
        // Atualizar apenas os dados básicos do escalista
        // Role é gerenciada automaticamente pelo useEscalistaForm
        await updateEscalista(modalEscalista.edit.id, values);
        console.log("Escalista atualizado:", values);
        // Fechar modal e mostrar toast de sucesso
        setModalEscalista({ open: false });
        toast({
          title: "✅ Sucesso",
          description: "Escalista atualizado com sucesso!",
        });
        reload();
      } else {
        // Modo criação - pode fechar o modal
        await addEscalista(values);
        setModalEscalista({ open: false });
        toast({
          title: "✅ Sucesso",
          description: "Escalista adicionado com sucesso!",
        });
        reload();
      }
    } catch (error) {
      console.error("Erro ao salvar escalista:", error);
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao salvar os dados do escalista.",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteEscalista(escalista_id: string) {
    await deleteUser(escalista_id);
    // await deleteEscalista(escalista_id);
    setModalEscalista({ open: false });
    reload();
  }

  function handleEditEscalista(escalista: Escalista, grupoId: string) {
    setModalEscalista({
      open: true,
      grupoId: grupoId,
      edit: escalista,
    });
  }

  function handleManageEscalista(escalista: any) {
    // TODO: Implementar modal de gerenciamento de roles
    console.log("Gerenciar escalista:", escalista);
  }

  function reload() {
    setLoading(true);
    fetchGruposComEscalistas().then((grupos) => {
      setGrupos(grupos);
      setLoading(false);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-normal tracking-tight">Escalistas</h1>
            <RequirePermission permission={Permission.GROUP_ADD}>
              <Button onClick={() => setModalGrupo({ open: true, edit: null })}>
                Novo Grupo
              </Button>
            </RequirePermission>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Nome do Grupo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Qtd. Escalistas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : grupos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Nenhum grupo encontrado.</TableCell>
                </TableRow>
              ) : (
                // MARK: LISTAGEM DOS GRUPOS
                grupos.map((grupo) => (
                  <React.Fragment key={grupo.id}>
                    <TableRow className="group cursor-pointer hover:bg-gray-50">
                      <TableCell
                        onClick={() => toggleExpand(grupo.id)}
                        className="w-8"
                      >
                        {expanded === grupo.id ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(grupo.id)}>
                        {grupo.nome}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(grupo.id)}>
                        {grupo.responsavel || "-"}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(grupo.id)}>
                        {formatPhoneDisplay(grupo.telefone || "")}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(grupo.id)}>
                        {grupo.email || "-"}
                      </TableCell>
                      <TableCell onClick={() => toggleExpand(grupo.id)}>
                        {grupo.escalistas.length}
                      </TableCell>
                      <TableCell>
                        {grupo.id !== GRUPO_NAO_INFORMADO_ID && (
                          <GroupActionsDropdown
                            grupo={grupo}
                            onEdit={(grupo) =>
                              setModalGrupo({ open: true, edit: grupo })
                            }
                            onDelete={(grupo) =>
                              setModalDeleteGrupo({ open: true, grupo })
                            }
                            onDeleteWithOptions={(grupo) =>
                              setModalDeleteGrupoOption({ open: true, grupo })
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded === grupo.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-normal text-gray-700">
                                Escalistas
                              </span>
                              {/* MARK: CRIAÇÃO DE ESCALISTAS */}
                              <RequirePermission
                                permission={Permission.MEMBERS_ADD}
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setModalEscalista({
                                      open: true,
                                      grupoId: grupo.id,
                                    })
                                  }
                                >
                                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                                  Escalista
                                </Button>
                              </RequirePermission>
                            </div>
                            {/* MARK: COMPONENTE DA TABELA DOS ESCALISTAS */}
                            <EscalistaTable
                              escalistas={grupo.escalistas}
                              grupoId={grupo.id}
                              onEditEscalista={(escalista) =>
                                handleEditEscalista(escalista, grupo.id)
                              }
                              onManageEscalista={handleManageEscalista}
                              formatPhoneDisplay={formatPhoneDisplay}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog
        open={modalGrupo.open}
        onOpenChange={(open) =>
          setModalGrupo({ open, edit: open ? modalGrupo.edit : null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalGrupo.edit ? "Editar Grupo" : "Novo Grupo"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              await handleSaveGrupo({
                nome: form.nome.value,
                responsavel: form.responsavel.value,
                telefone: form.telefone.value,
                email: form.email.value,
              });
            }}
            className="space-y-4"
          >
            <Input
              name="nome"
              placeholder="Nome do grupo"
              defaultValue={modalGrupo.edit?.nome || ""}
              required
            />
            <Input
              name="responsavel"
              placeholder="Responsável"
              defaultValue={modalGrupo.edit?.responsavel || ""}
            />
            <Input
              name="telefone"
              placeholder="Telefone"
              defaultValue={modalGrupo.edit?.telefone || ""}
            />
            <Input
              name="email"
              placeholder="E-mail"
              defaultValue={modalGrupo.edit?.email || ""}
            />
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <GroupDeleteConfirmationModal
        open={modalDeleteGrupoOption.open}
        onOpenChange={(open) =>
          setModalDeleteGrupoOption({
            open,
            grupo: open ? modalDeleteGrupoOption.grupo : null,
          })
        }
        grupo={modalDeleteGrupoOption.grupo}
        onDeleteWithEscalistas={(grupo) => handleDeleteGrupo(grupo, true)}
        onDeleteGroupOnly={(grupo) => handleDeleteGrupo(grupo, false)}
      />
      <GroupDeleteModal
        open={modalDeleteGrupo.open}
        onOpenChange={(open) =>
          setModalDeleteGrupo({
            open,
            grupo: open ? modalDeleteGrupo.grupo : null,
          })
        }
        grupo={modalDeleteGrupo.grupo}
        onDelete={(grupo) => handleDeleteGrupo(grupo, false)}
      />
      <EscalistaModal
        open={modalEscalista.open}
        onOpenChange={(open) => setModalEscalista({ open })}
        escalista={modalEscalista.edit}
        grupoId={modalEscalista.grupoId}
        onSave={handleSaveEscalista}
        onDelete={handleDeleteEscalista}
        onInviteSuccess={reload}
      />
    </div>
  );
}

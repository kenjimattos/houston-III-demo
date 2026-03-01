import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, cn, formatTelefoneBR } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { DoctorNameLink } from "@/components/medicos/doctor-name-link";
import { VagasContextActions } from "@/components/vagas/context-actions/VagasContextActions";
import {
  aprovarCandidatura,
  reprovarCandidatura,
  reconsiderarCandidatura,
  reabrirVaga,
} from "@/services/candidaturasService";
import { Candidatura, VagaCandidatura } from "@/types";

// Interface estendida que inclui os campos da resposta real da API
interface VagaTableRowProps {
  vaga: VagaCandidatura;
  selectedVagas: string[];
  expandedRow: string | null;
  editLoading: boolean;
  onToggleRow: (id: string) => void;
  onToggleVagaSelection: (vagaId: string) => void;
  onOpenJobDetailsModal: (vaga: VagaCandidatura) => void;
  onEditVaga?: (vagaId: string) => Promise<void>;
  onSetSelectedJob: (vaga: any) => void;
  onSetIsEditModalOpen: (open: boolean) => void;
  onSetEditLoading: (loading: boolean) => void;
  onSetTodasVagas: (vagas: any[]) => void;
  onSetVagasToDelete: (vagaIds: string[]) => void;
  onSetDeleteModalOpen: (open: boolean) => void;
  onRefreshData: () => Promise<void>;
  currentPage: number;
  vagasData: any[];
  vagaCandidaturas?: Record<string, any[]>;
}

/**
 * Componente de linha de tabela para exibição de uma vaga.
 *
 * Exibe os dados principais da vaga, permite seleção, expansão para visualizar candidaturas,
 * e oferece ações de contexto como editar, compartilhar, anunciar, alterar status e excluir.
 * Também permite aprovar, reprovar ou reconsiderar candidaturas diretamente na linha expandida.
 *
 * @param vaga - Objeto da vaga a ser exibida.
 * @param selectedVagas - Array de IDs das vagas selecionadas.
 * @param expandedRow - ID da vaga atualmente expandida para exibir candidaturas.
 * @param editLoading - Estado de carregamento para ações de edição.
 * @param onToggleRow - Função chamada ao expandir ou recolher a linha da vaga.
 * @param onToggleVagaSelection - Função chamada ao selecionar ou desselecionar a vaga.
 * @param onOpenJobDetailsModal - Função chamada ao abrir o modal de detalhes da vaga.
 * @param onSetSelectedJob - Função para definir a vaga selecionada para edição.
 * @param onSetIsEditModalOpen - Função para abrir ou fechar o modal de edição.
 * @param onSetEditLoading - Função para definir o estado de carregamento de edição.
 * @param onSetTodasVagas - Função para atualizar a lista de todas as vagas.
 * @param onSetVagasToDelete - Função para definir as vagas a serem excluídas.
 * @param onSetDeleteModalOpen - Função para abrir ou fechar o modal de exclusão.
 *
 * @example
 * ```tsx
 * <VagaTableRow
 *   vaga={vaga}
 *   selectedVagas={selectedVagas}
 *   expandedRow={expandedRow}
 *   editLoading={editLoading}
 *   onToggleRow={handleToggleRow}
 *   onToggleVagaSelection={handleToggleVagaSelection}
 *   onOpenJobDetailsModal={handleOpenJobDetailsModal}
 *   onSetSelectedJob={setSelectedJob}
 *   onSetIsEditModalOpen={setIsEditModalOpen}
 *   onSetEditLoading={setEditLoading}
 *   onSetTodasVagas={setTodasVagas}
 *   onSetVagasToDelete={setVagasToDelete}
 *   onSetDeleteModalOpen={setDeleteModalOpen}
 * />
 * ```
 */
export function VagaTableRow({
  vaga,
  selectedVagas,
  expandedRow,
  editLoading,
  onToggleRow,
  onToggleVagaSelection,
  onOpenJobDetailsModal,
  onEditVaga,
  onSetSelectedJob,
  onSetIsEditModalOpen,
  onSetEditLoading,
  onSetTodasVagas,
  onSetVagasToDelete,
  onSetDeleteModalOpen,
  onRefreshData,
  currentPage,
  vagasData,
  vagaCandidaturas,
}: VagaTableRowProps) {
  const refreshVagasList = async () => {
    await onRefreshData();
  };

  return (
    <>
      <TableRow
        key={vaga.vaga_id}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => onToggleRow(vaga.vaga_id)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedVagas.includes(vaga.vaga_id)}
              onCheckedChange={() => onToggleVagaSelection(vaga.vaga_id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Selecionar vaga ${vaga.vaga_id}`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRow(vaga.vaga_id);
              }}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedRow === vaga.vaga_id ? "transform rotate-180" : ""
                )}
              />
            </Button>
          </div>
        </TableCell>
        <TableCell>
          {vaga.vaga_data
            ? vaga.vaga_data.slice(8, 10) +
            "/" +
            vaga.vaga_data.slice(5, 7) +
            "/" +
            vaga.vaga_data.slice(0, 4)
            : "-"}
        </TableCell>
        <TableCell>{vaga.hospital.hospital_nome || "-"}</TableCell>
        <TableCell>{vaga.setor.setor_nome || "-"}</TableCell>
        <TableCell>{vaga.especialidade.especialidade_nome || "-"}</TableCell>
        <TableCell>{vaga.periodo_nome || "-"}</TableCell>
        <TableCell className="text-right">
          {vaga.vaga_valor ? formatCurrency(vaga.vaga_valor) : "-"}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={
              vaga.vaga_status === "aberta"
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900"
                : vaga.vaga_status === "fechada"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900"
                  : vaga.vaga_status === "anunciada"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900"
            }
          >
            {vaga.vaga_status
              ? vaga.vaga_status.charAt(0).toUpperCase() +
              vaga.vaga_status.slice(1)
              : "-"}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900"
          >
            {vaga.total_candidaturas || 0}
          </Badge>
        </TableCell>
        <TableCell>
          <VagasContextActions
            vaga={vaga}
            vagasData={vagasData}
            onRefreshData={onRefreshData}
            onViewDetails={() => onOpenJobDetailsModal(vaga)}
            onEditVaga={onEditVaga || (async (vagaId) => {
              // Fallback para função antiga se onEditVaga não foi passada
              onSetEditLoading(true);
              try {
                onSetSelectedJob(null);
                const { fetchVagasCandidaturas } = await import('@/services/vagasCandidaturasService');
                const vagaDetalhadaArr = await fetchVagasCandidaturas({
                  vaga_id: vaga.vaga_id,
                });
                const vagaDetalhada = vagaDetalhadaArr && vagaDetalhadaArr[0];
                if (vagaDetalhada) {
                  onSetSelectedJob(vagaDetalhada);
                } else {
                  onSetSelectedJob(vaga);
                }
                onSetIsEditModalOpen(true);
              } catch (err) {
                console.error("Erro ao buscar dados da vaga:", err);
                onSetSelectedJob(vaga);
                onSetIsEditModalOpen(true);
              } finally {
                onSetEditLoading(false);
              }
            })}
            onDeleteVaga={(vagaId) => {
              onSetVagasToDelete([vagaId]);
              onSetDeleteModalOpen(true);
            }}
            vagaCandidaturas={vagaCandidaturas}
            disabled={false}
            loading={editLoading}
          />
        </TableCell>
      </TableRow>
      {expandedRow === vaga.vaga_id && vaga.candidaturas.length > 0 && (
        <TableRow>
          <TableCell colSpan={12} className="p-0">
            <div className="bg-muted/30 p-4">
              <h4 className="font-normal mb-2">Candidaturas</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaga.candidaturas.map((candidatura: Candidatura) => (
                    <TableRow key={candidatura.candidatura_id}>
                      <TableCell>
                        <DoctorNameLink
                          doctorId={candidatura.medico_id}
                          doctorName={`${candidatura.medico_primeiro_nome || ""
                            } ${candidatura.medico_sobrenome || ""}`.trim()}
                        />
                      </TableCell>
                      <TableCell>{candidatura.medico_crm || "-"}</TableCell>
                      <TableCell>
                        {formatTelefoneBR(candidatura.medico_telefone)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            candidatura.candidatura_status === "APROVADO"
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900"
                              : candidatura.candidatura_status === "REPROVADO"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900"
                          }
                        >
                          {candidatura.candidatura_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {candidatura.candidatura_status === "PENDENTE" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 font-normal"
                                onClick={async () => {
                                  onSetEditLoading(true);
                                  try {
                                    await aprovarCandidatura({
                                      candidatura_id:
                                        candidatura.candidatura_id,
                                      vaga_id: vaga.vaga_id,
                                    });
                                    await refreshVagasList();
                                  } catch (err) {
                                    alert("Erro ao aprovar candidatura");
                                  } finally {
                                    onSetEditLoading(false);
                                  }
                                }}
                              >
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-normal"
                                onClick={async () => {
                                  onSetEditLoading(true);
                                  try {
                                    await reprovarCandidatura({
                                      candidatura_id:
                                        candidatura.candidatura_id,
                                    });
                                    await refreshVagasList();
                                  } catch (err) {
                                    alert("Erro ao reprovar candidatura");
                                  } finally {
                                    onSetEditLoading(false);
                                  }
                                }}
                              >
                                Reprovar
                              </Button>
                            </>
                          )}
                          {(candidatura.candidatura_status === "APROVADO" ||
                            candidatura.candidatura_status === "REPROVADO") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-normal"
                                onClick={async () => {
                                  onSetEditLoading(true);
                                  try {
                                    await reconsiderarCandidatura({
                                      candidatura_id: candidatura.candidatura_id,
                                    });
                                    if (
                                      candidatura.candidatura_status ===
                                      "APROVADO"
                                    ) {
                                      if (
                                        window.confirm("Deseja reabrir a vaga?")
                                      ) {
                                        await reabrirVaga({
                                          vaga_id: vaga.vaga_id,
                                        });
                                      }
                                    }
                                    await refreshVagasList();
                                  } catch (err) {
                                    alert("Erro ao reconsiderar candidatura");
                                  } finally {
                                    onSetEditLoading(false);
                                  }
                                }}
                              >
                                Reconsiderar
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { getCurrentUser } from "@/services/authService";
import { updateVaga } from "@/services/vagasService";
import {
  cancelarCandidaturasDaVaga,
  reativarCandidaturasDaVaga,
} from "@/services/candidaturasService";

// Função para obter o horário local do Brasil (UTC-3) no formato ISO para salvar no banco
function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

// Função para converter string de data do banco em Date local (evita problema de timezone)
function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString || typeof dateString !== 'string') return new Date();

  // Se a string já tem horário, usar Date normal
  if (dateString.includes('T') || dateString.includes(' ')) {
    return new Date(dateString);
  }

  // Se é apenas data (YYYY-MM-DD), forçar interpretação como local
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months são 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Fallback para Date normal
  return new Date(dateString);
}

interface BulkUpdateParams {
  vagaUpdate: any;
  selectedBeneficios: string[];
  selectedRequisitos: string[];
  medicoDesignado?: string;
  prazoPagamento?: string;
  dataFechamento?: Date;
}

export function useVagasBulkOperations() {
  const [loading, setLoading] = useState(false);

  // Função para aplicar edições em lote
  const handleBulkUpdate = async (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>,
    params: BulkUpdateParams
  ) => {
    const {
      vagaUpdate,
      selectedBeneficios,
      selectedRequisitos,
      medicoDesignado,
      prazoPagamento,
      dataFechamento,
    } = params;

    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      // Aplicar atualizações para todas as vagas selecionadas
      for (const vagaId of selectedVagas) {
        let finalVagaUpdate = {
          ...vagaUpdate,
          updated_at: now,
          updated_by: user.id,
        };

        // Calcular data de pagamento individual para cada vaga se especificado
        if (
          prazoPagamento &&
          prazoPagamento !== "data_fechamento" &&
          prazoPagamento !== ""
        ) {
          const vagaData: any = jobsData.find((v: any) => v.vaga_id === vagaId);
          if (vagaData?.vaga_data) {
            const dataVaga = parseLocalDate(vagaData.vaga_data);
            let dataPagamentoCalculada: Date;

            if (prazoPagamento === "vista") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(dataPagamentoCalculada.getDate() + 1);
            } else if (prazoPagamento === "30dias") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(dataPagamentoCalculada.getDate() + 30);
            } else if (prazoPagamento === "45dias") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(dataPagamentoCalculada.getDate() + 45);
            } else if (prazoPagamento === "60dias") {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(dataPagamentoCalculada.getDate() + 60);
            } else {
              dataPagamentoCalculada = new Date(dataVaga);
              dataPagamentoCalculada.setDate(dataPagamentoCalculada.getDate() + 30); // default
            }

            finalVagaUpdate.vaga_datapagamento = dataPagamentoCalculada
              .toISOString()
              .slice(0, 10);
          }
        } else if (prazoPagamento === "data_fechamento" && dataFechamento) {
          // Para data de fechamento, usar a data especificada para todas as vagas
          finalVagaUpdate.vaga_datapagamento = dataFechamento
            .toISOString()
            .slice(0, 10);
        }

        await updateVaga({
          vaga_id: vagaId,
          vagaUpdate: finalVagaUpdate,
          selectedBeneficios,
          selectedRequisitos,
        });

        // Se há médico designado, fechar vaga e criar candidatura aprovada
        if (medicoDesignado) {
          const vagaAtual: any = jobsData.find((v: any) => v.vaga_id === vagaId);

          // Verificar conflito de horário
          try {
            const { verificarConflitoHorario } = await import("@/services/vagasService");
            await verificarConflitoHorario({
              medico_id: medicoDesignado,
              data: vagaAtual.vaga_data,
              hora_inicio: vagaAtual.vaga_horainicio,
              hora_fim: vagaAtual.vaga_horafim,
            });
          } catch (error: any) {
            // Se houver conflito, pular esta vaga e mostrar erro
            toast({
              title: "Conflito detectado",
              description: `Vaga ${vagaAtual.hospital_nome} - ${parseLocalDate(
                vagaAtual.vaga_data
              ).toLocaleDateString("pt-BR")}: ${error.message || "médico já possui plantão conflitante"
                }`,
              variant: "destructive",
              duration: 8000,
            });
            continue; // Pular para próxima vaga
          }

          await updateVaga({
            vaga_id: vagaId,
            vagaUpdate: {
              status: "fechada",
              updated_at: now,
              updated_by: user.id,
            },
            selectedBeneficios: [],
          });

          // Criar candidatura aprovada
          try {
            const { createCandidatura, aprovarCandidatura } = await import('@/services/candidaturasService');

            const vagaValor = vagaAtual?.vaga_valor || 0;

            const novaCandidatura = await createCandidatura({
              vaga_id: vagaId,
              medico_id: medicoDesignado,
              vaga_valor: vagaValor
            });

            if (novaCandidatura?.candidatura_id) {
              await aprovarCandidatura({
                candidatura_id: novaCandidatura.candidatura_id,
                vaga_id: vagaId,
              });
            }
          } catch (err: any) {
            // Verificar se é erro de conflito de horário do trigger
            const errorMessage =
              err?.message ||
              err?.details ||
              err?.hint ||
              err?.toString() ||
              "";
            const isConflictError =
              errorMessage.toUpperCase().includes("CONFLITO_HORARIO") ||
              errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO");

            if (isConflictError) {
              // Reverter status da vaga para aberta já que não conseguiu criar candidatura
              await updateVaga({
                vaga_id: vagaId,
                vagaUpdate: {
                  status: "aberta",
                  updated_at: now,
                  updated_by: user.id,
                },
                selectedBeneficios: [],
              });
              const conflictMatch = errorMessage.match(/Plantão já aprovado: ([^|]+)/);
              const conflictInfo = conflictMatch ? conflictMatch[1] : "horário conflitante";
              toast({
                title: "Conflito de Horário (Trigger)",
                description: `Não foi possível designar o médico para a vaga. O médico já possui ${conflictInfo}.`,
                variant: "destructive",
              });
            } else {
              throw err; // Re-throw se não for conflito
            }
          }
        }
      }

      // Recarregar dados
      await new Promise((resolve) => setTimeout(resolve, 300));
      await onRefreshData();
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast({
        title: "Edição em lote concluída!",
        description: `${selectedVagas.length} vaga${selectedVagas.length !== 1 ? "s foram" : " foi"
          } atualizada${selectedVagas.length !== 1 ? "s" : ""} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro na edição em lote:", error);
      toast({
        title: "Erro na edição em lote",
        description: "Ocorreu um erro ao aplicar as alterações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para anunciar vagas em lote
  const handleBulkAnunciar = async (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>
  ) => {
    if (selectedVagas.length === 0) {
      toast({
        title: "Nenhuma vaga selecionada",
        description: "Selecione pelo menos uma vaga para anunciar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      let countSuccess = 0;
      let countSkipped = 0;

      for (const vagaId of selectedVagas) {
        const vaga: any = jobsData.find((v: any) => v.vaga_id === vagaId);
        if (!vaga) continue;

        // Verificar se vaga já está anunciada ou não é fechada
        if (vaga.vaga_status === "anunciada" || vaga.vaga_status !== "fechada") {
          countSkipped++;
          continue;
        }

        await updateVaga({
          vaga_id: vagaId,
          vagaUpdate: {
            status: "anunciada",
            updated_at: now,
            updated_by: user.id,
          },
          selectedBeneficios: vaga.beneficios || [],
        });

        countSuccess++;
      }

      // Atualizar lista
      await new Promise((resolve) => setTimeout(resolve, 300));
      await onRefreshData();
      await new Promise((resolve) => setTimeout(resolve, 100));

      let message = `${countSuccess} vaga${countSuccess !== 1 ? "s foram" : " foi"
        } anunciada${countSuccess !== 1 ? "s" : ""} com sucesso.`;
      if (countSkipped > 0) {
        message += ` ${countSkipped} vaga${countSkipped !== 1 ? "s já estavam" : " já estava"
          } anunciada${countSkipped !== 1 ? "s" : ""}.`;
      }

      toast({
        title: "Anúncio de vagas concluído!",
        description: message,
      });
    } catch (error) {
      console.error("Erro ao anunciar vagas:", error);
      toast({
        title: "Erro ao anunciar vagas",
        description: "Ocorreu um erro ao anunciar as vagas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função unificada para cancelar vagas (em lote ou unitária)
  const handleBulkCancelar = async (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>
  ) => {
    if (selectedVagas.length === 0) {
      toast({
        title: "Nenhuma vaga selecionada",
        description: "Selecione pelo menos uma vaga para cancelar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      let countSuccess = 0;
      let countSkipped = 0;

      for (const vagaId of selectedVagas) {
        const vaga: any = jobsData.find((v: any) => v.vaga_id === vagaId);
        if (!vaga) continue;

        // Verificar se vaga já está cancelada
        if (vaga.vaga_status === "cancelada") {
          countSkipped++;
          continue;
        }

        try {
          // Cancelar candidaturas aprovadas da vaga
          await cancelarCandidaturasDaVaga({ vaga_id: vagaId });

          // Cancelar vaga
          await updateVaga({
            vaga_id: vagaId,
            vagaUpdate: {
              status: "cancelada",
              updated_at: now,
              updated_by: user.id,
            },
            selectedBeneficios: vaga.beneficios || [],
          });

          countSuccess++;
        } catch (error) {
          console.error(`Erro ao cancelar vaga ${vagaId}:`, error);
        }
      }

      // Mostrar resultado
      if (countSuccess > 0) {
        toast({
          title: "Vagas canceladas com sucesso",
          description: `${countSuccess} vaga${countSuccess !== 1 ? "s" : ""
            } cancelada${countSuccess !== 1 ? "s" : ""}.${countSkipped > 0
              ? ` ${countSkipped} já estava${countSkipped !== 1 ? "m" : ""
              } cancelada${countSkipped !== 1 ? "s" : ""}.`
              : ""
            }`,
        });
      }

      // Recarregar dados
      await new Promise((resolve) => setTimeout(resolve, 300));
      await onRefreshData();
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Erro no cancelamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar vagas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para reativar vagas em lote
  const handleBulkReativar = async (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>
  ) => {
    if (selectedVagas.length === 0) return;

    setLoading(true);
    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      for (const vagaId of selectedVagas) {
        await updateVaga({
          vaga_id: vagaId,
          vagaUpdate: {
            status: "aberta",
            updated_at: now,
            updated_by: user.id,
          },
          selectedBeneficios: [],
        });

        await reativarCandidaturasDaVaga({ vaga_id: vagaId });
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await onRefreshData();
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast({
        title: "Vagas reativadas",
        description: `${selectedVagas.length} vaga(s) foram reativadas com sucesso.`,
      });
    } catch (err) {
      console.error("Erro ao reativar vagas:", err);
      toast({
        title: "Erro ao reativar",
        description: "Não foi possível reativar as vagas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para fechar vagas em lote
  const handleBulkFechar = async (
    selectedVagas: string[],
    onRefreshData: () => Promise<void>
  ) => {
    if (selectedVagas.length === 0) return;

    setLoading(true);
    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      for (const vagaId of selectedVagas) {
        await updateVaga({
          vaga_id: vagaId,
          vagaUpdate: {
            status: "fechada",
            updated_at: now,
            updated_by: user.id,
          },
          selectedBeneficios: [],
        });
      }

      toast({
        title: "Vagas fechadas!",
        description: `${selectedVagas.length} vaga${selectedVagas.length !== 1 ? "s foram" : " foi"
          } fechada${selectedVagas.length !== 1 ? "s" : ""} com sucesso.`,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
      await onRefreshData();
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.error("Erro ao fechar vagas:", err);
      toast({
        title: "Erro ao fechar",
        description: "Não foi possível fechar as vagas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para deletar vagas em lote
  const handleBulkDelete = async (
    vagasToDelete: string[],
    onRefreshData: () => Promise<void>
  ) => {
    setLoading(true);
    try {
      const { excluirVagasCanceladas } = await import("@/services/vagasService");
      await excluirVagasCanceladas({ vaga_ids: vagasToDelete });

      await new Promise((resolve) => setTimeout(resolve, 300));
      await onRefreshData();
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast({
        title: "Vagas excluídas",
        description: `${vagasToDelete.length} vaga(s) foram excluídas definitivamente do sistema.`,
      });
    } catch (err) {
      console.error("Erro ao deletar vagas:", err);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir as vagas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleBulkUpdate,
    handleBulkAnunciar,
    handleBulkCancelar,
    handleBulkReativar,
    handleBulkFechar,
    handleBulkDelete,
  };
}
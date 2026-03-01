"use client";

import { useState, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { getCurrentUser } from "@/services/authService";
import { updateVaga } from "@/services/vagasService";
import {
  cancelarCandidaturasDaVaga,
  reativarCandidaturasDaVaga,
  reabrirVaga,
} from "@/services/candidaturasService";

// Função para obter o horário local do Brasil (UTC-3) no formato ISO para salvar no banco
function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

interface UseVagasActionsOptions {
  onRefreshData?: () => Promise<void>;
  onClearSelection?: () => void;
}

export function useVagasActions(options: UseVagasActionsOptions = {}) {
  const { onRefreshData, onClearSelection } = options;

  const [actionLoading, setActionLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Função unificada para cancelar vagas (individual ou em lote)
  const handleCancelVaga = useCallback(async (vagaIds: string | string[], vagasData: any[]) => {
    const ids = Array.isArray(vagaIds) ? vagaIds : [vagaIds];
    const isBulk = ids.length > 1;

    setActionLoading(true);
    setLastAction('cancel');

    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      let countSuccess = 0;
      let countSkipped = 0;

      for (const vagaId of ids) {
        const vaga = vagasData.find((v) => v.vaga_id === vagaId);
        if (!vaga) continue;

        // Verificar se vaga já está cancelada
        if (vaga.vaga_status === "cancelada") {
          countSkipped++;
          continue;
        }

        try {
          console.log("🔧 DEBUG cancelamento - vaga:", {
            vaga_id: vagaId,
            user_id: user.id,
            beneficios_type: typeof vaga.beneficios,
            beneficios_value: vaga.beneficios
          });

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
            selectedBeneficios: Array.isArray(vaga.beneficios) ? vaga.beneficios : [],
          });

          countSuccess++;
        } catch (error) {
          console.error(`Erro ao cancelar vaga ${vagaId}:`, error);
          throw error; // Re-throw para ver o erro completo
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

      // Refresh dados e limpar seleção
      if (onRefreshData) {
        await onRefreshData();
      }
      if (isBulk && onClearSelection) {
        onClearSelection();
      }

      return { success: countSuccess, skipped: countSkipped };
    } catch (error) {
      console.error("Erro no cancelamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar vaga(s)",
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
      setLastAction(null);
    }
  }, [onRefreshData, onClearSelection]);

  // Função unificada para excluir vagas canceladas
  const handleDeleteVaga = useCallback(async (vagaIds: string | string[], isBulk = false) => {
    const ids = Array.isArray(vagaIds) ? vagaIds : [vagaIds];

    setActionLoading(true);
    setLastAction('delete');

    try {
      const { excluirVagasCanceladas } = await import("@/services/vagasService");
      await excluirVagasCanceladas({ vaga_ids: ids });

      const count = ids.length;
      toast({
        title: "Vagas excluídas",
        description: `${count} vaga${count > 1 ? "s" : ""} foram excluídas definitivamente do sistema.`,
      });

      // Refresh dados e limpar seleção
      if (onRefreshData) {
        await onRefreshData();
      }
      if (isBulk && onClearSelection) {
        onClearSelection();
      }

      return { success: count };
    } catch (error) {
      console.error("Erro ao deletar vagas:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir as vagas.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
      setLastAction(null);
    }
  }, [onRefreshData, onClearSelection]);

  // Função para anunciar vaga
  const handleAnnounceVaga = useCallback(async (vagaId: string, vagasData: any[]) => {
    const vaga = vagasData.find((v) => v.vaga_id === vagaId);
    if (!vaga) return;

    setActionLoading(true);
    setLastAction('announce');

    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      await updateVaga({
        vaga_id: vagaId,
        vagaUpdate: {
          status: "anunciada",
          updated_at: now,
          updated_by: user.id,
        },
        selectedBeneficios: vaga.beneficios || [],
      });

      toast({
        title: "Vaga anunciada",
        description: "A vaga foi anunciada com sucesso.",
      });

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error("Erro ao anunciar vaga:", error);
      toast({
        title: "Erro",
        description: "Erro ao anunciar vaga",
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
      setLastAction(null);
    }
  }, [onRefreshData]);

  // Função para fechar vaga
  const handleCloseVaga = useCallback(async (vagaId: string, vagasData: any[]) => {
    const vaga = vagasData.find((v) => v.vaga_id === vagaId);
    if (!vaga) return;

    setActionLoading(true);
    setLastAction('close');

    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      await updateVaga({
        vaga_id: vagaId,
        vagaUpdate: {
          status: "fechada",
          updated_at: now,
          updated_by: user.id,
        },
        selectedBeneficios: vaga.beneficios || [],
      });

      toast({
        title: "Vaga fechada",
        description: "A vaga foi fechada com sucesso.",
      });

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error("Erro ao fechar vaga:", error);
      toast({
        title: "Erro",
        description: "Erro ao fechar vaga",
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
      setLastAction(null);
    }
  }, [onRefreshData]);

  // Função para reativar vaga
  const handleReactivateVaga = useCallback(async (vagaId: string, vagasData: any[]) => {
    const vaga = vagasData.find((v) => v.vaga_id === vagaId);
    if (!vaga) return;

    setActionLoading(true);
    setLastAction('reactivate');

    try {
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      // Reativar candidaturas da vaga
      await reativarCandidaturasDaVaga({ vaga_id: vagaId });

      // Reativar vaga
      await updateVaga({
        vaga_id: vagaId,
        vagaUpdate: {
          status: "aberta",
          updated_at: now,
          updated_by: user.id,
        },
        selectedBeneficios: vaga.beneficios || [],
      });

      toast({
        title: "Vaga reativada",
        description: "A vaga foi reativada com sucesso.",
      });

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error("Erro ao reativar vaga:", error);
      toast({
        title: "Erro",
        description: "Erro ao reativar vaga",
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
      setLastAction(null);
    }
  }, [onRefreshData]);

  // Função para reabrir vaga
  const handleReopenVaga = useCallback(async (vagaId: string) => {
    setActionLoading(true);
    setLastAction('reopen');

    try {
      await reabrirVaga({ vaga_id: vagaId });

      toast({
        title: "Vaga reaberta",
        description: "A vaga foi reaberta com sucesso.",
      });

      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      console.error("Erro ao reabrir vaga:", error);
      toast({
        title: "Erro",
        description: "Erro ao reabrir vaga",
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
      setLastAction(null);
    }
  }, [onRefreshData]);

  return {
    // Estados
    actionLoading,
    lastAction,

    // Ações principais
    handleCancelVaga,
    handleDeleteVaga,
    handleAnnounceVaga,
    handleCloseVaga,
    handleReactivateVaga,
    handleReopenVaga,

    // Utilitários
    setActionLoading,
    setLastAction,
  };
}
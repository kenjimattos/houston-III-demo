"use client";

import { useMemo } from "react";
import {
  Megaphone,
  CircleX,
  RotateCcw,
  SquarePen,
  Trash2,
  Eye,
  Edit,
  Users,
  ExternalLink,
} from "lucide-react";
import { useVagasBulkOperations } from "./useVagasBulkOperations";
import usePermissions from "../usePermissions";
import { Permission } from "@/types/permission";
import { toast } from "../use-toast";

interface VagaData {
  vaga_id: string;
  vaga_status: "aberta" | "fechada" | "cancelada" | "anunciada";
  [key: string]: any;
}

interface BulkActionConfig {
  key: string;
  label: string;
  icon: any;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  onClick: () => void | Promise<void>;
  visible: boolean;
}

interface ContextActionConfig {
  key: string;
  label: string;
  icon: any;
  onClick: (e: React.MouseEvent) => void;
  visible?: boolean;
}

interface UseVagasActionsConfigProps {
  selectedVagas: string[];
  vagasData: VagaData[];
  onRefreshData: () => Promise<void>;
  onClearSelection?: () => void;

  // Context actions callbacks
  onViewDetails?: (vagaId: string) => void;
  onViewApplications?: (vagaId: string) => void;
  onEditVaga?: (vagaId: string) => void;
  onCancelVaga?: (vagaId: string) => void;
  onAnnounceVaga?: (vagaId: string) => void;
  onCloseVaga?: (vagaId: string) => void;
  onDeleteVaga?: (vagaId: string) => void;
  onBulkEdit?: () => void;

  // Contadores para context menu
  vagaCandidaturas?: Record<string, any[]>;
}

export function useVagasActionsConfig({
  selectedVagas,
  vagasData,
  onRefreshData,
  onClearSelection,
  onViewDetails,
  onViewApplications,
  onEditVaga,
  onCancelVaga,
  onAnnounceVaga,
  onCloseVaga,
  onDeleteVaga,
  onBulkEdit,
  vagaCandidaturas = {},
}: UseVagasActionsConfigProps) {
  const {
    loading,
    handleBulkAnunciar,
    handleBulkCancelar,
    handleBulkReativar,
    handleBulkFechar,
    handleBulkDelete,
  } = useVagasBulkOperations();

  // Análise do status das vagas selecionadas
  const statusAnalysis = useMemo(() => {
    const vagasSelecionadas = vagasData.filter((v) =>
      selectedVagas.includes(v.vaga_id)
    );

    return {
      todasCanceladas: vagasSelecionadas.every(
        (v) => v.vaga_status === "cancelada"
      ),
      todasNaoCanceladas: vagasSelecionadas.every(
        (v) => v.vaga_status !== "cancelada"
      ),
      todasFechadas: vagasSelecionadas.every(
        (v) => v.vaga_status === "fechada"
      ),
      todasAnunciadas: vagasSelecionadas.every(
        (v) => v.vaga_status === "anunciada"
      ),
      todasAbertas: vagasSelecionadas.every((v) => v.vaga_status === "aberta"),
      vagasSelecionadas,
    };
  }, [selectedVagas, vagasData]);

  // Configurações das ações em lote
  const bulkActions: BulkActionConfig[] = useMemo(
    () => [
      {
        key: "anunciar",
        label: "Anunciar",
        icon: Megaphone,
        variant: "outline" as const,
        className: "text-yellow-600 border-yellow-600 hover:bg-yellow-50",
        onClick: () =>
          handleBulkAnunciar(selectedVagas, vagasData, onRefreshData),
        visible: statusAnalysis.todasFechadas,
      },
      {
        key: "fechar",
        label: "Fechar",
        icon: CircleX,
        variant: "outline" as const,
        className: "text-orange-600 border-orange-600 hover:bg-orange-50",
        onClick: () => handleBulkFechar(selectedVagas, onRefreshData),
        visible: statusAnalysis.todasAnunciadas,
      },
      {
        key: "reativar",
        label: "Reativar",
        icon: RotateCcw,
        variant: "outline" as const,
        className: "text-green-600 border-green-600 hover:bg-green-50",
        onClick: () =>
          handleBulkReativar(selectedVagas, vagasData, onRefreshData),
        visible: statusAnalysis.todasCanceladas,
      },
      {
        key: "cancelar",
        label: "Cancelar",
        icon: CircleX,
        variant: "outline" as const,
        className: "text-red-600 border-red-600 hover:bg-red-50",
        onClick: () =>
          handleBulkCancelar(selectedVagas, vagasData, onRefreshData),
        visible: statusAnalysis.todasNaoCanceladas,
      },
      {
        key: "editar",
        label: "Editar",
        icon: SquarePen,
        variant: "outline" as const,
        className: "text-blue-600 border-blue-600 hover:bg-blue-50",
        onClick: onBulkEdit || (() => {}),
        visible: true,
      },
      {
        key: "excluir",
        label: "Excluir",
        icon: Trash2,
        variant: "destructive" as const,
        onClick: () => {
          const canceledVagas = selectedVagas.filter((vagaId) => {
            const vaga = vagasData.find((v) => v.vaga_id === vagaId);
            return vaga?.vaga_status === "cancelada";
          });
          if (canceledVagas.length > 0) {
            handleBulkDelete(canceledVagas, onRefreshData);
            onClearSelection?.();
          }
        },
        visible: statusAnalysis.todasCanceladas,
      },
    ],
    [
      selectedVagas,
      vagasData,
      onRefreshData,
      statusAnalysis,
      handleBulkAnunciar,
      handleBulkFechar,
      handleBulkReativar,
      handleBulkCancelar,
      handleBulkDelete,
      onBulkEdit,
      onClearSelection,
    ]
  );

  // Função para obter ações de contexto para uma vaga específica
  const getContextActions = (vaga: VagaData): ContextActionConfig[] => {
    const getCandidatureCounts = (vagaId: string) => {
      const candidaturas = vagaCandidaturas[vagaId] || [];
      const pendingCount = candidaturas.filter(
        (c: any) => c.candidatura_status === "PENDENTE"
      ).length;
      const totalCount = candidaturas.length;
      return { pendingCount, totalCount };
    };
    const { has } = usePermissions();

    const { pendingCount, totalCount } = getCandidatureCounts(vaga.vaga_id);

    // Mostrar botão de candidaturas quando:
    // 1. Há candidaturas pendentes, OU
    // 2. Há mais de uma candidatura (permite substituir médico escalado por outro candidato)
    const showCandidaturasButton = pendingCount > 0 || totalCount > 1;

    // Label dinâmico: mostra pendentes se houver, senão mostra total
    const candidaturasLabel = pendingCount > 0
      ? `Candidaturas (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})`
      : `Candidaturas (${totalCount})`;

    return [
      {
        key: "details",
        label: "Detalhes",
        icon: Eye,
        onClick: (e) => {
          e.stopPropagation();
          onViewDetails?.(vaga.vaga_id);
        },
      },
      {
        key: "applications",
        label: candidaturasLabel,
        icon: Users,
        onClick: (e) => {
          e.stopPropagation();
          onViewApplications?.(vaga.vaga_id);
        },
        visible: showCandidaturasButton,
      },

      {
        key: "edit",
        label: "Editar",
        icon: Edit,
        onClick: (e) => {
          e.stopPropagation();
          onEditVaga?.(vaga.vaga_id);
        },
        visible: has(Permission.JOBS_UPDATE),
      },
      {
        key: "share",
        label: "Compartilhar",
        icon: ExternalLink,
        onClick: (e) => {
          e.stopPropagation();
          const url = `https://link.revoluna.com.br?id=${vaga.vaga_id}`;
          navigator.clipboard.writeText(url);
          toast({
            title: "Link copiado com sucesso!",
            description: "",
          });
          // Aqui poderia adicionar um toast de confirmação
        },
      },
      // Ações baseadas no status
      ...(vaga.vaga_status === "fechada"
        ? [
            {
              key: "announce",
              label: "Anunciar",
              icon: Megaphone,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onAnnounceVaga?.(vaga.vaga_id);
              },
            },
          ]
        : []),
      ...(vaga.vaga_status === "anunciada"
        ? [
            {
              key: "close",
              label: "Fechar",
              icon: CircleX,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onCloseVaga?.(vaga.vaga_id);
              },
            },
          ]
        : []),
      ...(vaga.vaga_status === "aberta" ||
      vaga.vaga_status === "fechada" ||
      vaga.vaga_status === "anunciada"
        ? [
            {
              key: "cancel",
              label: "Cancelar",
              icon: CircleX,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onCancelVaga?.(vaga.vaga_id);
              },
            },
          ]
        : []),
      ...(vaga.vaga_status === "cancelada"
        ? [
            {
              key: "reactivate",
              label: "Reativar",
              icon: RotateCcw,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onCancelVaga?.(vaga.vaga_id); // A mesma função lida com reativação
              },
            },
            {
              key: "delete",
              label: "Excluir",
              icon: Trash2,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                onDeleteVaga?.(vaga.vaga_id);
              },
            },
          ]
        : []),
    ];
  };

  return {
    // Configurações de ações
    bulkActions: bulkActions.filter((action) => action.visible),
    getContextActions,

    // Estados
    loading,
    statusAnalysis,

    // Funções diretas das operações (para casos especiais)
    handleBulkAnunciar: () =>
      handleBulkAnunciar(selectedVagas, vagasData, onRefreshData),
    handleBulkCancelar: () =>
      handleBulkCancelar(selectedVagas, vagasData, onRefreshData),
    handleBulkReativar: () =>
      handleBulkReativar(selectedVagas, vagasData, onRefreshData),
    handleBulkFechar: () => handleBulkFechar(selectedVagas, onRefreshData),
    handleBulkDelete: (vagasToDelete: string[]) =>
      handleBulkDelete(vagasToDelete, onRefreshData),
  };
}

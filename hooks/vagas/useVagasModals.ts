"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import { fetchVagasCandidaturas } from "@/services/vagasCandidaturasService";
import { VagaCandidatura } from "@/types";

// Função para converter string de data do banco em Date local (evita problema de timezone)
function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString || typeof dateString !== "string") return new Date();

  // Se a string já tem horário, usar Date normal
  if (dateString.includes("T") || dateString.includes(" ")) {
    return new Date(dateString);
  }

  // Se é apenas data (YYYY-MM-DD), forçar interpretação como local
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months são 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Fallback para Date normal
  return new Date(dateString);
}

interface UseVagasModalsOptions {
  grupos?: any[];
  onRefreshData?: () => Promise<void>;
}

export function useVagasModals(options: UseVagasModalsOptions = {}) {
  const { grupos = [], onRefreshData } = options;

  // Estados dos modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false);
  const [jobApplicationsModalOpen, setJobApplicationsModalOpen] =
    useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Estados dos dados dos modals
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any>(null);
  const [selectedJobForApplications, setSelectedJobForApplications] =
    useState<any>(null);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState<any>(null);

  // Função unificada para abrir modal de detalhes (das duas páginas)
  const openJobDetailsModal = useCallback(
    (vaga: VagaCandidatura) => {
      console.log(
        "🪝 Hook openJobDetailsModal chamado com vaga:",
        vaga?.vaga_id
      );
      console.log("🪝 grupos disponíveis:", grupos.length);
      // Buscar informações do grupo e escalista
      let grupoNome = null;
      let escalistaNome = null;

      // Verificar se os campos estão disponíveis
      const grupoId = vaga.grupo?.id || (vaga as any).grupo_id;
      const escalistaId = vaga.escalista?.id || (vaga as any).escalista_id;

      if (grupoId && grupos.length > 0) {
        const grupo = grupos.find((g) => g.id === grupoId);
        if (grupo) {
          grupoNome = grupo.grupo_nome;
          if (escalistaId) {
            const escalista = grupo.escalistas?.find(
              (e: any) => e.escalista_id === escalistaId
            );
            if (escalista) {
              escalistaNome = escalista.escalista_nome;
            }
          }
        }
      }

      // Estrutura de dados compatível com ambas as páginas
      const jobDetails = {
        id: vaga.vaga_id,
        hospital: vaga.hospital?.hospital_nome || (vaga as any).hospital_nome,
        date: vaga.vaga_data
          ? format(parseLocalDate(vaga.vaga_data), "dd/MM/yyyy")
          : "-",
        sector: vaga.setor?.setor_nome || (vaga as any).setor_nome,
        specialty:
          vaga.especialidade?.especialidade_nome ||
          (vaga as any).especialidade_nome,
        startTime: vaga.vaga_horainicio,
        endTime: vaga.vaga_horafim,
        value: vaga.vaga_valor,
        paymentDate: vaga.vaga_datapagamento
          ? format(parseLocalDate(vaga.vaga_datapagamento), "dd/MM/yyyy")
          : "-",
        periodo: vaga.periodo_nome || vaga.periodo_id || "-",
        grupoNome,
        escalistaNome,
      };

      setSelectedJobForDetails(jobDetails);
      setJobDetailsModalOpen(true);
    },
    [grupos]
  );

  // Função unificada para abrir modal de candidaturas
  const openJobApplicationsModal = useCallback(
    async (vagaId: string, vagasData: any[]) => {
      try {
        // Buscar dados atualizados da vaga
        const vagaDetalhadaArr = await fetchVagasCandidaturas({
          vaga_id: vagaId,
        });
        const vaga = vagaDetalhadaArr && vagaDetalhadaArr[0];

        if (!vaga) {
          // Fallback para dados em cache
          const vagaCache = vagasData.find((v) => v.vaga_id === vagaId);
          if (!vagaCache) return;
          setSelectedJobForApplications(vagaCache);
          setJobApplicationsModalOpen(true);
          return;
        }

        setSelectedJobForApplications(vaga);
        setJobApplicationsModalOpen(true);
      } catch (error) {
        console.error("Erro ao buscar dados da vaga:", error);
        // Fallback para dados em cache
        const vagaCache = vagasData.find((v) => v.vaga_id === vagaId);
        if (vagaCache) {
          setSelectedJobForApplications(vagaCache);
          setJobApplicationsModalOpen(true);
        }
      }
    },
    []
  );

  // Função unificada para abrir modal de edição (das duas páginas)
  const openEditModal = useCallback(
    async (vagaId: string, vagasData: any[]) => {
      const vaga = vagasData.find((v) => v.vaga_id === vagaId);
      if (!vaga) return;

      setEditLoading(true);
      try {
        // Buscar dados atualizados da vaga
        const vagaDetalhadaArr = await fetchVagasCandidaturas({
          vaga_id: vaga.vaga_id,
        });
        const vagaDetalhada = vagaDetalhadaArr && vagaDetalhadaArr[0];

        if (vagaDetalhada) {
          setSelectedJob(vagaDetalhada);
          setIsEditModalOpen(true);
        } else {
          // Fallback para dados básicos se não conseguir buscar detalhados
          setSelectedJob(vaga);
          setIsEditModalOpen(true);
        }
      } catch (err) {
        console.error("Erro ao buscar dados da vaga:", err);
        // Fallback para dados básicos em caso de erro
        setSelectedJob(vaga);
        setIsEditModalOpen(true);
      } finally {
        setEditLoading(false);
      }
    },
    []
  );

  // Função unificada para abrir modal de exclusão
  const openDeleteModal = useCallback(
    (vagaId: string | string[], vagasData: any[], isBulk = false) => {
      if (Array.isArray(vagaId)) {
        // Exclusão em lote
        setSelectedJobForDelete({
          vagaIds: vagaId,
          count: vagaId.length,
          isBulk: true,
        });
      } else {
        // Exclusão individual
        const vaga = vagasData.find((v) => v.vaga_id === vagaId);
        if (!vaga || vaga.vaga_status !== "cancelada") return;

        setSelectedJobForDelete({
          ...vaga,
          isBulk: false,
        });
      }
      setDeleteModalOpen(true);
    },
    []
  );

  // Função para fechar modal de edição
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedJob(null);
  }, []);

  // Função para fechar modal de detalhes
  const closeJobDetailsModal = useCallback(() => {
    setJobDetailsModalOpen(false);
    setSelectedJobForDetails(null);
  }, []);

  // Função para fechar modal de candidaturas
  const closeJobApplicationsModal = useCallback(() => {
    setJobApplicationsModalOpen(false);
    setSelectedJobForApplications(null);
  }, []);

  // Função para fechar modal de exclusão
  const closeDeleteModal = useCallback(() => {
    setDeleteModalOpen(false);
    setSelectedJobForDelete(null);
  }, []);

  // Função para processar sucesso de operação e refresh
  const handleOperationSuccess = useCallback(
    async (message: string) => {
      toast({
        title: "Operação realizada com sucesso",
        description: message,
      });

      // Refresh dados se callback foi fornecido
      if (onRefreshData) {
        await onRefreshData();
      }
    },
    [onRefreshData]
  );

  return {
    // Estados dos modals
    modalsState: {
      editModalOpen: isEditModalOpen,
      detailsModalOpen: jobDetailsModalOpen,
      applicationsModalOpen: jobApplicationsModalOpen,
      deleteModalOpen: deleteModalOpen,
      editLoading,
    },

    // Dados dos modals
    selectedJob,
    selectedJobForDetails,
    selectedJobForApplications,
    selectedJobForDelete,

    // Funções para abrir modals
    openJobDetailsModal,
    openJobApplicationsModal,
    openEditModal,
    openDeleteModal,

    // Funções para fechar modals
    closeEditModal,
    closeJobDetailsModal,
    closeJobApplicationsModal,
    closeDeleteModal,

    // Setters diretos (para compatibilidade com código existente)
    setIsEditModalOpen,
    setJobDetailsModalOpen,
    setJobApplicationsModalOpen,
    setDeleteModalOpen,
    setEditLoading,
    setSelectedJob,
    setSelectedJobForDetails,
    setSelectedJobForApplications,
    setSelectedJobForDelete,

    // Utilitários
    handleOperationSuccess,
  };
}

"use client";

import { useState, useCallback } from "react";

export function useVagasSelection() {
  const [selectedVagas, setSelectedVagas] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Função para alternar seleção de uma vaga
  const toggleVagaSelection = useCallback((vagaId: string) => {
    setSelectedVagas((prev) => {
      const newSelection = prev.includes(vagaId)
        ? prev.filter((id) => id !== vagaId)
        : [...prev, vagaId];

      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  }, []);

  // Função para alternar seleção de todas as vagas visíveis
  const toggleAllVagas = useCallback((allVagaIds: string[]) => {
    setSelectedVagas((prev) => {
      const newSelection = prev.length === allVagaIds.length ? [] : allVagaIds;
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  }, []);

  // Função para limpar seleção
  const clearSelection = useCallback(() => {
    setSelectedVagas([]);
    setShowBulkActions(false);
  }, []);

  // Função para seleção específica de vagas (para casos especiais)
  const selectVagas = useCallback((vagaIds: string[]) => {
    setSelectedVagas(vagaIds);
    setShowBulkActions(vagaIds.length > 0);
  }, []);

  // Função para remover vagas específicas da seleção (útil após delete)
  const removeFromSelection = useCallback((vagaIds: string[]) => {
    setSelectedVagas((prev) => {
      const newSelection = prev.filter((id) => !vagaIds.includes(id));
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  }, []);

  // Função para seleção baseada em condição
  const selectVagasByCondition = useCallback((
    allVagas: any[],
    condition: (vaga: any) => boolean
  ) => {
    const matchingIds = allVagas.filter(condition).map((vaga) => vaga.vaga_id);
    setSelectedVagas(matchingIds);
    setShowBulkActions(matchingIds.length > 0);
  }, []);

  // Função para verificar se uma vaga está selecionada
  const isVagaSelected = useCallback((vagaId: string) => {
    return selectedVagas.includes(vagaId);
  }, [selectedVagas]);

  // Função para verificar se todas as vagas visíveis estão selecionadas
  const areAllVagasSelected = useCallback((allVagaIds: string[]) => {
    return allVagaIds.length > 0 && selectedVagas.length === allVagaIds.length;
  }, [selectedVagas]);

  // Função para obter contagem de vagas selecionadas
  const getSelectedCount = useCallback(() => {
    return selectedVagas.length;
  }, [selectedVagas]);

  return {
    // Estados
    selectedVagas,
    showBulkActions,

    // Funções principais
    toggleVagaSelection,
    toggleAllVagas,
    clearSelection,

    // Funções utilitárias
    selectVagas,
    removeFromSelection,
    selectVagasByCondition,

    // Funções de verificação
    isVagaSelected,
    areAllVagasSelected,
    getSelectedCount,
  };
}
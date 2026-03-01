"use client";

import { useState, useCallback } from "react";

export function usePagamentosSelection() {
  const [selectedPagamentos, setSelectedPagamentos] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const togglePagamentoSelection = useCallback((pagamentoId: string, selected?: boolean) => {
    setSelectedPagamentos((prev) => {
      const isCurrentlySelected = prev.includes(pagamentoId);
      const shouldSelect = selected !== undefined ? selected : !isCurrentlySelected;

      const newSelection = shouldSelect
        ? isCurrentlySelected ? prev : [...prev, pagamentoId]
        : prev.filter((id) => id !== pagamentoId);

      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  }, []);

  const toggleAllPagamentos = useCallback((allPagamentoIds: string[], selectAll: boolean) => {
    setSelectedPagamentos(() => {
      const newSelection = selectAll ? allPagamentoIds : [];
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPagamentos([]);
    setShowBulkActions(false);
  }, []);

  const selectPagamentos = useCallback((pagamentoIds: string[]) => {
    setSelectedPagamentos(pagamentoIds);
    setShowBulkActions(pagamentoIds.length > 0);
  }, []);

  const removeFromSelection = useCallback((pagamentoIds: string[]) => {
    setSelectedPagamentos((prev) => {
      const newSelection = prev.filter((id) => !pagamentoIds.includes(id));
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  }, []);

  const isPagamentoSelected = useCallback((pagamentoId: string) => {
    return selectedPagamentos.includes(pagamentoId);
  }, [selectedPagamentos]);

  const areAllPagamentosSelected = useCallback((allPagamentoIds: string[]) => {
    return allPagamentoIds.length > 0 && selectedPagamentos.length === allPagamentoIds.length;
  }, [selectedPagamentos]);

  const isAllSelected = useCallback((allPagamentoIds: string[]) => {
    return allPagamentoIds.length > 0 && allPagamentoIds.every((id) => selectedPagamentos.includes(id));
  }, [selectedPagamentos]);
  const getSelectedCount = useCallback(() => {
    return selectedPagamentos.length;
  }, [selectedPagamentos]);

  return {
    selectedPagamentos,
    showBulkActions,
    togglePagamentoSelection,
    toggleAllPagamentos,
    clearSelection,
    selectPagamentos,
    removeFromSelection,
    isPagamentoSelected,
    areAllPagamentosSelected,
    isAllSelected,
    getSelectedCount,
  };
}

"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useVagasBulkOperations } from "@/hooks/vagas/useVagasBulkOperations";
import { useVagasSelection } from "@/hooks/vagas/useVagasSelection";
import { useVagasCommonData } from "@/hooks/vagas/useVagasCommonData";
import { useVagasActionsConfig } from "@/hooks/vagas/useVagasActionsConfig";
import usePermissions from "@/hooks/usePermissions";
import { Permission } from "@/types/permission";

interface VagasOperationsContextType {
  // Selection
  selectedVagas: string[];
  showBulkActions: boolean;
  toggleVagaSelection: (vagaId: string) => void;
  toggleAllVagas: (allVagaIds: string[]) => void;
  clearSelection: () => void;
  selectVagas: (vagaIds: string[]) => void;
  removeFromSelection: (vagaIds: string[]) => void;
  selectVagasByCondition: (allVagas: any[], condition: (vaga: any) => boolean) => void;
  isVagaSelected: (vagaId: string) => boolean;
  areAllVagasSelected: (allVagaIds: string[]) => boolean;
  getSelectedCount: () => number;

  // Bulk Operations
  bulkLoading: boolean;
  handleBulkUpdate: (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>,
    params: any
  ) => Promise<void>;
  handleBulkAnunciar: (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>
  ) => Promise<void>;
  handleBulkCancelar: (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>
  ) => Promise<void>;
  handleBulkReativar: (
    selectedVagas: string[],
    jobsData: any[],
    onRefreshData: () => Promise<void>
  ) => Promise<void>;
  handleBulkFechar: (
    selectedVagas: string[],
    onRefreshData: () => Promise<void>
  ) => Promise<void>;
  handleBulkDelete: (
    vagasToDelete: string[],
    onRefreshData: () => Promise<void>
  ) => Promise<void>;

  // Common Data
  getCommonDataFromSelectedVagas: (
    selectedVagas: string[],
    fetchVagasData?: (vagaIds: string[]) => Promise<any[]>
  ) => Promise<any>;
  getCommonDataFromLoadedVagas: (selectedVagas: string[], allVagasData: any[]) => any;

  // Actions Config (será inicializado pelos componentes filhos)
  initializeActionsConfig?: (config: any) => void;
  bulkActions?: any[];
  getContextActions?: (vaga: any) => any[];
  actionsLoading?: boolean;
}

const VagasOperationsContext = createContext<VagasOperationsContextType | undefined>(undefined);

interface VagasOperationsProviderProps {
  children: ReactNode;
}

export function VagasOperationsProvider({ children }: VagasOperationsProviderProps) {
  // Hooks básicos
  const selection = useVagasSelection();
  const bulkOperations = useVagasBulkOperations();
  const commonData = useVagasCommonData();

  const contextValue: VagasOperationsContextType = {
    // Selection
    selectedVagas: selection.selectedVagas,
    showBulkActions: selection.showBulkActions,
    toggleVagaSelection: selection.toggleVagaSelection,
    toggleAllVagas: selection.toggleAllVagas,
    clearSelection: selection.clearSelection,
    selectVagas: selection.selectVagas,
    removeFromSelection: selection.removeFromSelection,
    selectVagasByCondition: selection.selectVagasByCondition,
    isVagaSelected: selection.isVagaSelected,
    areAllVagasSelected: selection.areAllVagasSelected,
    getSelectedCount: selection.getSelectedCount,

    // Bulk Operations
    bulkLoading: bulkOperations.loading,
    handleBulkUpdate: bulkOperations.handleBulkUpdate,
    handleBulkAnunciar: bulkOperations.handleBulkAnunciar,
    handleBulkCancelar: bulkOperations.handleBulkCancelar,
    handleBulkReativar: bulkOperations.handleBulkReativar,
    handleBulkFechar: bulkOperations.handleBulkFechar,
    handleBulkDelete: bulkOperations.handleBulkDelete,

    // Common Data
    getCommonDataFromSelectedVagas: commonData.getCommonDataFromSelectedVagas,
    getCommonDataFromLoadedVagas: commonData.getCommonDataFromLoadedVagas,
  };

  return (
    <VagasOperationsContext.Provider value={contextValue}>
      {children}
    </VagasOperationsContext.Provider>
  );
}

// Hook personalizado para usar o contexto
export function useVagasOperations() {
  const context = useContext(VagasOperationsContext);
  if (context === undefined) {
    throw new Error('useVagasOperations must be used within a VagasOperationsProvider');
  }
  return context;
}

// Hook adicional que integra as configurações de ações
export function useVagasOperationsWithActions(config: {
  vagasData: any[];
  onRefreshData: () => Promise<void>;
  onViewDetails?: (vagaId: string) => void;
  onViewApplications?: (vagaId: string) => void;
  onEditVaga?: (vagaId: string) => void;
  onCancelVaga?: (vagaId: string) => void;
  onAnnounceVaga?: (vagaId: string) => void;
  onCloseVaga?: (vagaId: string) => void;
  onDeleteVaga?: (vagaId: string) => void;
  onBulkEdit?: () => void;
  vagaCandidaturas?: Record<string, any[]>;
}) {
  const operations = useVagasOperations();

  let actionsConfig = useVagasActionsConfig({
    selectedVagas: operations.selectedVagas,
    vagasData: config.vagasData,
    onRefreshData: config.onRefreshData,
    onClearSelection: operations.clearSelection,
    onViewDetails: config.onViewDetails,
    onViewApplications: config.onViewApplications,
    onEditVaga: config.onEditVaga,
    onCancelVaga: config.onCancelVaga,
    onAnnounceVaga: config.onAnnounceVaga,
    onCloseVaga: config.onCloseVaga,
    onDeleteVaga: config.onDeleteVaga,
    onBulkEdit: config.onBulkEdit,
    vagaCandidaturas: config.vagaCandidaturas,
  });
  
  return {
    ...operations,
    ...actionsConfig,
  };
}
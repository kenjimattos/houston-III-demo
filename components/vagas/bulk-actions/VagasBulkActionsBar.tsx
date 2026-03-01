"use client";

import React from "react";
import { BulkActionsBar } from "@/components/ui/bulk-actions-bar";
import { useVagasOperationsWithActions } from "../providers/VagasOperationsProvider";

interface VagasBulkActionsBarProps {
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
  className?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export function VagasBulkActionsBar({
  vagasData,
  onRefreshData,
  onViewDetails,
  onViewApplications,
  onEditVaga,
  onCancelVaga,
  onAnnounceVaga,
  onCloseVaga,
  onDeleteVaga,
  onBulkEdit,
  vagaCandidaturas,
  className,
  bgColor,
  borderColor,
  textColor,
}: VagasBulkActionsBarProps) {

  const {
    selectedVagas,
    clearSelection,
    bulkActions,
    loading,
  } = useVagasOperationsWithActions({
    vagasData,
    onRefreshData,
    onViewDetails,
    onViewApplications,
    onEditVaga,
    onCancelVaga,
    onAnnounceVaga,
    onCloseVaga,
    onDeleteVaga,
    onBulkEdit,
    vagaCandidaturas,
  });

  return (
    <BulkActionsBar
      selectedItems={selectedVagas}
      items={vagasData}
      itemName="vaga"
      itemNamePlural="vagas"
      onClearSelection={clearSelection}
      actions={bulkActions}
      loading={loading}
      className={className}
      bgColor={bgColor}
      borderColor={borderColor}
      textColor={textColor}
    />
  );
}
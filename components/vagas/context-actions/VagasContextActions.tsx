"use client";

import React from "react";
import { ContextMenuActions } from "@/components/ui/context-menu-actions";
import { useVagasOperationsWithActions } from "../providers/VagasOperationsProvider";

interface VagasContextActionsProps {
  vaga: any;
  vagasData: any[];
  onRefreshData?: () => Promise<void>;
  onViewDetails?: (vagaId: string) => void;
  onViewApplications?: (vagaId: string) => void;
  onEditVaga?: (vagaId: string) => void;
  onCancelVaga?: (vagaId: string) => void;
  onAnnounceVaga?: (vagaId: string) => void;
  onCloseVaga?: (vagaId: string) => void;
  onDeleteVaga?: (vagaId: string) => void;
  onBulkEdit?: () => void;
  vagaCandidaturas?: Record<string, any[]>;
  disabled?: boolean;
  triggerClassName?: string;
  contentAlign?: "start" | "center" | "end";
  loading?: boolean;
}

export function VagasContextActions({
  vaga,
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
  disabled,
  triggerClassName,
  contentAlign,
  loading,
}: VagasContextActionsProps) {
  
  const { getContextActions } = useVagasOperationsWithActions({
    vagasData,
    onRefreshData: onRefreshData || (() => Promise.resolve()),
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

  const actions = getContextActions(vaga);

  return (
    <ContextMenuActions
      item={vaga}
      actions={actions}
      disabled={disabled}
      triggerClassName={triggerClassName}
      contentAlign={contentAlign}
      loading={loading}
    />
  );
}
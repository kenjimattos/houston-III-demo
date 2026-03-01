"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface CancelConfirmationModalProps {
  open: boolean
  count: number
  approvedCount?: number
  onConfirm: () => void
  onCancel: () => void
  isSingleItem?: boolean
  itemType?: 'vaga' | 'vagas'
}

export function CancelConfirmationModal({
  open,
  count,
  approvedCount = 0,
  onConfirm,
  onCancel,
  isSingleItem = false,
  itemType = 'vagas'
}: CancelConfirmationModalProps) {
  const hasApproved = approvedCount > 0
  const itemText = isSingleItem ? itemType.slice(0, -1) : itemType // 'vaga' or 'vagas'
  const description = hasApproved 
    ? `ATENÇÃO: ${approvedCount} ${approvedCount === 1 ? 'vaga possui' : 'vagas possuem'} candidatura${approvedCount !== 1 ? 's' : ''} aprovada${approvedCount !== 1 ? 's' : ''}. Cancelar ${isSingleItem ? 'esta vaga' : 'essas vagas'} irá reprovar automaticamente todas as candidaturas. Deseja continuar?`
    : `Você está prestes a cancelar ${isSingleItem ? '1' : count} ${count === 1 ? 'vaga' : 'vagas'}. Esta ação não pode ser desfeita.`

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onCancel()}
      title={isSingleItem ? "Confirmar cancelamento" : "Confirmar cancelamento em lote"}
      description={description}
      confirmText={`Cancelar ${isSingleItem ? 'vaga' : (count === 1 ? 'vaga' : 'vagas')}`}
      cancelText="Cancelar"
      onConfirm={onConfirm}
      variant="destructive"
    />
  )
}
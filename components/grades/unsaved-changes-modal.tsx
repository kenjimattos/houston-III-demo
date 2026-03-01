"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface UnsavedChangesModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnsavedChangesModal({
  open,
  onConfirm,
  onCancel,
}: UnsavedChangesModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onCancel()}
      title="Alterações não salvas"
      description="Existem alterações não salvas. Deseja sair sem salvar?"
      confirmText="Sair sem salvar"
      cancelText="Cancelar"
      onConfirm={onConfirm}
      variant="destructive"
    />
  )
}
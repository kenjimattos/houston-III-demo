"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface ReopenVacancyModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ReopenVacancyModal({
  open,
  onConfirm,
  onCancel,
}: ReopenVacancyModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onCancel()}
      title="Reabrir vaga"
      description="Deseja reabrir esta vaga? A vaga voltará ao status 'Aberta' e ficará disponível para novas candidaturas."
      confirmText="Reabrir vaga"
      cancelText="Cancelar"
      onConfirm={onConfirm}
      variant="default"
    />
  )
}
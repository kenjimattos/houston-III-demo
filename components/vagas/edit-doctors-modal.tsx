"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EditDoctorsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (action: 'PENDENTE' | 'REPROVADO' | 'EXCLUIR') => void
  vagasCount?: number
  loading?: boolean
  title?: string
  description?: string
}

export function EditDoctorsModal({
  open,
  onOpenChange,
  onConfirm,
  vagasCount = 1,
  loading = false,
  title,
  description
}: EditDoctorsModalProps) {
  const [selectedAction, setSelectedAction] = useState<'PENDENTE' | 'REPROVADO' | 'EXCLUIR' | null>(null)

  const handleConfirm = () => {
    if (selectedAction) {
      onConfirm(selectedAction)
      setSelectedAction(null)
    }
  }

  const handleCancel = () => {
    setSelectedAction(null)
    onOpenChange(false)
  }

  const defaultTitle = vagasCount > 1 
    ? "O que fazer com as candidaturas aprovadas?"
    : "O que fazer com a candidatura anterior?"

  const defaultDescription = vagasCount > 1
    ? `${vagasCount} vaga${vagasCount !== 1 ? 's' : ''} possui${vagasCount !== 1 ? 'em' : ''} candidaturas aprovadas. Como deseja proceder com estas candidaturas?`
    : "O médico anterior tinha uma candidatura aprovada nesta vaga. Como deseja proceder?"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || defaultTitle}</DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <div className="flex flex-col gap-2">
            <Button 
              variant={selectedAction === 'PENDENTE' ? 'default' : 'outline'} 
              onClick={() => setSelectedAction('PENDENTE')}
            >
              Marcar como PENDENTE
            </Button>
            <Button 
              variant={selectedAction === 'REPROVADO' ? 'default' : 'outline'} 
              onClick={() => setSelectedAction('REPROVADO')}
            >
              Marcar como REPROVADO
            </Button>
            <Button 
              variant={selectedAction === 'EXCLUIR' ? 'default' : 'outline'} 
              onClick={() => setSelectedAction('EXCLUIR')}
            >
              Excluir candidatura{vagasCount > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedAction || loading} 
            className="w-1/3"
          >
            Confirmar
          </Button>
          <Button 
            onClick={handleCancel} 
            disabled={loading} 
            variant="outline" 
            className="w-1/3"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
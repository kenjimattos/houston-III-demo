"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface DeleteConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  vagasCount?: number
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  vagasCount = 1,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            {title || "Confirmar Exclusão"}
          </DialogTitle>
          <DialogDescription className="pt-3">
            {description || (
              <span>
                Você está prestes a excluir definitivamente {vagasCount} vaga{vagasCount !== 1 ? 's' : ''} do sistema.
                <span className="block mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <span className="block text-sm text-red-800 font-medium">
                      Esta ação não pode ser desfeita
                  </span>
                  <span className="block text-xs text-red-700 mt-1">
                    A{vagasCount !== 1 ? 's' : ''} vaga{vagasCount !== 1 ? 's' : ''} ser{vagasCount !== 1 ? 'ão' : 'á'} permanentemente removida{vagasCount !== 1 ? 's' : ''} do banco de dados.
                  </span>
                </span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Definitivamente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Grupo } from "@/services/escalistasService";

interface GroupDeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: Grupo | null | undefined;
  onDeleteWithEscalistas: (grupo: Grupo) => void;
  onDeleteGroupOnly: (grupo: Grupo) => void;
}

export function GroupDeleteConfirmationModal({
  open,
  onOpenChange,
  grupo,
  onDeleteWithEscalistas,
  onDeleteGroupOnly,
}: GroupDeleteConfirmationModalProps) {
  if (!grupo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Grupo com Escalistas</DialogTitle>
        </DialogHeader>
        <div>
          O grupo &ldquo;{grupo.nome}&rdquo; possui escalistas. O que deseja
          fazer?
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => onDeleteGroupOnly(grupo)}
            className="w-full sm:w-auto"
          >
            Excluir apenas grupo
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDeleteWithEscalistas(grupo)}
            className="w-full sm:w-auto"
          >
            Excluir grupo e escalistas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

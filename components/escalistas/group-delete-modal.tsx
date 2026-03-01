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

interface GroupDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grupo: Grupo | null | undefined;
  onDelete: (grupo: Grupo) => void;
}

export function GroupDeleteModal({
  open,
  onOpenChange,
  grupo,
  onDelete,
}: GroupDeleteModalProps) {
  if (!grupo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Grupo</DialogTitle>
        </DialogHeader>
        <div>
          Tem certeza que deseja excluir o grupo &ldquo;{grupo.nome}&rdquo;?
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => onDelete(grupo)}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

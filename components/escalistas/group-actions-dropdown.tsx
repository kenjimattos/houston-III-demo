"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Grupo } from "@/services/escalistasService";

interface GroupActionsDropdownProps {
  grupo: Grupo;
  onEdit: (grupo: Grupo) => void;
  onDelete: (grupo: Grupo) => void;
  onDeleteWithOptions: (grupo: Grupo) => void;
}

export function GroupActionsDropdown({
  grupo,
  onEdit,
  onDelete,
  onDeleteWithOptions,
}: GroupActionsDropdownProps) {
  const handleDeleteClick = () => {
    if (grupo.escalistas.length > 0) {
      onDeleteWithOptions(grupo);
    } else {
      onDelete(grupo);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(grupo)}>
          <Edit className="w-4 h-4 mr-2" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDeleteClick}
          className="text-red-600 hover:bg-red-50 focus:bg-red-100"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Deletar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { StatusBadge } from "@/components/escalistas/status-badge";
import RequirePermission from "@/components/permissions/RequirePermission";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Escalista } from "@/services/escalistasService";
import { Permission } from "@/types/permission";
import { Edit } from "lucide-react";

interface EscalistaTableProps {
  escalistas: Escalista[];
  grupoId: string;
  onEditEscalista: (escalista: Escalista) => void;
  onManageEscalista?: (escalista: Escalista) => void;
  formatPhoneDisplay: (phone: string) => string;
  className?: string;
}

export function EscalistaTable({
  escalistas,
  grupoId,
  onEditEscalista,
  onManageEscalista,
  formatPhoneDisplay,
  className = "",
}: EscalistaTableProps) {
  if (!escalistas || escalistas.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">
        Nenhum escalista neste grupo.
      </div>
    );
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {escalistas.map((escalista) => (
            <TableRow key={escalista.id} className="h-10">
              <TableCell className="font-normal py-2">
                {escalista.nome}
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge status={escalista.escalista_status} />
              </TableCell>
              <TableCell className="py-2">{escalista!.role}</TableCell>
              <TableCell className="py-2">
                {formatPhoneDisplay(escalista.telefone || "")}
              </TableCell>
              <TableCell className="py-2">{escalista.email || "-"}</TableCell>
              <TableCell className="py-2 space-x-2">
                {/* Botão Editar com controle de permissão */}
                <RequirePermission
                  permission={Permission.MEMBERS_UPDATE}
                  fallback={
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            className="h-8 w-8 opacity-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Você não tem permissão para editar escalistas</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  }
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditEscalista(escalista)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar escalista</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </RequirePermission>

                {/* Botão Gerenciar com controle de permissão */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

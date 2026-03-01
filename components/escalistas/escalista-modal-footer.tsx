/**
 * Rodapé do Modal de Escalistas
 *
 * Componente responsável por renderizar os botões de ação no rodapé do modal,
 * incluindo controles de permissão e estados de carregamento.
 *
 * Características principais:
 * - Botão de salvar/criar com texto dinâmico baseado no modo
 * - Botão de excluir com controle de permissões (apenas modo edição)
 * - Estados de carregamento com feedback visual
 * - Layout responsivo e acessível
 */

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import RequirePermission from "@/components/permissions/RequirePermission";
import { Permission } from "@/types/permission";
import { Save, Trash2, Loader2 } from "lucide-react";

/**
 * Props do EscalistaModalFooter
 */
interface EscalistaModalFooterProps {
  /** Indica se está no modo edição (afeta texto dos botões) */
  isEditing: boolean;
  /** Estado de carregamento para desabilitar botões */
  isLoading: boolean;
  /** Indica se houve mudanças nos dados (para desabilitar botão no modo edição) */
  hasChanges?: boolean;
  /** Callback para deletar escalista (opcional, só aparece se fornecido) */
  onDelete?: () => Promise<void>;
}

/**
 * Componente Rodapé do Modal
 *
 * Renderiza os botões de ação com controles de permissão e estados adequados.
 */
export function EscalistaModalFooter({
  isEditing,
  isLoading,
  hasChanges = true, // Por padrão, permite submissão (modo criação)
  onDelete,
}: EscalistaModalFooterProps) {
  return (
    <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-4">
      {/* Botão Excluir - apenas no modo edição e com permissão */}
      {isEditing && onDelete && (
        <RequirePermission permission={Permission.MEMBERS_REMOVE}>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </RequirePermission>
      )}

      {/* Botão Salvar/Criar - sempre disponível */}
      <Button
        type="submit"
        disabled={isLoading || (isEditing && !hasChanges)}
        className="min-w-[100px]"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {/* Texto dinâmico baseado no estado atual */}
        {isLoading
          ? isEditing
            ? "Salvando..."
            : "Criando..."
          : isEditing
          ? "Salvar"
          : "Criar Escalista"}
      </Button>
    </DialogFooter>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";

interface PagamentoInputProps {
  value: string;
  onChange: (value: string) => void;
  canEdit: boolean;
  jaSalvo: boolean;
  isEditing: boolean;
  onEditClick: () => void;
  onSave: () => void;
  onCancel: () => void;
  originalValue: string;
}

export function PagamentoInput({
  value,
  onChange,
  canEdit,
  jaSalvo,
  isEditing,
  onEditClick,
  onSave,
  onCancel,
  originalValue,
}: PagamentoInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.,]/g, "");
    onChange(val);
  };

  if (!canEdit) {
    return (
      <span className="text-sm font-mono">
        {formatCurrency(Number(value) || 0)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">R$</span>

      {/* Se pagamento já salvo e não está editando, mostra valor fixo + botão editar */}
      {jaSalvo && !isEditing ? (
        <>
          <span className="h-8 w-24 text-sm text-right px-2 font-mono flex items-center justify-end">
            {value}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-blue-600 hover:bg-blue-50"
            onClick={onEditClick}
            title="Editar valor"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            className="h-8 w-24 text-sm text-right px-2 font-mono"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-green-600 hover:bg-green-50"
            onClick={onSave}
            title="Salvar valor"
          >
            <Check className="h-3 w-3" />
          </Button>
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:bg-gray-50"
              onClick={() => {
                onCancel();
                onChange(originalValue);
              }}
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  canAutorizarPagamento: boolean;
  canMarcarPago: boolean;
  onAutorizar: () => void;
  onMarcarPago: () => void;
}

export function ActionButtons({
  canAutorizarPagamento,
  canMarcarPago,
  onAutorizar,
  onMarcarPago,
}: ActionButtonsProps) {
  if (!canAutorizarPagamento && !canMarcarPago) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {canAutorizarPagamento && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 font-normal"
          onClick={onAutorizar}
        >
          Autorizar
        </Button>
      )}
      {canMarcarPago && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50 font-normal"
          onClick={onMarcarPago}
        >
          Pagar
        </Button>
      )}
    </div>
  );
}

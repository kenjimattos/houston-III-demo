"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/date-formatters";
import { ptBR } from "date-fns/locale";
import { Check, Pencil, ChevronDown, AlertTriangle, X } from "lucide-react";

interface CheckinCheckoutInputProps {
  // Check-in
  checkinDate: Date | undefined;
  checkinTime: string;
  onCheckinDateChange: (date: Date | undefined) => void;
  onCheckinTimeChange: (time: string) => void;
  checkinCalendarOpen: boolean;
  onCheckinCalendarOpenChange: (open: boolean) => void;
  showCheckinWarning: boolean;
  checkinWarningMessage: string;

  // Check-out
  checkoutDate: Date | undefined;
  checkoutTime: string;
  onCheckoutDateChange: (date: Date | undefined) => void;
  onCheckoutTimeChange: (time: string) => void;
  checkoutCalendarOpen: boolean;
  onCheckoutCalendarOpenChange: (open: boolean) => void;
  showCheckoutWarning: boolean;
  checkoutWarningMessage: string;

  // Estado compartilhado
  canEdit: boolean;
  jaSalvo: boolean;
  isEditing: boolean;
  onEditClick: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CheckinCheckoutInput({
  // Check-in
  checkinDate,
  checkinTime,
  onCheckinDateChange,
  onCheckinTimeChange,
  checkinCalendarOpen,
  onCheckinCalendarOpenChange,
  showCheckinWarning,
  checkinWarningMessage,

  // Check-out
  checkoutDate,
  checkoutTime,
  onCheckoutDateChange,
  onCheckoutTimeChange,
  checkoutCalendarOpen,
  onCheckoutCalendarOpenChange,
  showCheckoutWarning,
  checkoutWarningMessage,

  // Estado compartilhado
  canEdit,
  jaSalvo,
  isEditing,
  onEditClick,
  onSave,
  onCancel,
}: CheckinCheckoutInputProps) {
  const handleTimeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    currentTime: string,
    setTime: (time: string) => void
  ) => {
    const val = e.target.value.replace(/[^0-9:]/g, "");
    if (val.length === 2 && !val.includes(":") && currentTime.length < 2) {
      setTime(val + ":");
    } else if (val.length <= 5) {
      setTime(val);
    }
  };

  // Campos habilitados se:
  // 1. canEdit é true E
  // 2. (jaSalvo é false OU isEditing é true)
  // Ou seja: se nunca foi salvo, campos ficam habilitados por padrão
  //          se já foi salvo, precisa clicar no lápis para editar
  const fieldsEnabled = canEdit && (!jaSalvo || isEditing);

  return (
    <div className="flex items-center gap-2">
      {/* Coluna dos inputs (Check-in e Check-out) */}
      <div className="flex flex-col gap-1">
        {/* Check-in Row */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground w-6">In:</span>

          {showCheckinWarning && canEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{checkinWarningMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex items-center gap-3">
            <Popover open={checkinCalendarOpen} onOpenChange={fieldsEnabled ? onCheckinCalendarOpenChange : undefined}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-[90px] text-xs px-2 font-mono justify-between"
                  disabled={!fieldsEnabled}
                >
                  <span className="flex-1 text-center">
                    {checkinDate ? formatDateForDisplay(checkinDate) : <span className="text-muted-foreground">Data</span>}
                  </span>
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              {fieldsEnabled && (
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkinDate}
                    onSelect={(selectedDate) => {
                      onCheckinDateChange(selectedDate);
                      onCheckinCalendarOpenChange(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              )}
            </Popover>

            <Input
              type="text"
              value={checkinTime}
              onChange={(e) => handleTimeInputChange(e, checkinTime, onCheckinTimeChange)}
              placeholder="00:00"
              maxLength={5}
              className="h-7 w-14 text-xs text-center px-1 font-mono"
              disabled={!fieldsEnabled}
            />
          </div>
        </div>

        {/* Check-out Row */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground w-6">Out:</span>

          {showCheckoutWarning && canEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{checkoutWarningMessage}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex items-center gap-3">
            <Popover open={checkoutCalendarOpen} onOpenChange={fieldsEnabled ? onCheckoutCalendarOpenChange : undefined}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-[90px] text-xs px-2 font-mono justify-between"
                  disabled={!fieldsEnabled}
                >
                  <span className="flex-1 text-center">
                    {checkoutDate ? formatDateForDisplay(checkoutDate) : <span className="text-muted-foreground">Data</span>}
                  </span>
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              {fieldsEnabled && (
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkoutDate}
                    onSelect={(selectedDate) => {
                      onCheckoutDateChange(selectedDate);
                      onCheckoutCalendarOpenChange(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              )}
            </Popover>

            <Input
              type="text"
              value={checkoutTime}
              onChange={(e) => handleTimeInputChange(e, checkoutTime, onCheckoutTimeChange)}
              placeholder="00:00"
              maxLength={5}
              className="h-7 w-14 text-xs text-center px-1 font-mono"
              disabled={!fieldsEnabled}
            />
          </div>
        </div>
      </div>

      {/* Coluna dos botões de ação - Centralizada verticalmente */}
      {canEdit ? (
        isEditing ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-green-600 hover:bg-green-50"
              onClick={onSave}
              title="Salvar check-in/check-out"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-red-600 hover:bg-red-50"
              onClick={onCancel}
              title="Cancelar edição"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : jaSalvo ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-blue-600 hover:bg-blue-50"
            onClick={onEditClick}
            title="Editar check-in/check-out"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-green-600 hover:bg-green-50"
            onClick={onSave}
            title="Salvar check-in/check-out"
          >
            <Check className="h-3 w-3" />
          </Button>
        )
      ) : (
        <div className="w-5" />
      )}
    </div>
  );
}

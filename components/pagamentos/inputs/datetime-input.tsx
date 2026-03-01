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
import { Check, Pencil, ChevronDown, AlertTriangle } from "lucide-react";

interface DateTimeInputProps {
  label: "In" | "Out";
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  canEdit: boolean;
  jaSalvo: boolean;
  isEditing: boolean;
  onEditClick: () => void;
  onSave: () => void;
  showWarning: boolean;
  warningMessage: string;
}

export function DateTimeInput({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  calendarOpen,
  onCalendarOpenChange,
  canEdit,
  jaSalvo,
  isEditing,
  onEditClick,
  onSave,
  showWarning,
  warningMessage,
}: DateTimeInputProps) {
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9:]/g, "");
    if (val.length === 2 && !val.includes(":") && time.length < 2) {
      onTimeChange(val + ":");
    } else if (val.length <= 5) {
      onTimeChange(val);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground w-6">{label}:</span>

      {/* Ícone de aviso se médico não preencheu */}
      {showWarning && canEdit && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{warningMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="flex items-center gap-3">
        {/* Date Picker */}
        <Popover open={calendarOpen} onOpenChange={canEdit ? onCalendarOpenChange : undefined}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-[90px] text-xs px-2 font-mono justify-between"
              disabled={!canEdit}
            >
              <span className="flex-1 text-center">
                {date ? formatDateForDisplay(date) : <span className="text-muted-foreground">Data</span>}
              </span>
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          {canEdit && (
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  onDateChange(selectedDate);
                  onCalendarOpenChange(false);
                }}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          )}
        </Popover>

        {/* Time Input */}
        <Input
          type="text"
          value={time}
          onChange={handleTimeInputChange}
          placeholder="00:00"
          maxLength={5}
          className="h-7 w-14 text-xs text-center px-1 font-mono"
          disabled={!canEdit}
        />

        {/* Action Button */}
        {canEdit ? (
          jaSalvo && !isEditing ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-blue-600 hover:bg-blue-50"
              onClick={onEditClick}
              title={`Editar check-${label.toLowerCase()}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-green-600 hover:bg-green-50"
              onClick={onSave}
              title={`Salvar check-${label.toLowerCase()}`}
            >
              <Check className="h-3 w-3" />
            </Button>
          )
        ) : (
          <div className="w-5" />
        )}
      </div>
    </div>
  );
}

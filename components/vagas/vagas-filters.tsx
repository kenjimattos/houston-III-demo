"use client";

import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, ChevronDown, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { DoctorSelector } from "@/components/medicos/doctor-selector";
import { MultiHospitalSelector } from "@/components/hospitais/multi-hospital-selector";
import { useState } from "react";
import RequirePermission from "../permissions/RequirePermission";
import { Permission } from "@/types/permission";

interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface VagasFiltersProps {
  // Dados dos filtros
  specialties: FilterOption[];
  sectors: FilterOption[];
  periods: FilterOption[];
  grades: FilterOption[];
  doctors: FilterOption[];
  hospitals?: FilterOption[]; // Lista de hospitais disponíveis baseada no contexto

  // Estados dos filtros
  selectedHospitals: string[];
  selectedSpecialties: string[];
  selectedSectors: string[];
  selectedPeriods: string[];
  selectedStatuses: string[];
  selectedGrades: string[];
  selectedDoctors: string[];
  dateRange?: DateRange;

  // Handlers
  onHospitalsChange: (value: string[]) => void;
  onSpecialtiesChange: (values: string[]) => void;
  onSectorsChange: (values: string[]) => void;
  onPeriodsChange: (values: string[]) => void;
  onStatusesChange: (values: string[]) => void;
  onGradesChange: (values: string[]) => void;
  onDoctorsChange: (values: string[]) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
  onCreateNew: () => void;

  className?: string;
}

const STATUS_OPTIONS = [
  { value: "aberta", label: "Aberta" },
  { value: "fechada", label: "Fechada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "anunciada", label: "Anunciada" },
];

export function VagasFilters({
  specialties,
  sectors,
  periods,
  grades,
  doctors,
  hospitals,
  selectedHospitals,
  selectedSpecialties,
  selectedSectors,
  selectedPeriods,
  selectedStatuses,
  selectedGrades,
  selectedDoctors,
  dateRange,
  onHospitalsChange,
  onSpecialtiesChange,
  onSectorsChange,
  onPeriodsChange,
  onStatusesChange,
  onGradesChange,
  onDoctorsChange,
  onDateRangeChange,
  onClearFilters,
  onCreateNew,
  className,
}: VagasFiltersProps) {
  const [doctorSelectorOpen, setDoctorSelectorOpen] = useState(false);

  return (
    <div className={cn("space-y-4 mb-6", className)}>
      <h3 className="text-sm font-normal text-muted-foreground">Filtros</h3>

      {/* Primeira linha de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MultiHospitalSelector
          value={selectedHospitals}
          onChange={onHospitalsChange}
          placeholder="Selecionar hospitais..."
          className="w-full"
          label=""
          availableHospitals={hospitals?.map((h) => ({
            hospital_id: h.value,
            hospital_nome: h.label,
            hospital_cnpj: "",
            hospital_endereco: "",
            hospital_telefone: "",
            hospital_email: "",
          }))}
        />

        <MultiSelect
          options={specialties}
          value={selectedSpecialties}
          onValueChange={onSpecialtiesChange}
          placeholder="Especialidades"
          className="w-full"
        />

        <MultiSelect
          options={sectors}
          value={selectedSectors}
          onValueChange={onSectorsChange}
          placeholder="Setores"
          className="w-full"
        />

        <DoctorSelector
          selectedDoctor=""
          selectedDoctors={selectedDoctors}
          onSelectDoctor={() => {}}
          onSelectDoctors={onDoctorsChange}
          open={doctorSelectorOpen}
          onOpenChange={setDoctorSelectorOpen}
          customButtonClassName={
            selectedDoctors.length === 0 ? "text-muted-foreground" : ""
          }
          multiple={true}
        />
      </div>

      {/* Segunda linha de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MultiSelect
          options={periods}
          value={selectedPeriods}
          onValueChange={onPeriodsChange}
          placeholder="Períodos"
          className="w-full"
        />

        <MultiSelect
          options={STATUS_OPTIONS}
          value={selectedStatuses}
          onValueChange={onStatusesChange}
          placeholder="Status"
          className="w-full"
        />

        <GradesMultiSelect
          grades={grades}
          value={selectedGrades}
          onValueChange={onGradesChange}
          placeholder="Grades"
          className="w-full"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "justify-start text-left font-thin w-full",
                !(dateRange && dateRange.from && dateRange.to) &&
                  "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange && dateRange.from && dateRange.to ? (
                `${format(dateRange.from, "dd/MM/yyyy")} - ${format(
                  dateRange.to,
                  "dd/MM/yyyy"
                )}`
              ) : (
                <span>Intervalo de datas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Terceira linha - Botões de ação */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          className="font-thin"
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
        <RequirePermission permission={Permission.JOBS_CREATE}>
          <Button onClick={onCreateNew} className="font-normal">
            <Plus className="mr-2 h-4 w-4" /> Nova Vaga
          </Button>
        </RequirePermission>
      </div>
    </div>
  );
}

// Componente especializado para seleção de grades com cores
interface GradesMultiSelectProps {
  grades: FilterOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

function GradesMultiSelect({
  grades,
  value,
  onValueChange,
  placeholder = "Grades",
  className,
}: GradesMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOptions = grades.filter((grade) => value.includes(grade.value));

  const handleSelect = (gradeValue: string) => {
    const newValue = value.includes(gradeValue)
      ? value.filter((v) => v !== gradeValue)
      : [...value, gradeValue];
    onValueChange(newValue);
  };

  const handleClear = () => {
    onValueChange([]);
  };

  const displayText = () => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }

    if (selectedOptions.length <= 2) {
      const text = selectedOptions.map((option) => option.label).join(", ");
      if (text.length > 30) {
        return `${selectedOptions.length} selecionada${
          selectedOptions.length > 1 ? "s" : ""
        }`;
      }
      return text;
    }

    return `${selectedOptions.length} selecionada${
      selectedOptions.length > 1 ? "s" : ""
    }`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-thin",
            selectedOptions.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="p-3">
          {/* Header com contagem e botão limpar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-normal">
              {selectedOptions.length > 0 && (
                <span className="text-muted-foreground">
                  {selectedOptions.length} de {grades.length} selecionada
                  {selectedOptions.length > 1 ? "s" : ""}
                </span>
              )}
            </span>
            {selectedOptions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-xs shrink-0"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Lista de grades */}
          <div className="max-h-80 overflow-auto">
            {grades.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma grade disponível
              </div>
            ) : (
              grades.map((grade) => (
                <div
                  key={grade.value}
                  className="flex items-start space-x-2 py-2 px-2 hover:bg-accent rounded cursor-pointer"
                  onClick={() => handleSelect(grade.value)}
                >
                  <Checkbox
                    checked={value.includes(grade.value)}
                    onCheckedChange={() => handleSelect(grade.value)}
                    className="mt-0.5 shrink-0"
                  />
                  <label className="flex-1 text-sm font-thin cursor-pointer leading-tight flex items-center gap-2">
                    {grade.color && grade.value !== "sem-grade" ? (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: grade.color }}
                      />
                    ) : null}
                    {grade.label}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

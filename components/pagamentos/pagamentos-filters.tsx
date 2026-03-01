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
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { MultiHospitalSelector } from "@/components/hospitais/multi-hospital-selector";
import { DoctorSelector } from "@/components/medicos/doctor-selector";
import { useState } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface PagamentosFiltersProps {
  specialties: FilterOption[];
  sectors: FilterOption[];
  selectedHospitals: string[];
  selectedSpecialties: string[];
  selectedSectors: string[];
  selectedPagamentoStatuses: string[];
  selectedDoctors: string[];
  dateRange?: DateRange;
  onHospitalsChange: (value: string[]) => void;
  onSpecialtiesChange: (values: string[]) => void;
  onSectorsChange: (values: string[]) => void;
  onPagamentoStatusesChange: (values: string[]) => void;
  onDoctorsChange: (values: string[]) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
  pagamentoStatusOptions: FilterOption[];
  className?: string;
}

export function PagamentosFilters({
  specialties,
  sectors,
  selectedHospitals,
  selectedSpecialties,
  selectedSectors,
  selectedPagamentoStatuses,
  selectedDoctors,
  dateRange,
  onHospitalsChange,
  onSpecialtiesChange,
  onSectorsChange,
  onPagamentoStatusesChange,
  onDoctorsChange,
  onDateRangeChange,
  onClearFilters,
  pagamentoStatusOptions,
  className,
}: PagamentosFiltersProps) {
  const [doctorSelectorOpen, setDoctorSelectorOpen] = useState(false);

  return (
    <div className={cn("space-y-4 mb-6", className)}>
      <h3 className="text-sm font-normal text-muted-foreground">Filtros</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <MultiHospitalSelector
          value={selectedHospitals}
          onChange={onHospitalsChange}
          placeholder="Selecionar hospitais..."
          className="w-full"
          label=""
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <MultiSelect
          options={pagamentoStatusOptions}
          value={selectedPagamentoStatuses}
          onValueChange={onPagamentoStatusesChange}
          placeholder="Status do Pagamento"
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
              {dateRange && dateRange.from && dateRange.to
                ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                : "Intervalo de datas"}
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

        <Button variant="outline" className="font-thin" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

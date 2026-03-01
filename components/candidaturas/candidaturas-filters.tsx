"use client"

import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/multi-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { MultiHospitalSelector } from "@/components/hospitais/multi-hospital-selector"
import { DoctorSelector } from "@/components/medicos/doctor-selector"
import { useState } from "react"

interface FilterOption {
  value: string
  label: string
}

interface CandidaturasFiltersProps {
  // Dados dos filtros
  specialties: FilterOption[]
  sectors: FilterOption[]
  doctors: FilterOption[]
  hospitals?: FilterOption[] // Lista de hospitais disponíveis baseada no contexto
  
  // Estados dos filtros
  selectedHospitals: string[]
  selectedSpecialties: string[]
  selectedSectors: string[]
  selectedStatuses: string[]
  selectedDoctors: string[]
  dateRange?: DateRange
  
  // Handlers
  onHospitalsChange: (value: string[]) => void
  onSpecialtiesChange: (values: string[]) => void
  onSectorsChange: (values: string[]) => void
  onStatusesChange: (values: string[]) => void
  onDoctorsChange: (values: string[]) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onClearFilters: () => void
  
  className?: string
}

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' }
]

export function CandidaturasFilters({
  specialties,
  sectors,
  doctors,
  hospitals,
  selectedHospitals,
  selectedSpecialties,
  selectedSectors,
  selectedStatuses,
  selectedDoctors,
  dateRange,
  onHospitalsChange,
  onSpecialtiesChange,
  onSectorsChange,
  onStatusesChange,
  onDoctorsChange,
  onDateRangeChange,
  onClearFilters,
  className
}: CandidaturasFiltersProps) {
  const [doctorSelectorOpen, setDoctorSelectorOpen] = useState(false)
  
  return (
    <div className={cn("space-y-4 mb-6", className)}>
      <h3 className="text-sm font-normal text-muted-foreground">Filtros</h3>
      
      {/* Primeira linha de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <MultiHospitalSelector
          value={selectedHospitals}
          onChange={onHospitalsChange}
          placeholder="Selecionar hospitais..."
          className="w-full"
          label=""
          availableHospitals={hospitals?.map(h => ({
            hospital_id: h.value,
            hospital_nome: h.label,
            hospital_cnpj: '',
            hospital_endereco: '',
            hospital_telefone: '',
            hospital_email: ''
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
      </div>

      {/* Segunda linha de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DoctorSelector
          selectedDoctor=""
          selectedDoctors={selectedDoctors}
          onSelectDoctor={() => {}}
          onSelectDoctors={onDoctorsChange}
          open={doctorSelectorOpen}
          onOpenChange={setDoctorSelectorOpen}
          customButtonClassName={selectedDoctors.length === 0 ? "text-muted-foreground" : ""}
          multiple={true}
        />
        <MultiSelect
          options={STATUS_OPTIONS}
          value={selectedStatuses}
          onValueChange={onStatusesChange}
          placeholder="Status"
          className="w-full"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "justify-start text-left font-thin w-full",
                !(dateRange && dateRange.from && dateRange.to) && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange && dateRange.from && dateRange.to
                ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                : <span>Intervalo de datas</span>}
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

        {/* Botão de limpar filtros */}
        <Button 
          variant="outline" 
          className="font-thin"
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  )
} 
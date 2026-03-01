"use client"

import { Button } from "@/components/ui/button"
import { MultiSelect } from "@/components/ui/multi-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarIcon, Plus } from "lucide-react"
import { DateRange } from "react-day-picker"

interface FilterOption {
  value: string
  label: string
}

interface PageFiltersProps {
  // Dados dos filtros
  hospitals: FilterOption[]
  specialties: FilterOption[]
  sectors: FilterOption[]
  periods: FilterOption[]
  
  // Estados dos filtros
  selectedHospitals: string[]
  selectedSpecialties: string[]
  selectedSectors: string[]
  selectedPeriods: string[]
  selectedStatuses: string[]
  dateRange?: DateRange
  
  // Handlers
  onHospitalsChange: (values: string[]) => void
  onSpecialtiesChange: (values: string[]) => void
  onSectorsChange: (values: string[]) => void
  onPeriodsChange: (values: string[]) => void
  onStatusesChange: (values: string[]) => void
  onDateRangeChange?: (range: DateRange | undefined) => void
  onClearFilters: () => void
  onCreateNew: () => void
  
  // Configurações
  showDateRange?: boolean
  showCreateButton?: boolean
  statusOptions?: FilterOption[]
  createButtonText?: string
  className?: string
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'fechada', label: 'Fechada' },
  { value: 'cancelada', label: 'Cancelada' }
]

export function PageFilters({
  hospitals,
  specialties,
  sectors,
  periods,
  selectedHospitals,
  selectedSpecialties,
  selectedSectors,
  selectedPeriods,
  selectedStatuses,
  dateRange,
  onHospitalsChange,
  onSpecialtiesChange,
  onSectorsChange,
  onPeriodsChange,
  onStatusesChange,
  onDateRangeChange,
  onClearFilters,
  onCreateNew,
  showDateRange = true,
  showCreateButton = true,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  createButtonText = "Nova Vaga",
  className
}: PageFiltersProps) {
  return (
    <div className={cn("space-y-4 mb-6", className)}>
      <h3 className="text-sm font-normal text-muted-foreground">Filtros</h3>
      
      {/* Primeira linha de filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <MultiSelect
          options={hospitals}
          value={selectedHospitals}
          onValueChange={onHospitalsChange}
          placeholder="Hospitais"
          className="w-full xl:col-span-1"
          dropdownWidth="w-[450px] lg:w-[550px] xl:w-[600px]"
          showSearch={true}
          searchPlaceholder="Buscar hospital..."
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
      <div className={cn(
        "grid grid-cols-1 gap-4",
        showDateRange && periods.length > 0 ? "sm:grid-cols-2 lg:grid-cols-4" :
        showDateRange || periods.length > 0 ? "sm:grid-cols-2 lg:grid-cols-3" :
        "sm:grid-cols-2"
      )}>
        <MultiSelect
          options={periods}
          value={selectedPeriods}
          onValueChange={onPeriodsChange}
          placeholder="Períodos"
          className="w-full"
        />

        <MultiSelect
          options={statusOptions}
          value={selectedStatuses}
          onValueChange={onStatusesChange}
          placeholder="Status"
          className="w-full"
        />

        {showDateRange && onDateRangeChange && (
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
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 lg:col-span-1">
          <Button 
            variant="outline" 
            className="font-thin flex-1"
            onClick={onClearFilters}
          >
            Limpar filtros
          </Button>
          {showCreateButton && (
            <Button 
              onClick={onCreateNew} 
              className="font-normal flex-1"
            >
              <Plus className="mr-2 h-4 w-4" /> {createButtonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 
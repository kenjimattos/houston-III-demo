"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarFiltersProps {
  specialties: { value: string; label: string }[]
  sectors: { value: string; label: string }[]
  onFilterChange: (filters: {
    specialty: string | null
    sector: string | null
    status: string | null
    date: Date | null
  }) => void
}

export function CalendarFilters({ specialties, sectors, onFilterChange }: CalendarFiltersProps) {
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [sector, setSector] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [date, setDate] = useState<Date | null>(null)

  const handleSpecialtyChange = (value: string) => {
    setSpecialty(value === "todos" ? null : value)
    onFilterChange({
      specialty: value === "todos" ? null : value,
      sector,
      status,
      date,
    })
  }

  const handleSectorChange = (value: string) => {
    setSector(value === "todos" ? null : value)
    onFilterChange({
      specialty,
      sector: value === "todos" ? null : value,
      status,
      date,
    })
  }

  const handleStatusChange = (value: string) => {
    setStatus(value === "todos" ? null : value)
    onFilterChange({
      specialty,
      sector,
      status: value === "todos" ? null : value,
      date,
    })
  }

  const handleDateChange = (value: Date | undefined) => {
    setDate(value || null)
    onFilterChange({
      specialty,
      sector,
      status,
      date: value || null,
    })
  }

  const clearFilters = () => {
    setSpecialty(null)
    setSector(null)
    setStatus(null)
    setDate(null)
    onFilterChange({
      specialty: null,
      sector: null,
      status: null,
      date: null,
    })
  }

  const hasFilters = specialty !== null || sector !== null || status !== null || date !== null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <Select value={specialty || "todos"} onValueChange={handleSpecialtyChange}>
              <SelectTrigger className="font-thin">
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="font-thin">
                  Todas Especialidades
                </SelectItem>
                {specialties.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="font-thin">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sector || "todos"} onValueChange={handleSectorChange}>
              <SelectTrigger className="font-thin">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="font-thin">
                  Todos Setores
                </SelectItem>
                {sectors.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="font-thin">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status || "todos"} onValueChange={handleStatusChange}>
              <SelectTrigger className="font-thin">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="font-thin">
                  Todos Status
                </SelectItem>
                <SelectItem value="aberta" className="font-thin">
                  Aberta
                </SelectItem>
                <SelectItem value="fechada" className="font-thin">
                  Fechada
                </SelectItem>
                <SelectItem value="cancelada" className="font-thin">
                  Cancelada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full md:w-[240px] justify-start text-left font-thin",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Data específica</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date || undefined}
                  onSelect={handleDateChange}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { format, addMonths, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface MonthPickerProps {
  selected: Date
  onSelect: (date: Date) => void
}

export function MonthPicker({ selected, onSelect }: MonthPickerProps) {
  const [open, setOpen] = useState(false)

  // Navegar para o mês anterior
  const previousMonth = () => {
    onSelect(subMonths(selected, 1))
  }

  // Navegar para o próximo mês
  const nextMonth = () => {
    onSelect(addMonths(selected, 1))
  }

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={previousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-[240px] justify-start text-left font-normal", !selected && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(selected, "MMMM 'de' yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onSelect(date)
                setOpen(false)
              }
            }}
            initialFocus
            month={selected}
            onMonthChange={onSelect}
            captionLayout="dropdown-buttons"
            fromYear={2020}
            toYear={2030}
            showOutsideDays={false}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={nextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

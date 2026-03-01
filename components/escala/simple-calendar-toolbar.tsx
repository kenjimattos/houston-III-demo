"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"

// Constantes de visualização
const VIEWS = {
  MONTH: 'month',
  WEEK: 'week'
} as const

interface SimpleCalendarToolbarProps {
  view: string
  date: Date
  onNavigate: (date: Date) => void
  onViewChange: (view: string) => void
}

export function SimpleCalendarToolbar({
  view,
  date,
  onNavigate,
  onViewChange
}: SimpleCalendarToolbarProps) {

  const navigatePrevious = () => {
    let newDate: Date
    
    switch (view) {
      case VIEWS.MONTH:
        newDate = subMonths(date, 1)
        break
      case VIEWS.WEEK:
        newDate = subWeeks(date, 1)
        break
      default:
        newDate = subMonths(date, 1)
    }
    
    onNavigate(newDate)
  }

  const navigateNext = () => {
    let newDate: Date
    
    switch (view) {
      case VIEWS.MONTH:
        newDate = addMonths(date, 1)
        break
      case VIEWS.WEEK:
        newDate = addWeeks(date, 1)
        break
      default:
        newDate = addMonths(date, 1)
    }
    
    onNavigate(newDate)
    
  }

  const navigateToday = () => {
    onNavigate(new Date())
  }

  const getDateLabel = () => {
    switch (view) {
      case VIEWS.MONTH:
        return format(date, "MMMM 'de' yyyy", { locale: ptBR })
          .charAt(0).toUpperCase() + format(date, "MMMM 'de' yyyy", { locale: ptBR }).slice(1)
      case VIEWS.WEEK:
        const startOfWeek = new Date(date)
        const dayOfWeek = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - dayOfWeek
        const weekStart = new Date(startOfWeek.setDate(diff))
        const weekEnd = addDays(weekStart, 6)
        
        return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`
      default:
        return format(date, "MMMM 'de' yyyy", { locale: ptBR })
    }
  }


  return (
    <div className="flex items-center justify-between w-full">
      {/* Navegação de data */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={navigatePrevious}
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={navigateToday}
          className="h-8 px-3"
        >
          <CalendarIcon className="mr-1 h-4 w-4" />
          Hoje
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={navigateNext}
          className="h-8 px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Label da data atual */}
      <div className="flex-1 text-center">
        <h2 className="text-lg font-normal text-gray-900">
          {getDateLabel()}
        </h2>
      </div>

      {/* Botões toggle de visualização */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <Button
          size="sm"
          variant={view === VIEWS.MONTH ? "default" : "ghost"}
          onClick={() => onViewChange(VIEWS.MONTH)}
          className="h-7 px-3 text-xs"
        >
          Mês
        </Button>
        <Button
          size="sm"
          variant={view === VIEWS.WEEK ? "default" : "ghost"}
          onClick={() => onViewChange(VIEWS.WEEK)}
          className="h-7 px-3 text-xs"
        >
          Semana
        </Button>
      </div>
    </div>
  )
}
"use client"

import React from "react"
import { CustomWeekCalendar } from "./custom-week-calendar"
import { CustomMonthCalendar } from "./custom-month-calendar"

// Constantes de visualização
const VIEWS = {
  MONTH: 'month',
  WEEK: 'week'
} as const

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  hospital: string
  specialty: string
  sector: string
  status: "aberta" | "fechada" | "cancelada" | "anunciada"
  doctor?: string
  candidates: number
  value: number
  resource?: any
}

interface CustomCalendarWrapperProps {
  events: CalendarEvent[]
  view: string
  date: Date
  vagaCandidaturas?: Record<string, any[]>
  vagasData: any[]
  grades?: Array<{ id: string; nome: string; cor: string }>
  onViewDetails?: (vagaId: string) => void
  onViewApplications?: (vagaId: string) => void
  onEditVaga?: (vagaId: string) => void
  onCancelVaga?: (vagaId: string) => void
  onAnnounceVaga?: (vagaId: string) => void
  onCloseVaga?: (vagaId: string) => void
  onDeleteVaga?: (vagaId: string) => void
  onRefreshData?: () => Promise<void>
  onDayClick?: (date: Date) => void
  clickedDay?: Date | null
  selectedVagas?: string[]
  onVagaSelection?: (vagaId: string, isSelected: boolean) => void
  showBulkActions?: boolean
  highlightedVaga?: string | null
  className?: string
}

export function CustomCalendarWrapper({
  events,
  view,
  date,
  vagaCandidaturas = {},
  vagasData,
  grades,
  onViewDetails,
  onViewApplications,
  onEditVaga,
  onCancelVaga,
  onAnnounceVaga,
  onCloseVaga,
  onDeleteVaga,
  onRefreshData,
  onDayClick,
  clickedDay,
  selectedVagas,
  onVagaSelection,
  showBulkActions,
  highlightedVaga,
  className = ""
}: CustomCalendarWrapperProps) {
  
  const renderCalendar = () => {
    switch (view) {
      case VIEWS.WEEK:
        return (
          <CustomWeekCalendar
            events={events}
            date={date}
            vagaCandidaturas={vagaCandidaturas}
            vagasData={vagasData}
            grades={grades}
            onViewDetails={onViewDetails}
            onViewApplications={onViewApplications}
            onEditVaga={onEditVaga}
            onCancelVaga={onCancelVaga}
            onAnnounceVaga={onAnnounceVaga}
            onCloseVaga={onCloseVaga}
            onDeleteVaga={onDeleteVaga}
            onRefreshData={onRefreshData}
            selectedVagas={selectedVagas}
            onVagaSelection={onVagaSelection}
            showBulkActions={showBulkActions}
            clickedDay={clickedDay}
            highlightedVaga={highlightedVaga}
          />
        )
      
      case VIEWS.MONTH:
        return (
          <CustomMonthCalendar
            events={events}
            date={date}
            vagaCandidaturas={vagaCandidaturas}
            vagasData={vagasData}
            grades={grades}
            onViewDetails={onViewDetails}
            onViewApplications={onViewApplications}
            onEditVaga={onEditVaga}
            onCancelVaga={onCancelVaga}
            onAnnounceVaga={onAnnounceVaga}
            onCloseVaga={onCloseVaga}
            onDeleteVaga={onDeleteVaga}
            onRefreshData={onRefreshData}
            onDayClick={onDayClick}
            clickedDay={clickedDay}
            highlightedVaga={highlightedVaga}
          />
        )
      
      
      default:
        return (
          <CustomMonthCalendar
            events={events}
            date={date}
            vagaCandidaturas={vagaCandidaturas}
            vagasData={vagasData}
            grades={grades}
            onViewDetails={onViewDetails}
            onViewApplications={onViewApplications}
            onEditVaga={onEditVaga}
            onCancelVaga={onCancelVaga}
            onAnnounceVaga={onAnnounceVaga}
            onCloseVaga={onCloseVaga}
            onDeleteVaga={onDeleteVaga}
            onRefreshData={onRefreshData}
            onDayClick={onDayClick}
            clickedDay={clickedDay}
            highlightedVaga={highlightedVaga}
          />
        )
    }
  }

  return (
    <div className={`custom-calendar-container ${className}`} id="calendar-export-container">
      {renderCalendar()}
    </div>
  )
}
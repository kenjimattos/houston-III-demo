"use client"

import React from "react"
import { Clock, Users, Calendar, AlertCircle } from "lucide-react"
import { type GradeLine } from "@/hooks/grades"

interface GradeCardViewModeProps {
  line: GradeLine
  diasSemana: string[]
}

export function GradeCardViewMode({ line, diasSemana }: GradeCardViewModeProps) {
  
  // Calcular estatísticas da grade
  const getGradeStats = () => {
    const stats = {
      totalSlots: 0,
      slotsWithMedicos: 0,
      activeDays: 0,
      totalWeeks: 0,
      horarioInfo: null as { inicio: number, fim: number } | null
    }

    // Usar apenas estrutura slotsByDay (após refatoração)
    if (line.slotsByDay && Object.keys(line.slotsByDay).length > 0) {
      stats.totalWeeks = Object.keys(line.slotsByDay).length
      
      Object.values(line.slotsByDay).forEach(week => {
        Object.values(week).forEach(daySlots => {
          if (daySlots && daySlots.length > 0) {
            stats.activeDays++
            stats.totalSlots += daySlots.length
            stats.slotsWithMedicos += daySlots.filter(slot => slot.assignedVagas && slot.assignedVagas.length > 0).length
            
            // Capturar informações de horário
            daySlots.forEach(slot => {
              if (!stats.horarioInfo) {
                stats.horarioInfo = { inicio: slot.startHour, fim: slot.endHour }
              } else {
                stats.horarioInfo.inicio = Math.min(stats.horarioInfo.inicio, slot.startHour)
                stats.horarioInfo.fim = Math.max(stats.horarioInfo.fim, slot.endHour)
              }
            })
          }
        })
      })
    }

    return stats
  }

  const stats = getGradeStats()
  const hasConfiguration = stats.totalSlots > 0
  const occupancyRate = stats.totalSlots > 0 ? Math.round((stats.slotsWithMedicos / stats.totalSlots) * 100) : 0

  const formatHorario = (hora: number) => {
    return `${hora.toString().padStart(2, '0')}:00`
  }

  if (!hasConfiguration) {
    // Exibir quando a grade não tem configuração
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <AlertCircle className="w-8 h-8 text-gray-400" />
          <div>
            <p className="text-sm font-normal">Grade não configurada</p>
            <p className="text-xs">Clique em &ldquo;Editar&rdquo; para configurar horários e plantões</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Grid de estatísticas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Horário */}
        {stats.horarioInfo && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">Horário</span>
            </div>
            <p className="text-sm font-normal">
              {formatHorario(stats.horarioInfo.inicio)} - {formatHorario(stats.horarioInfo.fim)}
            </p>
          </div>
        )}

        {/* Dias ativos */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Dias</span>
          </div>
          <p className="text-sm font-normal">
            {stats.activeDays} {stats.activeDays === 1 ? 'dia' : 'dias'}
          </p>
        </div>

        {/* Semanas */}
        {stats.totalWeeks > 1 && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs text-gray-600">Semanas</span>
            </div>
            <p className="text-sm font-normal">{stats.totalWeeks}</p>
          </div>
        )}

        {/* Ocupação */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Ocupação</span>
          </div>
          <p className="text-sm font-normal">
            {occupancyRate}%
          </p>
        </div>
      </div>

      {/* Indicador de status visual */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300 rounded-full"
            style={{ 
              width: `${occupancyRate}%`,
              backgroundColor: line.cor
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          {stats.slotsWithMedicos} de {stats.totalSlots} plantões com médicos
        </p>
      </div>

      {/* Resumo rápido dos dias ativos */}
      {stats.activeDays > 0 && stats.activeDays <= 7 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-600 mb-2">Dias da semana configurados:</p>
          <div className="flex flex-wrap gap-1">
            {/* Aqui poderíamos mostrar quais dias específicos estão configurados */}
            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
              {stats.activeDays} {stats.activeDays === 1 ? 'dia configurado' : 'dias configurados'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
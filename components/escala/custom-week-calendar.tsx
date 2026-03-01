"use client"

import React, { useMemo, useEffect, useRef } from "react"
import moment from "moment"
import "moment/locale/pt-br"
import { cn, cleanHospitalNameSync } from "@/lib/utils"
import { DoctorNameLink } from "@/components/medicos/doctor-name-link"
import { Checkbox } from "@/components/ui/checkbox"
import { VagasContextActions } from "@/components/vagas/context-actions/VagasContextActions"

// Garantir que o moment esteja configurado para português
moment.locale("pt-br")

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

interface CustomWeekCalendarProps {
  events: CalendarEvent[]
  date: Date
  vagaCandidaturas: Record<string, any[]>
  vagasData: any[]
  grades?: Array<{ id: string; nome: string; cor: string; ordem?: number }>
  onViewDetails?: (vagaId: string) => void
  onViewApplications?: (vagaId: string) => void
  onEditVaga?: (vagaId: string) => void
  onCancelVaga?: (vagaId: string) => void
  onAnnounceVaga?: (vagaId: string) => void
  onCloseVaga?: (vagaId: string) => void
  onDeleteVaga?: (vagaId: string) => void
  onRefreshData?: () => Promise<void>
  selectedVagas?: string[]
  onVagaSelection?: (vagaId: string, isSelected: boolean) => void
  showBulkActions?: boolean
  clickedDay?: Date | null
  highlightedVaga?: string | null
}

export function CustomWeekCalendar({
  events,
  date,
  vagaCandidaturas,
  vagasData,
  grades = [],
  onViewDetails,
  onViewApplications,
  onEditVaga,
  onCancelVaga,
  onAnnounceVaga,
  onCloseVaga,
  onDeleteVaga,
  onRefreshData,
  selectedVagas = [],
  onVagaSelection,
  showBulkActions = false,
  clickedDay,
  highlightedVaga
}: CustomWeekCalendarProps) {

  // Ref para a vaga destacada para scroll automático
  const highlightedVagaRef = useRef<HTMLDivElement>(null)

  // Scroll automático para vaga destacada
  useEffect(() => {
    if (highlightedVaga && highlightedVagaRef.current) {
      // Aguardar um delay maior para garantir que o DOM e layout foram completamente renderizados
      const scrollTimer = setTimeout(() => {
        if (highlightedVagaRef.current) {
          // Verificar se o elemento está visível na viewport
          const rect = highlightedVagaRef.current.getBoundingClientRect()
          const isVisible = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          )

          // Apenas fazer scroll se não estiver visível ou não estiver centralizado
          if (!isVisible || rect.top < window.innerHeight * 0.2 || rect.top > window.innerHeight * 0.8) {
            highlightedVagaRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            })
          }
        }
      }, 1000) // Aumentado para 1 segundo

      return () => clearTimeout(scrollTimer)
    }
  }, [highlightedVaga])

  // Calcular dias da semana atual
  const weekData = useMemo(() => {
    const startOfWeek = moment(date).startOf('week')
    const days = []

    for (let i = 0; i < 7; i++) {
      const current = moment(startOfWeek).add(i, 'days')
      days.push({
        date: current.clone().toDate(),
        dayNumber: current.date(),
        dayName: current.format('ddd'),
        fullDayName: current.format('dddd'),
        isToday: current.isSame(moment(), 'day'),
        dateKey: current.format('YYYY-MM-DD'),
        monthName: current.format('MMM')
      })
    }

    return days
  }, [date])

  // Gerar horários disponíveis baseados apenas nos eventos da semana atual
  const timeSlots = useMemo(() => {
    const horariosSet = new Set<string>()

    // Calcular range da semana atual
    const startOfWeek = moment(date).startOf('week')
    const endOfWeek = moment(date).endOf('week')

    events.forEach(event => {
      const eventDate = moment(event.start)

      // Apenas incluir eventos da semana atual
      if (eventDate.isBetween(startOfWeek, endOfWeek, 'day', '[]')) {
        const horaInicioRaw = event.resource?.vaga_horainicio || event.start.toTimeString()
        const horaFimRaw = event.resource?.vaga_horafim || event.end.toTimeString()

        const horaInicio = horaInicioRaw.slice(0, 2)
        const horaFim = horaFimRaw.slice(0, 2)

        const horarioKey = `${horaInicio}h - ${horaFim}h`
        horariosSet.add(horarioKey)
      }
    })

    // Converter para array e ordenar por horário de início e fim
    return Array.from(horariosSet).sort((a, b) => {
      const [inicioA, fimA] = a.split(' - ')
      const [inicioB, fimB] = b.split(' - ')

      // Primeiro ordenar por horário de início
      const compareInicio = inicioA.localeCompare(inicioB)
      if (compareInicio !== 0) {
        return compareInicio
      }

      // Se horários de início são iguais, ordenar por horário de fim
      return fimA.localeCompare(fimB)
    })
  }, [events, date])

  // Agrupar eventos por data e horário
  const eventsByDateAndTime = useMemo(() => {
    const grouped: Record<string, Record<string, CalendarEvent[]>> = {}

    events.forEach(event => {
      const dateKey = moment(event.start).format('YYYY-MM-DD')
      const horaInicioRaw = event.resource?.vaga_horainicio || event.start.toTimeString()
      const horaFimRaw = event.resource?.vaga_horafim || event.end.toTimeString()

      const horaInicio = horaInicioRaw.slice(0, 2)
      const horaFim = horaFimRaw.slice(0, 2)
      const horarioKey = `${horaInicio}h - ${horaFim}h`

      if (!grouped[dateKey]) {
        grouped[dateKey] = {}
      }
      if (!grouped[dateKey][horarioKey]) {
        grouped[dateKey][horarioKey] = []
      }
      grouped[dateKey][horarioKey].push(event)
    })

    return grouped
  }, [events])

  // Função para contar candidaturas pendentes de uma vaga
  const countPendingCandidatures = (vagaId: string) => {
    const candidaturas = vagaCandidaturas[vagaId] || []
    return candidaturas.filter(c => c.candidatura_status === "PENDENTE").length
  }

  // Função para obter a cor da grade de uma vaga
  const getGradeColor = (vaga: any) => {
    // O grade_id está no objeto resource (vaga completa)
    const gradeId = vaga.resource?.grade_id
    if (!gradeId) return null

    const grade = grades.find(g => g.id === gradeId)
    return grade?.cor || null
  }

  // Função auxiliar para obter o nome da grade de uma vaga
  const getGradeName = (vaga: any) => {
    const gradeId = vaga.resource?.grade_id
    if (!gradeId) return 'zzz-sem-grade' // Colocar no final da ordenação

    const grade = grades.find(g => g.id === gradeId)
    return grade?.nome || 'zzz-sem-grade'
  }

  // Função auxiliar para obter a ordem da grade de uma vaga
  const getGradeOrder = (vaga: any): number => {
    const gradeId = vaga.resource?.grade_id
    if (!gradeId) return 999999 // Vagas sem grade vão para o final

    const grade = grades.find(g => g.id === gradeId)
    return grade?.ordem ?? 999999 // Se não tiver ordem, vai para o final
  }

  // Função auxiliar para obter o nome do médico de uma vaga
  const getMedicoName = (event: any) => {
    if (event.status === "fechada" || event.status === "anunciada") {
      if (vagaCandidaturas[event.id]) {
        const candidaturaAprovada = vagaCandidaturas[event.id].find(
          c => c.candidatura_status === "APROVADO"
        )
        if (candidaturaAprovada) {
          return `${candidaturaAprovada.medico_primeironome || ''} ${candidaturaAprovada.medico_sobrenome || ''}`.trim()
        }
      }
      return 'zzz-sem-medico' // Colocar no final da ordenação
    }
    return 'aaa-vaga-' + event.status // Vagas abertas/canceladas vêm primeiro
  }

  // Função para renderizar conteúdo de uma célula (dia + horário)
  const renderCellContent = (day: any, timeSlot: string) => {
    const dayEvents = eventsByDateAndTime[day.dateKey]?.[timeSlot] || []

    if (dayEvents.length === 0) {
      return null
    }

    // Ordenar eventos por: 1) Ordem da grade (numérica), 2) Nome do médico (alfabético)
    const sortedEvents = [...dayEvents].sort((a, b) => {
      // Primeira ordenação: por ordem da grade (numérica)
      const ordemA = getGradeOrder(a)
      const ordemB = getGradeOrder(b)

      if (ordemA !== ordemB) {
        return ordemA - ordemB
      }

      // Segunda ordenação: por nome do médico (alfabética)
      const medicoA = getMedicoName(a)
      const medicoB = getMedicoName(b)
      return medicoA.localeCompare(medicoB)
    })

    // Separar eventos ordenados por status
    const vagasFechadas = sortedEvents.filter(e => e.status === "fechada")
    const vagasAbertas = sortedEvents.filter(e => e.status === "aberta")
    const vagasCanceladas = sortedEvents.filter(e => e.status === "cancelada")
    const vagasAnunciadas = sortedEvents.filter(e => e.status === "anunciada")

    return (
      <div className="flex flex-col gap-1 text-xs p-1">
        {/* Renderizar vagas fechadas individualmente */}
        {vagasFechadas.map((event, idx) => {
          const vaga = event.resource

          // Buscar médico aprovado
          let medicoAprovado = null
          if (vagaCandidaturas[event.id]) {
            const candidaturaAprovada = vagaCandidaturas[event.id].find(
              c => c.candidatura_status === "APROVADO"
            )
            if (candidaturaAprovada) {
              medicoAprovado = `${candidaturaAprovada.medico_primeironome || ''} ${candidaturaAprovada.medico_sobrenome || ''}`.trim()
            }
          }

          return (
            <div
              key={`fechada-${idx}`}
              ref={highlightedVaga === event.id ? highlightedVagaRef : null}
              className={cn(
                "bg-blue-50 border-blue-200 border rounded p-2 text-xs hover:shadow-sm transition-shadow relative group",
                highlightedVaga === event.id && "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
              )}
            >
              {/* Checkbox de seleção (canto superior esquerdo) */}
              {onVagaSelection && (
                <div className={`absolute top-1 left-1 transition-opacity ${selectedVagas.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <Checkbox
                    checked={selectedVagas.includes(event.id)}
                    onCheckedChange={(checked) => {
                      onVagaSelection(event.id, checked as boolean)
                    }}
                    className="h-4 w-4 rounded-full bg-white/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}

              {/* Menu de ações (só aparece no hover) */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <VagasContextActions
                  vaga={{ vaga_id: event.id, ...event.resource }}
                  vagasData={vagasData}
                  onRefreshData={onRefreshData}
                  onViewDetails={() => onViewDetails?.(event.id)}
                  onViewApplications={() => onViewApplications?.(event.id)}
                  onEditVaga={() => onEditVaga?.(event.id)}
                  onCancelVaga={() => onCancelVaga?.(event.id)}
                  onAnnounceVaga={() => onAnnounceVaga?.(event.id)}
                  onCloseVaga={() => onCloseVaga?.(event.id)}
                  onDeleteVaga={() => onDeleteVaga?.(event.id)}
                  vagaCandidaturas={vagaCandidaturas}
                  triggerClassName="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                  contentAlign="end"
                />
              </div>

              {/* Primeira linha: Médico com marcador de cor da grade */}
              <div className="font-normal text-blue-700 mb-1 truncate pr-6 flex items-center gap-2">
                {/* Marcador de cor da grade */}
                {(() => {
                  const gradeColor = getGradeColor(event)
                  return gradeColor ? (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gradeColor }}
                      title={`Grade: ${grades.find(g => g.id === event.resource?.grade_id)?.nome || ''}`}
                    />
                  ) : null
                })()}

                <div className="flex-1 truncate">
                  {medicoAprovado && vagaCandidaturas[event.id] ? (
                    (() => {
                      const candidaturaAprovada = vagaCandidaturas[event.id].find(
                        (c: any) => c.candidatura_status === "APROVADO"
                      )
                      return candidaturaAprovada ? (
                        <DoctorNameLink
                          doctorId={candidaturaAprovada.medico_id}
                          doctorName={medicoAprovado}
                        />
                      ) : medicoAprovado
                    })()
                  ) : (
                    'Vaga Fechada'
                  )}
                </div>
              </div>

              {/* Segunda linha: Hospital */}
              <div className="font-thin text-gray-600 mb-1 truncate">
                {cleanHospitalNameSync(vaga?.hospital_nome)}
              </div>

              {/* Terceira linha: Especialidade • Setor */}
              <div className="text-gray-600 truncate flex items-center gap-1">
                <span>{vaga?.especialidade_nome}</span>
                {vaga?.setor_nome && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{vaga.setor_nome}</span>
                  </>
                )}
              </div>

              {/* Quarta linha: Valor da vaga */}
              {vaga?.vaga_valor && (
                <div className="text-gray-700 font-medium mt-1">
                  R$ {vaga.vaga_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}

              {/* Badge de candidatos pendentes */}
              {countPendingCandidatures(event.id) > 0 && (
                <div className="mt-1">
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-2 py-0.5 rounded-full border border-yellow-200">
                    {countPendingCandidatures(event.id)} candidato{countPendingCandidatures(event.id) > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Renderizar vagas anunciadas individualmente */}
        {vagasAnunciadas.map((event, idx) => {
          const vaga = event.resource

          // Buscar médico aprovado para vagas anunciadas
          let medicoAprovado = null
          if (vagaCandidaturas[event.id]) {
            const candidaturaAprovada = vagaCandidaturas[event.id].find(
              c => c.candidatura_status === "APROVADO"
            )
            if (candidaturaAprovada) {
              medicoAprovado = `${candidaturaAprovada.medico_primeironome || ''} ${candidaturaAprovada.medico_sobrenome || ''}`.trim()
            }
          }

          return (
            <div
              key={`anunciada-${idx}`}
              ref={highlightedVaga === event.id ? highlightedVagaRef : null}
              className={cn(
                "bg-yellow-50 border-yellow-200 border rounded p-2 text-xs hover:shadow-sm transition-shadow relative group",
                highlightedVaga === event.id && "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
              )}
            >
              {/* Checkbox de seleção (canto superior esquerdo) */}
              {onVagaSelection && (
                <div className={`absolute top-1 left-1 transition-opacity ${selectedVagas.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <Checkbox
                    checked={selectedVagas.includes(event.id)}
                    onCheckedChange={(checked) => {
                      onVagaSelection(event.id, checked as boolean)
                    }}
                    className="h-4 w-4 rounded-full bg-white/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}

              {/* Menu de ações (só aparece no hover) */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <VagasContextActions
                  vaga={{ vaga_id: event.id, ...event.resource }}
                  vagasData={vagasData}
                  onRefreshData={onRefreshData}
                  onViewDetails={() => onViewDetails?.(event.id)}
                  onViewApplications={() => onViewApplications?.(event.id)}
                  onEditVaga={() => onEditVaga?.(event.id)}
                  onCancelVaga={() => onCancelVaga?.(event.id)}
                  onAnnounceVaga={() => onAnnounceVaga?.(event.id)}
                  onCloseVaga={() => onCloseVaga?.(event.id)}
                  onDeleteVaga={() => onDeleteVaga?.(event.id)}
                  vagaCandidaturas={vagaCandidaturas}
                  triggerClassName="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                  contentAlign="end"
                />
              </div>

              {/* Primeira linha: Médico com marcador de cor da grade */}
              <div className="font-normal text-yellow-700 mb-1 truncate pr-6 flex items-center gap-2">
                {/* Marcador de cor da grade */}
                {(() => {
                  const gradeColor = getGradeColor(event)
                  return gradeColor ? (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gradeColor }}
                      title={`Grade: ${grades.find(g => g.id === event.resource?.grade_id)?.nome || ''}`}
                    />
                  ) : null
                })()}

                <div className="flex-1 truncate">
                  {medicoAprovado && vagaCandidaturas[event.id] ? (
                    (() => {
                      const candidaturaAprovada = vagaCandidaturas[event.id].find(
                        (c: any) => c.candidatura_status === "APROVADO"
                      )
                      return candidaturaAprovada ? (
                        <DoctorNameLink
                          doctorId={candidaturaAprovada.medico_id}
                          doctorName={medicoAprovado}
                        />
                      ) : medicoAprovado
                    })()
                  ) : (
                    'Vaga Anunciada'
                  )}
                </div>
              </div>

              {/* Segunda linha: Hospital */}
              <div className="font-thin text-gray-600 mb-1 truncate">
                {cleanHospitalNameSync(vaga?.hospital_nome)}
              </div>

              {/* Terceira linha: Especialidade • Setor */}
              <div className="text-gray-600 truncate flex items-center gap-1">
                <span>{vaga?.especialidade_nome}</span>
                {vaga?.setor_nome && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{vaga.setor_nome}</span>
                  </>
                )}
              </div>

              {/* Quarta linha: Valor da vaga */}
              {vaga?.vaga_valor && (
                <div className="text-gray-700 font-medium mt-1">
                  R$ {vaga.vaga_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}

              {/* Badge de candidatos pendentes */}
              {countPendingCandidatures(event.id) > 0 && (
                <div className="mt-1">
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-2 py-0.5 rounded-full border border-yellow-200">
                    {countPendingCandidatures(event.id)} candidato{countPendingCandidatures(event.id) > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Renderizar vagas abertas individualmente */}
        {vagasAbertas.map((event, idx) => {
          const vaga = event.resource

          return (
            <div
              key={`aberta-${idx}`}
              ref={highlightedVaga === event.id ? highlightedVagaRef : null}
              className={cn(
                "bg-green-50 border-green-200 border rounded p-2 text-xs hover:shadow-sm transition-shadow relative group",
                highlightedVaga === event.id && "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
              )}
            >
              {/* Checkbox de seleção (canto superior esquerdo) */}
              {onVagaSelection && (
                <div className={`absolute top-1 left-1 transition-opacity ${selectedVagas.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <Checkbox
                    checked={selectedVagas.includes(event.id)}
                    onCheckedChange={(checked) => {
                      onVagaSelection(event.id, checked as boolean)
                    }}
                    className="h-4 w-4 rounded-full bg-white/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}

              {/* Menu de ações (só aparece no hover) */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <VagasContextActions
                  vaga={{ vaga_id: event.id, ...event.resource }}
                  vagasData={vagasData}
                  onRefreshData={onRefreshData}
                  onViewDetails={() => onViewDetails?.(event.id)}
                  onViewApplications={() => onViewApplications?.(event.id)}
                  onEditVaga={() => onEditVaga?.(event.id)}
                  onCancelVaga={() => onCancelVaga?.(event.id)}
                  onAnnounceVaga={() => onAnnounceVaga?.(event.id)}
                  onCloseVaga={() => onCloseVaga?.(event.id)}
                  onDeleteVaga={() => onDeleteVaga?.(event.id)}
                  vagaCandidaturas={vagaCandidaturas}
                  triggerClassName="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                  contentAlign="end"
                />
              </div>

              {/* Primeira linha: Status */}
              <div className="font-normal text-green-700 mb-1 truncate pr-6">
                Vaga Aberta
              </div>

              {/* Segunda linha: Hospital */}
              <div className="font-thin text-gray-600 mb-1 truncate">
                {cleanHospitalNameSync(vaga?.hospital_nome)}
              </div>

              {/* Terceira linha: Especialidade • Setor */}
              <div className="text-gray-600 truncate flex items-center gap-1">
                <span>{vaga?.especialidade_nome}</span>
                {vaga?.setor_nome && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{vaga.setor_nome}</span>
                  </>
                )}
              </div>

              {/* Quarta linha: Valor da vaga */}
              {vaga?.vaga_valor && (
                <div className="text-gray-700 font-medium mt-1">
                  R$ {vaga.vaga_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}

              {/* Badge de candidatos pendentes */}
              {countPendingCandidatures(event.id) > 0 && (
                <div className="mt-1">
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-2 py-0.5 rounded-full border border-yellow-200">
                    {countPendingCandidatures(event.id)} candidato{countPendingCandidatures(event.id) > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Renderizar vagas canceladas individualmente */}
        {vagasCanceladas.map((event, idx) => {
          const vaga = event.resource

          return (
            <div
              key={`cancelada-${idx}`}
              ref={highlightedVaga === event.id ? highlightedVagaRef : null}
              className={cn(
                "bg-red-50 border-red-200 border rounded p-2 text-xs hover:shadow-sm transition-shadow relative group",
                highlightedVaga === event.id && "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
              )}
            >
              {/* Checkbox de seleção (canto superior esquerdo) */}
              {onVagaSelection && (
                <div className={`absolute top-1 left-1 transition-opacity ${selectedVagas.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <Checkbox
                    checked={selectedVagas.includes(event.id)}
                    onCheckedChange={(checked) => {
                      onVagaSelection(event.id, checked as boolean)
                    }}
                    className="h-4 w-4 rounded-full bg-white/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              )}

              {/* Menu de ações (só aparece no hover) */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <VagasContextActions
                  vaga={{ vaga_id: event.id, ...event.resource }}
                  vagasData={vagasData}
                  onRefreshData={onRefreshData}
                  onViewDetails={() => onViewDetails?.(event.id)}
                  onViewApplications={() => onViewApplications?.(event.id)}
                  onEditVaga={() => onEditVaga?.(event.id)}
                  onCancelVaga={() => onCancelVaga?.(event.id)}
                  onAnnounceVaga={() => onAnnounceVaga?.(event.id)}
                  onCloseVaga={() => onCloseVaga?.(event.id)}
                  onDeleteVaga={() => onDeleteVaga?.(event.id)}
                  vagaCandidaturas={vagaCandidaturas}
                  triggerClassName="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                  contentAlign="end"
                />
              </div>

              {/* Primeira linha: Status */}
              <div className="font-normal text-gray-700 mb-1 truncate pr-6">
                Vaga Cancelada
              </div>

              {/* Segunda linha: Hospital */}
              <div className="font-thin text-gray-600 mb-1 truncate">
                {cleanHospitalNameSync(vaga?.hospital_nome)}
              </div>

              {/* Terceira linha: Especialidade • Setor */}
              <div className="text-gray-600 truncate flex items-center gap-1">
                <span>{vaga?.especialidade_nome}</span>
                {vaga?.setor_nome && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>{vaga.setor_nome}</span>
                  </>
                )}
              </div>

              {/* Badge de candidatos pendentes */}
              {countPendingCandidatures(event.id) > 0 && (
                <div className="mt-1">
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-2 py-0.5 rounded-full border border-yellow-200">
                    {countPendingCandidatures(event.id)} candidato{countPendingCandidatures(event.id) > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full" id="weekly-calendar-content">
      {/* Header da semana */}
      <div className="mb-4 text-center">
        <h2 className="text-lg font-normal text-gray-900">
          {moment(weekData[0].date).format('DD/MM')} - {moment(weekData[6].date).format('DD/MM/YYYY')}
        </h2>
      </div>

      {/* Grid do calendário */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          {/* Coluna de horários */}
          <div className="p-3 text-center text-sm font-normal text-gray-700 border-r border-gray-200">
            Horários
          </div>
          {weekData.map((day) => {
            // Verificar se este dia é o dia clicado
            const isClickedDay = clickedDay && moment(day.date).isSame(moment(clickedDay), 'day')

            return (
              <div
                key={day.dateKey}
                className={cn(
                  "p-3 text-center text-sm font-normal border-r border-gray-200 last:border-r-0",
                  day.isToday ? "bg-primary/10 text-primary" : "text-gray-700",
                  isClickedDay && !day.isToday && "bg-primary/5 border-2 border-primary"
                )}
              >
                <div className="font-normal">{day.dayName}</div>
                <div className={cn(
                  "text-lg mt-1",
                  day.isToday && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto",
                  isClickedDay && !day.isToday && "bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center mx-auto border border-primary"
                )}>
                  {day.dayNumber}
                </div>
                <div className="text-xs text-gray-500">{day.monthName}</div>
              </div>
            )
          })}
        </div>

        {/* Grid das linhas de horário */}
        {timeSlots.map((timeSlot) => (
          <div key={timeSlot} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0 min-h-[80px]">
            {/* Coluna de horário */}
            <div className="border-r border-gray-200 p-3 text-sm font-normal text-gray-700 bg-gray-50 flex items-center justify-center">
              {timeSlot}
            </div>
            {/* Colunas dos dias */}
            {weekData.map((day) => {
              // Verificar se este dia é o dia clicado
              const isClickedDay = clickedDay && moment(day.date).isSame(moment(clickedDay), 'day')

              return (
                <div
                  key={`${day.dateKey}-${timeSlot}`}
                  className={cn(
                    "border-r border-gray-200 last:border-r-0 overflow-visible",
                    "flex flex-col relative",
                    day.isToday && "bg-primary/5",
                    isClickedDay && !day.isToday && "bg-primary/5"
                  )}
                  style={{
                    minHeight: '80px',
                    height: 'auto'
                  }}
                >
                  {/* Conteúdo da célula */}
                  <div className="flex-1 overflow-visible">
                    {renderCellContent(day, timeSlot)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
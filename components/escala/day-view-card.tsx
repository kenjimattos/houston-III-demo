import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Check, X, Eye, Edit, CircleX } from "lucide-react"
import { DoctorNameLink } from "@/components/medicos/doctor-name-link"
import { cleanHospitalNameSync, formatTelefoneBR } from "@/lib/utils"

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
  allDay?: boolean
  resource?: any
}

interface Candidatura {
  candidatura_id: string
  medico_id: string
  medico_primeironome?: string
  medico_sobrenome?: string
  medico_crm?: string
  medico_telefone?: string
  medico_email?: string
  candidatura_createdate?: string
  candidatura_status: "PENDENTE" | "APROVADO" | "REPROVADO"
}

interface DayViewCardProps {
  event: CalendarEvent
  eventIndex: number
  position: { top: number; left: number }
  isExpanded: boolean
  isLoading: boolean
  candidaturas: Candidatura[]
  actionLoading: Record<string, boolean>
  loadingClosedVagas?: boolean
  onToggleExpansion: (eventId: string) => void
  onAprovarCandidatura: (candidaturaId: string, vagaId: string) => void
  onReprovarCandidatura: (candidaturaId: string, vagaId: string) => void
  onReconsiderarCandidatura: (candidaturaId: string, vagaId: string, statusAtual: string) => void
  onViewDetails?: (vagaId: string) => void
  onEditVaga?: (vagaId: string) => void
  onCancelVaga?: (vagaId: string) => void
  getSpecialtyName: (id: string) => string
  getSectorName: (id: string) => string
}

export function DayViewCard({
  event,
  eventIndex,
  position,
  isExpanded,
  isLoading,
  candidaturas,
  actionLoading,
  loadingClosedVagas,
  onToggleExpansion,
  onAprovarCandidatura,
  onReprovarCandidatura,
  onReconsiderarCandidatura,
  onViewDetails,
  onEditVaga,
  onCancelVaga,
  getSpecialtyName,
  getSectorName,
}: DayViewCardProps) {
  // Buscar médico aprovado se vaga fechada ou anunciada
  const medicoAprovado = (event.status === "fechada" || event.status === "anunciada") && candidaturas.length > 0
    ? candidaturas.find(c => c.candidatura_status === "APROVADO")
    : null

  // Calcular altura do card baseado na expansão
  const cardHeight = isExpanded
    ? Math.max(300, 200 + (candidaturas.length * 40)) // Altura dinâmica baseada no número de candidaturas
    : 140 // Altura padrão

  return (
    <div
      key={`${event.id}-${eventIndex}`}
      className={`
        absolute rounded-lg border-l-4 p-3 cursor-pointer transition-all hover:shadow-lg bg-white shadow-md
        ${event.status === "aberta"
          ? "border-l-green-500 hover:border-l-green-600"
          : event.status === "fechada"
            ? "border-l-blue-500 hover:border-l-blue-600"
            : event.status === "anunciada"
              ? "border-l-yellow-500 hover:border-l-yellow-600"
              : "border-l-red-500 hover:border-l-red-600"
        }
        ${isExpanded ? 'shadow-2xl border-2 border-primary' : ''}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        height: `${cardHeight}px`,
        width: isExpanded ? "500px" : "300px", // Largura maior quando expandido
        zIndex: isExpanded ? 50 : 5, // Z-index elevado quando expandido
        transition: 'all 0.3s ease-in-out'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onToggleExpansion(event.id)
      }}
    >
      {/* Header do card */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="font-normal text-sm text-gray-900">
            {cleanHospitalNameSync(event.resource.hospital_nome)}

          </h4>
          <p className="text-xs text-gray-600">
            {getSpecialtyName(event.specialty)}
          </p>
        </div>
        <div className="flex items-center gap-2">

          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
            {isExpanded ?
              <ChevronDown className="h-3 w-3" /> :
              <ChevronRight className="h-3 w-3" />
            }
          </Button>
        </div>
      </div>

      {/* Informações da vaga */}
      <div className="space-y-1 text-xs text-gray-700">
        <div className="flex justify-between">
          <span className="font-normal">{getSectorName(event.sector)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-normal text-green-700">
            R$ {event.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Médico aprovado ou candidatos (apenas quando não expandido) */}
      {!isExpanded && (
        <>
          {(event.status === "fechada" || event.status === "anunciada") && medicoAprovado ? (
            <div className="absolute bottom-2 left-3 right-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${event.status === "anunciada" ? "bg-yellow-500" : "bg-blue-500"}`}></div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-normal truncate ${event.status === "anunciada" ? "text-yellow-800" : "text-blue-800"}`}>
                    {`${medicoAprovado.medico_primeironome || ''} ${medicoAprovado.medico_sobrenome || ''}`.trim()}
                  </p>
                </div>
              </div>
            </div>
          ) : (event.status === "fechada" || event.status === "anunciada") && loadingClosedVagas && candidaturas.length === 0 ? (
            <div className="absolute bottom-2 left-3 right-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-gray-500 animate-pulse">
                    Carregando médico...
                  </p>
                </div>
              </div>
            </div>
          ) : event.status === "aberta" && event.candidates > 0 ? (
            <div className="absolute bottom-2 left-3">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                {event.candidates} candidato{event.candidates > 1 ? "s" : ""}
              </Badge>
            </div>
          ) : null}
        </>
      )}

      {/* Seção expandida com candidaturas */}
      {isExpanded && (
        <div className="mt-4 border-t pt-3">
          <h5 className="font-normal text-sm mb-3">Candidaturas</h5>
          {isLoading ? (
            <div className="text-center py-4 text-xs text-gray-500">
              Carregando candidaturas...
            </div>
          ) : candidaturas.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {candidaturas.map((candidatura) => (
                <div
                  key={candidatura.candidatura_id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <DoctorNameLink
                        doctorId={candidatura.medico_id}
                        doctorName={`${candidatura.medico_primeironome || ''} ${candidatura.medico_sobrenome || ''}`.trim()}
                      />
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {candidatura.medico_crm} • {formatTelefoneBR(candidatura.medico_telefone)}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {candidatura.candidatura_status === "PENDENTE" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                          disabled={actionLoading[candidatura.candidatura_id]}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAprovarCandidatura(candidatura.candidatura_id, event.id)
                          }
                          }
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          disabled={actionLoading[candidatura.candidatura_id]}
                          onClick={(e) => {
                            e.stopPropagation()
                            onReprovarCandidatura(candidatura.candidatura_id, event.id)
                          }
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {candidatura.candidatura_status === "APROVADO" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        disabled={actionLoading[candidatura.candidatura_id]}
                        onClick={(e) => {
                          e.stopPropagation()
                          onReconsiderarCandidatura(candidatura.candidatura_id, event.id, candidatura.candidatura_status)
                        }
                        }
                      >
                        Cancelar
                      </Button>
                    )}
                    {candidatura.candidatura_status === "REPROVADO" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        disabled={actionLoading[candidatura.candidatura_id]}
                        onClick={(e) => {
                          e.stopPropagation()
                          onReconsiderarCandidatura(candidatura.candidatura_id, event.id, candidatura.candidatura_status)
                        }
                        }
                      >
                        Reconsiderar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-gray-500">
              Nenhuma candidatura encontrada
            </div>
          )}

          {/* Botões de Ações */}
          <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                if (onViewDetails) onViewDetails(event.id)
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Detalhes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                if (onEditVaga) onEditVaga(event.id)
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
            {event.status !== "cancelada" ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onCancelVaga) onCancelVaga(event.id)
                }}
              >
                <CircleX className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onCancelVaga) onCancelVaga(event.id)
                }}
              >
                <CircleX className="h-3 w-3 mr-1" />
                Reativar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 
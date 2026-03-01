import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Briefcase, Calendar, Clock, Users, GripVertical, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"
import { useState, useEffect } from "react"
import { fetchHospitalDataWithFilters, type HospitalData } from "@/services/dashboardService"
import { cleanHospitalNameSync } from "@/lib/utils"

interface HospitalCardProps {
  hospital: HospitalData
  timeFilterType: "month" | "week" | "custom"
  selectedMonth?: string
  periodos: Array<{value: string, label: string}>
  setores: Array<{value: string, label: string}>
}

export function HospitalCard({
  hospital: initialHospital,
  timeFilterType,
  selectedMonth,
  periodos,
  setores
}: HospitalCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("todos")
  const [selectedSetor, setSelectedSetor] = useState<string>("todos")
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false)
  const [hospital, setHospital] = useState<HospitalData>(initialHospital)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasValidData, setHasValidData] = useState<boolean>(true)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: hospital.id,
    transition: {
      duration: 150, // Transição mais rápida
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 1,
    opacity: isDragging ? 0.9 : 1,
  }

  // Aplicar filtros quando mudarem
  useEffect(() => {
    async function applyFilters() {
      // Se há filtro de mês global, sempre aplicar os filtros mesmo que os filtros locais sejam "todos"
      if (selectedPeriod === "todos" && selectedSetor === "todos" && !selectedMonth) {
        setHospital(initialHospital)
        return
      }

      setLoading(true)
      try {
        const filteredData = await fetchHospitalDataWithFilters(
          initialHospital.id,
          selectedPeriod === "todos" ? undefined : selectedPeriod,
          selectedSetor === "todos" ? undefined : selectedSetor,
          selectedMonth
        )
        
        // Verificar se há dados válidos (pelo menos uma vaga)
        const hasData = filteredData.totalJobs > 0
        setHasValidData(hasData)
        setHospital(filteredData)
      } catch (error) {
        console.error('Erro ao aplicar filtros:', error)
        setHospital(initialHospital)
      } finally {
        setLoading(false)
      }
    }

    applyFilters()
  }, [selectedPeriod, selectedSetor, initialHospital, selectedMonth])

  // Se não há dados válidos, não renderizar o card
  if (!hasValidData) {
    return null
  }

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`overflow-hidden transition-all duration-150 ease-out ${
        isDragging 
          ? 'shadow-2xl scale-105 rotate-1 ring-2 ring-primary/20' 
          : 'hover:shadow-lg hover:scale-[1.02] active:scale-95'
      } ${loading ? 'opacity-75' : ''}`}
    >
      <CardHeader className="bg-primary/5 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-normal truncate pr-2">{cleanHospitalNameSync(hospital.name)}</CardTitle>
        <div
          {...attributes}
          {...listeners}
          className={`
            cursor-grab active:cursor-grabbing p-2 rounded-lg 
            hover:bg-gray-100 dark:hover:bg-gray-800 
            transition-all duration-150 ease-out
            touch-manipulation select-none
            ${isDragging ? 'bg-primary/10' : ''}
            min-w-[32px] min-h-[32px] flex items-center justify-center
          `}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className={`h-5 w-5 transition-colors duration-150 ${
            isDragging ? 'text-primary' : 'text-gray-400'
          }`} />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Filtros Contraídos/Expandidos */}
        <div className="space-y-2">
          {/* Botão para expandir/contrair filtros */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center justify-between w-full text-left p-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-normal text-gray-700">Filtros</span>
              {(selectedPeriod !== "todos" || selectedSetor !== "todos") && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  Ativo
                </Badge>
              )}
            </div>
            {filtersExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {/* Filtros expandidos */}
          {filtersExpanded && (
            <div className="grid grid-cols-2 gap-3 p-2 bg-gray-50 rounded-md">
              {/* Filtro de Período */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Período</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={loading}
                >
                  <option value="todos">Todos</option>
                  {periodos.map((periodo) => (
                    <option key={periodo.value} value={periodo.value}>
                      {periodo.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Setor */}
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Setor</label>
                <select
                  value={selectedSetor}
                  onChange={(e) => setSelectedSetor(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={loading}
                >
                  <option value="todos">Todos</option>
                  {setores.map((setor) => (
                    <option key={setor.value} value={setor.value}>
                      {setor.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de preenchimento */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-normal">Taxa de preenchimento</span>
            <span className="text-sm font-normal">
              {hospital.totalJobs > 0 ? Math.round((hospital.filledJobs / hospital.totalJobs) * 100) : 0}%
            </span>
          </div>
          <Progress
            value={hospital.totalJobs > 0 ? (hospital.filledJobs / hospital.totalJobs) * 100 : 0}
            className="h-2"
          />
        </div>

        {/* Indicadores de vagas */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 bg-green-50 rounded-md">
            <Briefcase className="h-4 w-4 text-green-600 mb-1" />
            <span className="text-xs text-gray-600">Abertas</span>
            <span className="font-normal text-green-600">{hospital.openJobs}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-blue-50 rounded-md">
            <Calendar className="h-4 w-4 text-blue-600 mb-1" />
            <span className="text-xs text-gray-600">Média/dia</span>
            <span className="font-normal text-blue-600">
              {Math.round((hospital.openJobs + hospital.filledJobs) / (timeFilterType === "week" ? 7 : 30))}
            </span>
          </div>
          <div className="flex flex-col items-center p-2 bg-amber-50 rounded-md">
            <Clock className="h-4 w-4 text-amber-600 mb-1" />
            <span className="text-xs text-gray-600">Urgentes</span>
            <span className="font-normal text-amber-600">{hospital.urgentJobs}</span>
          </div>
        </div>

        {/* Candidaturas */}
        <div className="flex flex-col">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-gray-500 mr-1" />
            <span className="text-sm">Candidaturas</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {hospital.candidates} total
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              {hospital.pendingCandidates} pendentes
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

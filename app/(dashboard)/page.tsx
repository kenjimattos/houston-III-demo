"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// Hook customizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
import { GlobalMetrics } from "@/components/dashboard/global-metrics"
import { HospitalCard } from "@/components/dashboard/hospital-card"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { fetchDashboardMetrics, fetchDashboardMetricsWithFilters, fetchHospitalData, fetchHospitalDataWithGlobalFilter, type DashboardMetrics, type DashboardFilters as DashboardFiltersType, type HospitalData } from "@/services/dashboardService"
import { fetchHospitaisDasVagas, fetchEspecialidadesDasVagas, fetchSetoresDasVagas, fetchPeriodosDasVagas, fetchMesesDisponiveis } from '@/services/vagasCandidaturasService'
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"

// Importar a versão do package.json
const packageInfo = require('@/package.json')

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [hospitais, setHospitais] = useState<HospitalData[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Estados dos filtros
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  // Estado para controlar se já tentamos definir o mês inicial
  const [hasInitializedMonth, setHasInitializedMonth] = useState(false)
  // Flag para evitar toast duplicado (React Strict Mode chama useEffect 2x)
  const hasShownToastRef = useRef(false)

  // Definir o mês inicial como undefined - será definido depois que os dados carregarem
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined)

  // Debounce do selectedMonth para evitar múltiplas queries ao mudar rapidamente
  const debouncedMonth = useDebounce(selectedMonth, 300)

  // Dados dos filtros
  const [filterHospitals, setFilterHospitals] = useState<{ hospital_id: string, hospital_nome: string }[]>([])
  const [specialties, setSpecialties] = useState<{ especialidade_id: string, especialidade_nome: string }[]>([])
  const [sectors, setSectors] = useState<{ setor_id: string, setor_nome: string }[]>([])
  const [periods, setPeriods] = useState<{ periodo_id: string, periodo_nome: string }[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Precisa mover 8px para ativar o drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 8, // Precisa mover 8px para ativar o drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Carregar dados dos filtros e definir mês inicial com fallback
  useEffect(() => {
    async function loadFilters() {
      try {
        // Executar todas as queries em paralelo com Promise.all
        const [hospitalsData, specialtiesData, sectorsData, periodosData] = await Promise.all([
          fetchHospitaisDasVagas(),
          fetchEspecialidadesDasVagas(),
          fetchSetoresDasVagas(),
          fetchPeriodosDasVagas()
        ])

        setFilterHospitals(hospitalsData.sort((a, b) => a.hospital_nome.localeCompare(b.hospital_nome)))
        setSpecialties(specialtiesData.sort((a, b) => a.especialidade_nome.localeCompare(b.especialidade_nome)))
        setSectors(sectorsData)
        setPeriods(periodosData)
      } catch (error) {
        console.error("Erro ao carregar filtros:", error)
      }
    }
    loadFilters()
  }, [])

  // Inicializar mês com fallback inteligente
  useEffect(() => {
    // Só executar uma vez, quando ainda não inicializamos o mês
    if (hasInitializedMonth) return

    async function initializeMonth() {
      try {
        const mesesDisponiveis = await fetchMesesDisponiveis()

        if (!mesesDisponiveis || mesesDisponiveis.length === 0) {
          console.warn('Nenhum mês disponível na base de dados')
          setHasInitializedMonth(true)
          return
        }

        // Obter mês atual
        const agora = new Date()
        const mesAtual = `${agora.getFullYear()}-${(agora.getMonth() + 1).toString().padStart(2, '0')}`

        // Verificar se o mês atual tem dados
        const mesAtualTemDados = mesesDisponiveis.some(m => m.valor === mesAtual)

        if (mesAtualTemDados) {
          console.log(`Mês atual (${mesAtual}) tem dados - usando como padrão`)
          setSelectedMonth(mesAtual)
        } else {
          // Usar o último mês disponível (mais recente)
          const ultimoMes = mesesDisponiveis[mesesDisponiveis.length - 1]
          console.log(`Mês atual (${mesAtual}) não tem dados - usando ${ultimoMes.nome} como fallback`)
          setSelectedMonth(ultimoMes.valor)

          // Mostrar toast apenas uma vez (evitar duplicatas do React Strict Mode)
          if (!hasShownToastRef.current) {
            hasShownToastRef.current = true
            toast.info(`Exibindo dados de ${ultimoMes.nome} (mês com dados mais recente)`)
          }
        }

        setHasInitializedMonth(true)
      } catch (error) {
        console.error('Erro ao inicializar mês:', error)
        setHasInitializedMonth(true)
      }
    }

    initializeMonth()
  }, [hasInitializedMonth])

  // Função para carregar dados do dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      // Dashboard loading...

      // Preparar filtros para as métricas (usando debouncedMonth)
      const filters: DashboardFiltersType = {
        hospitalIds: selectedHospitals.length > 0 ? selectedHospitals : undefined,
        especialidadeIds: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
        setorIds: selectedSectors.length > 0 ? selectedSectors : undefined,
        periodos: selectedPeriods.length > 0 ? selectedPeriods : undefined,
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        selectedMonth: debouncedMonth
      }

      // Loading filters and dashboard data...

      // Carregar métricas e dados de hospitais em paralelo com Promise.all
      const [metricsData, hospitaisData] = await Promise.all([
        fetchDashboardMetricsWithFilters(filters),
        fetchHospitalDataWithGlobalFilter(debouncedMonth)
      ])

      // Restaurar ordem dos hospitais do localStorage
      const savedOrder = localStorage.getItem('dashboard-hospital-order')
      let orderedHospitais = hospitaisData

      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder) as string[]
          orderedHospitais = [...hospitaisData].sort((a, b) => {
            const indexA = orderIds.indexOf(a.id)
            const indexB = orderIds.indexOf(b.id)

            // Se não estiver na ordem salva, colocar no final
            if (indexA === -1) return 1
            if (indexB === -1) return -1

            return indexA - indexB
          })
          //  Hospital order restored from localStorage
        } catch (error) {
          // Error restoring hospital order
        }
      }

      setMetrics(metricsData)
      setHospitais(orderedHospitais)
      setLastUpdate(new Date())

      //  Dashboard loaded successfully

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
      toast.error('Erro ao carregar dados do dashboard. Verifique o console para mais detalhes.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedHospitals, selectedSpecialties, selectedSectors, selectedPeriods, selectedStatuses, debouncedMonth])

  // Recarregar métricas quando filtros mudarem (usando debouncedMonth)
  // Só carrega os dados quando:
  // 1. Os filtros de hospitais foram carregados (filterHospitals.length > 0)
  // 2. O mês foi inicializado (hasInitializedMonth)
  // 3. O debouncedMonth está definido (para evitar carregar sem filtro durante o debounce)
  useEffect(() => {
    if (filterHospitals.length > 0 && hasInitializedMonth && debouncedMonth) {
      loadDashboardData()
    }
  }, [selectedHospitals, selectedSpecialties, selectedSectors, selectedPeriods, selectedStatuses, debouncedMonth, loadDashboardData, filterHospitals.length, hasInitializedMonth])

  // Simulação de atualização em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 30000) // Atualiza a cada 30 segundos

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = useCallback(async () => {
    await loadDashboardData()
    toast.success('Dados atualizados com sucesso')
  }, [loadDashboardData])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setIsDragging(false)

    if (over && active.id !== over.id) {
      setHospitais((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Salvar a ordem no localStorage para persistir entre sessões
        const hospitalOrder = newOrder.map(h => h.id)
        localStorage.setItem('dashboard-hospital-order', JSON.stringify(hospitalOrder))

        // Feedback para o usuário
        const movedHospital = items[oldIndex]
        toast.success(`${movedHospital.name} foi reposicionado`)

        return newOrder
      })
    }
  }, [])

  const handleDragCancel = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Função para limpar filtros
  const clearFilters = () => {
    setSelectedMonth(undefined)
    // Manter os outros filtros internos para as métricas, mas não são visíveis na UI
    // setSelectedHospitals([])
    // setSelectedSpecialties([])
    // setSelectedSectors([])
    // setSelectedPeriods([])
    // setSelectedStatuses([])
  }

  // Converter dados de períodos e setores para formato esperado pelo HospitalCard
  const periodosFormatted = useMemo(() => {
    return periods.map(p => ({
      value: p.periodo_id,
      label: p.periodo_nome
    }))
  }, [periods])

  const setoresFormatted = useMemo(() => {
    return sectors.map(s => ({
      value: s.setor_id,
      label: s.setor_nome
    }))
  }, [sectors])

  // Memoizar filtro de hospitais para evitar re-computação em cada render
  const filteredHospitais = useMemo(() => {
    return hospitais.filter((hospital) => {
      // Se filtro de hospital foi selecionado, mostrar apenas hospitais selecionados
      if (selectedHospitals.length > 0 && !selectedHospitals.includes(hospital.id)) {
        return false
      }

      // Por enquanto, outros filtros (especialidades, setores, períodos) não filtram hospitais
      // pois os dados dos hospitais não incluem essas informações detalhadas
      // Os filtros afetam apenas as métricas globais
      return true
    })
  }, [hospitais, selectedHospitals])

  // Temporário: permitir renderizar mesmo durante loading para debug
  if (false && (isLoading || !metrics)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner message="Carregando dados do dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">


      <Card className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-normal">Painel de Controle</h1>
            <p className="text-muted-foreground">
              Visão geral da operação • Última atualização: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <DashboardFilters
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onClearFilters={clearFilters}
            />
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Métricas Globais */}
            <Card className="p-4 sm:p-6 w-full lg:w-2/3">
              <GlobalMetrics data={metrics || undefined} isLoading={isLoading} />
            </Card>

            {/* Central de Notificações */}
            <NotificationCenter compact={true} />

          </div>

          {/* Cards dos Hospitais com Drag and Drop */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-normal">Hospitais</h2>
                {isLoading ? (
                  ''
                ) : (
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Arraste os cards para reorganizar
                  </p>
                )}
                <p className="text-sm text-muted-foreground sm:hidden">
                  Toque e arraste para reorganizar
                </p>
              </div>

              {filteredHospitais.length > 0 ? (
                <div className="relative">
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/5 rounded-lg pointer-events-none z-10 transition-opacity duration-150" />
                  )}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext items={filteredHospitais.map(h => h.id)} strategy={rectSortingStrategy}>
                      <div className={`grid gap-6 transition-all duration-200 ${isDragging ? 'gap-8' : ''
                        } grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`}>
                        {filteredHospitais.map((hospital) => (
                          <HospitalCard
                            key={hospital.id}
                            hospital={hospital}
                            timeFilterType="month"
                            selectedMonth={selectedMonth}
                            periodos={periodosFormatted}
                            setores={setoresFormatted}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              ) : isLoading ? (
                <LoadingSpinner message="Carregando hospitais..." className="py-12" />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {selectedMonth
                      ? `Nenhum hospital encontrado com dados para o mês selecionado.`
                      : `Nenhum hospital encontrado com os filtros selecionados.`
                    }
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Card>

      {/* Footer com informações técnicas */}
      <div className="border-t pt-6 text-xs text-muted-foreground">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4">

          <div>
            <strong>Sistema:</strong> Houston III
          </div>
          <div>
            <strong>Versão:</strong> {packageInfo.version}
          </div>
          <div>
            <strong>Última atualização:</strong> {format(lastUpdate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>

        </div>
      </div>
    </div>
  )
}

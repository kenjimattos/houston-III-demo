import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Briefcase, Users, Clock, AlertTriangle, DollarSign, Shield, RefreshCw } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface GlobalMetricsProps {
  data?: {
    totalVagas: number
    vagasAbertas: number
    vagasFechadas: number
    taxaPreenchimento: number
    candidaturasPendentes: number
    vagasUrgentes: number
    tempoMedioPreenchimento: number
    tendenciaVagas: "up" | "down" | "stable"
    tendenciaCandidaturas: "up" | "down" | "stable"
    folhaPagamentoTotal: number
    riscoOperacional: number
  }
  isLoading?: boolean
}

export function GlobalMetrics({ data, isLoading = false }: GlobalMetricsProps) {
  const router = useRouter()
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "excelente": return "bg-green-500"
      case "bom": return "bg-blue-500"
      case "atencao": return "bg-yellow-500"
      case "critico": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "excelente": return "Operação Excelente"
      case "bom": return "Operação Normal"
      case "atencao": return "Requer Atenção"
      case "critico": return "Situação Crítica"
      default: return "Status Indefinido"
    }
  }

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-normal mb-4">Métricas Globais</h2>
        
        {isLoading ? (
          <LoadingSpinner message="Carregando métricas..." className="py-12" />
        ) : !data ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum dado disponível</p>
          </div>
        ) : (
          /* Métricas Principais - Organizadas em 2 linhas */
          <div className="space-y-4">
          {/* Primeira linha: Todas as 6 métricas principais */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
            {/* Total de Vagas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal">Total de Vagas</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-normal">{data.totalVagas.toLocaleString()}</div>
              </CardContent>
            </Card>

            {/* Vagas Abertas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal">Vagas Abertas</CardTitle>
                <Briefcase className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-normal text-green-600">{data.vagasAbertas.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {data.totalVagas > 0 ? Math.round((data.vagasAbertas / data.totalVagas) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            {/* Vagas Fechadas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal">Vagas Fechadas</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-normal text-blue-600">{data.taxaPreenchimento}%</div>
                <p className="text-xs text-muted-foreground">
                  {data.vagasFechadas.toLocaleString()} vagas preenchidas
                </p>
              </CardContent>
            </Card>

            {/* Tempo Médio */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-normal text-purple-600">{data.tempoMedioPreenchimento}h</div>
                <p className="text-xs text-muted-foreground">
                  Para preenchimento
                </p>
              </CardContent>
            </Card>

            {/* Candidaturas Pendentes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal">Candidaturas</CardTitle>
                <Users className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-normal text-amber-600">{data.candidaturasPendentes.toLocaleString()}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>Pendentes</span>
                </div>
              </CardContent>
            </Card>

            {/* Vagas Urgentes */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal text-red-800">Vagas Urgentes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-normal text-red-600">{data.vagasUrgentes.toLocaleString()}</div>
                <div className="flex items-center">
                  <Badge variant="destructive" className="text-xs">
                    Hoje até 2 dias
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segunda linha: Folha de Pagamento e Risco Operacional */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Folha de Pagamento Total */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal text-green-800">Folha de Pagamento</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-normal text-green-600 truncate">
                  R$ {data.folhaPagamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total do período
                </p>
              </CardContent>
            </Card>

            {/* Risco Operacional */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-normal text-orange-800">Risco Operacional</CardTitle>
                <Shield className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-normal text-orange-600 truncate">
                  R$ {data.riscoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vagas abertas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  )
} 
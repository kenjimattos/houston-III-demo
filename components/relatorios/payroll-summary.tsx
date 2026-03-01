"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Users, Briefcase, DollarSign, TrendingUp, Clock } from "lucide-react"

interface PayrollSummaryProps {
  summary: {
    totalDoctors: number
    totalJobs: number
    totalValue: number
    totalHours?: number
    averageValuePerJob: number
    averageValuePerHour?: number
    averageValuePer12hShift?: number
    averageJobsPerDoctor: number
  }
}

export function PayrollSummary({ summary }: PayrollSummaryProps) {
  // Formatar horas para exibição (ex: 156.5h)
  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-normal">Total de Médicos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-normal">{summary.totalDoctors}</div>
          <p className="text-xs text-muted-foreground">
            médicos com plantões realizados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-normal">Total de Plantões</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-normal">{summary.totalJobs}</div>
          <p className="text-xs text-muted-foreground">
            {summary.totalHours ? formatHours(summary.totalHours) : ''} no período
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-normal">Valor Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-normal">{formatCurrency(summary.totalValue)}</div>
          <p className="text-xs text-muted-foreground">
            valor total da folha de pagamento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-normal">Valor Médio/Hora</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-normal">
            {summary.averageValuePerHour ? formatCurrency(summary.averageValuePerHour) : '-'}
          </div>
          <p className="text-xs text-muted-foreground">
            por hora trabalhada
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-normal">Média Plantão 12h</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-normal">
            {summary.averageValuePer12hShift ? formatCurrency(summary.averageValuePer12hShift) : '-'}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.averageJobsPerDoctor.toFixed(1)} plantões/médico
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 
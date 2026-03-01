"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, FileText, Loader2, Calendar, Filter, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PayrollReport } from "@/components/relatorios/payroll-report"
import { PayrollSummary } from "@/components/relatorios/payroll-summary"
import { DateRangePicker } from "@/components/relatorios/date-range-picker"
import { MonthPicker } from "@/components/relatorios/month-picker"
import { formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { DateRange } from "react-day-picker"
import { 
  fetchPayrollData, 
  exportPayrollToExcel, 
  getPayrollSummary,
  fetchPayrollHospitals,
  fetchPayrollSpecialties,
  fetchPayrollSectors,
  fetchPayrollDoctors,
  type PayrollData,
  type PayrollFilters
} from "@/services/relatoriosService"

export default function FolhaPagamentoPage() {
  // Estados para dados
  const [payrollData, setPayrollData] = useState<PayrollData[]>([])
  const [payrollSummary, setPayrollSummary] = useState({
    totalDoctors: 0,
    totalJobs: 0,
    totalValue: 0,
    averageValuePerJob: 0,
    averageJobsPerDoctor: 0
  })
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Estados para filtros
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [filterType, setFilterType] = useState<"month" | "range">("month")
  const [selectedHospital, setSelectedHospital] = useState<string>("todos")
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("todas")
  const [selectedSector, setSelectedSector] = useState<string>("todos")
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos")

  // Estados para opções de filtro
  const [hospitals, setHospitals] = useState<any[]>([])
  const [specialties, setSpecialties] = useState<any[]>([])
  const [sectors, setSectors] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])

  // Carregar opções de filtro
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [
          hospitalsData, 
          specialtiesData, 
          sectorsData, 
          doctorsData
        ] = await Promise.all([
          fetchPayrollHospitals(),
          fetchPayrollSpecialties(),
          fetchPayrollSectors(),
          fetchPayrollDoctors()
        ])
        
        setHospitals(hospitalsData)
        setSpecialties(specialtiesData)
        setSectors(sectorsData)
        setDoctors(doctorsData)
      } catch (error) {
        console.error('Erro ao carregar opções de filtro:', error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar as opções de filtro.",
          variant: "destructive",
        })
      }
    }

    loadFilterOptions()
  }, [])

  const loadPayrollData = useCallback(async () => {
    setLoading(true)
    try {
      const filters: PayrollFilters = {}

      // Aplicar filtro de data
      if (filterType === "month") {
        filters.data_inicio = format(startOfMonth(selectedMonth), "yyyy-MM-dd")
        filters.data_fim = format(endOfMonth(selectedMonth), "yyyy-MM-dd")
      } else if (filterType === "range" && dateRange?.from && dateRange?.to) {
        filters.data_inicio = format(dateRange.from, "yyyy-MM-dd")
        filters.data_fim = format(dateRange.to, "yyyy-MM-dd")
      }

      // Aplicar outros filtros
      if (selectedHospital !== "todos") {
        filters.hospital_id = selectedHospital
      }
      if (selectedSpecialty !== "todas") {
        filters.especialidade_id = selectedSpecialty
      }
      if (selectedSector !== "todos") {
        filters.setor_id = selectedSector
      }
      if (selectedDoctor !== "todos") {
        filters.medico_id = selectedDoctor
      }

      const [data, summary] = await Promise.all([
        fetchPayrollData(filters),
        getPayrollSummary(filters)
      ])

      setPayrollData(data)
      setPayrollSummary(summary)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do relatório.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, dateRange, filterType, selectedHospital, selectedSpecialty, selectedSector, selectedDoctor])

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    loadPayrollData()
  }, [loadPayrollData])

  const handleExportExcel = async () => {
    if (payrollData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados disponíveis para o período selecionado.",
        variant: "destructive",
      })
      return
    }

    setExporting(true)
    try {
      const filters: PayrollFilters = {}

      // Aplicar filtro de data
      if (filterType === "month") {
        filters.data_inicio = format(startOfMonth(selectedMonth), "yyyy-MM-dd")
        filters.data_fim = format(endOfMonth(selectedMonth), "yyyy-MM-dd")
      } else if (filterType === "range" && dateRange?.from && dateRange?.to) {
        filters.data_inicio = format(dateRange.from, "yyyy-MM-dd")
        filters.data_fim = format(dateRange.to, "yyyy-MM-dd")
      }

      // Aplicar outros filtros
      if (selectedHospital !== "todos") {
        filters.hospital_id = selectedHospital
      }
      if (selectedSpecialty !== "todas") {
        filters.especialidade_id = selectedSpecialty
      }
      if (selectedSector !== "todos") {
        filters.setor_id = selectedSector
      }
      if (selectedDoctor !== "todos") {
        filters.medico_id = selectedDoctor
      }

      const blob = await exportPayrollToExcel(payrollData)
      
      // Criar nome do arquivo
      let fileName = "folha_pagamento"
      if (filterType === "month") {
        fileName += `_${format(selectedMonth, "yyyy_MM", { locale: ptBR })}`
      } else if (filterType === "range" && dateRange?.from && dateRange?.to) {
        fileName += `_${format(dateRange.from, "yyyy_MM_dd")}_a_${format(dateRange.to, "yyyy_MM_dd")}`
      }
      fileName += ".csv"

      // Download do arquivo
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${fileName} baixado com sucesso.`,
      })
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSelectedHospital("todos")
    setSelectedSpecialty("todas")
    setSelectedSector("todos")
    setSelectedDoctor("todos")
    setFilterType("month")
    setSelectedMonth(new Date())
    setDateRange(undefined)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/relatorios">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-normal tracking-tight">Folha de Pagamento</h1>
              <p className="text-muted-foreground">
                Relatório de folha de pagamento com filtros avançados
              </p>
            </div>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Configure os filtros para gerar o relatório de folha de pagamento (apenas vagas fechadas com confirmações de presença)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtro de período */}
              <div className="space-y-2">
                <label className="text-sm font-normal">Período</label>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={(value: "month" | "range") => setFilterType(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Por mês</SelectItem>
                      <SelectItem value="range">Período personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {filterType === "month" ? (
                    <MonthPicker selected={selectedMonth} onSelect={setSelectedMonth} />
                  ) : (
                    <DateRangePicker 
                      dateRange={dateRange} 
                      onSelect={setDateRange} 
                    />
                  )}
                </div>
              </div>

              {/* Outros filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-normal">Hospital</label>
                  <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os hospitais</SelectItem>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.hospital_id} value={hospital.hospital_id}>
                          {hospital.hospital_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-normal">Especialidade</label>
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as especialidades</SelectItem>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty.especialidade_id} value={specialty.especialidade_id}>
                          {specialty.especialidade_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-normal">Setor</label>
                  <Select value={selectedSector} onValueChange={setSelectedSector}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os setores</SelectItem>
                      {sectors.map((sector) => (
                        <SelectItem key={sector.setor_id} value={sector.setor_id}>
                          {sector.setor_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-normal">Médico</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os médicos</SelectItem>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.medico_primeironome} {doctor.medico_sobrenome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
                <Button onClick={handleExportExcel} disabled={exporting || payrollData.length === 0}>
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Excel
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          {!loading && (
            <PayrollSummary summary={payrollSummary} />
          )}

          {/* Relatório */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Folha de Pagamento
              </CardTitle>
              <CardDescription>
                {filterType === "month" 
                  ? `Dados de ${format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })} - Vagas fechadas com check-in/check-out`
                  : dateRange?.from && dateRange?.to
                    ? `Período de ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")} - Vagas fechadas com check-in/check-out`
                    : "Selecione um período - Vagas fechadas com check-in/check-out"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSpinner message="Carregando dados..." />
              ) : (
                <PayrollReport 
                  data={payrollData} 
                  onDataUpdate={() => {
                    // Recarregar dados após atualização
                    loadPayrollData()
                  }}
                />
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
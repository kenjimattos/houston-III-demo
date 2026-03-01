"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, FileText, Filter, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "@/components/ui/use-toast"
import { 
  fetchGradesReport,
  exportGradesReportToExcel,
  fetchGradesHospitals,
  fetchGradesSpecialties,
  fetchGradesSectors,
  fetchGradesGroups,
  type GradeReportItem,
  type GradeReportFilters
} from "@/services/relatoriosService"

export default function GradesPage() {
  // Estados para dados
  const [gradesData, setGradesData] = useState<GradeReportItem[]>([])
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [exportingGrades, setExportingGrades] = useState(false)
  
  // Estados para filtros específicos de grades
  const [selectedGradeHospital, setSelectedGradeHospital] = useState<string>("todos")
  const [selectedGradeSpecialty, setSelectedGradeSpecialty] = useState<string>("todas")
  const [selectedGradeSector, setSelectedGradeSector] = useState<string>("todos")
  const [selectedGradeGroup, setSelectedGradeGroup] = useState<string>("todos")
  
  // Estados para opções de filtro específicas de grades
  const [gradesHospitals, setGradesHospitals] = useState<any[]>([])
  const [gradesSpecialties, setGradesSpecialties] = useState<any[]>([])
  const [gradesSectors, setGradesSectors] = useState<any[]>([])
  const [gradesGroups, setGradesGroups] = useState<any[]>([])

  // Carregar opções de filtro específicas de grades
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [
          gradesHospitalsData,
          gradesSpecialtiesData,
          gradesSectorsData,
          gradesGroupsData
        ] = await Promise.all([
          fetchGradesHospitals(),
          fetchGradesSpecialties(),
          fetchGradesSectors(),
          fetchGradesGroups()
        ])
        
        setGradesHospitals(gradesHospitalsData)
        setGradesSpecialties(gradesSpecialtiesData)
        setGradesSectors(gradesSectorsData)
        setGradesGroups(gradesGroupsData)
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

  const loadGradesData = useCallback(async () => {
    setLoadingGrades(true)
    try {
      const filters: GradeReportFilters = {}

      // Aplicar filtros específicos de grades
      if (selectedGradeHospital !== "todos") {
        filters.hospital_id = selectedGradeHospital
      }
      if (selectedGradeSpecialty !== "todas") {
        filters.especialidade_id = selectedGradeSpecialty
      }
      if (selectedGradeSector !== "todos") {
        filters.setor_id = selectedGradeSector
      }
      if (selectedGradeGroup !== "todos") {
        filters.grupo_id = selectedGradeGroup
      }

      const data = await fetchGradesReport(filters)
      setGradesData(data)
    } catch (error) {
      console.error('Erro ao carregar dados de grades:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados das grades.",
        variant: "destructive",
      })
    } finally {
      setLoadingGrades(false)
    }
  }, [selectedGradeHospital, selectedGradeSpecialty, selectedGradeSector, selectedGradeGroup])

  // Carregar dados de grades quando filtros mudarem
  useEffect(() => {
    loadGradesData()
  }, [loadGradesData])

  const handleExportGradesExcel = async () => {
    if (gradesData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados de grades disponíveis.",
        variant: "destructive",
      })
      return
    }

    setExportingGrades(true)
    try {
      const blob = await exportGradesReportToExcel(gradesData)
      
      // Criar nome do arquivo
      const fileName = "relatorio_grades.csv"

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
        description: "Não foi possível exportar os dados das grades.",
        variant: "destructive",
      })
    } finally {
      setExportingGrades(false)
    }
  }

  const clearFilters = () => {
    setSelectedGradeHospital("todos")
    setSelectedGradeSpecialty("todas")
    setSelectedGradeSector("todos")
    setSelectedGradeGroup("todos")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
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
              <h1 className="text-3xl font-normal tracking-tight">Relatório de Grades</h1>
              <p className="text-muted-foreground">
                Configurações das grades organizadas por hospital, setor, horários e médicos atribuídos
              </p>
            </div>
          </div>

          {/* Filtros para Grades */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Configure os filtros para gerar o relatório de grades (configurações e médicos atribuídos)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hospital</label>
                  <Select value={selectedGradeHospital} onValueChange={setSelectedGradeHospital}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os hospitais</SelectItem>
                      {gradesHospitals.map((hospital) => (
                        <SelectItem key={hospital.hospital_id} value={hospital.hospital_id}>
                          {hospital.hospital_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Especialidade</label>
                  <Select value={selectedGradeSpecialty} onValueChange={setSelectedGradeSpecialty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as especialidades</SelectItem>
                      {gradesSpecialties.map((specialty) => (
                        <SelectItem key={specialty.especialidade_id} value={specialty.especialidade_id}>
                          {specialty.especialidade_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Setor</label>
                  <Select value={selectedGradeSector} onValueChange={setSelectedGradeSector}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os setores</SelectItem>
                      {gradesSectors.map((sector) => (
                        <SelectItem key={sector.setor_id} value={sector.setor_id}>
                          {sector.setor_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Grupo</label>
                  <Select value={selectedGradeGroup} onValueChange={setSelectedGradeGroup}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os grupos</SelectItem>
                      {gradesGroups.map((group) => (
                        <SelectItem key={group.grupo_id} value={group.grupo_id}>
                          {group.grupo_nome}
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
                <Button onClick={handleExportGradesExcel} disabled={exportingGrades || gradesData.length === 0}>
                  {exportingGrades ? (
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

          {/* Relatório de Grades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Grades
              </CardTitle>
              <CardDescription>
                Configurações das grades organizadas por hospital, setor, horários e médicos atribuídos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingGrades ? (
                <LoadingSpinner className="h-32" />
              ) : (
                <div className="space-y-4">
                  {gradesData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma grade encontrada com os filtros aplicados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Hospital</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Setor</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Tipo</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Grade</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Semana</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Dia</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Início</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Fim</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Duração</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Período</th>
                            <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium">Médico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradesData.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.hospital}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.setor}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.tipo}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm font-medium">{item.nome_grade}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.semana}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.dia_semana}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.hora_inicio}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.hora_fim}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.duracao}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.periodo}</td>
                              <td className="border border-gray-200 px-3 py-2 text-sm">{item.nome_medico}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {gradesData.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total de registros: {gradesData.length}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
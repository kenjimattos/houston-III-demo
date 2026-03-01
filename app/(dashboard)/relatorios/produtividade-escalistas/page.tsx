"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  FileText,
  Calendar,
  Filter,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EscalistaProductivityReport } from "@/components/relatorios/escalista-productivity-report";
import { DateRangePicker } from "@/components/relatorios/date-range-picker";
import { MonthPicker } from "@/components/relatorios/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DateRange } from "react-day-picker";
import {
  fetchEscalistaProductivity,
  exportEscalistaProductivityToExcel,
  fetchPayrollHospitals,
  fetchPayrollSpecialties,
  fetchPayrollSectors,
  fetchEscalistasWithApprovals,
  fetchGradesWithApprovals,
  fetchMedicosWithApprovals,
  type EscalistaProductivity,
  type PayrollFilters,
} from "@/services/relatoriosService";

export default function ProdutividadeEscalistasPage() {
  // Estados para dados
  const [escalistaData, setEscalistaData] = useState<EscalistaProductivity[]>(
    []
  );
  const [loadingEscalista, setLoadingEscalista] = useState(false);
  const [exportingEscalista, setExportingEscalista] = useState(false);

  // Estados para filtros
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterType, setFilterType] = useState<"month" | "range">("month");
  const [selectedHospital, setSelectedHospital] = useState<string>("todos");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("todas");
  const [selectedSector, setSelectedSector] = useState<string>("todos");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos");
  const [selectedEscalista, setSelectedEscalista] = useState<string>("todos");
  const [selectedGrade, setSelectedGrade] = useState<string>("todas");

  // Estados para opções de filtro
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [escalistas, setEscalistas] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [medicosWithApprovals, setMedicosWithApprovals] = useState<any[]>([]);

  // Carregar opções de filtro
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [
          hospitalsData,
          specialtiesData,
          sectorsData,
          escalistas,
          grades,
          medicosApprovals,
        ] = await Promise.all([
          fetchPayrollHospitals(),
          fetchPayrollSpecialties(),
          fetchPayrollSectors(),
          fetchEscalistasWithApprovals(),
          fetchGradesWithApprovals(),
          fetchMedicosWithApprovals(),
        ]);

        setHospitals(hospitalsData);
        setSpecialties(specialtiesData);
        setSectors(sectorsData);
        setEscalistas(escalistas);
        setGrades(grades);
        setMedicosWithApprovals(medicosApprovals);
      } catch (error) {
        console.error("Erro ao carregar opções de filtro:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as opções de filtro.",
          variant: "destructive",
        });
      }
    };

    loadFilterOptions();
  }, []);

  const loadEscalistaData = useCallback(async () => {
    setLoadingEscalista(true);
    try {
      const filters: PayrollFilters = {};

      // Aplicar filtro de data
      if (filterType === "month") {
        filters.data_inicio = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
        filters.data_fim = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
      } else if (filterType === "range" && dateRange?.from && dateRange?.to) {
        filters.data_inicio = format(dateRange.from, "yyyy-MM-dd");
        filters.data_fim = format(dateRange.to, "yyyy-MM-dd");
      }

      // Aplicar outros filtros
      if (selectedHospital !== "todos") {
        filters.hospital_id = selectedHospital;
      }
      if (selectedSpecialty !== "todas") {
        filters.especialidade_id = selectedSpecialty;
      }
      if (selectedSector !== "todos") {
        filters.setor_id = selectedSector;
      }
      if (selectedDoctor !== "todos") {
        filters.medico_id = selectedDoctor;
      }
      if (selectedGrade !== "todas") {
        filters.grade_id = selectedGrade;
      }

      const data = await fetchEscalistaProductivity(filters);

      // Filtrar por escalista específico no frontend se selecionado
      let filteredData = data;
      if (selectedEscalista !== "todos") {
        filteredData = data.filter(
          (escalista) => escalista.escalista_nome === selectedEscalista
        );
      }

      setEscalistaData(filteredData);
    } catch (error) {
      console.error("Erro ao carregar dados de escalistas:", error);
      toast({
        title: "Erro",
        description:
          "Não foi possível carregar os dados de produtividade dos escalistas.",
        variant: "destructive",
      });
    } finally {
      setLoadingEscalista(false);
    }
  }, [
    selectedMonth,
    dateRange,
    filterType,
    selectedHospital,
    selectedSpecialty,
    selectedSector,
    selectedDoctor,
    selectedGrade,
    selectedEscalista,
  ]);

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    loadEscalistaData();
  }, [loadEscalistaData]);

  const handleExportEscalistaExcel = async () => {
    if (escalistaData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description:
          "Não há dados de produtividade disponíveis para o período selecionado.",
        variant: "destructive",
      });
      return;
    }

    setExportingEscalista(true);
    try {
      const blob = await exportEscalistaProductivityToExcel(escalistaData);

      // Criar nome do arquivo
      let fileName = "produtividade_escalistas";
      if (filterType === "month") {
        fileName += `_${format(selectedMonth, "yyyy_MM", { locale: ptBR })}`;
      } else if (filterType === "range" && dateRange?.from && dateRange?.to) {
        fileName += `_${format(dateRange.from, "yyyy_MM_dd")}_a_${format(
          dateRange.to,
          "yyyy_MM_dd"
        )}`;
      }
      fileName += ".csv";

      // Download do arquivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${fileName} baixado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setExportingEscalista(false);
    }
  };

  const clearFilters = () => {
    setSelectedHospital("todos");
    setSelectedSpecialty("todas");
    setSelectedSector("todos");
    setSelectedDoctor("todos");
    setSelectedEscalista("todos");
    setSelectedGrade("todas");
    setFilterType("month");
    setSelectedMonth(new Date());
    setDateRange(undefined);
  };

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
              <h1 className="text-3xl font-normal tracking-tight">
                Produtividade dos Escalistas
              </h1>
              <p className="text-muted-foreground">
                Relatório de produtividade dos escalistas com métricas de
                aprovação
              </p>
            </div>
          </div>

          {/* Filtros para Produtividade */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Configure os filtros para gerar o relatório de produtividade dos
                escalistas (candidaturas aprovadas)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtro de período */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <div className="flex gap-2">
                  <Select
                    value={filterType}
                    onValueChange={(value: "month" | "range") =>
                      setFilterType(value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Por mês</SelectItem>
                      <SelectItem value="range">
                        Período personalizado
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {filterType === "month" ? (
                    <MonthPicker
                      selected={selectedMonth}
                      onSelect={setSelectedMonth}
                    />
                  ) : (
                    <DateRangePicker
                      dateRange={dateRange}
                      onSelect={setDateRange}
                    />
                  )}
                </div>
              </div>

              {/* Outros filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hospital</label>
                  <Select
                    value={selectedHospital}
                    onValueChange={setSelectedHospital}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os hospitais</SelectItem>
                      {hospitals.map((hospital) => (
                        <SelectItem
                          key={hospital.hospital_id}
                          value={hospital.hospital_id}
                        >
                          {hospital.hospital_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Especialidade</label>
                  <Select
                    value={selectedSpecialty}
                    onValueChange={setSelectedSpecialty}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">
                        Todas as especialidades
                      </SelectItem>
                      {specialties.map((specialty) => (
                        <SelectItem
                          key={specialty.especialidade_id}
                          value={specialty.especialidade_id}
                        >
                          {specialty.especialidade_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Setor</label>
                  <Select
                    value={selectedSector}
                    onValueChange={setSelectedSector}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os setores</SelectItem>
                      {sectors.map((sector) => (
                        <SelectItem
                          key={sector.setor_id}
                          value={sector.setor_id}
                        >
                          {sector.setor_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Médico</label>
                  <Select
                    value={selectedDoctor}
                    onValueChange={setSelectedDoctor}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os médicos</SelectItem>
                      {medicosWithApprovals.map((medico) => (
                        <SelectItem
                          key={medico.medico_id}
                          value={medico.medico_id}
                        >
                          {medico.medico_primeiro_nome}{" "}
                          {medico.medico_sobrenome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Escalista</label>
                  <Select
                    value={selectedEscalista}
                    onValueChange={setSelectedEscalista}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os escalistas</SelectItem>
                      {escalistas.map((escalista) => (
                        <SelectItem
                          key={escalista.escalista_uuid}
                          value={escalista.escalista_nome}
                        >
                          {escalista.escalista_nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade</label>
                  <Select
                    value={selectedGrade}
                    onValueChange={setSelectedGrade}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as grades</SelectItem>
                      {grades.map((grade) => (
                        <SelectItem key={grade.grade_id} value={grade.grade_id}>
                          {grade.grade_nome}
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
                <Button
                  onClick={handleExportEscalistaExcel}
                  disabled={exportingEscalista || escalistaData.length === 0}
                >
                  {exportingEscalista ? (
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

          {/* Relatório de Produtividade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Produtividade dos Escalistas
              </CardTitle>
              <CardDescription>
                {filterType === "month"
                  ? `Dados de ${format(selectedMonth, "MMMM 'de' yyyy", {
                      locale: ptBR,
                    })} - Candidaturas aprovadas`
                  : dateRange?.from && dateRange?.to
                  ? `Período de ${format(
                      dateRange.from,
                      "dd/MM/yyyy"
                    )} a ${format(
                      dateRange.to,
                      "dd/MM/yyyy"
                    )} - Candidaturas aprovadas`
                  : "Selecione um período - Candidaturas aprovadas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEscalista ? (
                <LoadingSpinner className="h-32" />
              ) : (
                <EscalistaProductivityReport data={escalistaData} />
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

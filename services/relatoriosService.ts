import { getSupabaseClient } from "@/services/supabaseClient";

// Função para validar se uma string é um UUID válido
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Função para buscar nome do escalista por UUID (apenas se for escalista)
export async function getEscalistaNome(userId: string): Promise<string | null> {
  if (!userId || !isValidUUID(userId)) return null;

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("escalistas")
      .select("nome")
      .eq("id", userId)
      .single();

    if (error || !data || !data.nome)
      return null;

    return data.nome;
  } catch {
    return null;
  }
}

// Interfaces para relatórios
export interface Doctor {
  id: string;
  name: string;
  crm: string;
  specialty: string;
  email: string;
  phone: string;
  cpf: string;
  // Campos bancários da view vw_folha_pagamento
  razaoSocial?: string;
  cnpj?: string;
  bancoAgencia?: string;
  bancoDigito?: string;
  bancoConta?: string;
  bancoPix?: string;
  // Indicador se é médico pré-cadastrado
  isPrecadastro?: boolean;
}

export interface Job {
  id: string;
  start: string;
  end: string;
  hospitalName: string;
  specialtyName: string;
  sectorName: string;
  value: number;
  date: string;
  dataAprovacao?: string;
  periodo: string;
  checkinTime?: string;
  checkoutTime?: string;
  checkinJustificativa?: string;
  checkoutJustificativa?: string;
  paymentMethod?: string;
}

export interface PayrollData {
  doctor: Doctor;
  jobs: Job[];
  totalValue: number;
}

export interface PayrollFilters {
  data_inicio?: string;
  data_fim?: string;
  hospital_id?: string;
  especialidade_id?: string;
  setor_id?: string;
  medico_id?: string;
  grade_id?: string;
}

export async function fetchPayrollData(
  filters: PayrollFilters = {}
): Promise<PayrollData[]> {
  // Construir query string com filtros
  const params = new URLSearchParams();
  if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
  if (filters.data_fim) params.append('data_fim', filters.data_fim);
  if (filters.hospital_id) params.append('hospital_id', filters.hospital_id);
  if (filters.especialidade_id) params.append('especialidade_id', filters.especialidade_id);
  if (filters.setor_id) params.append('setor_id', filters.setor_id);
  if (filters.medico_id) params.append('medico_id', filters.medico_id);
  if (filters.grade_id) params.append('grade_id', filters.grade_id);

  const queryString = params.toString();
  const url = `/api/relatorios/folha-pagamento${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar dados de folha de pagamento');
  }

  const { data } = await response.json();

  if (!data || data.length === 0) return [];

  console.log("=== DEBUG RELATÓRIO FOLHA DE PAGAMENTO ===");
  console.log("Total de registros da view vw_folha_pagamento:", data.length);

  // Verificar campos disponíveis na nova view
  if (data.length > 0) {
    const firstItem = data[0];
    console.log("Campos disponíveis na view:", {
      medico_cpf: firstItem.medico_cpf,
      forma_recebimento: firstItem.forma_recebimento,
      razao_social: firstItem.razao_social,
      cnpj: firstItem.cnpj,
      banco_agencia: firstItem.banco_agencia,
      banco_conta: firstItem.banco_conta,
      banco_pix: firstItem.banco_pix,
      checkin: firstItem.checkin,
      checkout: firstItem.checkout,
    });
  }

  // Agrupar dados por médico - usar ID único considerando pré-cadastrados
  const groupedData = data.reduce((acc: Record<string, any>, item: any) => {
    // Use medico_precadastro_id se disponível, senão use medico_id
    const doctorKey = item.medico_precadastro_id || item.medico_id;
    const isPrecadastro = !!item.medico_precadastro_id;

    if (!acc[doctorKey]) {
      console.log(
        `Criando médico ${isPrecadastro ? "(pré-cadastro)" : "(cadastrado)"} ${
          item.medico_primeironome
        } ${item.medico_sobrenome}:`
      );
      console.log(`  ID: "${doctorKey}"`);
      console.log(`  CPF: "${item.medico_cpf}"`);
      console.log(
        `  Dados bancários: agencia="${item.banco_agencia}", conta="${item.banco_conta}", pix="${item.banco_pix}"`
      );

      acc[doctorKey] = {
        doctor: {
          id: doctorKey,
          name: [item.medico_primeironome, item.medico_sobrenome]
            .filter(Boolean)
            .join(' ') || 'Nome não disponível',
          crm: item.medico_crm || "",
          specialty: item.medico_especialidade || "",
          email: "", // Não disponível na view
          phone: "", // Não disponível na view
          cpf: item.medico_cpf || "",
          // Campos bancários da view
          razaoSocial: item.razao_social || "",
          cnpj: item.cnpj || "",
          bancoAgencia: item.banco_agencia || "",
          bancoDigito: item.banco_digito || "",
          bancoConta: item.banco_conta || "",
          bancoPix: item.banco_pix || "",
          // Indicador se é pré-cadastro
          isPrecadastro: isPrecadastro,
        },
        jobs: [],
        totalValue: 0,
      };
    }

    // Usar dados de checkin/checkout diretamente da view
    const job: Job = {
      id: item.vaga_id,
      start: `${item.vaga_data}T${item.horario_inicio}`,
      end: `${item.vaga_data}T${item.horario_fim}`,
      hospitalName: item.hospital_nome || "",
      specialtyName: item.especialidade_nome || "",
      sectorName: item.setor_nome || "",
      value: item.vaga_valor || 0,
      date: item.vaga_data || null,
      dataAprovacao: item.candidatura_data_confirmacao || undefined,
      periodo: item.periodo_nome || "",
      checkinTime: item.checkin || undefined,
      checkoutTime: item.checkout || undefined,
      checkinJustificativa: item.checkin_justificativa || undefined,
      checkoutJustificativa: item.checkout_justificativa || undefined,
      paymentMethod: item.forma_recebimento || "",
    };

    acc[doctorKey].jobs.push(job);
    acc[doctorKey].totalValue += job.value;

    return acc;
  }, {});

  return Object.values(groupedData);
}

// Função para buscar hospitais que aparecem nos relatórios de folha de pagamento
export async function fetchPayrollHospitals(): Promise<
  { hospital_id: string; hospital_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=hospitais&source=folha_pagamento', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar hospitais');
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar especialidades que aparecem nos relatórios de folha de pagamento
export async function fetchPayrollSpecialties(): Promise<
  { especialidade_id: string; especialidade_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=especialidades&source=folha_pagamento', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar especialidades');
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar setores que aparecem nos relatórios de folha de pagamento
export async function fetchPayrollSectors(): Promise<
  { setor_id: string; setor_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=setores&source=folha_pagamento', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar setores');
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar médicos que aparecem nos relatórios de folha de pagamento
export async function fetchPayrollDoctors(): Promise<
  { id: string; medico_primeironome: string; medico_sobrenome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=medicos&source=folha_pagamento', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar médicos');
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar escalistas específicos que têm candidaturas aprovadas
export async function fetchEscalistasWithApprovals(): Promise<
  { escalista_nome: string; escalista_uuid: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=escalistas&source=produtividade', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.warn('Erro ao buscar escalistas:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar grades que aparecem em candidaturas aprovadas
export async function fetchGradesWithApprovals(): Promise<
  { grade_id: string; grade_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=grades&source=produtividade', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.warn('Erro ao buscar grades:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar médicos que têm candidaturas aprovadas
export async function fetchMedicosWithApprovals(): Promise<
  {
    medico_id: string;
    medico_primeiro_nome: string;
    medico_sobrenome: string;
  }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=medicos&source=produtividade', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.warn('Erro ao buscar médicos:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

export async function exportPayrollToExcel(data: PayrollData[]): Promise<Blob> {
  // Preparar dados para exportação
  const exportData: any[] = [];

  data.forEach((item) => {
    item.jobs.forEach((job) => {
      // Função para formatar apenas a data
      const formatDate = (timestamp?: string) => {
        if (!timestamp) return "-";
        try {
          const date = new Date(timestamp);
          return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch {
          return "-";
        }
      };

      // Função para formatar apenas o horário
      const formatTime = (timestamp?: string) => {
        if (!timestamp) return "-";
        try {
          const date = new Date(timestamp);
          return date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        } catch {
          return "-";
        }
      };

      exportData.push({
        Médico: item.doctor.name,
        CPF: item.doctor.cpf,
        CRM: item.doctor.crm,
        Especialidade: item.doctor.specialty,
        "Data do Plantão": new Date(job.date).toLocaleDateString("pt-BR"),
        "Data de Aprovação": job.dataAprovacao
          ? new Date(job.dataAprovacao).toLocaleDateString("pt-BR")
          : "-",
        Período: job.periodo,
        "Horário Início": job.start.split("T")[1],
        "Horário Fim": job.end.split("T")[1],
        Valor: job.value,
        Hospital: job.hospitalName,
        Setor: job.sectorName,
        Contratação: job.paymentMethod,
        "Razão Social": item.doctor.razaoSocial || "",
        CNPJ: item.doctor.cnpj || "",
        "Banco Agência": item.doctor.bancoAgencia || "",
        "Número da Conta": item.doctor.bancoConta || "",
        "Dígito da Conta": item.doctor.bancoDigito || "",
        "Chave PIX": item.doctor.bancoPix || "",
        "Data Check-in": formatDate(job.checkinTime),
        "Horário Check-in": formatTime(job.checkinTime),
        "Justificativa Check-in": job.checkinJustificativa || "-",
        "Data Check-out": formatDate(job.checkoutTime),
        "Horário Check-out": formatTime(job.checkoutTime),
        "Justificativa Check-out": job.checkoutJustificativa || "-",
      });
    });
  });

  // Criar CSV
  const headers = Object.keys(exportData[0] || {});
  const csvContent = [
    headers.join(","),
    ...exportData.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escapar valores que contêm vírgulas ou aspas
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  // Adicionar BOM para UTF-8
  const bom = "\uFEFF";
  return new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
}

// Função para salvar dados bancários de um médico
export async function updateDoctorBankingData(
  doctorId: string,
  isPrecadastro: boolean,
  bankingData: {
    razaoSocial?: string;
    cnpj?: string;
    bancoAgencia?: string;
    bancoDigito?: string;
    bancoConta?: string;
    bancoPix?: string;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const tableName = isPrecadastro ? "medicos_precadastro" : "medicos";

    // Criar objeto de atualização apenas com campos preenchidos
    const updateData: Record<string, string | null> = {};

    if (
      bankingData.razaoSocial !== undefined &&
      bankingData.razaoSocial.trim() !== ""
    ) {
      updateData.razao_social = bankingData.razaoSocial.trim();
    }

    if (bankingData.cnpj !== undefined && bankingData.cnpj.trim() !== "") {
      updateData.cnpj = bankingData.cnpj.trim();
    }

    if (
      bankingData.bancoAgencia !== undefined &&
      bankingData.bancoAgencia.trim() !== ""
    ) {
      updateData.banco_agencia = bankingData.bancoAgencia.trim();
    }

    if (
      bankingData.bancoDigito !== undefined &&
      bankingData.bancoDigito.trim() !== ""
    ) {
      updateData.banco_digito = bankingData.bancoDigito.trim();
    }

    if (
      bankingData.bancoConta !== undefined &&
      bankingData.bancoConta.trim() !== ""
    ) {
      updateData.banco_conta = bankingData.bancoConta.trim();
    }

    if (
      bankingData.bancoPix !== undefined &&
      bankingData.bancoPix.trim() !== ""
    ) {
      updateData.banco_pix = bankingData.bancoPix.trim();
    }

    // Se não há campos para atualizar, retorna sucesso
    if (Object.keys(updateData).length === 0) {
      console.log("Nenhum campo preenchido para atualizar");
      return true;
    }

    console.log("Atualizando dados bancários (apenas campos preenchidos):", {
      doctorId,
      isPrecadastro,
      tableName,
      updateData,
    });

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", doctorId);

    if (error) {
      console.error("Erro ao atualizar dados bancários:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro geral ao atualizar dados bancários:", error);
    return false;
  }
}

// Função auxiliar para calcular duração em horas entre dois timestamps
// Lida corretamente com plantões noturnos que atravessam a meia-noite
function calculateDurationInHours(start: string, end: string): number {
  try {
    const startDate = new Date(start);
    let endDate = new Date(end);

    // Extrair apenas as horas e minutos para comparação mais robusta
    const startHours = startDate.getHours() + startDate.getMinutes() / 60;
    const endHours = endDate.getHours() + endDate.getMinutes() / 60;

    // Se o horário de fim é menor ou igual ao de início, o plantão atravessa a meia-noite
    // Exemplos: 19:00→00:00 (5h), 17:00→02:00 (9h), 22:00→07:00 (9h)
    // Também trata o caso especial de 00:00 que deve ser interpretado como 24:00
    if (endHours <= startHours) {
      // Caso especial: se endHours é 0 (meia-noite), pode ser fim do dia
      // Se a diferença seria negativa ou zero, adiciona 24h
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    // Validar resultado (plantões normalmente não excedem 24 horas)
    if (hours <= 0 || hours > 24) {
      // Log para debug em caso de valores inválidos
      console.warn(`Duração inválida calculada: ${hours}h para ${start} → ${end}`);
      return 0;
    }

    return hours;
  } catch (error) {
    console.warn(`Erro ao calcular duração: ${start} → ${end}`, error);
    return 0;
  }
}

export async function getPayrollSummary(filters: PayrollFilters = {}): Promise<{
  totalDoctors: number;
  totalJobs: number;
  totalValue: number;
  totalHours: number;
  averageValuePerJob: number;
  averageValuePerHour: number;
  averageValuePer12hShift: number;
  averageJobsPerDoctor: number;
}> {
  const data = await fetchPayrollData(filters);

  const totalDoctors = data.length;
  const totalJobs = data.reduce((sum, item) => sum + item.jobs.length, 0);
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);

  // Calcular total de horas trabalhadas
  const totalHours = data.reduce((sum, item) => {
    return sum + item.jobs.reduce((jobSum, job) => {
      return jobSum + calculateDurationInHours(job.start, job.end);
    }, 0);
  }, 0);

  // Média simples (mantida para compatibilidade)
  const averageValuePerJob = totalJobs > 0 ? totalValue / totalJobs : 0;

  // Média ponderada por hora
  const averageValuePerHour = totalHours > 0 ? totalValue / totalHours : 0;

  // Média normalizada para plantão de 12h
  const averageValuePer12hShift = averageValuePerHour * 12;

  const averageJobsPerDoctor = totalDoctors > 0 ? totalJobs / totalDoctors : 0;

  return {
    totalDoctors,
    totalJobs,
    totalValue,
    totalHours,
    averageValuePerJob,
    averageValuePerHour,
    averageValuePer12hShift,
    averageJobsPerDoctor,
  };
}

// Interfaces para relatório de produtividade dos escalistas
export interface EscalistaProductivity {
  escalista_nome: string;
  total_candidaturas_aprovadas: number;
  candidaturas: EscalistaApproval[];
}

export interface EscalistaApproval {
  vaga_data: string;
  candidatura_createdate: string;
  candidatura_updateby: string;
  candidatura_updatedat: string;
  hospital_nome: string;
  especialidade_nome: string;
  setor_nome: string;
  vaga_horainicio: string;
  vaga_horafim: string;
  total_candidaturas: number;
  medico_nome: string;
  grade_nome: string;
}

export async function fetchEscalistaProductivity(
  filters: PayrollFilters = {}
): Promise<EscalistaProductivity[]> {
  // Construir query string com filtros
  const params = new URLSearchParams();
  if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
  if (filters.data_fim) params.append('data_fim', filters.data_fim);
  if (filters.hospital_id) params.append('hospital_id', filters.hospital_id);
  if (filters.especialidade_id) params.append('especialidade_id', filters.especialidade_id);
  if (filters.setor_id) params.append('setor_id', filters.setor_id);
  if (filters.medico_id) params.append('medico_id', filters.medico_id);
  if (filters.grade_id) params.append('grade_id', filters.grade_id);

  const queryString = params.toString();
  const url = `/api/relatorios/produtividade-escalistas${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar dados de produtividade de escalistas');
  }

  const { data } = await response.json();

  if (!data || data.length === 0) return [];

  // Agrupar dados por escalista que aprovou (usando escalista_nome)
  const groupedData = data.reduce(
    (acc: Record<string, any>, item: any) => {
      const escalista = item.escalista_nome;

      if (!acc[escalista]) {
        acc[escalista] = {
          escalista_nome: escalista,
          total_candidaturas_aprovadas: 0,
          candidaturas: [],
        };
      }

      acc[escalista].total_candidaturas_aprovadas += 1;
      acc[escalista].candidaturas.push({
        vaga_data: item.vaga_data,
        candidatura_createdate: item.candidatura_createdate,
        candidatura_updateby: item.candidatura_updateby,
        candidatura_updatedat: item.candidatura_updatedat,
        hospital_nome: item.hospital_nome,
        especialidade_nome: item.especialidade_nome,
        setor_nome: item.setor_nome,
        vaga_horainicio: item.vaga_horainicio,
        vaga_horafim: item.vaga_horafim,
        total_candidaturas: item.total_candidaturas || 1,
        medico_nome: `${item.medico_primeiro_nome || ""} ${
          item.medico_sobrenome || ""
        }`.trim(),
        grade_nome: item.grade_nome || "Não informado",
      });

      return acc;
    },
    {}
  );

  // Converter para array e ordenar por total de candidaturas aprovadas
  return Object.values(groupedData).sort(
    (a: any, b: any) =>
      b.total_candidaturas_aprovadas - a.total_candidaturas_aprovadas
  ) as EscalistaProductivity[];
}

// Interfaces para relatório de grades
export interface GradeReportItem {
  hospital: string;
  setor: string;
  tipo: string;
  nome_grade: string;
  semana: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
  duracao: string;
  periodo: string;
  nome_medico: string;
}

export interface GradeReportFilters {
  hospital_id?: string;
  setor_id?: string;
  especialidade_id?: string;
  grupo_id?: string;
}

import { detectarPeriodo } from "../components/grades/scripts/detectar-periodo";

export async function fetchGradesReport(
  filters: GradeReportFilters = {}
): Promise<GradeReportItem[]> {
  // Construir query string com filtros
  const params = new URLSearchParams();
  if (filters.hospital_id) params.append('hospital_id', filters.hospital_id);
  if (filters.especialidade_id) params.append('especialidade_id', filters.especialidade_id);
  if (filters.setor_id) params.append('setor_id', filters.setor_id);
  if (filters.grupo_id) params.append('grupo_id', filters.grupo_id);

  const queryString = params.toString();
  const url = `/api/relatorios/grades${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar dados de grades');
  }

  const { data: grades } = await response.json();

  if (!grades || grades.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();

  // Buscar dados relacionados separadamente
  const hospitalIds = [
    ...new Set(grades.map((g: any) => g.hospital_id).filter((id: any) => id)),
  ];
  const setorIds = [
    ...new Set(grades.map((g: any) => g.setor_id).filter((id: any) => id)),
  ];
  const especialidadeIds = [
    ...new Set(grades.map((g: any) => g.especialidade_id).filter((id: any) => id)),
  ];

  const [hospitaisData, setoresData, especialidadesData] = await Promise.all([
    supabase.from("hospitais").select("id, nome").in("id", hospitalIds),
    supabase.from("setores").select("id, nome").in("id", setorIds),
    supabase
      .from("especialidades")
      .select("id, nome")
      .in("id", especialidadeIds),
  ]);

  // Criar mapas
  const hospitaisMap = new Map(
    hospitaisData.data?.map((h) => [h.id, h.nome]) || []
  );
  const setoresMap = new Map(
    setoresData.data?.map((s) => [s.id, s.nome]) || []
  );
  const especialidadesMap = new Map(
    especialidadesData.data?.map((e) => [e.id, e.nome]) || []
  );

  // Buscar todos os médicos necessários
  const allMedicoIds = new Set<string>();
  const allMedicoPrecadastroIds = new Set<string>();

  grades.forEach((grade: any) => {
    const config = (grade.configuracao as any) || {};
    console.log(`Processando grade "${grade.nome}":`);
    console.log("- Configuração tem slotsByDay?", !!config.slotsByDay);
    console.log("- Configuração tem slots?", !!config.slots);

    // Coletar IDs dos médicos de slotsByDay
    if (config.slotsByDay) {
      console.log("  Processando slotsByDay...");
      Object.keys(config.slotsByDay).forEach((lineIndex) => {
        const slotsForLine = config.slotsByDay[lineIndex];
        console.log(`  Linha ${lineIndex}:`, Object.keys(slotsForLine));

        Object.keys(slotsForLine).forEach((dayIndex) => {
          const slots = slotsForLine[dayIndex];
          if (Array.isArray(slots) && slots.length > 0) {
            console.log(`    Dia ${dayIndex} tem ${slots.length} slots`);
            slots.forEach((slot: any, slotIndex: number) => {
              console.log(`      Slot ${slotIndex}:`, {
                hasAssignedVagas: !!slot.assignedVagas,
                assignedVagasLength: slot.assignedVagas?.length || 0,
              });

              if (slot.assignedVagas && slot.assignedVagas.length > 0) {
                slot.assignedVagas.forEach((vaga: any, vagaIndex: number) => {
                  console.log(`        Vaga ${vagaIndex}:`, {
                    medicoId: vaga.medicoId,
                    medicoPrecadastroId: vaga.medicoPrecadastroId,
                  });
                  if (vaga.medicoId) allMedicoIds.add(vaga.medicoId);
                  if (vaga.medicoPrecadastroId)
                    allMedicoPrecadastroIds.add(vaga.medicoPrecadastroId);
                });
              }
            });
          }
        });
      });
    }

    // Coletar IDs dos médicos de slots simples
    if (config.slots && Array.isArray(config.slots)) {
      console.log("  Processando slots simples...");
      config.slots.forEach((slot: any, slotIndex: number) => {
        console.log(`    Slot ${slotIndex}:`, {
          hasAssignedVagas: !!slot.assignedVagas,
          assignedVagasLength: slot.assignedVagas?.length || 0,
        });

        if (slot.assignedVagas && slot.assignedVagas.length > 0) {
          slot.assignedVagas.forEach((vaga: any, vagaIndex: number) => {
            console.log(`      Vaga ${vagaIndex}:`, {
              medicoId: vaga.medicoId,
              medicoPrecadastroId: vaga.medicoPrecadastroId,
            });
            if (vaga.medicoId) allMedicoIds.add(vaga.medicoId);
            if (vaga.medicoPrecadastroId)
              allMedicoPrecadastroIds.add(vaga.medicoPrecadastroId);
          });
        }
      });
    }
  });

  // Buscar dados dos médicos cadastrados e pré-cadastrados
  let medicosMap = new Map();

  console.log("IDs de médicos coletados:", {
    medicos: Array.from(allMedicoIds),
    medicoPrecadastro: Array.from(allMedicoPrecadastroIds),
  });

  // Se não encontrou nenhum médico, retornar relatório básico
  if (allMedicoIds.size === 0 && allMedicoPrecadastroIds.size === 0) {
    console.log("Nenhum médico encontrado nas configurações das grades");
  }

  // Médicos cadastrados - usar a view que sabemos que funciona
  if (allMedicoIds.size > 0) {
    try {
      console.log("Buscando médicos na view vw_vagas_candidaturas...");
      const { data: medicosData, error: medicosError } = await supabase
        .from("vw_vagas_candidaturas")
        .select("medico_id, medico_primeiro_nome, medico_sobrenome")
        .in("medico_id", Array.from(allMedicoIds))
        .not("medico_primeiro_nome", "is", null);

      if (medicosError) {
        console.error("Erro ao buscar médicos na view:", medicosError);
      } else if (medicosData && medicosData.length > 0) {
        console.log("Médicos encontrados na view:", medicosData.length);

        // Remover duplicados
        const medicosUnicos = new Map();
        medicosData.forEach((m) => {
          if (!medicosUnicos.has(m.medico_id)) {
            medicosUnicos.set(m.medico_id, m);
          }
        });

        medicosUnicos.forEach((m) => {
          const nomeCompleto = `${m.medico_primeiro_nome || ""} ${
            m.medico_sobrenome || ""
          }`.trim();
          if (nomeCompleto) {
            medicosMap.set(m.medico_id, nomeCompleto);
            console.log(`Médico da view: ${m.medico_id} -> ${nomeCompleto}`);
          }
        });
      } else {
        console.log("Nenhum médico encontrado na view para os IDs fornecidos");
      }
    } catch (error) {
      console.error("Erro geral na busca de médicos na view:", error);
    }
  }

  // Médicos pré-cadastrados
  if (allMedicoPrecadastroIds.size > 0) {
    try {
      console.log("Buscando médicos pré-cadastrados...");
      const { data: medicosPreData, error: medicosPreError } = await supabase
        .from("medico_precadastro")
        .select("id, primeironome, sobrenome")
        .in("id", Array.from(allMedicoPrecadastroIds));

      if (medicosPreError) {
        console.error(
          "Erro ao buscar médicos pré-cadastrados:",
          medicosPreError
        );
        console.log("Tentando tabela alternativa medicos_precadastro...");

        // Tentar com nome alternativo da tabela
        const { data: altData, error: altError } = await supabase
          .from("medicos_precadastro")
          .select("id, primeironome, sobrenome")
          .in("id", Array.from(allMedicoPrecadastroIds));

        if (altError) {
          console.error("Erro na tabela alternativa:", altError);
        } else if (altData && altData.length > 0) {
          console.log(
            "Médicos pré-cadastrados encontrados na tabela alternativa:",
            altData.length
          );
          altData.forEach((m) => {
            const nomeCompleto = `${m.primeironome || ""} ${
              m.sobrenome || ""
            }`.trim();
            if (nomeCompleto) {
              medicosMap.set(m.id, nomeCompleto);
              console.log(
                `Médico pré-cadastrado (alt): ${m.id} -> ${nomeCompleto}`
              );
            }
          });
        }
      } else if (medicosPreData && medicosPreData.length > 0) {
        console.log(
          "Médicos pré-cadastrados encontrados:",
          medicosPreData.length
        );
        medicosPreData.forEach((m) => {
          const nomeCompleto = `${m.primeironome || ""} ${
            m.sobrenome || ""
          }`.trim();
          if (nomeCompleto) {
            medicosMap.set(m.id, nomeCompleto);
            console.log(`Médico pré-cadastrado: ${m.id} -> ${nomeCompleto}`);
          }
        });
      } else {
        console.log("Nenhum médico pré-cadastrado encontrado na base de dados");
      }
    } catch (error) {
      console.error("Erro na query de médicos pré-cadastrados:", error);
    }
  }

  const reportItems: GradeReportItem[] = [];
  const diasSemana = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];

  // Função auxiliar para formatar horário
  const formatTime = (hour: number): string => {
    if (hour >= 24) {
      const adjustedHour = hour - 24;
      const h = Math.floor(adjustedHour);
      const m = Math.round((adjustedHour % 1) * 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const h = Math.floor(hour);
    const m = Math.round((hour % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Processar cada grade e extrair plantões
  grades.forEach((grade: any) => {
    const hospital = hospitaisMap.get(grade.hospital_id) || "N/A";
    const setor = setoresMap.get(grade.setor_id) || "N/A";
    const tipo = especialidadesMap.get(grade.especialidade_id) || "N/A";

    const config = (grade.configuracao as any) || {};
    const horarioInicial = grade.horario_inicial || 7;

    // Se não há configuração de slots, criar entrada básica
    if (!config.slotsByDay && !config.slots) {
      reportItems.push({
        hospital,
        setor,
        tipo,
        nome_grade: grade.nome,
        semana: "Semana 1",
        dia_semana: "Não configurado",
        hora_inicio: `${String(horarioInicial).padStart(2, "0")}:00`,
        hora_fim: "Não configurado",
        duracao: "Não configurado",
        periodo: "Não configurado",
        nome_medico: "Não atribuído",
      });
      return;
    }

    // Processar slotsByDay (estrutura por linha/dia)
    if (config.slotsByDay) {
      Object.keys(config.slotsByDay).forEach((lineIndex) => {
        const semanaNum = parseInt(lineIndex) + 1;
        const semana = `Semana ${semanaNum}`;
        const slotsForLine = config.slotsByDay[lineIndex];

        Object.keys(slotsForLine).forEach((dayIndex) => {
          const slots = slotsForLine[dayIndex] || [];
          const diaSemana = diasSemana[parseInt(dayIndex)] || `Dia ${dayIndex}`;

          if (slots.length > 0) {
            slots.forEach((slot: any, slotIndex: number) => {
              const startHour =
                slot.startHour !== undefined
                  ? slot.startHour
                  : horarioInicial + slotIndex;
              const endHour =
                slot.endHour !== undefined ? slot.endHour : startHour + 1;

              const horaInicio = formatTime(startHour);
              const horaFim = formatTime(endHour);

              // Usar o script existente para detectar período
              const periodoInfo = detectarPeriodo(
                Math.floor(startHour),
                Math.floor(endHour)
              );
              const duracao = slot.duration || `${periodoInfo.duracao}h`;

              // Buscar médico atribuído (cadastrado ou pré-cadastrado)
              let medicoNome = "Não atribuído";
              if (
                slot.assignedVagas &&
                Array.isArray(slot.assignedVagas) &&
                slot.assignedVagas.length > 0
              ) {
                const vaga = slot.assignedVagas[0];
                const medicoId = vaga?.medicoId || vaga?.medicoPrecadastroId;
                console.log(
                  `        Mapeando médico: ID=${medicoId}, tem no mapa=${medicosMap.has(
                    medicoId
                  )}`
                );
                if (medicoId && medicosMap.has(medicoId)) {
                  medicoNome = medicosMap.get(medicoId);
                  console.log(`        Médico encontrado: ${medicoNome}`);
                } else if (medicoId) {
                  console.log(
                    `        Médico não encontrado para ID: ${medicoId}`
                  );
                  console.log(
                    `        IDs disponíveis no mapa:`,
                    Array.from(medicosMap.keys())
                  );
                } else {
                  console.log(`        Nenhum ID de médico na vaga:`, vaga);
                }
              } else {
                console.log(
                  `        Slot não tem vagas atribuídas ou vagas inválidas`
                );
              }

              reportItems.push({
                hospital,
                setor,
                tipo,
                nome_grade: grade.nome,
                semana,
                dia_semana: diaSemana,
                hora_inicio: horaInicio,
                hora_fim: horaFim,
                duracao: duracao,
                periodo: periodoInfo.periodo,
                nome_medico: medicoNome,
              });
            });
          }
        });
      });
    }

    // Processar slots simples (compatibilidade)
    if (config.slots && Array.isArray(config.slots)) {
      config.slots.forEach((slot: any, index: number) => {
        const startHour =
          slot.startHour !== undefined
            ? slot.startHour
            : horarioInicial + index;
        const endHour =
          slot.endHour !== undefined ? slot.endHour : startHour + 1;

        const horaInicio = formatTime(startHour);
        const horaFim = formatTime(endHour);

        // Usar o script existente para detectar período
        const periodoInfo = detectarPeriodo(
          Math.floor(startHour),
          Math.floor(endHour)
        );

        // Buscar médico atribuído (cadastrado ou pré-cadastrado)
        let medicoNome = "Não atribuído";
        if (
          slot.assignedVagas &&
          Array.isArray(slot.assignedVagas) &&
          slot.assignedVagas.length > 0
        ) {
          const vaga = slot.assignedVagas[0];
          const medicoId = vaga?.medicoId || vaga?.medicoPrecadastroId;
          console.log(
            `      Mapeando médico (slot simples): ID=${medicoId}, tem no mapa=${medicosMap.has(
              medicoId
            )}`
          );
          if (medicoId && medicosMap.has(medicoId)) {
            medicoNome = medicosMap.get(medicoId);
            console.log(`      Médico encontrado: ${medicoNome}`);
          } else if (medicoId) {
            console.log(`      Médico não encontrado para ID: ${medicoId}`);
            console.log(
              `      IDs disponíveis no mapa:`,
              Array.from(medicosMap.keys())
            );
          } else {
            console.log(`      Nenhum ID de médico na vaga:`, vaga);
          }
        } else {
          console.log(`      Slot não tem vagas atribuídas ou vagas inválidas`);
        }

        reportItems.push({
          hospital,
          setor,
          tipo,
          nome_grade: grade.nome,
          semana: "Semana Padrão",
          dia_semana: slot.dayOfWeek
            ? diasSemana[slot.dayOfWeek]
            : "Todos os dias",
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          duracao: slot.duration || `${periodoInfo.duracao}h`,
          periodo: periodoInfo.periodo,
          nome_medico: medicoNome,
        });
      });
    }
  });

  console.log("Relatório de grades gerado:");
  console.log(`- Total de itens: ${reportItems.length}`);
  console.log(`- Médicos mapeados: ${medicosMap.size}`);
  console.log(
    `- Itens com médicos atribuídos: ${
      reportItems.filter((item) => item.nome_medico !== "Não atribuído").length
    }`
  );
  console.log(
    "- Resumo dos médicos encontrados:",
    Array.from(medicosMap.entries())
  );

  return reportItems;
}

export async function exportGradesReportToExcel(
  data: GradeReportItem[]
): Promise<Blob> {
  const exportData = data.map((item) => ({
    Hospital: item.hospital,
    Setor: item.setor,
    "Tipo/Especialidade": item.tipo,
    "Nome da Grade": item.nome_grade,
    Semana: item.semana,
    "Dia da Semana": item.dia_semana,
    "Hora Início": item.hora_inicio,
    "Hora Fim": item.hora_fim,
    Duração: item.duracao,
    Período: item.periodo,
    "Nome do Médico": item.nome_medico,
  }));

  // Criar CSV
  const headers = Object.keys(exportData[0] || {});
  const csvContent = [
    headers.join(","),
    ...exportData.map((row) =>
      headers
        .map((header) => {
          const value = (row as any)[header];
          // Escapar valores que contêm vírgulas ou aspas
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  // Adicionar BOM para UTF-8
  const bom = "\uFEFF";
  return new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
}

// Função para buscar hospitais que têm grades
export async function fetchGradesHospitals(): Promise<
  { hospital_id: string; hospital_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=hospitais&source=grades', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Erro ao buscar hospitais:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar setores que têm grades
export async function fetchGradesSectors(): Promise<
  { setor_id: string; setor_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=setores&source=grades', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Erro ao buscar setores:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar especialidades que têm grades
export async function fetchGradesSpecialties(): Promise<
  { especialidade_id: string; especialidade_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=especialidades&source=grades', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Erro ao buscar especialidades:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

// Função para buscar grupos que têm grades
export async function fetchGradesGroups(): Promise<
  { grupo_id: string; grupo_nome: string }[]
> {
  const response = await fetch('/api/relatorios/filtros?tipo=grupos&source=grades', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Erro ao buscar grupos:', error);
    return [];
  }

  const { data } = await response.json();
  return data || [];
}

export async function exportEscalistaProductivityToExcel(
  data: EscalistaProductivity[]
): Promise<Blob> {
  const exportData: any[] = [];

  // Criar mapa de UUIDs para nomes (apenas UUIDs válidos)
  const uniqueUuids = Array.from(
    new Set(
      data
        .map((item) => item.escalista_nome)
        .filter((uuid) => uuid && isValidUUID(uuid))
    )
  );
  const escalataNomes: Record<string, string> = {};

  await Promise.all(
    uniqueUuids.map(async (uuid) => {
      const nome = await getEscalistaNome(uuid);
      if (nome) {
        escalataNomes[uuid] = nome;
      }
    })
  );

  // Filtrar apenas escalistas que têm nome válido
  data
    .filter((escalista) => escalataNomes[escalista.escalista_nome])
    .forEach((escalista) => {
      escalista.candidaturas.forEach((candidatura) => {
        const formatDate = (dateString: string) => {
          try {
            return new Date(dateString).toLocaleDateString("pt-BR");
          } catch {
            return dateString;
          }
        };

        const formatDateTime = (dateTimeString: string) => {
          try {
            return new Date(dateTimeString).toLocaleString("pt-BR");
          } catch {
            return dateTimeString;
          }
        };

        exportData.push({
          "Escalista que Aprovou": escalataNomes[escalista.escalista_nome],
          "Data da Aprovação": formatDateTime(
            candidatura.candidatura_updatedat ||
              candidatura.candidatura_createdate
          ),
          "Data da Vaga": formatDate(candidatura.vaga_data),
          "Médico Aprovado": candidatura.medico_nome,
          Grade: candidatura.grade_nome,
          Hospital: candidatura.hospital_nome,
          Especialidade: candidatura.especialidade_nome,
          Setor: candidatura.setor_nome,
          "Horário Início": candidatura.vaga_horainicio,
          "Horário Fim": candidatura.vaga_horafim,
          "Total de Candidaturas na Vaga": candidatura.total_candidaturas,
        });
      });
    });

  // Criar CSV
  const headers = Object.keys(exportData[0] || {});
  const csvContent = [
    headers.join(","),
    ...exportData.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escapar valores que contêm vírgulas ou aspas
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  // Adicionar BOM para UTF-8
  const bom = "\uFEFF";
  return new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
}

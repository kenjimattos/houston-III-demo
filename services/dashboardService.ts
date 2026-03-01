/**
 * Dashboard Service - Refatorado para usar API routes
 *
 * ✅ MIGRADO: Todas as queries agora passam por /api/vw-vagas-candidaturas
 * - Autenticação via JWT (backend)
 * - Filtro por grupo_ids (backend security)
 * - Performance otimizada (sem RLS complexo)
 */

// Interface para métricas globais do dashboard
export interface DashboardMetrics {
  totalVagas: number;
  vagasAbertas: number;
  vagasFechadas: number;
  vagasUrgentes: number;
  taxaPreenchimento: number;
  candidaturasPendentes: number;
  tempoMedioPreenchimento: number;
  tendenciaVagas: "up" | "down" | "stable";
  tendenciaCandidaturas: "up" | "down" | "stable";
  folhaPagamentoTotal: number;
  riscoOperacional: number;
}

// Interface para dados dos hospitais
export interface HospitalData {
  id: string;
  name: string;
  openJobs: number;
  filledJobs: number;
  totalJobs: number;
  candidates: number;
  pendingCandidates: number;
  urgentJobs: number;
}

// Interface para os filtros do dashboard
export interface DashboardFilters {
  hospitalIds?: string[];
  especialidadeIds?: string[];
  setorIds?: string[];
  periodos?: string[];
  statuses?: string[];
  selectedMonth?: string;
}

/**
 * Helper function to call vw_vagas_candidaturas API route
 * IMPORTANTE: Sempre use esta função ao invés de query direta ao Supabase
 * para garantir filtros de grupo_id (backend security)
 */
async function fetchFromViewAPI(params?: {
  hospital_id?: string;
  setor_id?: string;
  especialidade_id?: string;
  status?: string;
  mes?: string;
  medico_id?: string;
  order?: string;
  ascending?: boolean;
  data_inicio?: string;
  data_fim?: string;
  select?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.hospital_id) searchParams.set('hospital_id', params.hospital_id);
  if (params?.setor_id) searchParams.set('setor_id', params.setor_id);
  if (params?.especialidade_id) searchParams.set('especialidade_id', params.especialidade_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.mes) searchParams.set('mes', params.mes);
  if (params?.medico_id) searchParams.set('medico_id', params.medico_id);
  if (params?.order) searchParams.set('order', params.order);
  if (params?.ascending !== undefined) searchParams.set('ascending', String(params.ascending));
  if (params?.data_inicio) searchParams.set('data_inicio', params.data_inicio);
  if (params?.data_fim) searchParams.set('data_fim', params.data_fim);
  if (params?.select) searchParams.set('select', params.select);

  const url = `/api/vw-vagas-candidaturas${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Importante: envia JWT cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar dados da view');
  }

  const { data } = await response.json();
  return data;
}

// Função para calcular tempo médio de fechamento de vagas
export async function calculateAverageClosingTime(): Promise<number> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    const data = await fetchFromViewAPI({
      status: 'fechada',
      select: 'vaga_id, vaga_createdate, candidatura_createdate, vaga_status, candidatura_status'
    });

    if (!data || data.length === 0) {
      // No data found for time calculation
      return 0;
    }

    // Processing raw data for time calculation

    // Filtrar dados válidos e remover duplicados por vaga_id - filtragem completa no cliente
    // Note: data comes from vw_vagas_candidaturas which has flattened structure
    const dadosValidos = data.filter((item: any) => {
      // Verificar se os campos não são null, undefined ou string "null"
      const vagaCreateValid = item.vaga_createdate &&
        item.vaga_createdate !== 'null' &&
        item.vaga_createdate !== null &&
        typeof item.vaga_createdate === 'string' &&
        item.vaga_createdate.trim() !== ''
      const candidatoCreateValid = item.candidatura_createdate &&
        item.candidatura_createdate !== 'null' &&
        item.candidatura_createdate !== null &&
        typeof item.candidatura_createdate === 'string' &&
        item.candidatura_createdate.trim() !== ''

      return vagaCreateValid && candidatoCreateValid
    })

    // Valid data after filter

    if (dadosValidos.length === 0) {
      // No valid data found after filters
      return 0;
    }

    // Remover duplicados por vaga_id
    const vagasUnicas = dadosValidos.reduce((acc: any[], curr: any) => {
      if (!acc.find(v => v.vaga_id === curr.vaga_id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    // Unique positions for calculation

    const temposFechamento = vagasUnicas.map((vaga: any) => {
      try {
        const dataCriacao = new Date(vaga.vaga_createdate)
        const dataFechamento = new Date(vaga.candidatura_createdate)

        // Verificar se as datas são válidas
        if (isNaN(dataCriacao.getTime()) || isNaN(dataFechamento.getTime())) {
          // Invalid date found, skipping...
          return null
        }

        // Calcular diferença em horas
        const diferencaMs = dataFechamento.getTime() - dataCriacao.getTime()
        const diferencaHoras = diferencaMs / (1000 * 60 * 60)

        return diferencaHoras
      } catch (error) {
        // Error processing dates, skipping...
        return null
      }
    }).filter((tempo: number | null) => tempo !== null && tempo > 0) as number[] // Filtrar tempos válidos e garantir tipo

    // Calculated closing times

    if (temposFechamento.length === 0) {
      // No valid time calculated
      return 0;
    }

    // Calcular média
    const soma = temposFechamento.reduce((acc: number, tempo: number) => acc + tempo, 0)
    const media = soma / temposFechamento.length

    // Average time calculated
    return Math.round(media);
  } catch (error) {
    console.error("Erro detalhado no calculateAverageClosingTime:", error);
    return 0;
  }
}

// Função para buscar métricas globais do dashboard
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return fetchDashboardMetricsWithFilters();
}

// Função para buscar métricas globais do dashboard com filtros
export async function fetchDashboardMetricsWithFilters(filters?: DashboardFilters): Promise<DashboardMetrics> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    // NOTA: API route não suporta filtros de array (in), então precisamos fazer no cliente
    // Mas o filtro de grupo_id já é aplicado no backend (security)

    let apiParams: any = {
      select: 'vaga_id, vaga_status, candidatura_status, vaga_data, vaga_valor, hospital_id, especialidade_id, setor_id, periodo_id'
    };

    // Filtro de mês (backend - mais eficiente)
    if (filters?.selectedMonth) {
      const [ano, mes] = filters.selectedMonth.split("-");
      const primeiroDia = `${ano}-${mes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
      const ultimoDiaStr = `${ano}-${mes}-${ultimoDia.toString().padStart(2, '0')}`

      apiParams.data_inicio = primeiroDia;
      apiParams.data_fim = ultimoDiaStr;
    }

    const data = await fetchFromViewAPI(apiParams);

    if (!data) return getDefaultMetrics();

    // Aplicar filtros de array no cliente (após buscar do backend)
    let filteredData = data;

    if (filters?.hospitalIds && filters.hospitalIds.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.hospitalIds!.includes(item.hospital_id)
      );
    }

    if (filters?.especialidadeIds && filters.especialidadeIds.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.especialidadeIds!.includes(item.especialidade_id)
      );
    }

    if (filters?.setorIds && filters.setorIds.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.setorIds!.includes(item.setor_id)
      );
    }

    if (filters?.periodos && filters.periodos.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.periodos!.includes(item.periodo_id)
      );
    }

    if (filters?.statuses && filters.statuses.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.statuses!.includes(item.vaga_status)
      );
    }

    // Remover duplicados por vaga_id para contar vagas únicas
    const vagasUnicas = filteredData.reduce((acc: any[], curr: any) => {
      if (!acc.find((v: any) => v.vaga_id === curr.vaga_id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    const totalVagas = vagasUnicas.length
    const vagasAbertas = vagasUnicas.filter((v: any) => v.vaga_status === 'aberta').length
    const vagasFechadas = vagasUnicas.filter((v: any) => v.vaga_status === 'fechada').length

    // Vagas urgentes: vagas abertas com data nos próximos 2 dias (apenas futuras)
    const hoje = new Date()
    const hojeStr = hoje.toISOString().split('T')[0]
    const doisDias = new Date()
    doisDias.setDate(doisDias.getDate() + 2)
    const doisDiasStr = doisDias.toISOString().split('T')[0]

    const vagasUrgentes = vagasUnicas.filter((v: any) =>
      v.vaga_status === 'aberta' &&
      v.vaga_data >= hojeStr &&
      v.vaga_data <= doisDiasStr
    ).length

    // Candidaturas pendentes: candidaturas com status PENDENTE
    const candidaturasPendentes = filteredData.filter((c: any) =>
      c.candidatura_status === 'PENDENTE'
    ).length

    // Taxa de preenchimento
    const taxaPreenchimento = totalVagas > 0 ? Math.round((vagasFechadas / totalVagas) * 100) : 0

    // Calcular tempo médio de preenchimento com filtros
    const tempoMedioPreenchimento = await calculateAverageClosingTimeWithFilters(filters)

    // Calcular tendências com filtros
    const { tendenciaVagas, tendenciaCandidaturas } = await calculateTrendsWithFilters(filters)

    // Calcular folha de pagamento total (soma dos valores de todas as vagas no período)
    const folhaPagamentoTotal = vagasUnicas.reduce((total: number, vaga: any) => {
      const valor = parseFloat(vaga.vaga_valor) || 0
      return total + valor
    }, 0)

    // Calcular risco operacional (valor total das vagas abertas)
    const riscoOperacional = vagasUnicas
      .filter((vaga: any) => vaga.vaga_status === 'aberta')
      .reduce((total: number, vaga: any) => {
        const valor = parseFloat(vaga.vaga_valor) || 0
        return total + valor
      }, 0)

    const resultado = {
      totalVagas,
      vagasAbertas,
      vagasFechadas,
      vagasUrgentes,
      taxaPreenchimento,
      candidaturasPendentes,
      tempoMedioPreenchimento,
      tendenciaVagas,
      tendenciaCandidaturas,
      folhaPagamentoTotal,
      riscoOperacional
    }

    return resultado
  } catch (error) {
    console.error("Erro detalhado no fetchDashboardMetricsWithFilters:", error);
    return getDefaultMetrics();
  }
}

// Função para calcular tempo médio com filtros
async function calculateAverageClosingTimeWithFilters(filters?: DashboardFilters): Promise<number> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    let apiParams: any = {
      status: 'fechada',
      select: 'vaga_id, vaga_createdate, candidatura_createdate, hospital_id, especialidade_id, setor_id, periodo_id, vaga_status'
    };

    // Filtro de mês (backend)
    if (filters?.selectedMonth) {
      const [ano, mes] = filters.selectedMonth.split("-");
      const primeiroDia = `${ano}-${mes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
      const ultimoDiaStr = `${ano}-${mes}-${ultimoDia.toString().padStart(2, '0')}`

      apiParams.data_inicio = primeiroDia;
      apiParams.data_fim = ultimoDiaStr;
    }

    let data = await fetchFromViewAPI(apiParams);

    if (!data || data.length === 0) {
      return 0;
    }

    // Aplicar filtros de array no cliente
    if (filters?.hospitalIds && filters.hospitalIds.length > 0) {
      data = data.filter((item: any) => filters.hospitalIds!.includes(item.hospital_id));
    }

    if (filters?.especialidadeIds && filters.especialidadeIds.length > 0) {
      data = data.filter((item: any) => filters.especialidadeIds!.includes(item.especialidade_id));
    }

    if (filters?.setorIds && filters.setorIds.length > 0) {
      data = data.filter((item: any) => filters.setorIds!.includes(item.setor_id));
    }

    if (filters?.periodos && filters.periodos.length > 0) {
      data = data.filter((item: any) => filters.periodos!.includes(item.periodo_id));
    }

    if (data.length === 0) {
      return 0;
    }

    // Filtrar dados válidos no lado do cliente
    const dadosValidos = data.filter((item: any) =>
      item.vaga_createdate &&
      item.candidatura_createdate &&
      item.vaga_createdate !== "" &&
      item.candidatura_createdate !== "" &&
      item.vaga_createdate !== "null" &&
      item.candidatura_createdate !== "null" &&
      item.vaga_createdate !== null &&
      item.candidatura_createdate !== null &&
      typeof item.vaga_createdate === 'string' &&
      typeof item.candidatura_createdate === 'string' &&
      item.vaga_createdate.trim() !== '' &&
      item.candidatura_createdate.trim() !== ''
    )

    if (dadosValidos.length === 0) {
      return 0;
    }

    // Remover duplicados por vaga_id
    const vagasUnicas = dadosValidos.reduce((acc: any[], curr: any) => {
      if (!acc.find(v => v.vaga_id === curr.vaga_id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    const temposFechamento = vagasUnicas.map((vaga: any) => {
      try {
        const dataCriacao = new Date(vaga.vaga_createdate)
        const dataFechamento = new Date(vaga.candidatura_createdate)

        // Verificar se as datas são válidas
        if (isNaN(dataCriacao.getTime()) || isNaN(dataFechamento.getTime())) {
          return null
        }

        // Calcular diferença em horas
        const diferencaMs = dataFechamento.getTime() - dataCriacao.getTime()
        const diferencaHoras = diferencaMs / (1000 * 60 * 60)

        return diferencaHoras
      } catch (error) {
        return null
      }
    }).filter((tempo: number | null) => tempo !== null && tempo > 0) as number[]

    if (temposFechamento.length === 0) {
      return 0;
    }

    // Calcular média
    const soma = temposFechamento.reduce((acc: number, tempo: number) => acc + tempo, 0)
    const media = soma / temposFechamento.length

    return Math.round(media)
  } catch (error) {
    console.error("Erro no calculateAverageClosingTimeWithFilters:", error);
    return 0;
  }
}

// Função para calcular tendências com filtros
async function calculateTrendsWithFilters(filters?: DashboardFilters): Promise<{
  tendenciaVagas: "up" | "down" | "stable";
  tendenciaCandidaturas: "up" | "down" | "stable";
}> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    const hoje = new Date()
    const umMesAtras = new Date(hoje)
    umMesAtras.setMonth(umMesAtras.getMonth() - 1)
    const doisMesesAtras = new Date(hoje)
    doisMesesAtras.setMonth(doisMesesAtras.getMonth() - 2)

    const hojeStr = hoje.toISOString().split('T')[0]
    const umMesAtrasStr = umMesAtras.toISOString().split('T')[0]
    const doisMesesAtrasStr = doisMesesAtras.toISOString().split('T')[0]

    // Buscar dados do mês atual e mês anterior em paralelo
    const [mesAtualData, mesAnteriorData] = await Promise.all([
      fetchFromViewAPI({
        data_inicio: umMesAtrasStr,
        data_fim: hojeStr,
        select: 'vaga_id, candidatura_status, hospital_id, especialidade_id, setor_id, periodo_id'
      }),
      fetchFromViewAPI({
        data_inicio: doisMesesAtrasStr,
        data_fim: umMesAtrasStr,
        select: 'vaga_id, candidatura_status, hospital_id, especialidade_id, setor_id, periodo_id'
      })
    ]);

    if (!mesAtualData || !mesAnteriorData) {
      return { tendenciaVagas: "stable", tendenciaCandidaturas: "stable" };
    }

    // Aplicar filtros de array no cliente
    let filteredAtual = mesAtualData;
    let filteredAnterior = mesAnteriorData;

    if (filters?.hospitalIds && filters.hospitalIds.length > 0) {
      filteredAtual = filteredAtual.filter((item: any) => filters.hospitalIds!.includes(item.hospital_id));
      filteredAnterior = filteredAnterior.filter((item: any) => filters.hospitalIds!.includes(item.hospital_id));
    }

    if (filters?.especialidadeIds && filters.especialidadeIds.length > 0) {
      filteredAtual = filteredAtual.filter((item: any) => filters.especialidadeIds!.includes(item.especialidade_id));
      filteredAnterior = filteredAnterior.filter((item: any) => filters.especialidadeIds!.includes(item.especialidade_id));
    }

    if (filters?.setorIds && filters.setorIds.length > 0) {
      filteredAtual = filteredAtual.filter((item: any) => filters.setorIds!.includes(item.setor_id));
      filteredAnterior = filteredAnterior.filter((item: any) => filters.setorIds!.includes(item.setor_id));
    }

    if (filters?.periodos && filters.periodos.length > 0) {
      filteredAtual = filteredAtual.filter((item: any) => filters.periodos!.includes(item.periodo_id));
      filteredAnterior = filteredAnterior.filter((item: any) => filters.periodos!.includes(item.periodo_id));
    }

    // Contar vagas únicas por período
    const vagasAtual = new Set(filteredAtual.map((item: any) => item.vaga_id) || []).size
    const vagasAnterior = new Set(filteredAnterior.map((item: any) => item.vaga_id) || []).size

    // Contar candidaturas por período
    const candidaturasAtual = filteredAtual.length || 0
    const candidaturasAnterior = filteredAnterior.length || 0

    // Calcular tendências
    const tendenciaVagas: "up" | "down" | "stable" =
      vagasAtual > vagasAnterior ? "up" :
        vagasAtual < vagasAnterior ? "down" : "stable"

    const tendenciaCandidaturas: "up" | "down" | "stable" =
      candidaturasAtual > candidaturasAnterior ? "up" :
        candidaturasAtual < candidaturasAnterior ? "down" : "stable"

    return { tendenciaVagas, tendenciaCandidaturas }
  } catch (error) {
    console.error("Erro ao calcular tendências:", error);
    return { tendenciaVagas: "stable", tendenciaCandidaturas: "stable" };
  }
}

// Função para buscar dados dos hospitais
export async function fetchHospitalData(): Promise<HospitalData[]> {
  return fetchHospitalDataWithGlobalFilter();
}

// Função para buscar dados dos hospitais com filtro global
export async function fetchHospitalDataWithGlobalFilter(selectedMonth?: string): Promise<HospitalData[]> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    let apiParams: any = {
      select: 'hospital_id, hospital_nome, vaga_id, vaga_status, candidatura_status, medico_id, vaga_data'
    };

    // Aplicar filtro de mês se fornecido
    if (selectedMonth) {
      const [ano, mes] = selectedMonth.split('-')
      const primeiroDia = `${ano}-${mes}-01`
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
      const ultimoDiaStr = `${ano}-${mes}-${ultimoDia.toString().padStart(2, '0')}`

      apiParams.data_inicio = primeiroDia;
      apiParams.data_fim = ultimoDiaStr;
    }

    const data = await fetchFromViewAPI(apiParams);

    if (!data) return []

    // Filtrar registros com hospital_nome válido
    const validData = data.filter((item: any) => item.hospital_nome && item.hospital_nome !== null);

    // Agrupar dados por hospital
    const hospitaisMap = validData.reduce((acc: Record<string, any>, item: any) => {
      const hospitalId = item.hospital_id

      if (!acc[hospitalId]) {
        acc[hospitalId] = {
          id: hospitalId,
          name: item.hospital_nome,
          vagas: new Set(),
          vagasAbertas: new Set(),
          vagasFechadas: new Set(),
          vagasUrgentes: new Set(),
          candidatos: new Set(),
          candidaturasPendentes: new Set(),
        };
      }

      // Adicionar vaga única
      acc[hospitalId].vagas.add(item.vaga_id)

      // Contar por status
      if (item.vaga_status === 'aberta') {
        acc[hospitalId].vagasAbertas.add(item.vaga_id)

        // Verificar se é urgente (data nos próximos 2 dias, apenas futuras)
        const hoje = new Date()
        const hojeStr = hoje.toISOString().split('T')[0]
        const doisDias = new Date()
        doisDias.setDate(doisDias.getDate() + 2)
        const doisDiasStr = doisDias.toISOString().split('T')[0]

        if (item.vaga_data >= hojeStr && item.vaga_data <= doisDiasStr) {
          acc[hospitalId].vagasUrgentes.add(item.vaga_id)
        }
      } else if (item.vaga_status === 'fechada') {
        acc[hospitalId].vagasFechadas.add(item.vaga_id)
      }

      // Contar candidatos únicos
      if (item.medico_id) {
        acc[hospitalId].candidatos.add(item.medico_id)

        if (item.candidatura_status === 'PENDENTE') {
          acc[hospitalId].candidaturasPendentes.add(item.medico_id)
        }
      }

      return acc
    }, {})

    // Converter para array e formatar dados - filtrar apenas hospitais com mais de 1 vaga
    return Object.values(hospitaisMap)
      .map((hospital: any) => ({
        id: hospital.id,
        name: hospital.name,
        openJobs: hospital.vagasAbertas.size,
        filledJobs: hospital.vagasFechadas.size,
        totalJobs: hospital.vagas.size,
        candidates: hospital.candidatos.size,
        pendingCandidates: hospital.candidaturasPendentes.size,
        urgentJobs: hospital.vagasUrgentes.size,
      }))
      .filter((hospital) => hospital.totalJobs > 1) // Apenas hospitais com mais de 1 vaga
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } catch (error) {
    console.error("Erro detalhado no fetchHospitalData:", error);
    return [];
  }
}

// Função para buscar hospitais únicos (para filtros)
export async function fetchDashboardHospitals(): Promise<{ hospital_id: string, hospital_nome: string }[]> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    const data = await fetchFromViewAPI({
      select: 'hospital_id, hospital_nome'
    });

    if (!data) return [];

    // Filtrar registros com hospital_nome válido e remover duplicados
    const unicos = (data || [])
      .filter((item: any) => item.hospital_nome && item.hospital_nome !== null)
      .reduce((acc: any[], curr: any) => {
        if (!acc.find((h: any) => h.hospital_id === curr.hospital_id)) {
          acc.push(curr);
        }
        return acc
      }, [])

    return unicos.sort((a: any, b: any) => a.hospital_nome.localeCompare(b.hospital_nome, 'pt-BR'))
  } catch (error) {
    console.error("Erro detalhado no fetchDashboardHospitals:", error);
    return [];
  }
}

// Função para buscar dados dos hospitais com filtros
export async function fetchHospitalDataWithFilters(
  hospitalId: string,
  periodo?: string,
  setor?: string,
  selectedMonth?: string
): Promise<HospitalData> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    let apiParams: any = {
      hospital_id: hospitalId,
      select: 'hospital_id, hospital_nome, vaga_id, vaga_status, candidatura_status, medico_id, vaga_data, periodo_id, setor_id, setor_nome'
    };

    // Filtros opcionais
    if (periodo && periodo !== 'todos') {
      // NOTA: API route não suporta periodo_id via param, filtrar no cliente
    }

    if (setor && setor !== 'todos') {
      apiParams.setor_id = setor;
    }

    if (selectedMonth) {
      const [ano, mes] = selectedMonth.split("-");
      const primeiroDia = `${ano}-${mes}-01`;
      const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
      const ultimoDiaStr = `${ano}-${mes}-${ultimoDia.toString().padStart(2, '0')}`

      apiParams.data_inicio = primeiroDia;
      apiParams.data_fim = ultimoDiaStr;
    }

    let data = await fetchFromViewAPI(apiParams);

    // Aplicar filtro de período no cliente (se necessário)
    if (periodo && periodo !== 'todos' && data) {
      data = data.filter((item: any) => item.periodo_id === periodo);
    }

    // Filtrar registros com hospital_nome válido
    if (data) {
      data = data.filter((item: any) => item.hospital_nome && item.hospital_nome !== null);
    }

    if (!data || data.length === 0) {
      return {
        id: hospitalId,
        name: "Hospital não encontrado",
        openJobs: 0,
        filledJobs: 0,
        totalJobs: 0,
        candidates: 0,
        pendingCandidates: 0,
        urgentJobs: 0,
      };
    }

    // Processar dados do hospital
    const hospital = {
      id: hospitalId,
      name: data[0].hospital_nome,
      vagas: new Set(),
      vagasAbertas: new Set(),
      vagasFechadas: new Set(),
      vagasUrgentes: new Set(),
      candidatos: new Set(),
      candidaturasPendentes: new Set()
    }

    data.forEach((item: any) => {
      // Adicionar vaga única
      hospital.vagas.add(item.vaga_id)

      // Contar por status
      if (item.vaga_status === 'aberta') {
        hospital.vagasAbertas.add(item.vaga_id)

        // Verificar se é urgente (data nos próximos 2 dias, apenas futuras)
        const hoje = new Date()
        const hojeStr = hoje.toISOString().split('T')[0]
        const doisDias = new Date()
        doisDias.setDate(doisDias.getDate() + 2)
        const doisDiasStr = doisDias.toISOString().split('T')[0]

        if (item.vaga_data >= hojeStr && item.vaga_data <= doisDiasStr) {
          hospital.vagasUrgentes.add(item.vaga_id)
        }
      } else if (item.vaga_status === 'fechada') {
        hospital.vagasFechadas.add(item.vaga_id)
      }

      // Contar candidatos únicos
      if (item.medico_id) {
        hospital.candidatos.add(item.medico_id)

        if (item.candidatura_status === 'PENDENTE') {
          hospital.candidaturasPendentes.add(item.medico_id)
        }
      }
    })

    return {
      id: hospital.id,
      name: hospital.name,
      openJobs: hospital.vagasAbertas.size,
      filledJobs: hospital.vagasFechadas.size,
      totalJobs: hospital.vagas.size,
      candidates: hospital.candidatos.size,
      pendingCandidates: hospital.candidaturasPendentes.size,
      urgentJobs: hospital.vagasUrgentes.size,
    };
  } catch (error) {
    console.error("Erro detalhado no fetchHospitalDataWithFilters:", error);
    return {
      id: hospitalId,
      name: "Erro ao carregar",
      openJobs: 0,
      filledJobs: 0,
      totalJobs: 0,
      candidates: 0,
      pendingCandidates: 0,
      urgentJobs: 0,
    };
  }
}

// Função auxiliar para retornar métricas padrão em caso de erro
function getDefaultMetrics(): DashboardMetrics {
  return {
    totalVagas: 0,
    vagasAbertas: 0,
    vagasFechadas: 0,
    vagasUrgentes: 0,
    taxaPreenchimento: 0,
    candidaturasPendentes: 0,
    tempoMedioPreenchimento: 0,
    tendenciaVagas: "stable",
    tendenciaCandidaturas: "stable",
    folhaPagamentoTotal: 0,
    riscoOperacional: 0,
  };
}

// Função para buscar períodos disponíveis
export async function fetchPeriodos(): Promise<Array<{ value: string, label: string }>> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    const data = await fetchFromViewAPI({
      select: 'periodo_id, periodo_nome'
    });

    if (!data) return [];

    // Filtrar registros com periodo_nome válido e remover duplicados
    const unicos = (data || [])
      .filter((item: any) => item.periodo_nome && item.periodo_nome !== null)
      .reduce((acc: any[], curr: any) => {
        if (!acc.find((p: any) => p.periodo_id === curr.periodo_id)) {
          acc.push(curr)
        }
        return acc
      }, [])

    // Mapear para formato esperado
    return unicos.map((item: any) => ({
      value: item.periodo_id,
      label: item.periodo_nome
    })).sort((a: any, b: any) => a.label.localeCompare(b.label, 'pt-BR'))
  } catch (error) {
    console.error("Erro ao buscar períodos:", error);
    return [];
  }
}

// Função para buscar setores disponíveis
export async function fetchSetores(): Promise<Array<{ value: string, label: string }>> {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    const data = await fetchFromViewAPI({
      select: 'setor_id, setor_nome'
    });

    if (!data) return [];

    // Filtrar registros com setor_nome válido e remover duplicados
    const unicos = (data || [])
      .filter((item: any) => item.setor_nome && item.setor_nome !== null)
      .reduce((acc: any[], curr: any) => {
        if (!acc.find((s: any) => s.setor_id === curr.setor_id)) {
          acc.push(curr);
        }
        return acc
      }, [])

    // Mapear para formato esperado
    return unicos
      .map((item: any) => ({
        value: item.setor_id,
        label: item.setor_nome,
      }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label, "pt-BR"));
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return [];
  }
}

import { getSupabaseClient } from "@/services/supabaseClient";
import { ShiftsJobsFilter } from "@/types/shifts-jobs-filter";
import {
  ApplicationsResponse,
  ShiftsSortField,
  SortDirection,
  VagasCandidaturasResponse,
} from "@/types/vagas-candidaturas";
const supabase = getSupabaseClient();

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
  escalista_id?: string;
  mes?: string;
  medico_id?: string;
  order?: string;
  ascending?: boolean;
  vaga_id?: string;
  vaga_ids?: string[];
  data_inicio?: string;
  data_fim?: string;
  recorrencia_id?: string;
  select?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.hospital_id) searchParams.set('hospital_id', params.hospital_id);
  if (params?.setor_id) searchParams.set('setor_id', params.setor_id);
  if (params?.especialidade_id) searchParams.set('especialidade_id', params.especialidade_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.escalista_id) searchParams.set('escalista_id', params.escalista_id);
  if (params?.mes) searchParams.set('mes', params.mes);
  if (params?.medico_id) searchParams.set('medico_id', params.medico_id);
  if (params?.order) searchParams.set('order', params.order);
  if (params?.ascending !== undefined) searchParams.set('ascending', String(params.ascending));
  if (params?.vaga_id) searchParams.set('vaga_id', params.vaga_id);
  if (params?.vaga_ids) searchParams.set('vaga_ids', params.vaga_ids.join(','));
  if (params?.data_inicio) searchParams.set('data_inicio', params.data_inicio);
  if (params?.data_fim) searchParams.set('data_fim', params.data_fim);
  if (params?.recorrencia_id) searchParams.set('recorrencia_id', params.recorrencia_id);
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

/**
 * Agrupa múltiplas linhas da view por vaga_id
 * A view vw_vagas_candidaturas retorna uma linha por candidatura,
 * então uma vaga com múltiplas candidaturas aparece em múltiplas linhas.
 * Esta função consolida essas linhas em uma única vaga com array de candidaturas.
 *
 * IMPORTANTE: Também estrutura os dados flat da view em objetos aninhados
 * para compatibilidade com componentes que esperam vaga.hospital.hospital_nome
 */
function groupCandidaturasByVaga(rawData: any[]): any[] {
  if (!rawData || rawData.length === 0) return [];

  const vagasMap = new Map();

  rawData.forEach((row) => {
    const vagaId = row.vaga_id;

    if (!vagasMap.has(vagaId)) {
      // Primeira vez vendo esta vaga - criar entrada com objetos aninhados
      vagasMap.set(vagaId, {
        ...row,
        // Criar objetos aninhados para compatibilidade com componentes
        hospital: {
          hospital_id: row.hospital_id,
          hospital_nome: row.hospital_nome
        },
        setor: {
          setor_id: row.setor_id,
          setor_nome: row.setor_nome
        },
        especialidade: {
          especialidade_id: row.especialidade_id,
          especialidade_nome: row.especialidade_nome
        },
        candidaturas: []
      });
    }

    // Adicionar candidatura se existir
    if (row.candidatura_id) {
      const vaga = vagasMap.get(vagaId);

      // Construir nome completo do médico a partir dos campos da view
      const medico_nome = [row.medico_primeiro_nome, row.medico_sobrenome]
        .filter(Boolean)
        .join(' ') || null;

      vaga.candidaturas.push({
        candidatura_id: row.candidatura_id,
        candidatura_status: row.candidatura_status,
        candidatura_createdate: row.candidatura_createdate,
        candidatura_medico_id: row.candidatura_medico_id || row.medico_id,
        medico_nome: medico_nome,
        medico_primeiro_nome: row.medico_primeiro_nome,
        medico_sobrenome: row.medico_sobrenome,
        medico_crm: row.medico_crm,
        medico_celular: row.medico_celular,
        medico_telefone: row.medico_telefone || row.medico_celular,
        medico_email: row.medico_email,
      });
    }
  });

  // Adicionar total_candidaturas a cada vaga
  const result = Array.from(vagasMap.values()).map(vaga => ({
    ...vaga,
    total_candidaturas: vaga.candidaturas.length
  }));

  return result;
}

/**
 * Busca candidaturas de vagas com paginação
 * ✅ MIGRADO: Usa API route com paginação client-side
 *
 * IMPORTANTE: A paginação agora é feita no cliente. A API route retorna
 * todos os dados filtrados e este serviço faz a paginação.
 */
export async function getPaginatedVagasCandidaturas(params: {
  pageNumber?: number;
  pageSize?: number;
  filters?: ShiftsJobsFilter;
  orderBy?: ShiftsSortField;
  sortDirection?: SortDirection;
}): Promise<VagasCandidaturasResponse> {
  const {
    pageNumber = 1,
    pageSize = 100,
    filters = {},
    orderBy = ShiftsSortField.vaga_data,
    sortDirection = SortDirection.ASC
  } = params;

  try {
    // Buscar todos os dados da API route com filtros
    const rawData = await fetchFromViewAPI({
      hospital_id: filters.hospital_ids?.[0], // API route aceita apenas um hospital por vez
      // Nota: API route não tem mapeamento direto para todos os filtros
      // Alguns filtros precisarão ser aplicados no cliente
      data_inicio: filters.start_date || undefined,
      data_fim: filters.end_date || undefined,
      order: orderBy,
      ascending: sortDirection === SortDirection.ASC
    });

    // IMPORTANTE: Agrupar candidaturas por vaga_id
    // A view retorna múltiplas linhas para vagas com múltiplas candidaturas
    const allData = groupCandidaturasByVaga(rawData);

    // Aplicar filtros adicionais no cliente (que a API route não suporta)
    let filteredData = allData || [];

    if (filters.specialty_ids && filters.specialty_ids.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.specialty_ids?.includes(item.especialidade_id)
      );
    }

    if (filters.sector_ids && filters.sector_ids.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.sector_ids?.includes(item.setor_id)
      );
    }

    if (filters.job_status_filter && filters.job_status_filter.length > 0) {
      filteredData = filteredData.filter((item: any) =>
        filters.job_status_filter?.includes(item.vaga_status)
      );
    }

    // Calcular paginação no cliente
    const totalCount = filteredData.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination: {
        current_page: pageNumber,
        total_pages: totalPages,
        total_count: totalCount,
        page_size: pageSize,
        has_next: pageNumber < totalPages,
        next_page: pageNumber < totalPages ? pageNumber + 1 : null,
        has_previous: pageNumber > 1,
        previous_page: pageNumber > 1 ? pageNumber - 1 : null
      }
    };
  } catch (error) {
    console.error('Erro ao buscar vagas paginadas:', error);
    throw error;
  }
}

/**
 * Busca candidaturas de vagas a partir dos parâmetros fornecidos.
 * ✅ MIGRADO: Usa API route ao invés de query direta
 * ✅ AGRUPADO: Consolida múltiplas candidaturas por vaga
 *
 * IMPORTANTE: Se vaga_id for fornecido, retorna apenas o array de candidaturas
 * dessa vaga (sem agrupar), para compatibilidade com modais de candidaturas.
 */
export async function fetchVagasCandidaturas(params?: {
  vaga_id?: string;
  vaga_ids?: string[];
  medico_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  const rawData = await fetchFromViewAPI({
    vaga_id: params?.vaga_id,
    vaga_ids: params?.vaga_ids,
    medico_id: params?.medico_id,
    status: params?.status,
    data_inicio: params?.data_inicio,
    data_fim: params?.data_fim,
  });

  // Sempre agrupar as candidaturas por vaga
  return groupCandidaturasByVaga(rawData);
}

export async function fetchHospitaisDasVagas() {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  const data = await fetchFromViewAPI({
    select: 'hospital_id, hospital_nome'
  });

  // Filtrar registros com hospital_nome válido e deduplicar
  const map = new Map();
  (data || []).forEach((item: any) => {
    if (item.hospital_nome && !map.has(item.hospital_id)) {
      map.set(item.hospital_id, {
        hospital_id: item.hospital_id,
        hospital_nome: item.hospital_nome
      });
    }
  });
  return Array.from(map.values());
}

export async function fetchEspecialidadesDasVagas() {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  const data = await fetchFromViewAPI({
    select: 'especialidade_id, especialidade_nome'
  });

  // Filtrar registros com especialidade_nome válido e deduplicar
  const map = new Map();
  (data || []).forEach((item: any) => {
    if (item.especialidade_nome && !map.has(item.especialidade_id)) {
      map.set(item.especialidade_id, {
        especialidade_id: item.especialidade_id,
        especialidade_nome: item.especialidade_nome
      });
    }
  });
  return Array.from(map.values());
}

export async function fetchSetoresDasVagas() {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  const data = await fetchFromViewAPI({
    select: 'setor_id, setor_nome'
  });

  // Filtrar registros com setor_nome válido e deduplicar
  const map = new Map();
  (data || []).forEach((item: any) => {
    if (item.setor_nome && !map.has(item.setor_id)) {
      map.set(item.setor_id, {
        setor_id: item.setor_id,
        setor_nome: item.setor_nome
      });
    }
  });
  return Array.from(map.values());
}

export async function fetchPeriodosDasVagas() {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  const data = await fetchFromViewAPI({
    select: 'periodo_id, periodo_nome'
  });

  // Filtrar registros com periodo_nome válido e deduplicar
  const map = new Map();
  (data || []).forEach((item: any) => {
    if (item.periodo_nome && !map.has(item.periodo_id)) {
      map.set(item.periodo_id, {
        periodo_id: item.periodo_id,
        periodo_nome: item.periodo_nome
      });
    }
  });
  return Array.from(map.values());
}

export async function fetchVagasPorRecorrencia(recorrencia_id: string) {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  const rawData = await fetchFromViewAPI({
    recorrencia_id
  });

  // Agrupar candidaturas por vaga_id
  return groupCandidaturasByVaga(rawData);
}

export async function fetchMesesDisponiveis() {
  try {
    // ✅ MIGRADO: Usa API route ao invés de query direta
    const data = await fetchFromViewAPI({
      select: 'vaga_data'
    });

    if (!data || data.length === 0) {
      return [];
    }

    // Filtrar apenas registros com vaga_data válidas
    const dadosValidos = data.filter(
      (item: any) =>
        item.vaga_data &&
        item.vaga_data !== null &&
        item.vaga_data !== "null" &&
        item.vaga_data !== ""
    );

    if (dadosValidos.length === 0) {
      return [];
    }

    // Extrair meses únicos do campo vaga_data
    const meses = dadosValidos
      .map((item: any) => {
        try {
          const dataObj = new Date(item.vaga_data);

          // Verificar se a data é válida
          if (isNaN(dataObj.getTime())) {
            return null;
          }

          const ano = dataObj.getFullYear();
          const mes = dataObj.getMonth() + 1; // getMonth() retorna 0-11
          return `${ano}-${mes.toString().padStart(2, "0")}`;
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean) as string[]; // Remove valores null e afirma tipo string

    // Remover duplicados e ordenar
    const mesesUnicos = [...new Set(meses)].sort();

    // Converter para formato amigável
    return mesesUnicos.map((mesAno) => {
      const [ano, mes] = mesAno.split("-");
      const mesesNomes = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      return {
        valor: mesAno,
        nome: `${mesesNomes[parseInt(mes) - 1]} ${ano}`,
      };
    });
  } catch (error) {
    console.error("Erro detalhado em fetchMesesDisponiveis:", error);
    throw error;
  }
}

// Função especializada para a escala com filtros dinâmicos baseados na visualização
export async function fetchVagasCandidaturasParaEscala(params: {
  data_inicio: string;
  data_fim: string;
  filtros?: {
    vaga_id?: string;
    medico_id?: string;
    status?: string;
  };
}) {
  // ✅ MIGRADO: Usa API route ao invés de query direta
  // NOTA: Ordenação múltipla não é suportada pela API atual
  // Ordenamos apenas por vaga_data e depois fazemos sort no cliente se necessário
  const rawData = await fetchFromViewAPI({
    data_inicio: params.data_inicio,
    data_fim: params.data_fim,
    vaga_id: params.filtros?.vaga_id,
    medico_id: params.filtros?.medico_id,
    status: params.filtros?.status,
    order: 'vaga_data',
    ascending: true
  });

  // Agrupar candidaturas por vaga_id
  const groupedData = groupCandidaturasByVaga(rawData);

  // Ordenação secundária por horainicio (no cliente)
  return groupedData.sort((a: any, b: any) => {
    const dataCompare = a.vaga_data?.localeCompare(b.vaga_data || '') || 0;
    if (dataCompare !== 0) return dataCompare;
    return a.vaga_horainicio?.localeCompare(b.vaga_horainicio || '') || 0;
  });
}

// Funções utilitárias para calcular ranges de datas baseados na visualização do calendário
export function calcularRangeCalendario(
  dataAtual: Date,
  visualizacao: "month" | "week"
): { data_inicio: string; data_fim: string } {
  if (visualizacao === "month") {
    // Para visão mensal: primeiro e último dia do mês
    const inicioMes = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      1
    );
    const fimMes = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth() + 1,
      0
    );

    return {
      data_inicio: inicioMes.toISOString().split("T")[0],
      data_fim: fimMes.toISOString().split("T")[0],
    };
  } else {
    // Para visão semanal: domingo da semana atual até sábado
    const diaSemana = dataAtual.getDay(); // 0 = domingo, 6 = sábado
    const inicioSemana = new Date(dataAtual);
    inicioSemana.setDate(dataAtual.getDate() - diaSemana);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    return {
      data_inicio: inicioSemana.toISOString().split("T")[0],
      data_fim: fimSemana.toISOString().split("T")[0],
    };
  }
}

// Função para calcular range expandido (incluindo dias adjacentes para melhor UX)
export function calcularRangeExpandido(
  dataAtual: Date,
  visualizacao: "month" | "week"
): { data_inicio: string; data_fim: string } {
  if (visualizacao === "month") {
    // Para visão mensal: 2 semanas antes e 2 semanas depois para cobrir dias adjacentes
    const inicioMes = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      1
    );
    const fimMes = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth() + 1,
      0
    );

    const inicioExpandido = new Date(inicioMes);
    inicioExpandido.setDate(inicioMes.getDate() - 14);

    const fimExpandido = new Date(fimMes);
    fimExpandido.setDate(fimMes.getDate() + 14);

    return {
      data_inicio: inicioExpandido.toISOString().split("T")[0],
      data_fim: fimExpandido.toISOString().split("T")[0],
    };
  } else {
    // Para visão semanal: 1 semana antes e 1 semana depois
    const diaSemana = dataAtual.getDay();
    const inicioSemana = new Date(dataAtual);
    inicioSemana.setDate(dataAtual.getDate() - diaSemana - 7); // 1 semana a mais

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 20); // 3 semanas (1 antes + atual + 1 depois)

    return {
      data_inicio: inicioSemana.toISOString().split("T")[0],
      data_fim: fimSemana.toISOString().split("T")[0],
    };
  }
}

export async function getPaginatedApplications({
  pageNumber = 1,
  pageSize = 50,
  filters,
  sortDirection,
  orderBy,
}: {
  pageNumber?: number;
  pageSize?: number;
  filters?: ShiftsJobsFilter;
  sortDirection?: SortDirection;
  orderBy?: ShiftsSortField;
}): Promise<ApplicationsResponse> {
  // ✅ MIGRADO: Usa API route para garantir filtro de grupo (backend security)
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(pageNumber));
  searchParams.set("page_size", String(pageSize));

  if (orderBy) searchParams.set("order_by", orderBy);
  if (sortDirection) searchParams.set("order_direction", sortDirection);

  // Filtros
  if (filters?.hospital_ids?.length) {
    searchParams.set("hospital_ids", filters.hospital_ids.join(","));
  }
  if (filters?.specialty_ids?.length) {
    searchParams.set("specialty_ids", filters.specialty_ids.join(","));
  }
  if (filters?.sector_ids?.length) {
    searchParams.set("sector_ids", filters.sector_ids.join(","));
  }
  if (filters?.doctor_ids?.length) {
    searchParams.set("doctor_ids", filters.doctor_ids.join(","));
  }
  if (filters?.application_status_filter?.length) {
    searchParams.set(
      "application_status_filter",
      filters.application_status_filter.join(",")
    );
  }
  if (filters?.start_date) {
    searchParams.set("start_date", filters.start_date);
  }
  if (filters?.end_date) {
    searchParams.set("end_date", filters.end_date);
  }

  const url = `/api/candidaturas/paginated?${searchParams.toString()}`;
  console.log("[getPaginatedApplications] Chamando API:", url);

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Erro ao buscar candidaturas: ${response.status}`
    );
  }

  const result = await response.json();
  return result as ApplicationsResponse;
}

/**
 * Exemplo de função que utiliza o enum VagasSortField
 * para ordenação de vagas com tipagem segura
 */
/*
export async function getVagasWithSort({
  sortField = VagasSortField.VAGAS_CREATEDATE,
  sortDirection = SortDirection.DESC,
  filters,
}: {
  sortField?: VagasSortField;
  sortDirection?: SortDirection;
  filters?: ShiftsJobsFilter;
}): Promise<VagasCandidaturasResponse> {
  const { data, error } = await supabase.rpc("get_vagas_sorted", {
    sort_field: sortField,
    sort_direction: sortDirection,
    ...filters,
  });
  
  if (error) throw error;
  return data[0] as VagasCandidaturasResponse;
}
*/

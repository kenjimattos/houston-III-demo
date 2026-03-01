// Modelos de dados para o sistema de vagas e candidaturas

export interface Grade {
  grade_id: string | null;
  grade_cor: string | null;
  grade_nome: string | null;
}

export interface Grupo {
  id: string;
  nome: string;
}

export interface Setor {
  setor_id: string;
  setor_nome: string;
}

export interface Hospital {
  hospital_id: string;
  hospital_end: string;
  hospital_lat: number;
  hospital_log: number;
  hospital_nome: string;
  hospital_avatar: string;
  hospital_estado: string;
}

export interface Escalista {
  id: string;
  escalista_nome: string;
  escalista_email: string;
  escalista_telefone: string;
}

export interface Candidatura {
  medico_id: string;
  medico_crm: string;
  vaga_salva: boolean;
  medico_email: string;
  medico_estado: string;
  candidatura_id: string;
  medico_favorito: boolean;
  medico_telefone: string;
  medico_sobrenome: string;
  candidatura_status: "APROVADO" | "PENDENTE" | "REPROVADO";
  medico_primeiro_nome: string;
  candidatura_createdate: string;
}

export interface Especialidade {
  especialidade_id: string;
  especialidade_nome: string;
}

export interface VagaCandidatura {
  grade: Grade | null;
  grupo: Grupo | null;
  setor: Setor;
  hospital: Hospital;
  vaga_id: string;
  escalista: Escalista | null;
  vaga_data: string;
  vagas_tipo: string;
  candidaturas: Candidatura[];
  vaga_valor: number;
  vaga_status: "aberta" | "fechada" | "cancelada" | "anunciada";
  especialidade: Especialidade;
  vaga_horafim: string;
  periodo_id: string;
  tipos_vaga_nome: string;
  vaga_createdate: string;
  vaga_horainicio: string;
  vagas_observacoes: string;
  total_candidaturas: number;
  periodo_nome: string;
  vaga_datapagamento: string | null;
}

export interface Pagination {
  has_next: boolean;
  next_page: number | null;
  page_size: number;
  total_count: number;
  total_pages: number;
  current_page: number;
  has_previous: boolean;
  previous_page: number | null;
}

export interface VagasCandidaturasResponse {
  data: VagaCandidatura[];
  pagination: Pagination;
}

// Tipo para a resposta da API que vem como array
export interface VagasCandidaturasApiResponse
  extends Array<VagasCandidaturasResponse> {
  0: VagasCandidaturasResponse;
}

// New English interfaces for Applications API response

export interface ApplicationData {
  vaga: VagaBasica;
  grade: Grade | null;
  grupo: Grupo | null;
  setor: Setor;
  medico: MedicoBasico;
  hospital: Hospital;
  escalista: Escalista;
  vaga_salva: boolean;
  especialidade: Especialidade;
  candidatura_id: string;
  medico_favorito: boolean;
  candidatura_status: "PENDENTE" | "APROVADO" | "REPROVADO" | "CANCELADO";
  candidatura_createdate: string;
}

export interface ApplicationsResponse {
  data: ApplicationData[];
  pagination: Pagination;
}

// Tipo para a resposta da API que vem como array
export interface ApplicationsApiResponse extends Array<ApplicationsResponse> {
  0: ApplicationsResponse;
}
// Tipos para filtros e parâmetros de busca
export interface VagasCandidaturasFilters {
  vaga_id?: string;
  medico_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
  hospital_id?: string;
  especialidade_id?: string;
  setor_id?: string;
  grupo_id?: string;
  escalista_id?: string;
  page?: number;
  page_size?: number;
}

// Tipos simplificados para uso em componentes
export interface MedicoBasico {
  medico_id: string;
  medico_crm: string;
  medico_email: string;
  medico_telefone: string;
  medico_primeiro_nome: string;
  medico_sobrenome: string;
  medico_estado: string;
  medico_favorito?: boolean;
}

export interface VagaBasica {
  vaga_id: string;
  vaga_data: string;
  vagas_horainicio: string;
  vagas_horafim: string;
  vaga_valor: number;
  vaga_status: "aberta" | "fechada" | "cancelada";
  vagas_observacoes?: string;
  hospital_nome: string;
  especialidade_nome: string;
  setor_nome: string;
  grupo_nome: string;
  escalista_nome: string;
  vaga_datapagamento: string;
  periodo_nome: string;
}

// Tipo para dropdown/select options
export interface SelectOption {
  value: string;
  label: string;
}

// Exportações de tipos utilitários para facilitar o uso
export type VagaStatus = VagaCandidatura["vaga_status"];
export type CandidaturaStatus = Candidatura["candidatura_status"];

// Enum para campos de ordenação das vagas
export enum ShiftsSortField {
  CANDIDATOS_CREATEDATE = "candidatura_createdate", // Data de criação da candidatura
  VAGAS_CREATEDATE = "vaga_createdate", // Data de criação da vaga ⭐ NOVO 
  vaga_data = "vaga_data", // Data da vaga ⭐ NOVO
  HOSPITAL_NOME = "hospital_nome", // Nome do hospital
  SETOR_NOME = "setor_nome", // Nome do setor
  ESPECIALIDADE_NOME = "especialidade_nome", // Nome da especialidade
  PERIODO_NOME = "periodo_nome", // Nome do período da vaga
  vaga_status = "vaga_status", // Status da vaga
  TOTAL_CANDIDATURAS = "total_candidaturas", // Número de candidaturas por vaga
  VAGA_VALOR = "vaga_valor", // Valor da vaga
  MEDICO_PRIMEIRO_NOME = "medico_primeiro_nome", // Nome do médico ⭐ NOVO
  CANDIDATURA_STATUS = "candidatura_status", // Status da candidatura
}

// Enum para direção da ordenação
export enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

// Interface para configuração de ordenação
export interface ShiftsSortConfig {
  field: ShiftsSortField;
  direction: SortDirection;
}

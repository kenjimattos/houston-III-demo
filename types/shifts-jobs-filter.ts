/**
 * Filtro para busca de turnos e trabalhos.
 *
 * @property {string[] | null} [hospital_ids] Lista de IDs de hospitais (array de UUID, padrão NULL).
 * @property {string[] | null} [specialty_ids] Lista de IDs de especialidades (array de UUID, padrão NULL).
 * @property {string[] | null} [sector_ids] Lista de IDs de setores (array de UUID, padrão NULL).
 * @property {string | null} [start_date] Data inicial do filtro (formato YYYY-MM-DD, padrão NULL).
 * @property {string | null} [end_date] Data final do filtro (formato YYYY-MM-DD, padrão NULL).
 * @property {number | null} [min_value] Valor mínimo para filtrar (numérico, padrão NULL).
 * @property {number | null} [max_value] Valor máximo para filtrar (numérico, padrão NULL).
 * @property {string[] | null} [period_ids] Lista de IDs de períodos (array de UUID, padrão NULL).
 * @property {string[] | null} [type_ids] Lista de IDs de tipos (array de UUID, padrão NULL).
 * @property {string[] | null} [group_ids] Lista de IDs de grupos (array de UUID, padrão NULL).
 * @property {string | null} [search_text] Texto para busca (texto, padrão NULL).
 * @property {string[] | null} [doctor_ids] Lista de IDs de médicos (array de UUID, padrão NULL).
 * @property {string[] | null} [application_status_filter] Filtro de status de aplicação (array de texto, padrão NULL).
 * @property {string[] | null} [job_status_filter] Filtro de status de trabalho (array de texto, padrão NULL).
 * @property {string[] | null} [grade_ids] Lista de IDs de grades (array de UUID, padrão NULL).
 */
export type ShiftsJobsFilter = {
  hospital_ids?: string[] | null; // uuid[] DEFAULT NULL
  specialty_ids?: string[] | null; // uuid[] DEFAULT NULL
  sector_ids?: string[] | null; // uuid[] DEFAULT NULL
  start_date?: string | null; // date DEFAULT NULL (YYYY-MM-DD)
  end_date?: string | null; // date DEFAULT NULL (YYYY-MM-DD)
  min_value?: number | null; // numeric DEFAULT NULL
  max_value?: number | null; // numeric DEFAULT NULL
  period_ids?: string[] | null; // uuid[] DEFAULT NULL
  type_ids?: string[] | null; // uuid[] DEFAULT NULL
  group_ids?: string[] | null; // uuid[] DEFAULT NULL
  search_text?: string | null; // text DEFAULT NULL
  doctor_ids?: string[] | null; // uuid[] DEFAULT NULL
  application_status_filter?: string[] | null; // text[] DEFAULT NULL
  job_status_filter?: string[] | null; // text[] DEFAULT NULL
  grade_ids?: string[] | null; // uuid[] DEFAULT NULL

  
};

export enum ShiftsJobsFilterFields {
  HospitalIds = "hospital_ids",
  SpecialtyIds = "specialty_ids",
  SectorIds = "sector_ids",
  StartDate = "start_date",
  EndDate = "end_date",
  MinValue = "min_value",
  MaxValue = "max_value",
  PeriodIds = "period_ids",
  TypeIds = "type_ids",
  GroupIds = "group_ids",
  SearchText = "search_text",
  DoctorIds = "doctor_ids",
  ApplicationStatusFilter = "application_status_filter",
  JobStatusFilter = "job_status_filter",
  GradeIds = "grade_ids",
}
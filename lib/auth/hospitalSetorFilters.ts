import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * Filtros de hospital e setor baseados em user_roles
 */
export interface HospitalSetorFilters {
  hospital_ids: string[] | null
  setor_ids: string[] | null
}

/**
 * Busca hospital_ids e setor_ids do usuário logado na tabela user_roles
 *
 * @param userId - ID do usuário (claims.sub)
 * @returns Filtros de hospital e setor
 *   - null = usuário pode ver TODOS (sem filtro)
 *   - array vazio = nunca deve acontecer (sem acesso)
 *   - array com IDs = filtrar APENAS esses IDs
 */
export async function getUserHospitalSetorFilters(
  userId: string
): Promise<HospitalSetorFilters> {
  const supabase = getServerClient()

  const { data, error } = await supabase
    .schema('houston')
    .from('user_roles')
    .select('hospital_ids, setor_ids')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    console.log(
      `[getUserHospitalSetorFilters] Nenhum filtro encontrado para userId=${userId}:`,
      error?.message || 'sem dados'
    )
    return { hospital_ids: null, setor_ids: null }
  }

  return {
    hospital_ids: data.hospital_ids?.length > 0 ? data.hospital_ids : null,
    setor_ids: data.setor_ids?.length > 0 ? data.setor_ids : null,
  }
}

/**
 * Aplica filtros de hospital/setor em uma query do Supabase
 *
 * @param query - Query do Supabase para aplicar filtros
 * @param filters - Filtros obtidos de getUserHospitalSetorFilters()
 * @returns Query com filtros aplicados
 */
export function applyHospitalSetorFilters(
  query: any,
  filters: HospitalSetorFilters
) {
  // Aplicar filtro de hospital se existir
  if (filters.hospital_ids) {
    console.log(
      `[applyHospitalSetorFilters] Aplicando filtro hospital_ids:`,
      filters.hospital_ids
    )
    query = query.in('hospital_id', filters.hospital_ids)
  }

  // Aplicar filtro de setor se existir
  if (filters.setor_ids) {
    console.log(
      `[applyHospitalSetorFilters] Aplicando filtro setor_ids:`,
      filters.setor_ids
    )
    query = query.in('setor_id', filters.setor_ids)
  }

  return query
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: Candidaturas Paginadas (Hybrid Filtering)
 *
 * Segue o mesmo padrão da API /api/vw-vagas-candidaturas
 * - Busca dados da view com filtro de grupo (segurança)
 * - Aplica filtros adicionais
 * - Pagina no servidor
 *
 * GET /api/candidaturas/paginated - Buscar candidaturas com paginação
 *
 * FILTROS DE SEGURANÇA (Backend):
 * - grupo_ids (do JWT) - OBRIGATÓRIO para não-admins
 * - hospital_ids e setor_ids (do user_roles)
 *
 * QUERY PARAMS SUPORTADOS:
 * - page: Número da página (default: 1)
 * - page_size: Tamanho da página (default: 50, max: 100)
 * - hospital_ids: Filtrar por hospitais (comma-separated UUIDs)
 * - specialty_ids: Filtrar por especialidades (comma-separated UUIDs)
 * - sector_ids: Filtrar por setores (comma-separated UUIDs)
 * - doctor_ids: Filtrar por médicos (comma-separated UUIDs)
 * - application_status_filter: Filtrar por status da candidatura (comma-separated: PENDENTE,APROVADO,REPROVADO)
 * - start_date: Data inicial (YYYY-MM-DD)
 * - end_date: Data final (YYYY-MM-DD)
 * - order_by: Campo para ordenação (default: candidatura_createdate)
 * - order_direction: Direção (ASC ou DESC, default: DESC)
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /candidaturas/paginated GET] Iniciando request...')
    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /candidaturas/paginated GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /candidaturas/paginated GET] Claims: user: ${claims.email}, groups: ${claims.grupo_ids?.length || 0}`)

    // Verificar permissão
    if (!claims.permissions.includes('candidaturas.select') && claims.user_role !== 'administrador') {
      console.log('[API /candidaturas/paginated GET] Sem permissão candidaturas.select')
      return NextResponse.json(
        { error: 'Sem permissão para listar candidaturas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()

    // Extrair query params
    const { searchParams } = new URL(request.url)

    // Paginação
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '50', 10)))

    // Ordenação
    const orderBy = searchParams.get('order_by') || 'candidatura_createdate'
    const orderDirection = searchParams.get('order_direction') || 'DESC'
    const ascending = orderDirection.toUpperCase() === 'ASC'

    // Filtros (comma-separated para arrays)
    const hospitalIds = searchParams.get('hospital_ids')?.split(',').filter(Boolean) || null
    const specialtyIds = searchParams.get('specialty_ids')?.split(',').filter(Boolean) || null
    const sectorIds = searchParams.get('sector_ids')?.split(',').filter(Boolean) || null
    const doctorIds = searchParams.get('doctor_ids')?.split(',').filter(Boolean) || null
    const applicationStatusFilter = searchParams.get('application_status_filter')?.split(',').filter(Boolean) || null
    const startDate = searchParams.get('start_date') || null
    const endDate = searchParams.get('end_date') || null

    console.log('[API /candidaturas/paginated GET] Params:', {
      page,
      pageSize,
      orderBy,
      ascending,
      hospitalIds,
      specialtyIds,
      sectorIds,
      doctorIds,
      applicationStatusFilter,
      startDate,
      endDate
    })

    // Construir query base - apenas registros com candidatura
    let query = supabase
      .from('vw_vagas_candidaturas')
      .select('*')
      .not('candidatura_id', 'is', null)

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /candidaturas/paginated GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      console.log('[API /candidaturas/paginated GET] Aplicando filtro de grupo_id:', claims.grupo_ids)
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      console.log('[API /candidaturas/paginated GET] Sem grupo_ids - bloqueando acesso')
      return NextResponse.json(
        { error: 'Sem permissão para acessar candidaturas' },
        { status: 403 }
      )
    }

    // BACKEND SECURITY: Filtrar por hospital_ids e setor_ids (se definidos em user_roles)
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    }

    // Filtros opcionais (frontend UX)
    if (hospitalIds && hospitalIds.length > 0) {
      query = query.in('hospital_id', hospitalIds)
    }

    if (specialtyIds && specialtyIds.length > 0) {
      query = query.in('especialidade_id', specialtyIds)
    }

    if (sectorIds && sectorIds.length > 0) {
      query = query.in('setor_id', sectorIds)
    }

    if (doctorIds && doctorIds.length > 0) {
      query = query.in('medico_id', doctorIds)
    }

    if (applicationStatusFilter && applicationStatusFilter.length > 0) {
      query = query.in('candidatura_status', applicationStatusFilter)
    }

    // Filtro de data
    if (startDate) {
      query = query.gte('candidatura_createdate', startDate)
    }

    if (endDate) {
      query = query.lte('candidatura_createdate', endDate)
    }

    // Ordenação
    query = query.order(orderBy, { ascending })

    console.log('[API /candidaturas/paginated GET] Executando query...')
    const { data, error } = await query

    if (error) {
      console.error('[API /candidaturas/paginated GET] Erro ao buscar dados:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Calcular paginação no servidor
    const allData = data || []
    const totalCount = allData.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedData = allData.slice(startIndex, endIndex)

    // Formatar resposta no mesmo formato da RPC
    const response = {
      data: paginatedData.map(item => ({
        candidatura_id: item.candidatura_id,
        candidatura_status: item.candidatura_status,
        candidatura_createdate: item.candidatura_createdate,
        vaga_salva: item.vaga_salva,
        vaga: {
          vaga_id: item.vaga_id,
          vaga_data: item.vaga_data,
          vaga_horainicio: item.vaga_horainicio,
          vaga_horafim: item.vaga_horafim,
          vaga_valor: item.vaga_valor,
          vaga_status: item.vaga_status,
          vaga_observacoes: item.vaga_observacoes,
          vaga_datapagamento: item.vaga_datapagamento,
          total_candidaturas: item.total_candidaturas,
          vaga_createdate: item.vaga_createdate,
          periodo_id: item.periodo_id,
          periodo_nome: item.periodo_nome,
          tipos_vaga_id: item.tipos_vaga_id,
          tipos_vaga_nome: item.tipos_vaga_nome,
          grupo_nome: item.grupo_nome,
          escalista_nome: item.escalista_nome,
        },
        medico: {
          medico_id: item.medico_id,
          medico_primeiro_nome: item.medico_primeiro_nome,
          medico_sobrenome: item.medico_sobrenome,
          medico_crm: item.medico_crm,
          medico_estado: item.medico_estado,
          medico_email: item.medico_email,
          medico_telefone: item.medico_telefone,
        },
        hospital: {
          hospital_id: item.hospital_id,
          hospital_nome: item.hospital_nome,
          hospital_estado: item.hospital_estado,
          hospital_lat: item.hospital_lat,
          hospital_log: item.hospital_log,
          hospital_end: item.hospital_end,
          hospital_avatar: item.hospital_avatar,
        },
        especialidade: {
          especialidade_id: item.especialidade_id,
          especialidade_nome: item.especialidade_nome,
        },
        setor: {
          setor_id: item.setor_id,
          setor_nome: item.setor_nome,
        },
        escalista: {
          escalista_id: item.escalista_id,
          escalista_nome: item.escalista_nome,
          escalista_email: item.escalista_email,
          escalista_telefone: item.escalista_telefone,
        },
        grupo: {
          grupo_id: item.grupo_id,
          grupo_nome: item.grupo_nome,
        },
        grade: {
          grade_id: item.grade_id,
          grade_nome: item.grade_nome,
          grade_cor: item.grade_cor,
        },
      })),
      pagination: {
        current_page: page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
        next_page: page < totalPages ? page + 1 : null,
        previous_page: page > 1 ? page - 1 : null,
      }
    }

    console.log(`[API /candidaturas/paginated GET] Resultado: ${paginatedData.length} candidaturas, página ${page}/${totalPages}`)

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[API /candidaturas/paginated GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

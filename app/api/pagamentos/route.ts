import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'
import { PagamentosSortField, PagamentosStatus } from '@/types/pagamentos'
import { SortDirection } from '@/types'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'

/**
 * API Route: GET /api/pagamentos
 *
 * Retorna plantões com pagamentos filtrados por permissões e grupo do usuário
 *
 * Query Parameters:
 * - pageNumber: número da página (default: 1)
 * - pageSize: tamanho da página (default: 50)
 * - orderBy: campo de ordenação (default: vaga_data)
 * - sortDirection: direção da ordenação (default: desc)
 * - hospital_ids: array de IDs de hospitais (opcional)
 * - setor_ids: array de IDs de setores (opcional)
 * - especialidade_ids: array de IDs de especialidades (opcional)
 * - medico_ids: array de IDs de médicos (opcional)
 * - status_checkin: array de status de checkin (opcional)
 * - status_pagamento: array de status de pagamento (opcional)
 * - data_inicio: data de início (formato: YYYY-MM-DD) (opcional)
 * - data_fim: data de fim (formato: YYYY-MM-DD) (opcional)
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /pagamentos GET] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos GET] User: ${claims.email}`)

    const hasPermission =
      claims.permissions.includes('pagamentos.select') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para visualizar pagamentos' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)

    // Parsing de parâmetros de paginação
    const pageNumber = parseInt(searchParams.get('pageNumber') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const orderBy = (searchParams.get('orderBy') || PagamentosSortField.VAGA_DATA) as PagamentosSortField
    const sortDirection = (searchParams.get('sortDirection') || SortDirection.DESC) as SortDirection

    // Parsing de filtros
    const hospital_ids = searchParams.get('hospital_ids')?.split(',').filter(Boolean)
    const setor_ids = searchParams.get('setor_ids')?.split(',').filter(Boolean)
    const especialidade_ids = searchParams.get('especialidade_ids')?.split(',').filter(Boolean)
    const medico_ids = searchParams.get('medico_ids')?.split(',').filter(Boolean)
    const status_checkin = searchParams.get('status_checkin')?.split(',').filter(Boolean)
    const status_pagamento = searchParams.get('status_pagamento')?.split(',').filter(Boolean)
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')

    console.log('[API /pagamentos GET] Filtros aplicados:', {
      hospital_ids,
      setor_ids,
      especialidade_ids,
      medico_ids,
      status_checkin,
      status_pagamento,
      data_inicio,
      data_fim
    })

    // Calcular range para paginação
    const from = (pageNumber - 1) * pageSize
    const to = from + pageSize - 1

    // Query base
    let query = supabase
      .from('vw_plantoes_pagamentos')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order(orderBy, { ascending: sortDirection === SortDirection.ASC })

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /pagamentos GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      console.log('[API /pagamentos GET] Sem grupo_ids, retornando array vazio')
      return NextResponse.json({
        data: [],
        pagination: {
          current_page: pageNumber,
          total_pages: 0,
          total_count: 0,
          page_size: pageSize,
          has_next: false,
          has_previous: false,
        },
      })
    }

    // BACKEND SECURITY: Filtrar por hospital_ids e setor_ids (se definidos em user_roles)
    // Administradores têm acesso a todos os hospitais e setores
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    } else {
      console.log('[API /pagamentos GET] Usuário é admin - sem filtro de hospital/setor')
    }

    // Aplicar filtros opcionais
    if (hospital_ids?.length) {
      query = query.in('hospital_id', hospital_ids)
    }
    if (setor_ids?.length) {
      query = query.in('setor_id', setor_ids)
    }
    if (especialidade_ids?.length) {
      query = query.in('especialidade_id', especialidade_ids)
    }
    if (medico_ids?.length) {
      query = query.in('medico_id', medico_ids)
    }
    if (status_checkin?.length) {
      query = query.in('checkin_status', status_checkin)
    }
    if (status_pagamento?.length) {
      query = query.in('pagamento_status', status_pagamento)
    }
    if (data_inicio) {
      query = query.gte('vaga_data', data_inicio)
    }
    if (data_fim) {
      query = query.lte('vaga_data', data_fim)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[API /pagamentos GET] Erro ao buscar plantões:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    console.log(`[API /pagamentos GET] Retornando ${data?.length || 0} plantões de ${totalCount} total`)

    return NextResponse.json({
      data,
      pagination: {
        current_page: pageNumber,
        total_pages: totalPages,
        total_count: totalCount,
        page_size: pageSize,
        has_next: pageNumber < totalPages,
        has_previous: pageNumber > 1,
      },
    })

  } catch (error: any) {
    console.error('[API /pagamentos GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * API Route: POST /api/pagamentos
 *
 * Cria um novo registro de pagamento
 *
 * Body:
 * - candidatura_id: string (obrigatório)
 * - medico_id: string (obrigatório)
 * - vaga_id: string (obrigatório)
 * - valor: number (obrigatório)
 *
 * Permissões necessárias: pagamentos.insert
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /pagamentos POST] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos POST] User: ${claims.email}`)

    // Verificar permissão: pagamentos.insert
    const hasPermission =
      claims.permissions.includes('pagamentos.insert') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /pagamentos POST] Sem permissão pagamentos.insert')
      return NextResponse.json(
        { error: 'Sem permissão para criar pagamentos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { candidatura_id, medico_id, vaga_id, valor } = body

    // Validar campos obrigatórios
    if (!candidatura_id || !medico_id || !vaga_id || typeof valor !== 'number' || valor <= 0) {
      return NextResponse.json(
        { error: 'Campos obrigatórios inválidos' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()
    const now = getBrazilNowISO()

    console.log(`[API /pagamentos POST] Criando pagamento para candidatura: ${candidatura_id}`)

    const { data, error } = await supabase
      .from('pagamentos')
      .insert({
        candidatura_id,
        medico_id,
        valor,
        vaga_id,
        status: 'PENDENTE' as PagamentosStatus,
        created_at: now,
      })
      .select()
      .single()

    if (error) {
      console.error('[API /pagamentos POST] Erro ao criar pagamento:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /pagamentos POST] Pagamento criado com sucesso: ${data.id}`)

    return NextResponse.json({
      success: true,
      data,
      message: 'Pagamento criado com sucesso'
    })

  } catch (error: any) {
    console.error('[API /pagamentos POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'
import { PagamentosSortField } from '@/types/pagamentos'
import { SortDirection } from '@/types'

/**
 * API Route: GET /api/pagamentos/autorizados
 *
 * Retorna plantões com status de pagamento AUTORIZADO filtrados por permissões e grupo do usuário
 *
 * Query Parameters: (mesmos da rota /api/pagamentos)
 * - pageNumber, pageSize, orderBy, sortDirection
 * - hospital_ids, setor_ids, especialidade_ids, medico_ids
 * - data_inicio, data_fim
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /pagamentos/autorizados GET] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/autorizados GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/autorizados GET] User: ${claims.email}`)

    const hasPermission =
      claims.permissions.includes('pagamentos.select') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /pagamentos/autorizados GET] Sem permissão pagamentos.select ou relatorios.select')
      return NextResponse.json(
        { error: 'Sem permissão para visualizar plantões' },
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
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')

    console.log('[API /pagamentos/autorizados GET] Filtros aplicados:', {
      hospital_ids,
      setor_ids,
      especialidade_ids,
      medico_ids,
      data_inicio,
      data_fim
    })

    // Calcular range para paginação
    const from = (pageNumber - 1) * pageSize
    const to = from + pageSize - 1

    // Query base com status AUTORIZADO
    let query = supabase
      .from('vw_plantoes_pagamentos')
      .select('*', { count: 'exact' })
      .eq('pagamento_status', 'AUTORIZADO')
      .range(from, to)
      .order(orderBy, { ascending: sortDirection === SortDirection.ASC })

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /pagamentos/autorizados GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      console.log('[API /pagamentos/autorizados GET] Sem grupo_ids, retornando array vazio')
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
      console.log('[API /pagamentos/autorizados GET] Usuário é admin - sem filtro de hospital/setor')
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
    if (data_inicio) {
      query = query.gte('vaga_data', data_inicio)
    }
    if (data_fim) {
      query = query.lte('vaga_data', data_fim)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[API /pagamentos/autorizados GET] Erro ao buscar plantões:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    console.log(`[API /pagamentos/autorizados GET] Retornando ${data?.length || 0} plantões autorizados de ${totalCount} total`)

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
    console.error('[API /pagamentos/autorizados GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

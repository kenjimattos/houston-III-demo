import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: GET /api/relatorios/folha-pagamento
 *
 * Retorna dados agregados da folha de pagamento por médico
 *
 * Permissões necessárias: relatorios.select
 *
 * Query params:
 * - mes (required): Formato YYYY-MM (ex: 2024-01)
 * - hospital_id (optional): UUID do hospital
 * - setor_id (optional): UUID do setor
 * - especialidade_id (optional): UUID da especialidade
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /relatorios/folha-pagamento GET] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /relatorios/folha-pagamento GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /relatorios/folha-pagamento GET] User: ${claims.email}`)

    // Verificar permissão: relatorios.select
    const hasPermission =
      claims.permissions.includes('relatorios.select') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /relatorios/folha-pagamento GET] Sem permissão')
      return NextResponse.json(
        { error: 'Sem permissão para visualizar relatórios' },
        { status: 403 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const mes = searchParams.get('mes')
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')
    const hospital_id = searchParams.get('hospital_id')
    const setor_id = searchParams.get('setor_id')
    const especialidade_id = searchParams.get('especialidade_id')

    // Validar que pelo menos um filtro de data foi fornecido
    if (!mes && !data_inicio) {
      return NextResponse.json(
        { error: 'Parâmetro "mes" ou "data_inicio/data_fim" é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    console.log(`[API /relatorios/folha-pagamento GET] Filtros: mes=${mes}, data_inicio=${data_inicio}, data_fim=${data_fim}, hospital_id=${hospital_id}`)
    console.log(`[API /relatorios/folha-pagamento GET] grupo_ids: ${JSON.stringify(claims.grupo_ids)}`)

    // Construir query
    let query = supabase
      .from('vw_folha_pagamento')
      .select('*')

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /relatorios/folha-pagamento GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      console.log('[API /relatorios/folha-pagamento GET] Sem grupo_ids, retornando array vazio')
      return NextResponse.json({
        data: [],
        count: 0,
        mes
      })
    }

    // BACKEND SECURITY: Filtrar por hospital_ids e setor_ids (se definidos em user_roles)
    // Administradores têm acesso a todos os hospitais e setores
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    } else {
      console.log('[API /relatorios/folha-pagamento GET] Usuário é admin - sem filtro de hospital/setor')
    }

    // Filtro de data: usar mes OU data_inicio/data_fim
    if (mes) {
      // Validar formato do mês (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        return NextResponse.json(
          { error: 'Formato de mês inválido. Use YYYY-MM (ex: 2024-01)' },
          { status: 400 }
        )
      }
      query = query.like('vaga_data', `${mes}%`)
    } else if (data_inicio && data_fim) {
      query = query.gte('vaga_data', data_inicio).lte('vaga_data', data_fim)
    } else if (data_inicio) {
      query = query.gte('vaga_data', data_inicio)
    } else if (data_fim) {
      query = query.lte('vaga_data', data_fim)
    }

    // Filtros opcionais
    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id)
    }

    if (setor_id) {
      query = query.eq('setor_id', setor_id)
    }

    if (especialidade_id) {
      query = query.eq('especialidade_id', especialidade_id)
    }

    console.log('[API /relatorios/folha-pagamento GET] Executando query...')

    const { data, error } = await query

    if (error) {
      console.error('[API /relatorios/folha-pagamento GET] Erro:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /relatorios/folha-pagamento GET] Resultado: ${(data || []).length} registros RAW da view`)

    // Retornar dados RAW da view - o frontend/service faz a agregação
    // Isso permite que o relatoriosService.ts construa os jobs individuais para cada médico
    return NextResponse.json({
      data: data || [],
      count: (data || []).length,
      mes
    })

  } catch (error: any) {
    console.error('[API /relatorios/folha-pagamento GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

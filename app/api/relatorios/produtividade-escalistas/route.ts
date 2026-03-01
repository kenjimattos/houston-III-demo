import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: GET /api/relatorios/produtividade-escalistas
 *
 * Retorna dados de produtividade dos escalistas
 *
 * Permissões necessárias: reports.read
 *
 * Query params:
 * - mes (optional): Formato YYYY-MM (ex: 2024-01)
 * - hospital_id (optional): UUID do hospital
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /relatorios/produtividade-escalistas GET] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /relatorios/produtividade-escalistas GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /relatorios/produtividade-escalistas GET] User: ${claims.email}`)

    // Verificar permissão: relatorios.select
    const hasPermission =
      claims.permissions.includes('relatorios.select') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /relatorios/produtividade-escalistas GET] Sem permissão')
      return NextResponse.json(
        { error: 'Sem permissão para visualizar relatórios' },
        { status: 403 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const mes = searchParams.get('mes')
    const hospital_id = searchParams.get('hospital_id')

    const supabase = getServerClient()

    console.log(`[API /relatorios/produtividade-escalistas GET] Filtros: mes=${mes}, hospital_id=${hospital_id}`)
    console.log(`[API /relatorios/produtividade-escalistas GET] grupo_ids: ${JSON.stringify(claims.grupo_ids)}`)

    // Construir query - buscar de vw_vagas_candidaturas
    let query = supabase
      .from('vw_vagas_candidaturas')
      .select('*')

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /relatorios/produtividade-escalistas GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      console.log('[API /relatorios/produtividade-escalistas GET] Sem grupo_ids, retornando array vazio')
      return NextResponse.json({
        data: [],
        count: 0,
        mes: mes || 'todos'
      })
    }

    // BACKEND SECURITY: Filtrar por hospital_ids e setor_ids (se definidos em user_roles)
    // Administradores têm acesso a todos os hospitais e setores
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    } else {
      console.log('[API /relatorios/produtividade-escalistas GET] Usuário é admin - sem filtro de hospital/setor')
    }

    // Filtros opcionais
    if (mes) {
      query = query.like('vaga_data', `${mes}%`)
    }

    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id)
    }

    console.log('[API /relatorios/produtividade-escalistas GET] Executando query...')

    const { data, error } = await query

    if (error) {
      console.error('[API /relatorios/produtividade-escalistas GET] Erro:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /relatorios/produtividade-escalistas GET] Resultado: ${(data || []).length} registros RAW da view`)

    // Retornar dados RAW da view - o frontend/service faz a agregação
    // Isso permite que o relatoriosService.ts construa as candidaturas detalhadas
    return NextResponse.json({
      data: data || [],
      count: (data || []).length,
      mes: mes || 'todos'
    })

  } catch (error: any) {
    console.error('[API /relatorios/produtividade-escalistas GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

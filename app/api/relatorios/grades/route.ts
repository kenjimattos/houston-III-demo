import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: GET /api/relatorios/grades
 *
 * Retorna dados de grades
 *
 * Permissões necessárias: reports.read OU grades.read
 *
 * Query params:
 * - hospital_id (optional): UUID do hospital
 * - setor_id (optional): UUID do setor
 * - mes (optional): Formato YYYY-MM (ex: 2024-01)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /relatorios/grades GET] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /relatorios/grades GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /relatorios/grades GET] User: ${claims.email}`)

    // Verificar permissão: relatorios.select
    const hasPermission =
      claims.permissions.includes('relatorios.select') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /relatorios/grades GET] Sem permissão')
      return NextResponse.json(
        { error: 'Sem permissão para visualizar grades' },
        { status: 403 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const hospital_id = searchParams.get('hospital_id')
    const setor_id = searchParams.get('setor_id')
    const mes = searchParams.get('mes')

    const supabase = getServerClient()

    console.log(`[API /relatorios/grades GET] Filtros: hospital_id=${hospital_id}, setor_id=${setor_id}, mes=${mes}`)
    console.log(`[API /relatorios/grades GET] grupo_ids: ${JSON.stringify(claims.grupo_ids)}`)

    // Construir query
    let query = supabase
      .from('grades')
      .select('*')

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /relatorios/grades GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      console.log('[API /relatorios/grades GET] Sem grupo_ids, retornando array vazio')
      return NextResponse.json({
        data: [],
        count: 0
      })
    }

    // Filtros opcionais
    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id)
    }

    if (setor_id) {
      query = query.eq('setor_id', setor_id)
    }

    if (mes) {
      query = query.like('mes_referencia', `${mes}%`)
    }

    console.log('[API /relatorios/grades GET] Executando query...')

    const { data, error } = await query

    if (error) {
      console.error('[API /relatorios/grades GET] Erro:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /relatorios/grades GET] Resultado: ${data?.length || 0} grades`)

    return NextResponse.json({
      data,
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('[API /relatorios/grades GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

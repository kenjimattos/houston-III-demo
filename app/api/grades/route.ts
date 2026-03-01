import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: Grades (Hybrid Filtering)
 *
 * Backend Security: Filtra por grupo_ids do JWT
 * Frontend UX: Aceita hospital_id e setor_id como query params opcionais
 */

// GET /api/grades - Buscar grades
export async function GET(request: NextRequest) {
  try {
    // 1. Extrair claims do JWT
    console.log('[API /grades GET] Iniciando request...')
    const claims = await getJWTClaims()
    console.log('[API /grades GET] Claims:', claims ? `user: ${claims.email}, groups: ${claims.grupo_ids.length}` : 'null')

    if (!claims) {
      console.error('[API /grades GET] Sem claims - retornando 401')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // 2. Inicializar query do Supabase (usando serverClient que bypassa RLS)
    const supabase = getServerClient()
    let query = supabase
      .from('grades')
      .select('*')

    // 3. BACKEND SECURITY: Filtrar por grupo_ids (do JWT)
    // Administradores têm acesso a todos os grupos
    console.log('[API /grades GET] grupo_ids do usuário:', claims.grupo_ids)
    if (isAdmin(claims)) {
      console.log('[API /grades GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      // Se não tem grupo_ids, não retorna nada (segurança)
      console.log('[API /grades GET] Sem grupo_ids, retornando array vazio')
      return NextResponse.json({ data: [] })
    }

    // 3.5. BACKEND SECURITY: Filtrar por hospital_ids e setor_ids (se definidos em user_roles)
    // Administradores têm acesso a todos os hospitais e setores
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    } else {
      console.log('[API /grades GET] Usuário é admin - sem filtro de hospital/setor')
    }

    // 4. FRONTEND UX: Filtros opcionais de hospital/setor (query params)
    const { searchParams } = new URL(request.url)

    const hospitalIds = searchParams.getAll('hospital_id')
    if (hospitalIds.length > 0) {
      console.log('[API /grades GET] Filtrando por hospital_ids:', hospitalIds)
      query = query.in('hospital_id', hospitalIds)
    }

    const setorIds = searchParams.getAll('setor_id')
    if (setorIds.length > 0) {
      console.log('[API /grades GET] Filtrando por setor_ids:', setorIds)
      query = query.in('setor_id', setorIds)
    }

    // 5. Ordenação (mesma do gradesService original)
    query = query
      .order('hospital_id', { ascending: true })
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    // 6. Executar query
    console.log('[API /grades GET] Executando query...')
    const { data, error } = await query

    console.log('[API /grades GET] Resultado:', {
      encontradas: data?.length || 0,
      erro: error ? error.message : 'nenhum'
    })

    if (error) {
      console.error('[API /grades GET] Erro ao buscar grades:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /grades GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/grades - Criar nova grade
export async function POST(request: NextRequest) {
  try {
    // 1. Extrair claims do JWT
    const claims = await getJWTClaims()

    if (!claims) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // 2. Verificar permissão (usa vagas permissions pois são o mesmo escopo)
    if (!claims.permissions.includes('vagas.insert') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para criar grades' },
        { status: 403 }
      )
    }

    // 3. Parse do body
    const body = await request.json()
    const { nome, especialidade_id, setor_id, hospital_id, cor, horario_inicial, configuracao } = body

    // 4. Validar grupo_id (deve ser um dos grupos do usuário)
    if (!claims.grupo_ids || claims.grupo_ids.length === 0) {
      return NextResponse.json(
        { error: 'Usuário sem grupos associados' },
        { status: 403 }
      )
    }

    // Usar o primeiro grupo do usuário (ou validar se foi passado)
    const grupo_id = claims.grupo_ids[0]

    // 5. Calcular próxima ordem disponível para o hospital (usando serverClient)
    const supabase = getServerClient()
    const { data: existingGrades } = await supabase
      .from('grades')
      .select('ordem')
      .eq('grupo_id', grupo_id)
      .eq('hospital_id', hospital_id)
      .order('ordem', { ascending: false, nullsFirst: false })
      .limit(1)

    const nextOrdem = existingGrades && existingGrades.length > 0
      ? (existingGrades[0].ordem ?? 0) + 1
      : 0

    // 6. Criar grade
    const { data, error } = await supabase
      .from('grades')
      .insert({
        nome,
        especialidade_id,
        setor_id,
        hospital_id,
        cor,
        horario_inicial: horario_inicial || 7,
        ordem: nextOrdem,
        configuracao: configuracao || {},
        grupo_id,
        created_by: claims.sub,
        updated_by: claims.sub
      })
      .select()
      .single()

    if (error) {
      console.error('[API /grades POST] Erro ao criar grade:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (error: any) {
    console.error('[API /grades POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/grades/[id] seria em /app/api/grades/[id]/route.ts
// DELETE /api/grades/[id] seria em /app/api/grades/[id]/route.ts

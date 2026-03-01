import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: Vagas (Hybrid Filtering)
 *
 * GET /api/vagas - Listar vagas com filtros
 * POST /api/vagas - Criar nova vaga
 *
 * FILTROS:
 * - Backend security: grupo_ids (do JWT)
 * - Frontend UX: hospital_id, setor_id, status (query params opcionais)
 */

// GET /api/vagas - Listar vagas
export async function GET(request: NextRequest) {
  try {
    console.log('[API /vagas GET] Iniciando request...')
    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /vagas GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /vagas GET] Claims: user: ${claims.email}, groups: ${claims.grupo_ids?.length || 0}`)
    console.log(`[API /vagas GET] grupo_ids do usuário:`, claims.grupo_ids)

    // Verificar permissão
    if (!claims.permissions.includes('vagas.select') && claims.user_role !== 'administrador') {
      console.log('[API /vagas GET] Sem permissão vagas.select')
      return NextResponse.json(
        { error: 'Sem permissão para listar vagas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()

    // Extrair query params (filtros opcionais)
    const { searchParams } = new URL(request.url)
    const hospital_id = searchParams.get('hospital_id')
    const setor_id = searchParams.get('setor_id')
    const status = searchParams.get('status')

    console.log('[API /vagas GET] Filtros opcionais:', { hospital_id, setor_id, status })

    // Buscar com filtro de grupo (backend security)
    let query = supabase
      .from('vagas')
      .select('*')

    // Filtro obrigatório: grupo_ids (backend security)
    // Administradores têm acesso a todos os grupos
    if (isAdmin(claims)) {
      console.log('[API /vagas GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      console.log('[API /vagas GET] Aplicando filtro de grupo_id:', claims.grupo_ids)
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      // Sem grupos = sem permissão
      console.log('[API /vagas GET] Sem grupo_ids - bloqueando acesso')
      return NextResponse.json(
        { error: 'Sem permissão para acessar vagas' },
        { status: 403 }
      )
    }

    // Filtro de segurança: hospital_ids e setor_ids (se definidos em user_roles)
    // Administradores têm acesso a todos os hospitais e setores
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    } else {
      console.log('[API /vagas GET] Usuário é admin - sem filtro de hospital/setor')
    }

    // Filtros opcionais (frontend UX)
    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id)
    }

    if (setor_id) {
      query = query.eq('setor_id', setor_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    console.log('[API /vagas GET] Executando query...')
    const { data, error } = await query

    if (error) {
      console.error('[API /vagas GET] Erro ao buscar vagas:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /vagas GET] Resultado: { encontradas: ${data?.length || 0} }`)
    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /vagas GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/vagas - Criar nova vaga (com benefícios e requisitos)
export async function POST(request: NextRequest) {
  try {
    const claims = await getJWTClaims()

    if (!claims) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão (usa mesma permission que grades - mesmo escopo de negócio)
    if (!claims.permissions.includes('vagas.insert') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para criar vagas' },
        { status: 403 }
      )
    }

    // Parse do body
    const body = await request.json()
    const { selectedBeneficios = [], selectedRequisitos = [], ...vagaInsert } = body

    // Validar que grupo_id pertence ao usuário (admin pode criar em qualquer grupo)
    if (!isAdmin(claims) && (!claims.grupo_ids || !claims.grupo_ids.includes(vagaInsert.grupo_id))) {
      return NextResponse.json(
        { error: 'Grupo inválido' },
        { status: 403 }
      )
    }

    // Preparar dados para inserção
    const now = new Date().toISOString()
    const vagaData = {
      ...vagaInsert,
      updated_by: claims.sub,
      updated_at: now
    }

    const supabase = getServerClient()

    // 1. Inserir vaga
    const { data: vagaCriada, error: vagaError } = await supabase
      .from('vagas')
      .insert([vagaData])
      .select()
      .single()

    if (vagaError) {
      console.error('[API /vagas POST] Erro ao criar vaga:', vagaError)
      return NextResponse.json(
        { error: vagaError.message },
        { status: 500 }
      )
    }

    // 2. Inserir benefícios (se houver)
    if (selectedBeneficios.length > 0) {
      const beneficiosRows = selectedBeneficios.map((beneficio_id: string) => ({
        vaga_id: vagaCriada.id,
        beneficio_id,
      }))

      const { error: beneficioError } = await supabase
        .from('vagas_beneficios')
        .insert(beneficiosRows)

      if (beneficioError) {
        console.error('[API /vagas POST] Erro ao inserir benefícios:', beneficioError)
        // Rollback: deletar vaga criada
        await supabase.from('vagas').delete().eq('id', vagaCriada.id)
        return NextResponse.json(
          { error: 'Erro ao inserir benefícios: ' + beneficioError.message },
          { status: 500 }
        )
      }
    }

    // 3. Inserir requisitos (se houver)
    if (selectedRequisitos.length > 0) {
      const requisitosRows = selectedRequisitos.map((requisito_id: string) => ({
        vaga_id: vagaCriada.id,
        requisito_id,
      }))

      const { error: requisitoError } = await supabase
        .from('vagas_requisitos')
        .insert(requisitosRows)

      if (requisitoError) {
        console.error('[API /vagas POST] Erro ao inserir requisitos:', requisitoError)
        // Rollback: deletar vaga e benefícios
        await supabase.from('vagas_beneficios').delete().eq('vaga_id', vagaCriada.id)
        await supabase.from('vagas').delete().eq('id', vagaCriada.id)
        return NextResponse.json(
          { error: 'Erro ao inserir requisitos: ' + requisitoError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ data: vagaCriada }, { status: 201 })

  } catch (error: any) {
    console.error('[API /vagas POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: Vagas by ID (Hybrid Filtering)
 *
 * GET /api/vagas/[id] - Buscar vaga específica
 * PUT /api/vagas/[id] - Atualizar vaga
 * DELETE /api/vagas/[id] - Deletar vaga
 */

// GET /api/vagas/[id] - Buscar vaga específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claims = await getJWTClaims()

    if (!claims) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const supabase = getServerClient()

    // Buscar com filtro de grupo (backend security)
    let query = supabase
      .from('vagas')
      .select('*')
      .eq('id', id)

    // Administradores têm acesso a todos os grupos
    if (isAdmin(claims)) {
      // Admin - sem filtro de grupo
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta vaga' },
        { status: 403 }
      )
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Vaga não encontrada' },
          { status: 404 }
        )
      }

      console.error('[API /vagas/[id] GET] Erro ao buscar vaga:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /vagas/[id] GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/vagas/[id] - Atualizar vaga (com benefícios e requisitos)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claims = await getJWTClaims()

    if (!claims) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão
    if (!claims.permissions.includes('vagas.update') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar vagas' },
        { status: 403 }
      )
    }

    // Parse do body
    const body = await request.json()
    const {
      selectedBeneficios = [],
      selectedRequisitos = [],
      id: bodyId,
      created_at,
      created_by,
      grupo_id,
      ...updateData
    } = body

    console.log('[API /vagas/[id] PUT] 🔍 Body recebido:', JSON.stringify(body, null, 2))
    console.log('[API /vagas/[id] PUT] 🔍 updateData:', JSON.stringify(updateData, null, 2))

    const supabase = getServerClient()

    // 1. Atualizar vaga apenas se pertence ao grupo do usuário
    let query = supabase
      .from('vagas')
      .update({
        ...updateData,
        updated_by: claims.sub,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Administradores têm acesso a todos os grupos
    if (isAdmin(claims)) {
      // Admin - sem filtro de grupo
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar esta vaga' },
        { status: 403 }
      )
    }

    const { data: vagaAtualizada, error: vagaError } = await query.select().single()

    if (vagaError) {
      if (vagaError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Vaga não encontrada ou sem permissão' },
          { status: 404 }
        )
      }

      console.error('[API /vagas/[id] PUT] Erro ao atualizar vaga:', vagaError)
      return NextResponse.json(
        { error: vagaError.message },
        { status: 500 }
      )
    }

    // 2. Atualizar benefícios: remover todos e inserir os novos
    const { error: deleteBeneficiosError } = await supabase
      .from('vagas_beneficios')
      .delete()
      .eq('vaga_id', id)

    if (deleteBeneficiosError) {
      console.error('[API /vagas/[id] PUT] Erro ao deletar benefícios:', deleteBeneficiosError)
      return NextResponse.json(
        { error: 'Erro ao deletar benefícios: ' + deleteBeneficiosError.message },
        { status: 500 }
      )
    }

    if (selectedBeneficios.length > 0) {
      const beneficiosRows = selectedBeneficios.map((beneficio_id: string) => ({
        vaga_id: id,
        beneficio_id,
      }))

      const { error: beneficioError } = await supabase
        .from('vagas_beneficios')
        .insert(beneficiosRows)

      if (beneficioError) {
        console.error('[API /vagas/[id] PUT] Erro ao inserir benefícios:', beneficioError)
        return NextResponse.json(
          { error: 'Erro ao inserir benefícios: ' + beneficioError.message },
          { status: 500 }
        )
      }
    }

    // 3. Atualizar requisitos: remover todos e inserir os novos
    const { error: deleteRequisitosError } = await supabase
      .from('vagas_requisitos')
      .delete()
      .eq('vaga_id', id)

    if (deleteRequisitosError) {
      console.error('[API /vagas/[id] PUT] Erro ao deletar requisitos:', deleteRequisitosError)
      return NextResponse.json(
        { error: 'Erro ao deletar requisitos: ' + deleteRequisitosError.message },
        { status: 500 }
      )
    }

    if (selectedRequisitos.length > 0) {
      const requisitosRows = selectedRequisitos.map((requisito_id: string) => ({
        vaga_id: id,
        requisito_id,
      }))

      const { error: requisitoError } = await supabase
        .from('vagas_requisitos')
        .insert(requisitosRows)

      if (requisitoError) {
        console.error('[API /vagas/[id] PUT] Erro ao inserir requisitos:', requisitoError)
        return NextResponse.json(
          { error: 'Erro ao inserir requisitos: ' + requisitoError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ data: vagaAtualizada })

  } catch (error: any) {
    console.error('[API /vagas/[id] PUT] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/vagas/[id] - Atualização parcial de vaga (ex: status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claims = await getJWTClaims()

    if (!claims) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão
    if (!claims.permissions.includes('vagas.update') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar vagas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const supabase = getServerClient()

    // Atualização parcial - apenas os campos enviados
    let query = supabase
      .from('vagas')
      .update({
        ...body,
        updated_by: claims.sub,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Administradores têm acesso a todos os grupos
    if (isAdmin(claims)) {
      // Admin - sem filtro de grupo
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar esta vaga' },
        { status: 403 }
      )
    }

    const { data, error } = await query.select().single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Vaga não encontrada ou sem permissão' },
          { status: 404 }
        )
      }

      console.error('[API /vagas/[id] PATCH] Erro ao atualizar vaga:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /vagas/[id] PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/vagas/[id] - Deletar vaga
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claims = await getJWTClaims()

    if (!claims) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar permissão
    if (!claims.permissions.includes('vagas.delete') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para deletar vagas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()

    // Deletar apenas se pertence ao grupo do usuário
    let query = supabase
      .from('vagas')
      .delete()
      .eq('id', id)

    // Administradores têm acesso a todos os grupos
    if (isAdmin(claims)) {
      // Admin - sem filtro de grupo
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para deletar esta vaga' },
        { status: 403 }
      )
    }

    const { error } = await query

    if (error) {
      console.error('[API /vagas/[id] DELETE] Erro ao deletar vaga:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('[API /vagas/[id] DELETE] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

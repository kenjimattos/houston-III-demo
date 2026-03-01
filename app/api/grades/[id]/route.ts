import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: Grades by ID (Hybrid Filtering)
 *
 * PUT /api/grades/[id] - Atualizar grade
 * DELETE /api/grades/[id] - Deletar grade
 */

// GET /api/grades/[id] - Buscar grade específica
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
      .from('grades')
      .select('*')
      .eq('id', id)

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /grades/[id] GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta grade' },
        { status: 403 }
      )
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Grade não encontrada' },
          { status: 404 }
        )
      }

      console.error('[API /grades/[id] GET] Erro ao buscar grade:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /grades/[id] GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/grades/[id] - Atualizar grade
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

    // Verificar permissão (usa vagas permissions pois são o mesmo escopo)
    if (!claims.permissions.includes('vagas.update') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar grades' },
        { status: 403 }
      )
    }

    // Parse do body
    const body = await request.json()

    // Remover campos que não devem ser atualizados diretamente
    const { id: bodyId, created_at, created_by, grupo_id, ...updateData } = body

    const supabase = getServerClient()

    // Atualizar apenas se pertence ao grupo do usuário
    let query = supabase
      .from('grades')
      .update({
        ...updateData,
        updated_by: claims.sub
      })
      .eq('id', id)

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /grades/[id] PUT] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar esta grade' },
        { status: 403 }
      )
    }

    const { data, error } = await query.select().single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Grade não encontrada ou sem permissão' },
          { status: 404 }
        )
      }

      console.error('[API /grades/[id] PUT] Erro ao atualizar grade:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /grades/[id] PUT] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/grades/[id] - Deletar grade
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

    // Verificar permissão (usa vagas permissions pois são o mesmo escopo)
    if (!claims.permissions.includes('vagas.delete') && claims.user_role !== 'administrador') {
      return NextResponse.json(
        { error: 'Sem permissão para deletar grades' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()

    // Deletar apenas se pertence ao grupo do usuário
    let query = supabase
      .from('grades')
      .delete()
      .eq('id', id)

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /grades/[id] DELETE] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      return NextResponse.json(
        { error: 'Sem permissão para deletar esta grade' },
        { status: 403 }
      )
    }

    const { error } = await query

    if (error) {
      console.error('[API /grades/[id] DELETE] Erro ao deletar grade:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error: any) {
    console.error('[API /grades/[id] DELETE] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

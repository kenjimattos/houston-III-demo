import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: PATCH /api/pagamentos/[id]
 *
 * Atualiza o valor de um pagamento existente
 *
 * Body:
 * - valor: number (obrigatório)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API /pagamentos/[id] PATCH] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/[id] PATCH] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/[id] PATCH] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /pagamentos/[id] PATCH] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para atualizar pagamentos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { valor } = body

    if (typeof valor !== 'number' || valor <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()
    const pagamento_id = params.id

    console.log(`[API /pagamentos/[id] PATCH] Atualizando pagamento ${pagamento_id} com valor: ${valor}`)

    const { error } = await supabase
      .from('pagamentos')
      .update({ valor })
      .eq('id', pagamento_id)

    if (error) {
      console.error('[API /pagamentos/[id] PATCH] Erro ao atualizar pagamento:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /pagamentos/[id] PATCH] Pagamento ${pagamento_id} atualizado com sucesso`)

    return NextResponse.json({
      success: true,
      message: 'Valor do pagamento atualizado com sucesso'
    })

  } catch (error: any) {
    console.error('[API /pagamentos/[id] PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

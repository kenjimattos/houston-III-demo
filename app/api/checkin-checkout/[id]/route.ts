import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: PATCH /api/checkin-checkout/[id]
 *
 * Atualiza os horários de checkin e/ou checkout
 *
 * Body:
 * - checkin?: string (opcional)
 * - checkout?: string (opcional)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API /checkin-checkout/[id] PATCH] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /checkin-checkout/[id] PATCH] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /checkin-checkout/[id] PATCH] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /checkin-checkout/[id] PATCH] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para atualizar checkin/checkout' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { checkin, checkout } = body

    if (!checkin && !checkout) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()
    const checkin_id = params.id

    console.log(`[API /checkin-checkout/[id] PATCH] Atualizando checkin: ${checkin_id}`)

    const updateData: any = {}
    if (checkin) updateData.checkin = checkin
    if (checkout) updateData.checkout = checkout

    const { error } = await supabase
      .from('checkin_checkout')
      .update(updateData)
      .eq('id', checkin_id)

    if (error) {
      console.error('[API /checkin-checkout/[id] PATCH] Erro ao atualizar:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /checkin-checkout/[id] PATCH] Checkin ${checkin_id} atualizado com sucesso`)

    return NextResponse.json({
      success: true,
      message: 'Horários atualizados com sucesso'
    })

  } catch (error: any) {
    console.error('[API /checkin-checkout/[id] PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

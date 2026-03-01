import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'

/**
 * API Route: PATCH /api/checkin-checkout/[id]/checkout
 *
 * Aprova ou rejeita um checkout
 *
 * Body:
 * - action: "aprovar" | "rejeitar" (obrigatório)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API /checkin-checkout/[id]/checkout PATCH] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /checkin-checkout/[id]/checkout PATCH] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /checkin-checkout/[id]/checkout PATCH] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /checkin-checkout/[id]/checkout PATCH] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para aprovar/rejeitar checkout' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['aprovar', 'rejeitar'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "aprovar" ou "rejeitar"' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()
    const checkin_id = params.id
    const now = getBrazilNowISO()
    const status = action === 'aprovar' ? 'APROVADO' : 'REJEITADO'

    console.log(`[API /checkin-checkout/[id]/checkout PATCH] ${action} checkout: ${checkin_id}`)

    const { error } = await supabase
      .from('checkin_checkout')
      .update({
        checkout_status: status,
        checkout_aprovado_por: claims.sub,
        checkout_aprovado_em: now,
      })
      .eq('id', checkin_id)

    if (error) {
      console.error('[API /checkin-checkout/[id]/checkout PATCH] Erro:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /checkin-checkout/[id]/checkout PATCH] Checkout ${checkin_id} ${status.toLowerCase()}`)

    return NextResponse.json({
      success: true,
      message: `Checkout ${status.toLowerCase()} com sucesso`
    })

  } catch (error: any) {
    console.error('[API /checkin-checkout/[id]/checkout PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

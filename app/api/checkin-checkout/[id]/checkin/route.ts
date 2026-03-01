import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'

/**
 * API Route: PATCH /api/checkin-checkout/[id]/checkin
 *
 * Aprova ou rejeita um checkin
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
    console.log('[API /checkin-checkout/[id]/checkin PATCH] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /checkin-checkout/[id]/checkin PATCH] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /checkin-checkout/[id]/checkin PATCH] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /checkin-checkout/[id]/checkin PATCH] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para aprovar/rejeitar checkin' },
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

    console.log(`[API /checkin-checkout/[id]/checkin PATCH] ${action} checkin: ${checkin_id}`)

    const { error } = await supabase
      .from('checkin_checkout')
      .update({
        checkin_status: status,
        checkin_aprovado_por: claims.sub,
        checkin_aprovado_em: now,
      })
      .eq('id', checkin_id)

    if (error) {
      console.error('[API /checkin-checkout/[id]/checkin PATCH] Erro:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /checkin-checkout/[id]/checkin PATCH] Checkin ${checkin_id} ${status.toLowerCase()}`)

    return NextResponse.json({
      success: true,
      message: `Checkin ${status.toLowerCase()} com sucesso`
    })

  } catch (error: any) {
    console.error('[API /checkin-checkout/[id]/checkin PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

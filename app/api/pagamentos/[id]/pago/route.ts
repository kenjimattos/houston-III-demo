import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'

/**
 * API Route: PATCH /api/pagamentos/[id]/pago
 *
 * Marca um pagamento como pago (muda status de AUTORIZADO para PAGO)
 *
 * Permissões necessárias: pagamentos.update + role administrador ou moderador
 */

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API /pagamentos/[id]/pago PATCH] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/[id]/pago PATCH] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/[id]/pago PATCH] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update + role check
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    const hasRole = ['administrador', 'moderador'].includes(claims.user_role)

    if (!hasPermission || !hasRole) {
      console.log('[API /pagamentos/[id]/pago PATCH] Sem permissão ou role inadequada')
      return NextResponse.json(
        { error: 'Sem permissão para marcar pagamentos como pagos' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()
    const params = await context.params
    const pagamento_id = params.id
    const now = getBrazilNowISO()

    console.log(`[API /pagamentos/[id]/pago PATCH] Marcando pagamento como pago: ${pagamento_id}`)

    // UPDATE direto - service_role bypassa RLS
    const { error } = await supabase
      .from('pagamentos')
      .update({
        status: 'PAGO',
        pago_por: claims.sub,
        pago_em: now,
      })
      .eq('id', pagamento_id)

    if (error) {
      console.error('[API /pagamentos/[id]/pago PATCH] Erro ao marcar como pago:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /pagamentos/[id]/pago PATCH] Pagamento ${pagamento_id} marcado como pago`)

    return NextResponse.json({
      success: true,
      message: 'Pagamento marcado como pago com sucesso'
    })

  } catch (error: any) {
    console.error('[API /pagamentos/[id]/pago PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

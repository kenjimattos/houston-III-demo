import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'

/**
 * API Route: PATCH /api/pagamentos/[id]/autorizar
 *
 * Autoriza um pagamento (muda status de PENDENTE para AUTORIZADO)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API /pagamentos/[id]/autorizar PATCH] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/[id]/autorizar PATCH] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/[id]/autorizar PATCH] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /pagamentos/[id]/autorizar PATCH] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para autorizar pagamentos' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()
    const params = await context.params
    const pagamento_id = params.id
    const now = getBrazilNowISO()

    console.log(`[API /pagamentos/[id]/autorizar PATCH] Autorizando pagamento: ${pagamento_id}`)

    // UPDATE direto - service_role bypassa RLS
    const { error } = await supabase
      .from('pagamentos')
      .update({
        status: 'AUTORIZADO',
        autorizado_por: claims.sub,
        autorizado_em: now,
      })
      .eq('id', pagamento_id)

    if (error) {
      console.error('[API /pagamentos/[id]/autorizar PATCH] Erro ao autorizar pagamento:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /pagamentos/[id]/autorizar PATCH] Pagamento ${pagamento_id} autorizado com sucesso`)

    return NextResponse.json({
      success: true,
      message: 'Pagamento autorizado com sucesso'
    })

  } catch (error: any) {
    console.error('[API /pagamentos/[id]/autorizar PATCH] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'
import { isElegivelParaPagamento } from '@/validators/pagamentosValidator'
import { PagamentosData, PagamentosStatus } from '@/types/pagamentos'
import { BulkOperationResult } from '@/types/pagamentos'

/**
 * API Route: POST /api/pagamentos/bulk/pago
 *
 * Marca múltiplos pagamentos como pagos em massa
 *
 * Body:
 * - plantoes: PlantaoData[] (array de plantões a marcar como pago)
 *
 * Permissões necessárias: pagamentos.update + role administrador ou moderador
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /pagamentos/bulk/pago POST] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/bulk/pago POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/bulk/pago POST] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update + role check
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    const hasRole = ['administrador', 'moderador'].includes(claims.user_role)

    if (!hasPermission || !hasRole) {
      console.log('[API /pagamentos/bulk/pago POST] Sem permissão ou role inadequada')
      return NextResponse.json(
        { error: 'Sem permissão para marcar pagamentos como pagos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { plantoes } = body as { plantoes: PagamentosData[] }

    if (!Array.isArray(plantoes) || plantoes.length === 0) {
      return NextResponse.json(
        { error: 'Array de plantões inválido ou vazio' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()
    const now = getBrazilNowISO()

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    // Filtrar apenas plantões elegíveis
    const elegiveis = plantoes.filter(isElegivelParaPagamento)
    result.skipped = plantoes.length - elegiveis.length

    console.log(`[API /pagamentos/bulk/pago POST] Marcando como pago ${elegiveis.length} de ${plantoes.length} plantões`)

    for (const plantao of elegiveis) {
      try {
        if (!plantao.pagamento_id) {
          result.failed++
          result.errors.push(`Plantão ${plantao.candidatura_id}: sem pagamento_id`)
          continue
        }

        const { error } = await supabase
          .from('pagamentos')
          .update({
            status: 'PAGO' as PagamentosStatus,
            pago_por: claims.sub,
            pago_em: now,
          })
          .eq('id', plantao.pagamento_id)

        if (error) {
          result.failed++
          result.errors.push(`Plantão ${plantao.candidatura_id}: ${error.message}`)
        } else {
          result.success++
        }
      } catch (err: any) {
        result.failed++
        result.errors.push(`Plantão ${plantao.candidatura_id}: ${err.message || 'erro desconhecido'}`)
      }
    }

    console.log(`[API /pagamentos/bulk/pago POST] Resultado: ${result.success} sucesso, ${result.failed} falhas, ${result.skipped} ignorados`)

    return NextResponse.json({
      result,
      message: `${result.success} pagamento(s) marcado(s) como pago com sucesso`
    })

  } catch (error: any) {
    console.error('[API /pagamentos/bulk/pago POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

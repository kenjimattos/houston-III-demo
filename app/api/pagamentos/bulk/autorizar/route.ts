import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'
import { isElegivelParaAutorizacao } from '@/validators/pagamentosValidator'
import { PagamentosData, PagamentosStatus } from '@/types/pagamentos'
import { BulkOperationResult } from '@/types/pagamentos'

/**
 * API Route: POST /api/pagamentos/bulk/autorizar
 *
 * Autoriza múltiplos pagamentos em massa
 *
 * Body:
 * - plantoes: PagamentosData[] (array de plantões a autorizar)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /pagamentos/bulk/autorizar POST] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/bulk/autorizar POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/bulk/autorizar POST] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /pagamentos/bulk/autorizar POST] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para autorizar pagamentos' },
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
    const elegiveis = plantoes.filter(isElegivelParaAutorizacao)
    result.skipped = plantoes.length - elegiveis.length

    console.log(`[API /pagamentos/bulk/autorizar POST] Autorizando ${elegiveis.length} de ${plantoes.length} plantões`)

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
            status: 'AUTORIZADO' as PagamentosStatus,
            autorizado_por: claims.sub,
            autorizado_em: now,
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

    console.log(`[API /pagamentos/bulk/autorizar POST] Resultado: ${result.success} sucesso, ${result.failed} falhas, ${result.skipped} ignorados`)

    return NextResponse.json({
      result,
      message: `${result.success} pagamento(s) autorizado(s) com sucesso`
    })

  } catch (error: any) {
    console.error('[API /pagamentos/bulk/autorizar POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

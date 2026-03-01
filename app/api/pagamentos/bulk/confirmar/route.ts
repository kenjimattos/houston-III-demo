import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { getBrazilNowISO } from '@/utils/pagamentosUtils'
import { PagamentosData, PagamentosStatus } from '@/types/pagamentos'
import { BulkOperationResult } from '@/types/pagamentos'

/**
 * API Route: POST /api/pagamentos/bulk/confirmar
 *
 * Cria pagamentos em massa para plantões que não possuem pagamento
 *
 * Body:
 * - plantoes: PagamentosData[] (array de plantões para criar pagamento)
 *
 * Permissões necessárias: pagamentos.insert
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /pagamentos/bulk/confirmar POST] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /pagamentos/bulk/confirmar POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /pagamentos/bulk/confirmar POST] User: ${claims.email}`)

    // Verificar permissão: pagamentos.insert
    const hasPermission =
      claims.permissions.includes('pagamentos.insert') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /pagamentos/bulk/confirmar POST] Sem permissão pagamentos.insert')
      return NextResponse.json(
        { error: 'Sem permissão para criar pagamentos' },
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

    // Filtrar apenas plantões sem pagamento
    const semPagamento = plantoes.filter(p => !p.pagamento_id)
    result.skipped = plantoes.length - semPagamento.length

    console.log(`[API /pagamentos/bulk/confirmar POST] Criando pagamentos para ${semPagamento.length} de ${plantoes.length} plantões`)

    for (const plantao of semPagamento) {
      try {
        if (!plantao.candidatura_id || !plantao.medico_id || !plantao.vaga_id || !plantao.vaga_valor) {
          result.failed++
          result.errors.push(`Plantão ${plantao.candidatura_id || 'desconhecido'}: dados incompletos`)
          continue
        }

        const { error } = await supabase
          .from('pagamentos')
          .insert({
            candidatura_id: plantao.candidatura_id,
            vaga_id: plantao.vaga_id,
            medico_id: plantao.medico_id,
            valor: plantao.vaga_valor,
            status: 'PENDENTE' as PagamentosStatus,
            created_at: now,
          })

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

    console.log(`[API /pagamentos/bulk/confirmar POST] Resultado: ${result.success} sucesso, ${result.failed} falhas, ${result.skipped} ignorados`)

    return NextResponse.json({
      result,
      message: `${result.success} pagamento(s) criado(s) com sucesso`
    })

  } catch (error: any) {
    console.error('[API /pagamentos/bulk/confirmar POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { buildTimestamp } from '@/utils/pagamentosUtils'
import { PagamentosData } from '@/types/pagamentos'
import { BulkOperationResult } from '@/types/pagamentos'

/**
 * API Route: POST /api/checkin-checkout/bulk/confirmar
 *
 * Cria checkin/checkout em massa para plantões sem check-in
 *
 * Body:
 * - plantoes: PagamentosData[] (array de plantões para criar checkin/checkout)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /checkin-checkout/bulk/confirmar POST] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /checkin-checkout/bulk/confirmar POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /checkin-checkout/bulk/confirmar POST] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /checkin-checkout/bulk/confirmar POST] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para criar checkin/checkout' },
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

    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    // Filtrar apenas plantões sem checkin
    const semCheckin = plantoes.filter(p => !p.checkin_hora)
    result.skipped = plantoes.length - semCheckin.length

    console.log(`[API /checkin-checkout/bulk/confirmar POST] Criando checkin para ${semCheckin.length} de ${plantoes.length} plantões`)

    for (const plantao of semCheckin) {
      try {
        if (!plantao.vaga_id || !plantao.medico_id || !plantao.vaga_data || !plantao.vaga_horainicio || !plantao.vaga_horafim) {
          result.failed++
          result.errors.push(`Plantão ${plantao.candidatura_id || 'desconhecido'}: dados incompletos`)
          continue
        }

        const checkin_value = buildTimestamp(plantao.vaga_data, plantao.vaga_horainicio)
        const checkout_value = buildTimestamp(plantao.vaga_data, plantao.vaga_horafim)

        // Verificar se já existe checkin para esta vaga e médico
        const { data: existing } = await supabase
          .from('checkin_checkout')
          .select('id')
          .eq('vaga_id', plantao.vaga_id)
          .eq('medico_id', plantao.medico_id)
          .maybeSingle()

        if (existing) {
          result.skipped++
          continue
        }

        // Criar novo checkin
        const { error } = await supabase
          .from('checkin_checkout')
          .insert({
            vaga_id: plantao.vaga_id,
            medico_id: plantao.medico_id,
            checkin: checkin_value,
            checkout: checkout_value,
            checkin_status: 'PENDENTE',
            checkout_status: 'PENDENTE',
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

    console.log(`[API /checkin-checkout/bulk/confirmar POST] Resultado: ${result.success} sucesso, ${result.failed} falhas, ${result.skipped} ignorados`)

    return NextResponse.json({
      result,
      message: `${result.success} checkin(s) criado(s) com sucesso`
    })

  } catch (error: any) {
    console.error('[API /checkin-checkout/bulk/confirmar POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: POST /api/checkin-checkout
 *
 * Cria ou atualiza um registro de checkin/checkout
 *
 * Body:
 * - vaga_id: string (obrigatório)
 * - medico_id: string (obrigatório)
 * - vaga_data: string (obrigatório)
 * - horario_inicio: string (obrigatório)
 * - horario_fim: string (obrigatório)
 *
 * Permissões necessárias: pagamentos.update
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /checkin-checkout POST] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /checkin-checkout POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /checkin-checkout POST] User: ${claims.email}`)

    // Verificar permissão: pagamentos.update
    const hasPermission =
      claims.permissions.includes('pagamentos.update') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /checkin-checkout POST] Sem permissão pagamentos.update')
      return NextResponse.json(
        { error: 'Sem permissão para criar/atualizar checkin/checkout' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { vaga_id, medico_id, vaga_data, horario_inicio, horario_fim } = body

    // Validar campos obrigatórios
    if (!vaga_id || !medico_id || !vaga_data || !horario_inicio || !horario_fim) {
      return NextResponse.json(
        { error: 'Campos obrigatórios inválidos' },
        { status: 400 }
      )
    }

    // Usar client de servidor (service key bypassa RLS)
    const supabase = getServerClient()

    console.log(`[API /checkin-checkout POST] Verificando checkin existente para vaga: ${vaga_id}, médico: ${medico_id}`)

    // Verificar se já existe um checkin para esta vaga e médico
    const { data: existing, error: fetchError } = await supabase
      .from('checkin_checkout')
      .select('id')
      .eq('vaga_id', vaga_id)
      .eq('medico_id', medico_id)
      .maybeSingle()

    if (fetchError) {
      console.error('[API /checkin-checkout POST] Erro ao buscar checkin existente:', fetchError)
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    const checkin_value = `${vaga_data} ${horario_inicio}`
    const checkout_value = `${vaga_data} ${horario_fim}`

    if (existing) {
      // Atualizar checkin existente
      console.log(`[API /checkin-checkout POST] Atualizando checkin existente: ${existing.id}`)

      const { error: updateError } = await supabase
        .from('checkin_checkout')
        .update({
          checkin: checkin_value,
          checkout: checkout_value,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[API /checkin-checkout POST] Erro ao atualizar checkin:', updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        )
      }

      console.log(`[API /checkin-checkout POST] Checkin ${existing.id} atualizado com sucesso`)

      return NextResponse.json({
        success: true,
        message: 'Checkin/checkout atualizado com sucesso',
        id: existing.id
      })

    } else {
      // Criar novo checkin
      console.log(`[API /checkin-checkout POST] Criando novo checkin para vaga: ${vaga_id}`)

      const { data, error: insertError } = await supabase
        .from('checkin_checkout')
        .insert({
          vaga_id,
          medico_id,
          checkin: checkin_value,
          checkout: checkout_value,
          checkin_status: 'PENDENTE',
          checkout_status: 'PENDENTE',
          created_by: claims.sub,
          updated_by: claims.sub,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[API /checkin-checkout POST] Erro ao criar checkin:', insertError)
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        )
      }

      console.log(`[API /checkin-checkout POST] Checkin criado com sucesso: ${data.id}`)

      return NextResponse.json({
        success: true,
        data,
        message: 'Checkin/checkout criado com sucesso'
      })
    }

  } catch (error: any) {
    console.error('[API /checkin-checkout POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

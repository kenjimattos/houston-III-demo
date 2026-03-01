import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: Operações em lote de candidaturas por vaga
 *
 * PATCH /api/candidaturas/vaga/[vaga_id] - Cancelar ou reativar candidaturas de uma vaga
 *
 * BODY:
 * - action: "cancelar" | "reativar"
 */

function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vaga_id: string }> }
) {
  try {
    const { vaga_id } = await params
    console.log(`[API /candidaturas/vaga/${vaga_id} PATCH] Iniciando request...`)

    const claims = await getJWTClaims()

    if (!claims) {
      console.log(`[API /candidaturas/vaga/${vaga_id} PATCH] Não autenticado`)
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /candidaturas/vaga/${vaga_id} PATCH] User: ${claims.email}`)

    // Verificar permissão
    if (!claims.permissions.includes('candidaturas.update') && claims.user_role !== 'administrador') {
      console.log(`[API /candidaturas/vaga/${vaga_id} PATCH] Sem permissão candidaturas.update`)
      return NextResponse.json(
        { error: 'Sem permissão para atualizar candidaturas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Campo obrigatório: action (cancelar|reativar)' },
        { status: 400 }
      )
    }

    const now = getBrazilNowISO()

    if (action === 'cancelar') {
      // Reprovar todas as candidaturas PENDENTES e APROVADAS da vaga
      const { error } = await supabase
        .from('candidaturas')
        .update({
          status: 'REPROVADO',
          updated_at: now,
          updated_by: claims.sub,
        })
        .eq('vaga_id', vaga_id)
        .in('status', ['PENDENTE', 'APROVADO'])

      if (error) {
        console.error(`[API /candidaturas/vaga/${vaga_id} PATCH] Erro ao cancelar:`, error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      console.log(`[API /candidaturas/vaga/${vaga_id} PATCH] Candidaturas canceladas`)
      return NextResponse.json({ success: true })

    } else if (action === 'reativar') {
      // Voltar candidaturas REPROVADAS para PENDENTE
      const { error } = await supabase
        .from('candidaturas')
        .update({
          status: 'PENDENTE',
          updated_at: now,
          updated_by: claims.sub,
        })
        .eq('vaga_id', vaga_id)
        .eq('status', 'REPROVADO')

      if (error) {
        console.error(`[API /candidaturas/vaga/${vaga_id} PATCH] Erro ao reativar:`, error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      console.log(`[API /candidaturas/vaga/${vaga_id} PATCH] Candidaturas reativadas`)
      return NextResponse.json({ success: true })

    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use: cancelar ou reativar' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error(`[API /candidaturas/vaga PATCH] Erro inesperado:`, error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

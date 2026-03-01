import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: Candidaturas (UPDATE operations)
 *
 * PATCH /api/candidaturas/[id] - Atualizar status de candidatura
 *
 * BODY:
 * - action: "aprovar" | "reprovar" | "reconsiderar"
 * - vaga_id: UUID da vaga (obrigatório para ação "aprovar")
 */

function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidatura_id = params.id
    console.log(`[API /candidaturas/${candidatura_id} PATCH] Iniciando request...`)

    const claims = await getJWTClaims()

    if (!claims) {
      console.log(`[API /candidaturas/${candidatura_id} PATCH] Não autenticado`)
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /candidaturas/${candidatura_id} PATCH] User: ${claims.email}`)

    // Verificar permissão
    if (!claims.permissions.includes('candidaturas.update') && claims.user_role !== 'administrador') {
      console.log(`[API /candidaturas/${candidatura_id} PATCH] Sem permissão candidaturas.update`)
      return NextResponse.json(
        { error: 'Sem permissão para atualizar candidaturas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()
    const body = await request.json()
    const { action, vaga_id } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Campo obrigatório: action (aprovar|reprovar|reconsiderar)' },
        { status: 400 }
      )
    }

    const now = getBrazilNowISO()

    if (action === 'aprovar') {
      if (!vaga_id) {
        return NextResponse.json(
          { error: 'Campo obrigatório para aprovar: vaga_id' },
          { status: 400 }
        )
      }

      // Aprovar candidatura
      const { error: candidaturaError } = await supabase
        .from('candidaturas')
        .update({ status: 'APROVADO', updated_at: now, updated_by: claims.sub })
        .eq('id', candidatura_id)

      if (candidaturaError) {
        console.error(`[API /candidaturas/${candidatura_id} PATCH] Erro ao aprovar:`, candidaturaError)
        return NextResponse.json(
          { error: candidaturaError.message },
          { status: 500 }
        )
      }

      // Fechar vaga
      const { error: vagaError } = await supabase
        .from('vagas')
        .update({ status: 'fechada', updated_at: now, updated_by: claims.sub })
        .eq('id', vaga_id)

      if (vagaError) {
        console.error(`[API /candidaturas/${candidatura_id} PATCH] Erro ao fechar vaga:`, vagaError)
        return NextResponse.json(
          { error: vagaError.message },
          { status: 500 }
        )
      }

      console.log(`[API /candidaturas/${candidatura_id} PATCH] Candidatura aprovada e vaga fechada`)
      return NextResponse.json({ success: true })

    } else if (action === 'reprovar') {
      const { error } = await supabase
        .from('candidaturas')
        .update({ status: 'REPROVADO', updated_at: now, updated_by: claims.sub })
        .eq('id', candidatura_id)

      if (error) {
        console.error(`[API /candidaturas/${candidatura_id} PATCH] Erro ao reprovar:`, error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      console.log(`[API /candidaturas/${candidatura_id} PATCH] Candidatura reprovada`)
      return NextResponse.json({ success: true })

    } else if (action === 'reconsiderar') {
      const { error } = await supabase
        .from('candidaturas')
        .update({ status: 'PENDENTE', updated_at: now, updated_by: claims.sub })
        .eq('id', candidatura_id)

      if (error) {
        console.error(`[API /candidaturas/${candidatura_id} PATCH] Erro ao reconsiderar:`, error)
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      console.log(`[API /candidaturas/${candidatura_id} PATCH] Candidatura reconsiderada`)
      return NextResponse.json({ success: true })

    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use: aprovar, reprovar ou reconsiderar' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error(`[API /candidaturas PATCH] Erro inesperado:`, error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

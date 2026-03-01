import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'

/**
 * API Route: Candidaturas (CREATE)
 *
 * POST /api/candidaturas - Criar nova candidatura
 *
 * BODY:
 * - vaga_id: UUID da vaga
 * - medico_id: UUID do médico (pode ser médico confirmado ou pré-cadastrado)
 * - status: "APROVADO" | "PENDENTE" | "REPROVADO" (default: "APROVADO")
 * - vaga_valor: Valor da vaga
 */

// ID do usuário fantasma para médicos pré-cadastrados
const MEDICO_FANTASMA_ID = "9cd29712-91b5-492f-86ff-41e38c7b03d5";

function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /candidaturas POST] Iniciando request...')
    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /candidaturas POST] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /candidaturas POST] User: ${claims.email}, sub: ${claims.sub}`)

    if (!claims.sub) {
      console.error('[API /candidaturas POST] claims.sub está undefined/null')
      return NextResponse.json(
        { error: 'Token inválido: subject não encontrado' },
        { status: 401 }
      )
    }

    // Verificar permissão
    if (!claims.permissions.includes('candidaturas.insert') && claims.user_role !== 'administrador') {
      console.log('[API /candidaturas POST] Sem permissão candidaturas.insert')
      return NextResponse.json(
        { error: 'Sem permissão para criar candidaturas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()
    const body = await request.json()
    const { vaga_id, medico_id, status = 'APROVADO', vaga_valor } = body

    if (!vaga_id || !medico_id || !vaga_valor) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: vaga_id, medico_id, vaga_valor' },
        { status: 400 }
      )
    }

    // SECURITY: Validate user has access to this vaga (via grupo_id)
    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select('grupo_id')
      .eq('id', vaga_id)
      .single()

    if (vagaError || !vaga) {
      console.log('[API /candidaturas POST] Vaga não encontrada:', vaga_id)
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    // Validate grupo access (unless admin)
    if (claims.user_role !== 'administrador') {
      if (!claims.grupo_ids?.includes(vaga.grupo_id)) {
        console.log(`[API /candidaturas POST] User ${claims.email} sem acesso à vaga ${vaga_id} (grupo: ${vaga.grupo_id})`)
        return NextResponse.json(
          { error: 'Sem permissão para criar candidatura nesta vaga' },
          { status: 403 }
        )
      }
    }

    const now = getBrazilNowISO()

    // Verificar se é médico pré-cadastrado
    const { data: preCadastroData } = await supabase
      .from('medicos_precadastro')
      .select('id')
      .eq('id', medico_id)
      .maybeSingle()

    let insertData
    if (preCadastroData) {
      // É pré-cadastrado: usar ID fantasma e preencher medico_precadastro_id
      insertData = {
        vaga_id,
        medico_id: MEDICO_FANTASMA_ID,
        medico_precadastro_id: medico_id,
        status: status,
        created_at: now,
        updated_at: now,
        updated_by: claims.sub,
        vaga_valor,
      }
    } else {
      // É médico confirmado: usar ID real e deixar medico_precadastro_id null
      insertData = {
        vaga_id,
        medico_id,
        medico_precadastro_id: null,
        status: status,
        created_at: now,
        updated_at: now,
        updated_by: claims.sub,
        vaga_valor,
      }
    }

    console.log('[API /candidaturas POST] insertData:', JSON.stringify(insertData, null, 2))

    // O trigger 'atualizar_vagas_status' irá:
    // 1. Fechar a vaga automaticamente quando status = 'APROVADO'
    // 2. Reprovar outras candidaturas da mesma vaga
    const { data, error } = await supabase
      .from('candidaturas')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('[API /candidaturas POST] Erro ao criar candidatura:', error)
      console.error('[API /candidaturas POST] Erro completo:', JSON.stringify(error, null, 2))
      console.error('[API /candidaturas POST] insertData que foi enviado:', JSON.stringify(insertData, null, 2))
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[API /candidaturas POST] Candidatura inserida com sucesso:', JSON.stringify(data, null, 2))
    console.log(`[API /candidaturas POST] Candidatura criada: ${data.id}`)
    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /candidaturas POST] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

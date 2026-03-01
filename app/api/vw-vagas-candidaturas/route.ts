import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: View vw_vagas_candidaturas (Hybrid Filtering)
 *
 * GET /api/vw-vagas-candidaturas - Buscar vagas com candidaturas
 *
 * FILTROS:
 * - Backend security: grupo_ids (do JWT) - OBRIGATÓRIO
 * - Frontend UX: Todos os filtros que vagasCandidaturasService.ts usava
 *
 * QUERY PARAMS SUPORTADOS:
 * - hospital_id: Filter by hospital
 * - setor_id: Filter by setor
 * - especialidade_id: Filter by especialidade
 * - status: Filter by vaga status
 * - escalista_id: Filter by escalista
 * - mes: Filter by month (formato: YYYY-MM)
 * - medico_id: Filter by medico (candidaturas)
 * - vaga_id: Filter by single vaga
 * - vaga_ids: Filter by multiple vagas (comma-separated)
 * - data_inicio: Filter by start date (vaga_data)
 * - data_fim: Filter by end date (vaga_data)
 * - recorrencia_id: Filter by recorrencia
 * - select: Custom select fields (default: *)
 * - order: Order by field (default: vaga_createdate)
 * - ascending: Order direction (default: false)
 *
 * NOMES DAS COLUNAS (conforme definição da view):
 * - Vagas: vaga_id, vaga_data, vaga_createdate, vaga_status, vaga_valor, etc.
 * - Hospital: hospital_id, hospital_nome, hospital_estado, etc.
 * - Setor: setor_id, setor_nome
 * - Especialidade: especialidade_id, especialidade_nome
 * - Escalista: escalista_id, escalista_nome, escalista_email, escalista_telefone
 * - Grupo: grupo_id, grupo_nome
 * - Candidatura: candidatura_id, candidatura_status, candidatura_createdate, etc.
 * - Médico: medico_id, medico_primeiro_nome, medico_sobrenome, etc.
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /vw-vagas-candidaturas GET] Iniciando request...')
    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /vw-vagas-candidaturas GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /vw-vagas-candidaturas GET] Claims: user: ${claims.email}, groups: ${claims.grupo_ids?.length || 0}`)
    console.log(`[API /vw-vagas-candidaturas GET] grupo_ids do usuário:`, claims.grupo_ids)

    // Verificar permissão
    if (!claims.permissions.includes('vagas.select') && claims.user_role !== 'administrador') {
      console.log('[API /vw-vagas-candidaturas GET] Sem permissão vagas.select')
      return NextResponse.json(
        { error: 'Sem permissão para listar vagas' },
        { status: 403 }
      )
    }

    const supabase = getServerClient()

    // Extrair query params
    const { searchParams } = new URL(request.url)
    const hospital_id = searchParams.get('hospital_id')
    const setor_id = searchParams.get('setor_id')
    const especialidade_id = searchParams.get('especialidade_id')
    const status = searchParams.get('status')
    const escalista_id = searchParams.get('escalista_id')
    const mes = searchParams.get('mes')
    const medico_id = searchParams.get('medico_id')
    const vaga_id = searchParams.get('vaga_id')
    const vaga_ids = searchParams.get('vaga_ids') // comma-separated
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')
    const recorrencia_id = searchParams.get('recorrencia_id')
    const select_fields = searchParams.get('select') || '*' // campos a selecionar
    const order = searchParams.get('order') || 'vaga_createdate'
    const ascending = searchParams.get('ascending') === 'true'

    console.log('[API /vw-vagas-candidaturas GET] Filtros:', {
      hospital_id,
      setor_id,
      especialidade_id,
      status,
      escalista_id,
      mes,
      medico_id,
      vaga_id,
      vaga_ids,
      data_inicio,
      data_fim,
      recorrencia_id,
      select_fields,
      order,
      ascending
    })

    // Buscar com filtro de grupo (backend security)
    let query = supabase
      .from('vw_vagas_candidaturas')
      .select(select_fields)

    // BACKEND SECURITY: Filtrar por grupo_ids (admins têm acesso a todos)
    if (isAdmin(claims)) {
      console.log('[API /vw-vagas-candidaturas GET] Usuário é admin - sem filtro de grupo')
    } else if (claims.grupo_ids && claims.grupo_ids.length > 0) {
      console.log('[API /vw-vagas-candidaturas GET] Aplicando filtro de grupo_id:', claims.grupo_ids)
      query = query.in('grupo_id', claims.grupo_ids)
    } else {
      // Sem grupos = sem permissão
      console.log('[API /vw-vagas-candidaturas GET] Sem grupo_ids - bloqueando acesso')
      return NextResponse.json(
        { error: 'Sem permissão para acessar vagas' },
        { status: 403 }
      )
    }

    // BACKEND SECURITY: Filtrar por hospital_ids e setor_ids (se definidos em user_roles)
    // Administradores têm acesso a todos os hospitais e setores
    if (!isAdmin(claims)) {
      const filters = await getUserHospitalSetorFilters(claims.sub)
      query = applyHospitalSetorFilters(query, filters)
    } else {
      console.log('[API /vw-vagas-candidaturas GET] Usuário é admin - sem filtro de hospital/setor')
    }

    // Filtros opcionais (frontend UX)
    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id)
    }

    if (setor_id) {
      query = query.eq('setor_id', setor_id)
    }

    if (especialidade_id) {
      query = query.eq('especialidade_id', especialidade_id)
    }

    if (status) {
      query = query.eq('vaga_status', status)
    }

    if (escalista_id) {
      query = query.eq('escalista_id', escalista_id)
    }

    if (medico_id) {
      query = query.eq('medico_id', medico_id)
    }

    if (vaga_id) {
      query = query.eq('vaga_id', vaga_id)
    }

    if (vaga_ids) {
      const idsArray = vaga_ids.split(',').map(id => id.trim())
      query = query.in('vaga_id', idsArray)
    }

    if (recorrencia_id) {
      query = query.eq('recorrencia_id', recorrencia_id)
    }

    // Filtro de data_inicio e data_fim (intervalo de datas)
    if (data_inicio) {
      query = query.gte('vaga_data', data_inicio)
    }

    if (data_fim) {
      query = query.lte('vaga_data', data_fim)
    }

    // Filtro de mês (formato: YYYY-MM) - sobrescreve data_inicio/data_fim se fornecido
    if (mes) {
      const [ano, mesNum] = mes.split('-')
      const inicio = `${ano}-${mesNum}-01`
      // Último dia do mês
      const ultimoDia = new Date(parseInt(ano), parseInt(mesNum), 0).getDate()
      const fim = `${ano}-${mesNum}-${ultimoDia}`

      query = query
        .gte('vaga_createdate', inicio)
        .lte('vaga_createdate', fim)
    }

    // Ordenação
    query = query.order(order, { ascending })

    console.log('[API /vw-vagas-candidaturas GET] Executando query...')
    const { data, error } = await query

    if (error) {
      console.error('[API /vw-vagas-candidaturas GET] Erro ao buscar dados:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log(`[API /vw-vagas-candidaturas GET] Resultado: { encontradas: ${data?.length || 0} }`)
    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /vw-vagas-candidaturas GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import {
  getUserHospitalSetorFilters,
  applyHospitalSetorFilters,
} from '@/lib/auth/hospitalSetorFilters'

/**
 * API Route: GET /api/relatorios/filtros
 *
 * Retorna opções de filtro para os relatórios
 *
 * Permissões necessárias: relatorios.select
 *
 * Query params:
 * - tipo (required): Tipo de filtro (hospitais, especialidades, setores, medicos, escalistas, grades, grupos)
 * - source (optional): Fonte de dados (folha_pagamento, grades, produtividade)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /relatorios/filtros GET] Iniciando request...')

    const claims = await getJWTClaims()

    if (!claims) {
      console.log('[API /relatorios/filtros GET] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.log(`[API /relatorios/filtros GET] User: ${claims.email}`)

    // Verificar permissão: relatorios.select
    const hasPermission =
      claims.permissions.includes('relatorios.select') ||
      claims.user_role === 'administrador'

    if (!hasPermission) {
      console.log('[API /relatorios/filtros GET] Sem permissão')
      return NextResponse.json(
        { error: 'Sem permissão para visualizar relatórios' },
        { status: 403 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const tipo = searchParams.get('tipo')
    const source = searchParams.get('source') || 'folha_pagamento'

    if (!tipo) {
      return NextResponse.json(
        { error: 'Parâmetro "tipo" é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()
    const userIsAdmin = isAdmin(claims)

    console.log(`[API /relatorios/filtros GET] tipo=${tipo}, source=${source}, isAdmin=${userIsAdmin}`)
    console.log(`[API /relatorios/filtros GET] grupo_ids: ${JSON.stringify(claims.grupo_ids)}`)

    // Se não é admin e não tem grupo_ids, retornar array vazio
    if (!userIsAdmin && (!claims.grupo_ids || claims.grupo_ids.length === 0)) {
      console.log('[API /relatorios/filtros GET] Sem grupo_ids, retornando array vazio')
      return NextResponse.json({ data: [] })
    }

    let data: any[] = []

    switch (tipo) {
      case 'hospitais':
        data = await getHospitais(supabase, source, claims, userIsAdmin)
        break
      case 'especialidades':
        data = await getEspecialidades(supabase, source, claims, userIsAdmin)
        break
      case 'setores':
        data = await getSetores(supabase, source, claims, userIsAdmin)
        break
      case 'medicos':
        data = await getMedicos(supabase, source, claims, userIsAdmin)
        break
      case 'escalistas':
        data = await getEscalistas(supabase, claims, userIsAdmin)
        break
      case 'grades':
        data = await getGrades(supabase, claims, userIsAdmin)
        break
      case 'grupos':
        data = await getGrupos(supabase, claims, userIsAdmin)
        break
      default:
        return NextResponse.json(
          { error: `Tipo de filtro inválido: ${tipo}` },
          { status: 400 }
        )
    }

    console.log(`[API /relatorios/filtros GET] Resultado: ${data.length} itens`)

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('[API /relatorios/filtros GET] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function getHospitais(supabase: any, source: string, claims: any, userIsAdmin: boolean) {
  if (source === 'grades') {
    // Buscar hospitais que têm grades
    let query = supabase
      .from('grades')
      .select('hospital_id')
      .not('hospital_id', 'is', null)

    if (!userIsAdmin && claims.grupo_ids?.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    }

    const { data: grades, error: gradesError } = await query

    if (gradesError || !grades || grades.length === 0) {
      console.log('[API /relatorios/filtros GET] Nenhuma grade encontrada para hospitais')
      return []
    }

    const hospitalIds = [...new Set(grades.map((g: any) => g.hospital_id))]

    const { data: hospitais, error: hospitaisError } = await supabase
      .from('hospitais')
      .select('id, nome')
      .in('id', hospitalIds)

    if (hospitaisError) {
      console.error('[API /relatorios/filtros GET] Erro ao buscar hospitais:', hospitaisError)
      return []
    }

    return (hospitais || [])
      .map((h: any) => ({ hospital_id: h.id, hospital_nome: h.nome }))
      .sort((a: any, b: any) => a.hospital_nome.localeCompare(b.hospital_nome, 'pt-BR'))
  }

  // Buscar de vw_folha_pagamento
  let query = supabase
    .from('vw_folha_pagamento')
    .select('hospital_id, hospital_nome')

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar hospitais:', error)
    return []
  }

  // Remover duplicados e ordenar
  const unicos = (data || []).reduce((acc: any[], curr: any) => {
    if (!acc.find((h: any) => h.hospital_id === curr.hospital_id)) {
      acc.push(curr)
    }
    return acc
  }, [])

  return unicos.sort((a: any, b: any) =>
    a.hospital_nome.localeCompare(b.hospital_nome, 'pt-BR')
  )
}

async function getEspecialidades(supabase: any, source: string, claims: any, userIsAdmin: boolean) {
  if (source === 'grades') {
    // Buscar especialidades que têm grades
    let query = supabase
      .from('grades')
      .select('especialidade_id')
      .not('especialidade_id', 'is', null)

    if (!userIsAdmin && claims.grupo_ids?.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    }

    const { data: grades, error: gradesError } = await query

    if (gradesError || !grades || grades.length === 0) {
      return []
    }

    const especialidadeIds = [...new Set(grades.map((g: any) => g.especialidade_id))]

    const { data: especialidades, error: especialidadesError } = await supabase
      .from('especialidades')
      .select('id, nome')
      .in('id', especialidadeIds)

    if (especialidadesError) {
      console.error('[API /relatorios/filtros GET] Erro ao buscar especialidades:', especialidadesError)
      return []
    }

    return (especialidades || [])
      .map((e: any) => ({ especialidade_id: e.id, especialidade_nome: e.nome }))
      .sort((a: any, b: any) => a.especialidade_nome.localeCompare(b.especialidade_nome, 'pt-BR'))
  }

  // Buscar de vw_folha_pagamento
  let query = supabase
    .from('vw_folha_pagamento')
    .select('especialidade_id, especialidade_nome')

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar especialidades:', error)
    return []
  }

  // Remover duplicados e ordenar
  const unicos = (data || []).reduce((acc: any[], curr: any) => {
    if (!acc.find((e: any) => e.especialidade_id === curr.especialidade_id)) {
      acc.push(curr)
    }
    return acc
  }, [])

  return unicos.sort((a: any, b: any) =>
    a.especialidade_nome.localeCompare(b.especialidade_nome, 'pt-BR')
  )
}

async function getSetores(supabase: any, source: string, claims: any, userIsAdmin: boolean) {
  if (source === 'grades') {
    // Buscar setores que têm grades
    let query = supabase
      .from('grades')
      .select('setor_id')
      .not('setor_id', 'is', null)

    if (!userIsAdmin && claims.grupo_ids?.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    }

    const { data: grades, error: gradesError } = await query

    if (gradesError || !grades || grades.length === 0) {
      return []
    }

    const setorIds = [...new Set(grades.map((g: any) => g.setor_id))]

    const { data: setores, error: setoresError } = await supabase
      .from('setores')
      .select('id, nome')
      .in('id', setorIds)

    if (setoresError) {
      console.error('[API /relatorios/filtros GET] Erro ao buscar setores:', setoresError)
      return []
    }

    return (setores || [])
      .map((s: any) => ({ setor_id: s.id, setor_nome: s.nome }))
      .sort((a: any, b: any) => a.setor_nome.localeCompare(b.setor_nome, 'pt-BR'))
  }

  // Buscar de vw_folha_pagamento
  let query = supabase
    .from('vw_folha_pagamento')
    .select('setor_id, setor_nome')

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar setores:', error)
    return []
  }

  // Remover duplicados e ordenar
  const unicos = (data || []).reduce((acc: any[], curr: any) => {
    if (!acc.find((s: any) => s.setor_id === curr.setor_id)) {
      acc.push(curr)
    }
    return acc
  }, [])

  return unicos.sort((a: any, b: any) =>
    a.setor_nome.localeCompare(b.setor_nome, 'pt-BR')
  )
}

async function getMedicos(supabase: any, source: string, claims: any, userIsAdmin: boolean) {
  if (source === 'produtividade') {
    // Buscar médicos que têm candidaturas aprovadas
    let query = supabase
      .from('vw_vagas_candidaturas')
      .select('medico_id, medico_primeiro_nome, medico_sobrenome')
      .eq('candidatura_status', 'APROVADO')
      .not('medico_id', 'is', null)
      .not('medico_primeiro_nome', 'is', null)

    if (!userIsAdmin && claims.grupo_ids?.length > 0) {
      query = query.in('grupo_id', claims.grupo_ids)
    }

    const { data, error } = await query

    if (error) {
      console.error('[API /relatorios/filtros GET] Erro ao buscar médicos:', error)
      return []
    }

    // Remover duplicados
    const medicosMap = new Map()
    data?.forEach((item: any) => {
      if (item.medico_id && item.medico_primeiro_nome) {
        medicosMap.set(item.medico_id, {
          medico_id: item.medico_id,
          medico_primeiro_nome: item.medico_primeiro_nome,
          medico_sobrenome: item.medico_sobrenome,
        })
      }
    })

    const medicos = Array.from(medicosMap.values())

    return medicos.sort((a: any, b: any) => {
      const nomeA = `${a.medico_primeiro_nome} ${a.medico_sobrenome || ''}`
      const nomeB = `${b.medico_primeiro_nome} ${b.medico_sobrenome || ''}`
      return nomeA.localeCompare(nomeB, 'pt-BR')
    })
  }

  // Buscar de vw_folha_pagamento
  let query = supabase
    .from('vw_folha_pagamento')
    .select('medico_id, medico_primeironome, medico_sobrenome')

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar médicos:', error)
    return []
  }

  // Remover duplicados e ordenar
  const unicos = (data || []).reduce((acc: any[], curr: any) => {
    if (!acc.find((d: any) => d.id === curr.medico_id)) {
      acc.push({
        id: curr.medico_id,
        medico_primeironome: curr.medico_primeironome,
        medico_sobrenome: curr.medico_sobrenome,
      })
    }
    return acc
  }, [])

  return unicos.sort((a: any, b: any) => {
    const nomeA = `${a.medico_primeironome || ''} ${a.medico_sobrenome || ''}`
    const nomeB = `${b.medico_primeironome || ''} ${b.medico_sobrenome || ''}`
    return nomeA.localeCompare(nomeB, 'pt-BR')
  })
}

async function getEscalistas(supabase: any, claims: any, userIsAdmin: boolean) {
  // Buscar escalistas que aprovaram candidaturas
  let query = supabase
    .from('vw_vagas_candidaturas')
    .select('candidatura_updateby, escalista_nome')
    .eq('candidatura_status', 'APROVADO')
    .not('candidatura_updateby', 'is', null)

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar escalistas:', error)
    return []
  }

  // Remover duplicados
  const escalistasMap = new Map()
  data?.forEach((item: any) => {
    if (item.candidatura_updateby && item.escalista_nome) {
      escalistasMap.set(item.candidatura_updateby, {
        escalista_uuid: item.candidatura_updateby,
        escalista_nome: item.escalista_nome,
      })
    }
  })

  const escalistas = Array.from(escalistasMap.values())

  return escalistas.sort((a: any, b: any) =>
    (a.escalista_nome || '').localeCompare(b.escalista_nome || '', 'pt-BR')
  )
}

async function getGrades(supabase: any, claims: any, userIsAdmin: boolean) {
  // Buscar grades de candidaturas aprovadas
  let query = supabase
    .from('vw_vagas_candidaturas')
    .select('grade_id, grade_nome')
    .eq('candidatura_status', 'APROVADO')
    .not('grade_id', 'is', null)
    .not('grade_nome', 'is', null)
    .neq('grade_nome', 'Não informado')

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data, error } = await query

  if (error) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar grades:', error)
    return []
  }

  // Remover duplicados
  const gradesMap = new Map()
  data?.forEach((item: any) => {
    if (item.grade_id && item.grade_nome) {
      gradesMap.set(item.grade_id, item.grade_nome)
    }
  })

  const grades = Array.from(gradesMap.entries()).map(([grade_id, grade_nome]) => ({
    grade_id,
    grade_nome,
  }))

  return grades.sort((a: any, b: any) =>
    a.grade_nome.localeCompare(b.grade_nome, 'pt-BR')
  )
}

async function getGrupos(supabase: any, claims: any, userIsAdmin: boolean) {
  // Buscar grupos que têm grades
  let query = supabase
    .from('grades')
    .select('grupo_id')
    .not('grupo_id', 'is', null)

  if (!userIsAdmin && claims.grupo_ids?.length > 0) {
    query = query.in('grupo_id', claims.grupo_ids)
  }

  const { data: grades, error: gradesError } = await query

  if (gradesError || !grades || grades.length === 0) {
    return []
  }

  const grupoIds = [...new Set(grades.map((g: any) => g.grupo_id))]

  const { data: grupos, error: gruposError } = await supabase
    .from('grupos')
    .select('id, nome')
    .in('id', grupoIds)

  if (gruposError) {
    console.error('[API /relatorios/filtros GET] Erro ao buscar grupos:', gruposError)
    return []
  }

  return (grupos || [])
    .map((g: any) => ({ grupo_id: g.id, grupo_nome: g.nome }))
    .sort((a: any, b: any) => a.grupo_nome.localeCompare(b.grupo_nome, 'pt-BR'))
}

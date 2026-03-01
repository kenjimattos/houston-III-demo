import { NextRequest, NextResponse } from 'next/server'
import { getJWTClaims, isAdmin } from '@/lib/auth/jwtHelper'
import { getServerClient } from '@/lib/supabase/serverClient'
import { GradeConfiguration } from '@/services/gradesService'

/**
 * API Route: Publicar Grade (Gerar Vagas)
 *
 * POST /api/grades/[id]/publicar
 *
 * Corpo da requisição:
 * {
 *   data_inicio: string (YYYY-MM-DD)
 *   data_fim: string (YYYY-MM-DD)
 * }
 *
 * Esta rota:
 * 1. Busca a grade e valida permissões
 * 2. Remove vagas antigas da mesma grade no período (sobrescrita)
 * 3. Gera novas vagas baseadas na estrutura da grade
 * 4. Cria candidaturas para médicos pré-designados
 */

interface TimeSlot {
  id?: string
  startHour: number
  endHour: number
  lineIndex?: number
  dayIndex?: number
  assignedVagas?: Array<{
    medicoId: string
    medicoNome: string
  }>
}

interface PeriodoInfo {
  periodo: string
  duracao: number
  descricao: string
}

// Detectar período do plantão baseado nos horários
function detectarPeriodo(startHour: number, endHour: number): PeriodoInfo {
  const duracao = endHour > startHour ? endHour - startHour : 24 - startHour + endHour

  if (duracao === 12) {
    if (startHour >= 5 && startHour < 17) {
      return { periodo: 'Diurno', duracao, descricao: 'Plantão diurno de 12 horas' }
    } else {
      return { periodo: 'Noturno', duracao, descricao: 'Plantão noturno de 12 horas' }
    }
  }

  if (duracao === 6) {
    if (startHour >= 5 && startHour < 13) {
      return { periodo: 'Meio período (manhã)', duracao, descricao: 'Plantão matutino de 6 horas' }
    } else if (startHour >= 13 && startHour < 17) {
      return { periodo: 'Meio período (tarde)', duracao, descricao: 'Plantão vespertino de 6 horas' }
    } else {
      return { periodo: 'Cinderela', duracao, descricao: 'Plantão noturno de 6 horas (Cinderela)' }
    }
  }

  if (startHour === 19 && endHour === 1) {
    return { periodo: 'Cinderela', duracao: 6, descricao: 'Plantão noturno de 6 horas (Cinderela)' }
  }

  if (startHour >= 5 && startHour < 12) {
    return { periodo: 'Diurno', duracao, descricao: `Plantão diurno de ${duracao} horas` }
  } else if (startHour >= 12 && startHour < 18) {
    return { periodo: 'Vespertino', duracao, descricao: `Plantão vespertino de ${duracao} horas` }
  } else {
    return { periodo: 'Noturno', duracao, descricao: `Plantão noturno de ${duracao} horas` }
  }
}

// Calcular valor baseado na configuração
function calcularValorPorHora(config: GradeConfiguration, duracaoHoras: number) {
  if (!config.tipoCalculo) {
    throw new Error('Tipo de cálculo não definido na configuração da grade')
  }

  if (config.tipoCalculo === 'valor_hora') {
    if (!config.valorPorHora) {
      throw new Error('Valor por hora não definido na configuração da grade')
    }
    return {
      valorPorHora: config.valorPorHora,
      valorTotal: Math.round(config.valorPorHora * duracaoHoras),
      duracaoHoras,
      tipoCalculo: 'valor_hora' as const
    }
  }

  if (config.tipoCalculo === 'valor_plantao') {
    if (!config.valorPorPlantao || !config.horasPlantao) {
      throw new Error('Valor por plantão ou horas do plantão não definidos na configuração da grade')
    }
    const valorPorHoraCalculado = config.valorPorPlantao / config.horasPlantao
    return {
      valorPorHora: valorPorHoraCalculado,
      valorTotal: Math.round(valorPorHoraCalculado * duracaoHoras),
      duracaoHoras,
      tipoCalculo: 'valor_plantao' as const
    }
  }

  throw new Error('Tipo de cálculo inválido')
}

// Calcular data de pagamento
function calcularDataPagamento(dataPlantao: Date, diasPagamento: GradeConfiguration['diasPagamento']): Date {
  const data = new Date(dataPlantao)
  switch (diasPagamento) {
    case 'vista':
      data.setDate(data.getDate() + 1)
      break
    case '30dias':
      data.setDate(data.getDate() + 30)
      break
    case '45dias':
      data.setDate(data.getDate() + 45)
      break
    case '60dias':
      data.setDate(data.getDate() + 60)
      break
    default:
      data.setDate(data.getDate() + 30)
  }
  return data
}

// Calcular data real da vaga considerando horários de dia seguinte
function calcularDataRealDaVaga(dataBase: Date, startHour: number, weekStartHour: number): Date {
  const dataVaga = new Date(dataBase)
  // Se startHour < weekStartHour, significa que o slot começa no dia seguinte
  if (startHour < weekStartHour) {
    dataVaga.setDate(dataVaga.getDate() + 1)
  }
  return dataVaga
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getServerClient()

  try {
    const { id: gradeId } = await params
    const claims = await getJWTClaims()

    console.log('[API /grades/[id]/publicar] Iniciando publicação da grade:', gradeId)

    if (!claims) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar permissão
    if (!claims.permissions.includes('vagas.insert') && claims.user_role !== 'administrador') {
      return NextResponse.json({ error: 'Sem permissão para publicar grades' }, { status: 403 })
    }

    // Parse do body
    const body = await request.json()
    const { data_inicio, data_fim } = body

    if (!data_inicio || !data_fim) {
      return NextResponse.json(
        { error: 'data_inicio e data_fim são obrigatórios' },
        { status: 400 }
      )
    }

    // 1. Buscar a grade
    let gradeQuery = supabase
      .from('grades')
      .select('*')
      .eq('id', gradeId)

    if (!isAdmin(claims)) {
      if (claims.grupo_ids && claims.grupo_ids.length > 0) {
        gradeQuery = gradeQuery.in('grupo_id', claims.grupo_ids)
      } else {
        return NextResponse.json({ error: 'Sem permissão para acessar esta grade' }, { status: 403 })
      }
    }

    const { data: grade, error: gradeError } = await gradeQuery.single()

    if (gradeError || !grade) {
      console.error('[API /grades/[id]/publicar] Grade não encontrada:', gradeError)
      return NextResponse.json({ error: 'Grade não encontrada' }, { status: 404 })
    }

    // Validar configuração
    const configuracao = grade.configuracao as GradeConfiguration
    if (!configuracao?.tipoCalculo) {
      return NextResponse.json(
        { error: 'Grade não possui configuração de pagamento. Configure os valores antes de publicar.' },
        { status: 400 }
      )
    }

    // 2. Buscar dados do escalista
    const { data: escalista, error: escalistaError } = await supabase
      .from('escalistas')
      .select('grupo_id, id')
      .eq('id', claims.sub)
      .single()

    if (escalistaError || !escalista?.grupo_id || !escalista?.id) {
      console.error('[API /grades/[id]/publicar] Escalista não encontrado:', escalistaError)
      return NextResponse.json({ error: 'Dados do escalista não encontrados' }, { status: 400 })
    }

    // 3. Buscar períodos do banco
    const { data: periodos, error: periodosError } = await supabase
      .from('periodos')
      .select('id, nome')

    if (periodosError || !periodos) {
      console.error('[API /grades/[id]/publicar] Erro ao buscar períodos:', periodosError)
      return NextResponse.json({ error: 'Erro ao buscar períodos' }, { status: 500 })
    }

    // 4. SOBRESCRITA: Buscar e deletar vagas antigas da mesma grade no período
    const { data: vagasAntigas, error: vagasAntigasError } = await supabase
      .from('vagas')
      .select('id')
      .eq('grade_id', gradeId)
      .gte('data', data_inicio)
      .lte('data', data_fim)
      .neq('status', 'cancelada')

    if (vagasAntigasError) {
      console.error('[API /grades/[id]/publicar] Erro ao buscar vagas antigas:', vagasAntigasError)
      return NextResponse.json({ error: 'Erro ao verificar vagas existentes' }, { status: 500 })
    }

    let vagasRemovidas = 0
    if (vagasAntigas && vagasAntigas.length > 0) {
      const vagasIds = vagasAntigas.map(v => v.id)

      // Deletar vagas antigas (hard delete)
      const { error: deleteError } = await supabase
        .from('vagas')
        .delete()
        .in('id', vagasIds)

      if (deleteError) {
        console.error('[API /grades/[id]/publicar] Erro ao deletar vagas antigas:', deleteError)
        return NextResponse.json(
          { error: `Erro ao remover vagas antigas: ${deleteError.message}` },
          { status: 500 }
        )
      }

      vagasRemovidas = vagasAntigas.length
      console.log(`[API /grades/[id]/publicar] ${vagasRemovidas} vagas antigas removidas`)
    }

    // 5. Extrair todos os slots da grade
    const slotsByDay = configuracao.slotsByDay || {}
    const todosSlots: TimeSlot[] = []

    Object.keys(slotsByDay).forEach((lineIndexStr) => {
      const lineIndex = parseInt(lineIndexStr)
      const semanaSlots = slotsByDay[lineIndex]

      Object.keys(semanaSlots || {}).forEach((dayIndexStr) => {
        const dayIndex = parseInt(dayIndexStr)
        const daySlots = semanaSlots[dayIndex] || []

        daySlots.forEach((slot: any) => {
          todosSlots.push({
            ...slot,
            lineIndex,
            dayIndex,
          })
        })
      })
    })

    if (todosSlots.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum horário encontrado na grade. Adicione horários antes de publicar.' },
        { status: 400 }
      )
    }

    // 6. Organizar slots por semana
    const slotsPorSemana: { [lineIndex: number]: TimeSlot[] } = {}
    todosSlots.forEach((slot) => {
      if (!slotsPorSemana[slot.lineIndex!]) {
        slotsPorSemana[slot.lineIndex!] = []
      }
      slotsPorSemana[slot.lineIndex!].push(slot)
    })

    // 7. Calcular período e criar vagas
    const dataInicioDate = new Date(data_inicio + 'T00:00:00')
    const dataFimDate = new Date(data_fim + 'T00:00:00')
    const diasTotal = Math.ceil((dataFimDate.getTime() - dataInicioDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const chavesSemanasOrdenadas = Object.keys(slotsPorSemana).map(k => parseInt(k)).sort((a, b) => a - b)
    const semanasGrade = chavesSemanasOrdenadas.length

    // Criar array sequencial de slots
    const todosSlotsDaGradeSequencial: {
      slot: TimeSlot
      posicaoNaGrade: number
      semanaGrade: number
      diaGrade: number
    }[] = []

    chavesSemanasOrdenadas.forEach((semanaIndex, semanaPos) => {
      const slotsDestaSemana = slotsPorSemana[semanaIndex] || []
      for (let dia = 0; dia < 7; dia++) {
        const slotsDesteDia = slotsDestaSemana.filter((slot) => slot.dayIndex === dia)
        slotsDesteDia.forEach((slot) => {
          todosSlotsDaGradeSequencial.push({
            slot,
            posicaoNaGrade: semanaPos * 7 + dia,
            semanaGrade: semanaPos,
            diaGrade: dia,
          })
        })
      }
    })

    const totalDiasNaGrade = semanasGrade * 7

    // Detectar dia da semana inicial
    const diaInicialJS = dataInicioDate.getDay()
    const diaInicialFrontend = diaInicialJS === 0 ? 6 : diaInicialJS - 1

    // Mapear vagas a criar
    const vagasParaCriar: {
      slot: TimeSlot
      medicoId: string | null
      medicoNome: string | null
      data: Date
    }[] = []

    for (let diaOffset = 0; diaOffset < diasTotal; diaOffset++) {
      const dataAtual = new Date(dataInicioDate)
      dataAtual.setDate(dataInicioDate.getDate() + diaOffset)

      const posicaoAbsolutaNaGrade = (diaInicialFrontend + diaOffset) % totalDiasNaGrade
      const slotsDoHoje = todosSlotsDaGradeSequencial.filter(
        (item) => item.posicaoNaGrade === posicaoAbsolutaNaGrade
      )

      slotsDoHoje.forEach((item) => {
        const slot = item.slot
        const lineIndexDoSlot = slot.lineIndex!
        const weekStartHour = configuracao.weekStartHours?.[lineIndexDoSlot] || grade.horario_inicial || 7
        const dataRealDaVaga = calcularDataRealDaVaga(dataAtual, slot.startHour, weekStartHour)

        if (!slot.assignedVagas || slot.assignedVagas.length === 0) {
          vagasParaCriar.push({
            slot,
            medicoId: null,
            medicoNome: null,
            data: dataRealDaVaga,
          })
        } else {
          slot.assignedVagas.forEach((medico: any) => {
            vagasParaCriar.push({
              slot,
              medicoId: medico.medicoId,
              medicoNome: medico.medicoNome,
              data: dataRealDaVaga,
            })
          })
        }
      })
    }

    // 8. Criar recorrência
    const recorrenciaId = crypto.randomUUID()
    const { error: recorrenciaError } = await supabase
      .from('vagas_recorrencias')
      .insert([{
        id: recorrenciaId,
        data_inicio: data_inicio,
        data_fim: data_fim,
        dias_semana: [],
        created_by: claims.sub,
        created_at: new Date().toISOString(),
        observacoes: `Grade ${grade.nome} - ${vagasParaCriar.length} vagas individuais`,
      }])

    if (recorrenciaError) {
      console.error('[API /grades/[id]/publicar] Erro ao criar recorrência:', recorrenciaError)
      return NextResponse.json(
        { error: `Erro ao criar recorrência: ${recorrenciaError.message}` },
        { status: 500 }
      )
    }

    // 9. Criar vagas
    let vagasCriadas = 0
    let conflitos = 0
    let outrosErros = 0
    const errosDetalhados: string[] = []

    for (const vaga of vagasParaCriar) {
      try {
        const endHourNormalizado = vaga.slot.endHour % 24
        const periodoInfo = detectarPeriodo(vaga.slot.startHour, endHourNormalizado)

        // Buscar período UUID
        const periodoEncontrado = periodos.find(
          p => p.nome.toLowerCase() === periodoInfo.periodo.toLowerCase()
        )
        if (!periodoEncontrado) {
          errosDetalhados.push(`Período '${periodoInfo.periodo}' não encontrado`)
          outrosErros++
          continue
        }

        // Calcular valor
        const duracaoReal = vaga.slot.endHour > vaga.slot.startHour
          ? vaga.slot.endHour - vaga.slot.startHour
          : 24 - vaga.slot.startHour + (vaga.slot.endHour % 24)
        const calculo = calcularValorPorHora(configuracao, duracaoReal)

        // Normalizar horários
        const startHourNum = Number(vaga.slot.startHour) % 24
        const endHourNum = Number(vaga.slot.endHour) % 24
        const horaInicioFormatada = `${startHourNum.toString().padStart(2, '0')}:00`
        const horaFimFormatada = `${endHourNum.toString().padStart(2, '0')}:00`

        // Verificar conflito se há médico designado
        if (vaga.medicoId) {
          const { data: conflitoData, error: conflitoError } = await supabase.rpc(
            'verificar_conflito_vaga_designada',
            {
              p_medico_id: vaga.medicoId,
              p_data: vaga.data.toISOString().slice(0, 10),
              p_hora_inicio: horaInicioFormatada,
              p_hora_fim: horaFimFormatada,
            }
          )

          if (conflitoError) {
            console.error('[API /grades/[id]/publicar] Erro ao verificar conflito:', conflitoError)
          }

          if (conflitoData === true) {
            conflitos++
            continue
          }
        }

        // Criar vaga
        const vagaInsert = {
          hospital_id: grade.hospital_id,
          periodo_id: periodoEncontrado.id,
          hora_inicio: horaInicioFormatada,
          hora_fim: horaFimFormatada,
          grade_id: gradeId,
          valor: calculo.valorTotal,
          data: vaga.data.toISOString().slice(0, 10),
          data_pagamento: calcularDataPagamento(vaga.data, configuracao.diasPagamento!).toISOString().slice(0, 10),
          tipos_vaga_id: configuracao.tipoVaga!,
          observacoes: vaga.medicoNome
            ? `Médico designado via grade: ${vaga.medicoNome}`
            : configuracao.observacoesPadrao || '',
          setor_id: grade.setor_id,
          status: vaga.medicoId ? 'fechada' : 'aberta',
          total_candidaturas: 0,
          especialidade_id: grade.especialidade_id,
          forma_recebimento_id: configuracao.formaRecebimento || '',
          grupo_id: escalista.grupo_id,
          escalista_id: escalista.id,
          updated_by: claims.sub,
          updated_at: new Date().toISOString(),
          recorrencia_id: recorrenciaId,
        }

        const { data: vagaCriada, error: vagaError } = await supabase
          .from('vagas')
          .insert([vagaInsert])
          .select()
          .single()

        if (vagaError) {
          console.error('[API /grades/[id]/publicar] Erro ao criar vaga:', vagaError)
          errosDetalhados.push(vagaError.message)
          outrosErros++
          continue
        }

        // Criar candidatura se há médico designado
        if (vaga.medicoId && vagaCriada) {
          const { error: candidaturaError } = await supabase
            .from('candidaturas')
            .insert([{
              vaga_id: vagaCriada.id,
              medico_id: vaga.medicoId,
              status: 'APROVADO',
              vaga_valor: calculo.valorTotal,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }])

          if (candidaturaError) {
            console.error('[API /grades/[id]/publicar] Erro ao criar candidatura:', candidaturaError)
            // Deletar vaga órfã
            await supabase.from('vagas').delete().eq('id', vagaCriada.id)
            conflitos++
            continue
          }
        }

        vagasCriadas++
      } catch (error: any) {
        console.error('[API /grades/[id]/publicar] Erro ao processar vaga:', error)
        errosDetalhados.push(error.message || 'Erro desconhecido')
        outrosErros++
      }
    }

    console.log(`[API /grades/[id]/publicar] Resultado: criadas=${vagasCriadas}, conflitos=${conflitos}, erros=${outrosErros}, removidas=${vagasRemovidas}`)

    return NextResponse.json({
      data: {
        vagasCriadas,
        conflitos,
        outrosErros,
        vagasRemovidas,
        errosDetalhados: errosDetalhados.slice(0, 10), // Limitar a 10 erros
      }
    })

  } catch (error: any) {
    console.error('[API /grades/[id]/publicar] Erro inesperado:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

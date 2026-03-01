/**
 * Utilitários para calcular valores de plantão
 * Suporta dois modos: valor por hora ou valor por plantão
 */

import { GradeConfiguration } from '@/services/gradesService'

export interface CalculoValor {
  valorPorHora: number
  valorTotal: number
  duracaoHoras: number
  tipoCalculo: 'valor_hora' | 'valor_plantao'
}

/**
 * Calcula o valor por hora baseado na configuração da grade
 * @param config - Configuração da grade
 * @param duracaoHoras - Duração real do plantão em horas
 * @returns Informações do cálculo
 */
export function calcularValorPorHora(
  config: GradeConfiguration, 
  duracaoHoras: number
): CalculoValor {
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
      tipoCalculo: 'valor_hora'
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
      tipoCalculo: 'valor_plantao'
    }
  }

  throw new Error('Tipo de cálculo inválido')
}

/**
 * Valida se a configuração de valores está completa
 * @param config - Configuração da grade
 * @returns Lista de erros encontrados
 */
export function validarConfiguracaoValores(config: GradeConfiguration): string[] {
  const erros: string[] = []

  if (!config.tipoCalculo) {
    erros.push('Tipo de cálculo deve ser selecionado')
    return erros
  }

  if (config.tipoCalculo === 'valor_hora') {
    if (!config.valorPorHora || config.valorPorHora <= 0) {
      erros.push('Valor por hora deve ser maior que zero')
    }
  }

  if (config.tipoCalculo === 'valor_plantao') {
    if (!config.valorPorPlantao || config.valorPorPlantao <= 0) {
      erros.push('Valor por plantão deve ser maior que zero')
    }
    if (!config.horasPlantao || config.horasPlantao <= 0) {
      erros.push('Quantidade de horas do plantão deve ser maior que zero')
    }
  }

  if (!config.diasPagamento) {
    erros.push('Prazo de pagamento deve ser selecionado')
  }

  return erros
}

/**
 * Formata valor para exibição no formato brasileiro
 * @param valor - Valor numérico
 * @returns String formatada
 */
export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

/**
 * Calcula data de pagamento baseada no prazo selecionado
 * @param dataPlantao - Data do plantão
 * @param diasPagamento - Prazo selecionado
 * @returns Data calculada
 */
export function calcularDataPagamento(
  dataPlantao: Date,
  diasPagamento: GradeConfiguration['diasPagamento']
): Date {
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
      data.setDate(data.getDate() + 30) // Fallback para 30 dias
  }
  
  return data
}

/**
 * Exemplo de uso e preview de cálculos
 */
export function previewCalculos(config: GradeConfiguration, duracaoHoras: number) {
  try {
    const calculo = calcularValorPorHora(config, duracaoHoras)
    const dataExemplo = new Date()
    const dataPagamento = calcularDataPagamento(dataExemplo, config.diasPagamento)
    
    return {
      sucesso: true,
      valorPorHora: formatarValor(calculo.valorPorHora),
      valorTotal: formatarValor(calculo.valorTotal),
      duracaoHoras: calculo.duracaoHoras,
      tipoCalculo: calculo.tipoCalculo,
      dataPagamento: dataPagamento.toLocaleDateString('pt-BR'),
      configuracao: {
        diasPagamento: config.diasPagamento,
        formaRecebimento: config.formaRecebimento,
        tipoVaga: config.tipoVaga
      }
    }
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}
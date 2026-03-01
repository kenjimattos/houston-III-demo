/**
 * Grades Service - Refatorado para usar API Routes
 *
 * IMPORTANTE: Este service agora usa /api/grades em vez de Supabase direto
 * Filtros de grupo são aplicados no backend (grupo_ids do JWT)
 * Filtros de hospital/setor são opcionais (UX)
 */

export interface Grade {
  id: string
  grupo_id: string
  nome: string
  especialidade_id: string
  setor_id: string
  hospital_id: string
  cor: string
  horario_inicial: number
  ordem?: number
  configuracao: GradeConfiguration
  created_at?: string
  updated_at?: string
  created_by?: string
  updated_by?: string
}

export interface GradeConfiguration {
  lineNames?: { [lineIndex: number]: string }
  selectedDays?: { [lineIndex: number]: boolean[] }
  subLines?: { [lineIndex: number]: any[] }
  slotsByDay?: { [lineIndex: number]: { [dayIndex: number]: any[] } }
  subLinesByDay?: { [lineIndex: number]: { [dayIndex: number]: any[] } }
  weekStartHours?: { [lineIndex: number]: number }
  slots?: any[] // Para compatibilidade com estrutura local

  // Configurações para geração de vagas
  tipoCalculo?: 'valor_hora' | 'valor_plantao'
  valorPorHora?: number
  valorPorPlantao?: number
  horasPlantao?: number
  diasPagamento?: 'vista' | '30dias' | '45dias' | '60dias'
  formaRecebimento?: string
  tipoVaga?: string
  observacoesPadrao?: string
}

class GradesService {
  // Buscar todas as grades do grupo do usuário
  async fetchGrades(filters?: {
    hospitalIds?: string[]
    setorIds?: string[]
  }): Promise<Grade[]> {
    const params = new URLSearchParams()

    // Filtros opcionais de UX (hospital/setor)
    filters?.hospitalIds?.forEach(id => params.append('hospital_id', id))
    filters?.setorIds?.forEach(id => params.append('setor_id', id))

    const response = await fetch(`/api/grades?${params}`, {
      credentials: 'include' // Envia cookies (JWT) para API route
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao buscar grades')
    }

    const { data } = await response.json()
    return data as Grade[]
  }

  // Buscar uma grade específica
  async fetchGrade(gradeId: string): Promise<Grade> {
    const response = await fetch(`/api/grades/${gradeId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao buscar grade')
    }

    const { data } = await response.json()
    return data as Grade
  }

  // Criar nova grade
  async createGrade(gradeData: {
    nome: string
    especialidade_id: string
    setor_id: string
    hospital_id: string
    cor: string
    horario_inicial?: number
    configuracao?: GradeConfiguration
  }): Promise<Grade> {
    const response = await fetch('/api/grades', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gradeData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao criar grade')
    }

    const { data } = await response.json()
    return data as Grade
  }

  // Atualizar grade existente
  async updateGrade(gradeId: string, updates: Partial<Grade>): Promise<Grade> {
    const response = await fetch(`/api/grades/${gradeId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao atualizar grade')
    }

    const { data } = await response.json()
    return data as Grade
  }

  // Deletar grade
  async deleteGrade(gradeId: string): Promise<void> {
    const response = await fetch(`/api/grades/${gradeId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao deletar grade')
    }
  }

  // Duplicar grade
  async duplicateGrade(gradeId: string, novoNome: string): Promise<Grade> {
    const gradeOriginal = await this.fetchGrade(gradeId)

    const { id, created_at, updated_at, created_by, updated_by, grupo_id, ordem, ...gradeData } = gradeOriginal

    return this.createGrade({
      ...gradeData,
      nome: novoNome
    })
  }

  // Atualizar ordenação de múltiplas grades em batch
  async updateGradesOrder(
    updates: Array<{ gradeId: string; ordem: number }>
  ): Promise<void> {
    // Executar todas as atualizações em paralelo via API
    const promises = updates.map(({ gradeId, ordem }) =>
      fetch(`/api/grades/${gradeId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ordem })
      })
    )

    const results = await Promise.all(promises)

    // Verificar se alguma atualização falhou
    const errors = results.filter(r => !r.ok)
    if (errors.length > 0) {
      const errorData = await errors[0].json()
      throw new Error(`Falha ao atualizar ordenação: ${errorData.error}`)
    }
  }

  // Publicar grade (gerar vagas)
  async publicarGrade(
    gradeId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<{
    vagasCriadas: number
    conflitos: number
    outrosErros: number
    vagasRemovidas: number
    errosDetalhados?: string[]
  }> {
    const response = await fetch(`/api/grades/${gradeId}/publicar`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data_inicio: dataInicio,
        data_fim: dataFim
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao publicar grade')
    }

    const { data } = await response.json()
    return data
  }
}

export const gradesService = new GradesService()
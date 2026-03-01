import { useState, useEffect, useCallback } from 'react'
import { gradesService, Grade } from '@/services/gradesService'

export function useGrades() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Buscar todas as grades
  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await gradesService.fetchGrades()
      setGrades(data)
    } catch (err) {
      setError(err as Error)
      // Toast é exibido na página que consome este hook
    } finally {
      setLoading(false)
    }
  }, [])

  // Criar nova grade (salva no banco imediatamente)
  const createGrade = async (gradeData: {
    nome: string
    especialidade_id: string
    setor_id: string
    hospital_id: string
    cor: string
    horario_inicial?: number
  }) => {
    try {
      setSaving(true)
      const newGrade = await gradesService.createGrade(gradeData)
      setGrades(prev => [...prev, newGrade])
      return newGrade
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  // Atualizar grade (salva no banco imediatamente - só quando usuário clicar em salvar)
  const updateGrade = async (gradeId: string, updates: Partial<Grade>) => {
    try {
      setSaving(true)
      const updatedGrade = await gradesService.updateGrade(gradeId, updates)
      setGrades(prev => prev.map(g => g.id === gradeId ? updatedGrade : g))
      return updatedGrade
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  // Deletar grade
  const deleteGrade = async (gradeId: string) => {
    try {
      setSaving(true)
      await gradesService.deleteGrade(gradeId)
      setGrades(prev => prev.filter(g => g.id !== gradeId))
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  // Duplicar grade
  const duplicateGrade = async (gradeId: string, novoNome: string) => {
    try {
      setSaving(true)
      const newGrade = await gradesService.duplicateGrade(gradeId, novoNome)
      setGrades(prev => [...prev, newGrade])
      return newGrade
    } catch (err) {
      throw err
    } finally {
      setSaving(false)
    }
  }

  // Carregar grades ao montar
  useEffect(() => {
    fetchGrades()
  }, [fetchGrades])

  return {
    grades,
    loading,
    saving,
    error,
    fetchGrades,
    createGrade,
    updateGrade,
    deleteGrade,
    duplicateGrade
  }
}

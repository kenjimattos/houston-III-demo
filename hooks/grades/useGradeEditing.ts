import { useState, useCallback } from 'react'

interface GradeEditingState {
  editingGradeId: string | null
  editingGradeHorario: number
  editingDayIndex: number | null
  editingColorGradeId: string | null
  editingPaymentGradeId: string | null
}

interface UseGradeEditingReturn {
  // Estados principais
  editingGradeId: string | null
  setEditingGradeId: React.Dispatch<React.SetStateAction<string | null>>
  editingGradeHorario: number
  setEditingGradeHorario: React.Dispatch<React.SetStateAction<number>>
  editingDayIndex: number | null
  setEditingDayIndex: React.Dispatch<React.SetStateAction<number | null>>
  editingColorGradeId: string | null
  setEditingColorGradeId: React.Dispatch<React.SetStateAction<string | null>>
  editingPaymentGradeId: string | null
  setEditingPaymentGradeId: React.Dispatch<React.SetStateAction<string | null>>
  
  // Métodos utilitários
  startGradeEditing: (gradeId: string, horarioInicial?: number) => void
  stopGradeEditing: () => void
  startColorEditing: (gradeId: string) => void
  stopColorEditing: () => void
  startPaymentEditing: (gradeId: string) => void
  stopPaymentEditing: () => void
  startDayEditing: (dayIndex: number) => void
  stopDayEditing: () => void
  isEditingGrade: (gradeId: string) => boolean
  isEditingColor: (gradeId: string) => boolean
  isEditingPayment: (gradeId: string) => boolean
  isEditingDay: (dayIndex: number) => boolean
  clearAllEditing: () => void
}

export const useGradeEditing = (): UseGradeEditingReturn => {
  // Estados de edição consolidados
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)
  const [editingGradeHorario, setEditingGradeHorario] = useState<number>(7)
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)
  const [editingColorGradeId, setEditingColorGradeId] = useState<string | null>(null)
  const [editingPaymentGradeId, setEditingPaymentGradeId] = useState<string | null>(null)
  
  // Iniciar edição de grade
  const startGradeEditing = useCallback((gradeId: string, horarioInicial: number = 7) => {
    setEditingGradeId(gradeId)
    setEditingGradeHorario(horarioInicial)
    // Limpar outras edições
    setEditingColorGradeId(null)
    setEditingPaymentGradeId(null)
    setEditingDayIndex(null)
  }, [])
  
  // Parar edição de grade
  const stopGradeEditing = useCallback(() => {
    setEditingGradeId(null)
    setEditingGradeHorario(7)
    setEditingDayIndex(null)
  }, [])
  
  // Iniciar edição de cor
  const startColorEditing = useCallback((gradeId: string) => {
    setEditingColorGradeId(gradeId)
    // Limpar outras edições
    setEditingGradeId(null)
    setEditingPaymentGradeId(null)
    setEditingDayIndex(null)
  }, [])
  
  // Parar edição de cor
  const stopColorEditing = useCallback(() => {
    setEditingColorGradeId(null)
  }, [])
  
  // Iniciar edição de pagamento
  const startPaymentEditing = useCallback((gradeId: string) => {
    setEditingPaymentGradeId(gradeId)
    // Limpar outras edições
    setEditingGradeId(null)
    setEditingColorGradeId(null)
    setEditingDayIndex(null)
  }, [])
  
  // Parar edição de pagamento
  const stopPaymentEditing = useCallback(() => {
    setEditingPaymentGradeId(null)
  }, [])
  
  // Iniciar edição de dia específico
  const startDayEditing = useCallback((dayIndex: number) => {
    setEditingDayIndex(dayIndex)
    // Limpar edições de grade, cor e pagamento (mas manter grade principal se existir)
  }, [])
  
  // Parar edição de dia
  const stopDayEditing = useCallback(() => {
    setEditingDayIndex(null)
  }, [])
  
  // Verificar se uma grade está sendo editada
  const isEditingGrade = useCallback((gradeId: string) => {
    return editingGradeId === gradeId
  }, [editingGradeId])
  
  // Verificar se cor está sendo editada
  const isEditingColor = useCallback((gradeId: string) => {
    return editingColorGradeId === gradeId
  }, [editingColorGradeId])
  
  // Verificar se pagamento está sendo editado
  const isEditingPayment = useCallback((gradeId: string) => {
    return editingPaymentGradeId === gradeId
  }, [editingPaymentGradeId])
  
  // Verificar se dia está sendo editado
  const isEditingDay = useCallback((dayIndex: number) => {
    return editingDayIndex === dayIndex
  }, [editingDayIndex])
  
  // Limpar todas as edições
  const clearAllEditing = useCallback(() => {
    setEditingGradeId(null)
    setEditingGradeHorario(7)
    setEditingDayIndex(null)
    setEditingColorGradeId(null)
    setEditingPaymentGradeId(null)
  }, [])
  
  return {
    // Estados principais
    editingGradeId,
    setEditingGradeId,
    editingGradeHorario,
    setEditingGradeHorario,
    editingDayIndex,
    setEditingDayIndex,
    editingColorGradeId,
    setEditingColorGradeId,
    editingPaymentGradeId,
    setEditingPaymentGradeId,
    
    // Métodos utilitários
    startGradeEditing,
    stopGradeEditing,
    startColorEditing,
    stopColorEditing,
    startPaymentEditing,
    stopPaymentEditing,
    startDayEditing,
    stopDayEditing,
    isEditingGrade,
    isEditingColor,
    isEditingPayment,
    isEditingDay,
    clearAllEditing,
  }
}
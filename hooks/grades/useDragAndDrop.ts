import { useState, useCallback } from 'react'
import { gradesService } from '@/services/gradesService'

interface DragAndDropState {
  // Estados para drag & drop de grades
  draggedGradeId: string | null
  dragOverGradeId: string | null
  gradesOrder: {[hospitalId: string]: string[]}
  
  // Estados para drag & drop de slots
  dragStart: number | null
  dragEnd: number | null
  dragRowIndex: number | null
  isDragging: boolean
  hasDragged: boolean
}

interface UseDragAndDropReturn {
  // Estados principais
  draggedGradeId: string | null
  setDraggedGradeId: React.Dispatch<React.SetStateAction<string | null>>
  dragOverGradeId: string | null
  setDragOverGradeId: React.Dispatch<React.SetStateAction<string | null>>
  gradesOrder: {[hospitalId: string]: string[]}
  setGradesOrder: React.Dispatch<React.SetStateAction<{[hospitalId: string]: string[]}>>
  
  // Estados de slots
  dragStart: number | null
  setDragStart: React.Dispatch<React.SetStateAction<number | null>>
  dragEnd: number | null
  setDragEnd: React.Dispatch<React.SetStateAction<number | null>>
  dragRowIndex: number | null
  setDragRowIndex: React.Dispatch<React.SetStateAction<number | null>>
  isDragging: boolean
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  hasDragged: boolean
  setHasDragged: React.Dispatch<React.SetStateAction<boolean>>
  
  // Métodos utilitários
  startGradeDrag: (gradeId: string) => void
  endGradeDrag: () => void
  startSlotDrag: (startHour: number, rowIndex?: number) => void
  updateSlotDrag: (endHour: number) => void
  endSlotDrag: () => void
  resetDragState: () => void
  isGradeDragging: (gradeId: string) => boolean
  updateGradesOrder: (hospitalId: string, newOrder: string[]) => void
  saveGradesOrderToDb: (hospitalId: string) => Promise<boolean>
}

export const useDragAndDrop = (): UseDragAndDropReturn => {
  // Estados para drag & drop de grades
  const [draggedGradeId, setDraggedGradeId] = useState<string | null>(null)
  const [dragOverGradeId, setDragOverGradeId] = useState<string | null>(null)
  const [gradesOrder, setGradesOrder] = useState<{[hospitalId: string]: string[]}>({})
  
  // Estados para drag & drop de slots
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  
  // Iniciar drag de grade
  const startGradeDrag = useCallback((gradeId: string) => {
    setDraggedGradeId(gradeId)
    setHasDragged(false)
  }, [])
  
  // Finalizar drag de grade
  const endGradeDrag = useCallback(() => {
    setDraggedGradeId(null)
    setDragOverGradeId(null)
    setHasDragged(false)
  }, [])
  
  // Iniciar drag de slot
  const startSlotDrag = useCallback((startHour: number, rowIndex?: number) => {
    setDragStart(startHour)
    setDragEnd(startHour)
    setDragRowIndex(rowIndex || null)
    setIsDragging(true)
    setHasDragged(false)
  }, [])
  
  // Atualizar drag de slot
  const updateSlotDrag = useCallback((endHour: number) => {
    setDragEnd(endHour)
    setHasDragged(true)
  }, [])
  
  // Finalizar drag de slot
  const endSlotDrag = useCallback(() => {
    setDragStart(null)
    setDragEnd(null)
    setDragRowIndex(null)
    setIsDragging(false)
    // Manter hasDragged true temporariamente para evitar clicks acidentais
    setTimeout(() => setHasDragged(false), 100)
  }, [])
  
  // Resetar todos os estados de drag
  const resetDragState = useCallback(() => {
    setDraggedGradeId(null)
    setDragOverGradeId(null)
    setDragStart(null)
    setDragEnd(null)
    setDragRowIndex(null)
    setIsDragging(false)
    setHasDragged(false)
  }, [])
  
  // Verificar se uma grade está sendo arrastada
  const isGradeDragging = useCallback((gradeId: string) => {
    return draggedGradeId === gradeId
  }, [draggedGradeId])
  
  // Atualizar ordem das grades para um hospital
  const updateGradesOrder = useCallback((hospitalId: string, newOrder: string[]) => {
    setGradesOrder(prev => ({
      ...prev,
      [hospitalId]: newOrder
    }))
  }, [])
  
  // Salvar ordenação no banco de dados
  const saveGradesOrderToDb = useCallback(async (hospitalId: string): Promise<boolean> => {
    const order = gradesOrder[hospitalId]
    if (!order || order.length === 0) return false

    try {
      const updates = order.map((gradeId, index) => ({
        gradeId,
        ordem: index
      }))

      await gradesService.updateGradesOrder(updates)
      return true
    } catch (error) {
      console.error('Erro ao salvar ordenação:', error)
      return false
    }
  }, [gradesOrder])
  
  return {
    // Estados principais
    draggedGradeId,
    setDraggedGradeId,
    dragOverGradeId,
    setDragOverGradeId,
    gradesOrder,
    setGradesOrder,
    
    // Estados de slots
    dragStart,
    setDragStart,
    dragEnd,
    setDragEnd,
    dragRowIndex,
    setDragRowIndex,
    isDragging,
    setIsDragging,
    hasDragged,
    setHasDragged,
    
    // Métodos utilitários
    startGradeDrag,
    endGradeDrag,
    startSlotDrag,
    updateSlotDrag,
    endSlotDrag,
    resetDragState,
    isGradeDragging,
    updateGradesOrder,
    saveGradesOrderToDb,
  }
}
import { useState, useRef, useCallback } from 'react'

export interface TimeSlot {
  id: string
  startHour: number
  endHour: number
  vagasCount: number
  assignedVagas: Array<{
    medicoId: string
    medicoNome: string
  }>
  lineIndex?: number
  slotLineIndex?: number
  rowIndex?: number
  dayIndex?: number
}

export interface GradeLine {
  id: string
  nome: string
  especialidade_id: string
  setor_id: string
  hospital_id: string
  cor: string
  horarioInicial: number
  lineNames?: {[lineIndex: number]: string}
  selectedDays?: {[lineIndex: number]: boolean[]}
  slotsByDay?: {[lineIndex: number]: {[dayIndex: number]: TimeSlot[]}}
  weekStartHours?: {[lineIndex: number]: number}
  dayRowCounts?: {[lineIndex: number]: {[dayIndex: number]: number}}
  configuracao?: {
    tipoCalculo?: 'valor_hora' | 'valor_plantao'
    valorPorHora?: number
    valorPorPlantao?: number
    horasPlantao?: number
    diasPagamento?: 'vista' | '30dias' | '45dias' | '60dias'
    formaRecebimento?: string
    tipoVaga?: string
    observacoesPadrao?: string
  }
}

interface UseGradeStateReturn {
  // Estados principais
  gradeLines: GradeLine[]
  setGradeLines: React.Dispatch<React.SetStateAction<GradeLine[]>>
  hasUnsavedChanges: {[gradeId: string]: boolean}
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<{[gradeId: string]: boolean}>>
  hasUnsavedChangesRef: React.MutableRefObject<{[gradeId: string]: boolean}>
  
  // Auto-save otimizado
  autoSaveTimeoutId: NodeJS.Timeout | null
  setAutoSaveTimeoutId: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>
  hasManualSave: boolean
  setHasManualSave: React.Dispatch<React.SetStateAction<boolean>>
  isSaving: boolean
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>
  
  // Métodos utilitários
  markUnsavedChanges: (gradeId?: string) => void
  clearUnsavedChanges: (gradeId: string) => void
  hasAnyUnsavedChanges: () => boolean
  updateGradeLine: (gradeId: string, updates: Partial<GradeLine>) => void
  triggerAutoSave: (gradeId: string) => void
  getPendingGrades: () => string[]
}

export const useGradeState = (): UseGradeStateReturn => {
  // Estados principais - consolidação de 4 estados relacionados
  const [gradeLines, setGradeLines] = useState<GradeLine[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<{[gradeId: string]: boolean}>({})
  const hasUnsavedChangesRef = useRef<{[gradeId: string]: boolean}>({})
  
  // Estados de auto-save otimizados
  const [autoSaveTimeoutId, setAutoSaveTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [hasManualSave, setHasManualSave] = useState(false)
  
  // Batching para auto-save - acumular mudanças antes de salvar
  const pendingChangesRef = useRef<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  
  // Removido auto-save automático - agora apenas marca mudanças pendentes
  const triggerAutoSave = useCallback((gradeId: string) => {
    // Apenas adicionar ao batch de mudanças pendentes
    pendingChangesRef.current.add(gradeId)
  }, [])

  // Método para marcar mudanças não salvas
  const markUnsavedChanges = useCallback((gradeId?: string) => {
    if (gradeId) {
      setHasUnsavedChanges(prev => ({ ...prev, [gradeId]: true }))
      hasUnsavedChangesRef.current = { ...hasUnsavedChangesRef.current, [gradeId]: true }
      
      // Marcar como pendente (sem auto-save)
      triggerAutoSave(gradeId)
    } else {
      // Se não especificar gradeId, marcar todos como alterados
      const allGradeIds = gradeLines.map(line => line.id)
      const updates = allGradeIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
      setHasUnsavedChanges(prev => ({ ...prev, ...updates }))
      hasUnsavedChangesRef.current = { ...hasUnsavedChangesRef.current, ...updates }
      
      // Marcar todas como pendentes (sem auto-save)
      allGradeIds.forEach(id => triggerAutoSave(id))
    }
  }, [gradeLines, triggerAutoSave])
  
  // Método para limpar mudanças não salvas
  const clearUnsavedChanges = useCallback((gradeId: string) => {
    setHasUnsavedChanges(prev => ({ ...prev, [gradeId]: false }))
    hasUnsavedChangesRef.current = { ...hasUnsavedChangesRef.current, [gradeId]: false }
  }, [])
  
  // Verificar se há mudanças não salvas
  const hasAnyUnsavedChanges = useCallback(() => {
    return Object.values(hasUnsavedChanges).some(Boolean)
  }, [hasUnsavedChanges])
  
  // Método para atualizar uma grade específica
  const updateGradeLine = useCallback((gradeId: string, updates: Partial<GradeLine>) => {
    setGradeLines(prev => prev.map(line => 
      line.id === gradeId ? { ...line, ...updates } : line
    ))
    markUnsavedChanges(gradeId)
  }, [markUnsavedChanges])
  
  // Método para obter grades com mudanças pendentes
  const getPendingGrades = useCallback(() => {
    return Array.from(pendingChangesRef.current)
  }, [])
  
  return {
    // Estados principais
    gradeLines,
    setGradeLines,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    hasUnsavedChangesRef,
    
    // Auto-save otimizado
    autoSaveTimeoutId,
    setAutoSaveTimeoutId,
    hasManualSave,
    setHasManualSave,
    isSaving,
    setIsSaving,
    
    // Métodos utilitários
    markUnsavedChanges,
    clearUnsavedChanges,
    hasAnyUnsavedChanges,
    updateGradeLine,
    triggerAutoSave,
    getPendingGrades,
  }
}
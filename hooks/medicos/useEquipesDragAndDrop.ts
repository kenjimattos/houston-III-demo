import { useState, useCallback, useEffect } from 'react'
import { type Equipe } from '@/services/equipesService'

interface UseEquipesDragAndDropReturn {
  draggedEquipeId: string | null
  dragOverEquipeId: string | null
  orderedEquipes: Equipe[]
  startEquipeDrag: (equipeId: string) => void
  endEquipeDrag: () => void
  handleDragOver: (equipeId: string) => void
  reorderEquipes: (equipes: Equipe[]) => void
  isEquipeDragging: (equipeId: string) => boolean
}

export const useEquipesDragAndDrop = (): UseEquipesDragAndDropReturn => {
  const [draggedEquipeId, setDraggedEquipeId] = useState<string | null>(null)
  const [dragOverEquipeId, setDragOverEquipeId] = useState<string | null>(null)
  const [orderedEquipes, setOrderedEquipes] = useState<Equipe[]>([])

  // Carregar ordem salva do localStorage
  const loadEquipesOrder = useCallback(() => {
    try {
      const savedOrder = localStorage.getItem('equipes-order')
      return savedOrder ? JSON.parse(savedOrder) : []
    } catch (error) {
      console.error('Erro ao carregar ordem das equipes:', error)
      return []
    }
  }, [])

  // Salvar ordem no localStorage
  const saveEquipesOrder = useCallback((equipeIds: string[]) => {
    try {
      localStorage.setItem('equipes-order', JSON.stringify(equipeIds))
    } catch (error) {
      console.error('Erro ao salvar ordem das equipes:', error)
    }
  }, [])

  // Reordenar equipes baseado na ordem salva ou ordem original
  const reorderEquipes = useCallback((equipes: Equipe[]) => {
    const savedOrder = loadEquipesOrder()

    if (savedOrder.length === 0) {
      setOrderedEquipes(equipes)
      return
    }

    // Criar mapa para acesso rápido
    const equipesMap = new Map(equipes.map(equipe => [equipe.id, equipe]))

    // Organizar equipes conforme ordem salva
    const reordered: Equipe[] = []
    const remaining: Equipe[] = []

    // Primeiro, adicionar equipes na ordem salva
    savedOrder.forEach((equipeId: string) => {
      const equipe = equipesMap.get(equipeId)
      if (equipe) {
        reordered.push(equipe)
        equipesMap.delete(equipeId)
      }
    })

    // Adicionar equipes restantes (novas equipes que não estão na ordem salva)
    equipesMap.forEach(equipe => {
      remaining.push(equipe)
    })

    setOrderedEquipes([...reordered, ...remaining])
  }, [loadEquipesOrder])

  // Iniciar drag de equipe
  const startEquipeDrag = useCallback((equipeId: string) => {
    setDraggedEquipeId(equipeId)
  }, [])

  // Finalizar drag de equipe
  const endEquipeDrag = useCallback(() => {
    if (draggedEquipeId && dragOverEquipeId && draggedEquipeId !== dragOverEquipeId) {
      // Reordenar array
      const draggedIndex = orderedEquipes.findIndex(e => e.id === draggedEquipeId)
      const dragOverIndex = orderedEquipes.findIndex(e => e.id === dragOverEquipeId)

      if (draggedIndex !== -1 && dragOverIndex !== -1) {
        const newOrder = [...orderedEquipes]
        const [draggedEquipe] = newOrder.splice(draggedIndex, 1)
        newOrder.splice(dragOverIndex, 0, draggedEquipe)

        setOrderedEquipes(newOrder)

        // Salvar nova ordem
        const equipeIds = newOrder.map(e => e.id)
        saveEquipesOrder(equipeIds)
      }
    }

    setDraggedEquipeId(null)
    setDragOverEquipeId(null)
  }, [draggedEquipeId, dragOverEquipeId, orderedEquipes, saveEquipesOrder])

  // Handle drag over
  const handleDragOver = useCallback((equipeId: string) => {
    if (draggedEquipeId && draggedEquipeId !== equipeId) {
      setDragOverEquipeId(equipeId)
    }
  }, [draggedEquipeId])

  // Verificar se equipe está sendo arrastada
  const isEquipeDragging = useCallback((equipeId: string) => {
    return draggedEquipeId === equipeId
  }, [draggedEquipeId])

  return {
    draggedEquipeId,
    dragOverEquipeId,
    orderedEquipes,
    startEquipeDrag,
    endEquipeDrag,
    handleDragOver,
    reorderEquipes,
    isEquipeDragging
  }
}
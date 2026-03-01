import { useState, useEffect, useCallback } from "react"
import {
  fetchEquipesDoMedico,
  addMedicoToEquipe,
  removeMedicoFromEquipe
} from "@/services/equipesService"
import { toast } from "sonner"

export function useMedicoEquipes(medicoId: string) {
  const [equipesDoMedico, setEquipesDoMedico] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Carregar equipes do médico
  const loadEquipesDoMedico = useCallback(async () => {
    if (!medicoId) return

    try {
      setLoading(true)
      const equipes = await fetchEquipesDoMedico(medicoId)
      setEquipesDoMedico(equipes)
    } catch (error) {
      console.error("Erro ao carregar equipes do médico:", error)
    } finally {
      setLoading(false)
    }
  }, [medicoId])

  // Adicionar médico à equipe
  const handleAddToEquipe = useCallback(async (equipeId: string) => {
    try {
      await addMedicoToEquipe(equipeId, medicoId)
      setEquipesDoMedico(prev => [...prev, equipeId])
      toast.success("Médico adicionado à equipe")
    } catch (error) {
      console.error("Erro ao adicionar médico à equipe:", error)
      toast.error("Erro ao adicionar médico à equipe")
      throw error
    }
  }, [medicoId])

  // Remover médico da equipe
  const handleRemoveFromEquipe = useCallback(async (equipeId: string) => {
    try {
      await removeMedicoFromEquipe(equipeId, medicoId)
      setEquipesDoMedico(prev => prev.filter(id => id !== equipeId))
      toast.success("Médico removido da equipe")
    } catch (error) {
      console.error("Erro ao remover médico da equipe:", error)
      toast.error("Erro ao remover médico da equipe")
      throw error
    }
  }, [medicoId])

  // Carregar dados ao montar ou quando medicoId mudar
  useEffect(() => {
    loadEquipesDoMedico()
  }, [loadEquipesDoMedico])

  return {
    equipesDoMedico,
    loading,
    loadEquipesDoMedico,
    addToEquipe: handleAddToEquipe,
    removeFromEquipe: handleRemoveFromEquipe
  }
}
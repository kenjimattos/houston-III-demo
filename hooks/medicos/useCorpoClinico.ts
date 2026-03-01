import { useState, useEffect, useCallback } from "react"
import {
  fetchCorpoClinicoMedicos,
  addMedicoToCorpoClinico,
  removeMedicoFromCorpoClinico,
  isMedicoInCorpoClinico,
  type CorpoClinicoMedicoView
} from "@/services/corpoClinicoService"
import { toast } from "sonner"

// Nota: toast ainda é usado em handleAddMedico

export function useCorpoClinico() {
  const [medicos, setMedicos] = useState<CorpoClinicoMedicoView[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Carregar médicos do corpo clínico
  const loadMedicos = useCallback(async () => {
    try {
      setLoading(true)
      const medicosData = await fetchCorpoClinicoMedicos()
      setMedicos(medicosData)
    } catch (error) {
      console.error("Erro ao carregar médicos do corpo clínico:", error)
      toast.error("Erro ao carregar médicos do corpo clínico")
    } finally {
      setLoading(false)
    }
  }, [])

  // Adicionar médico ao corpo clínico
  const handleAddMedico = useCallback(async (medicoId: string) => {
    try {
      setSaving(true)
      
      // Verificar se já está no corpo clínico
      const jaEsta = await isMedicoInCorpoClinico(medicoId)
      if (jaEsta) {
        toast.info("Médico já está no corpo clínico")
        return
      }

      await addMedicoToCorpoClinico(medicoId)
      await loadMedicos() // Recarregar lista
      toast.success("Médico adicionado ao corpo clínico")
    } catch (error: any) {
      console.error("Erro ao adicionar médico ao corpo clínico:", error)
      
      if (error.code === '23505') {
        toast.info("Médico já está no corpo clínico")
      } else {
        toast.error("Erro ao adicionar médico ao corpo clínico")
      }
      throw error
    } finally {
      setSaving(false)
    }
  }, [loadMedicos])

  // Remover médico do corpo clínico
  const handleRemoveMedico = useCallback(async (medicoId: string) => {
    try {
      setSaving(true)
      const result = await removeMedicoFromCorpoClinico(medicoId)

      if (!result.success) {
        throw new Error("Você não tem permissão para remover médicos do corpo clínico")
      }

      setMedicos(prev => prev.filter(m => m.medico_id !== medicoId))
      return result
    } catch (error) {
      throw error
    } finally {
      setSaving(false)
    }
  }, [])

  // Carregar dados ao montar
  useEffect(() => {
    loadMedicos()
  }, [loadMedicos])

  return {
    medicos,
    loading,
    saving,
    loadMedicos,
    addMedico: handleAddMedico,
    removeMedico: handleRemoveMedico
  }
}
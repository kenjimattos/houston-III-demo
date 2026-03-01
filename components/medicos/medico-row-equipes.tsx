"use client"

import React from "react"
import { MedicoEquipesMenu } from "./medico-equipes-menu"
import { useMedicoEquipes } from "@/hooks/medicos/useMedicoEquipes"
import { type Equipe } from "@/services/equipesService"

interface MedicoRowEquipesProps {
  medicoId: string
  medicoNome: string
  equipes: Equipe[]
  onEquipeChange?: () => void
}

export function MedicoRowEquipes({
  medicoId,
  medicoNome,
  equipes,
  onEquipeChange
}: MedicoRowEquipesProps) {
  const {
    equipesDoMedico,
    addToEquipe,
    removeFromEquipe
  } = useMedicoEquipes(medicoId)

  const handleAddToEquipe = async (medicoId: string, equipeId: string) => {
    await addToEquipe(equipeId)
    onEquipeChange?.()
  }

  const handleRemoveFromEquipe = async (medicoId: string, equipeId: string) => {
    await removeFromEquipe(equipeId)
    onEquipeChange?.()
  }

  return (
    <MedicoEquipesMenu
      medicoId={medicoId}
      medicoNome={medicoNome}
      equipes={equipes}
      equipesDoMedico={equipesDoMedico}
      onAddToEquipe={handleAddToEquipe}
      onRemoveFromEquipe={handleRemoveFromEquipe}
    />
  )
}
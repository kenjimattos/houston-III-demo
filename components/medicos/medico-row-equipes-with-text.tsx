"use client"

import React from "react"
import { MedicoEquipesMenuWithText } from "./medico-equipes-menu-with-text"
import { useMedicoEquipes } from "@/hooks/medicos/useMedicoEquipes"
import { type Equipe } from "@/services/equipesService"

interface MedicoRowEquipesWithTextProps {
  medicoId: string
  medicoNome: string
  equipes: Equipe[]
  onEquipeChange?: () => void
}

export function MedicoRowEquipesWithText({
  medicoId,
  medicoNome,
  equipes,
  onEquipeChange
}: MedicoRowEquipesWithTextProps) {
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
    <MedicoEquipesMenuWithText
      medicoId={medicoId}
      medicoNome={medicoNome}
      equipes={equipes}
      equipesDoMedico={equipesDoMedico}
      onAddToEquipe={handleAddToEquipe}
      onRemoveFromEquipe={handleRemoveFromEquipe}
    />
  )
}
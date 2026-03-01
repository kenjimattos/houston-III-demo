"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Users, Check, Plus, Minus } from "lucide-react"
import { type Equipe } from "@/services/equipesService"

interface MedicoEquipesMenuProps {
  medicoId: string
  medicoNome: string
  equipes: Equipe[]
  equipesDoMedico: string[] // IDs das equipes que o médico já está
  onAddToEquipe: (medicoId: string, equipeId: string) => Promise<void>
  onRemoveFromEquipe: (medicoId: string, equipeId: string) => Promise<void>
}

export function MedicoEquipesMenu({
  medicoId,
  medicoNome,
  equipes,
  equipesDoMedico,
  onAddToEquipe,
  onRemoveFromEquipe
}: MedicoEquipesMenuProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggleEquipe = async (equipeId: string, isInEquipe: boolean) => {
    try {
      setLoading(equipeId)

      if (isInEquipe) {
        await onRemoveFromEquipe(medicoId, equipeId)
      } else {
        await onAddToEquipe(medicoId, equipeId)
      }
    } catch (error) {
      console.error("Erro ao alterar equipe:", error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Gerenciar equipes do médico">
          <Users className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal text-sm">
          Equipes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {equipes.length === 0 ? (
          <>
            <DropdownMenuItem disabled className="text-center text-muted-foreground">
              Nenhuma equipe criada
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-xs text-center text-muted-foreground">
              Vá para Médicos → Equipes para criar uma
            </DropdownMenuItem>
          </>
        ) : (
          equipes.map((equipe) => {
            const isInEquipe = equipesDoMedico.includes(equipe.id)
            const isLoading = loading === equipe.id

            return (
              <DropdownMenuItem
                key={equipe.id}
                onClick={() => handleToggleEquipe(equipe.id, isInEquipe)}
                disabled={isLoading}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: equipe.cor }}
                  />
                  <span className="truncate">{equipe.nome}</span>
                </div>

                <div className="flex items-center gap-1">
                  {isLoading ? (
                    <div key="loading" className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : isInEquipe ? (
                    <Check key="check" className="h-4 w-4 text-green-600" />
                  ) : (
                    <Plus key="plus" className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
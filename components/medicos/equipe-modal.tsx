"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type Equipe } from "@/services/equipesService"

interface EquipeModalProps {
  open: boolean
  onClose: () => void
  onSave: (nome: string, cor: string) => Promise<void>
  equipe?: Equipe | null // Para edição
  mode: "create" | "edit"
  initialName?: string // Nome inicial para pré-preenchimento
}

const CORES_PREDEFINIDAS = [
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#84CC16", // lime-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#14B8A6", // teal-500
  "#EAB308", // yellow-500
  "#DC2626", // red-600
  "#059669", // emerald-600
  "#7C3AED", // violet-600
  "#DB2777"  // pink-600
]

export function EquipeModal({ open, onClose, onSave, equipe, mode, initialName }: EquipeModalProps) {
  const [nome, setNome] = useState("")
  const [cor, setCor] = useState("#3B82F6")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (mode === "edit" && equipe) {
        setNome(equipe.nome)
        setCor(equipe.cor)
      } else {
        setNome(initialName || "")
        setCor("#3B82F6")
      }
    }
  }, [open, mode, equipe, initialName])

  const handleSave = async () => {
    if (!nome.trim()) return

    try {
      setSaving(true)
      await onSave(nome.trim(), cor)
      handleClose()
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setNome("")
    setCor("#3B82F6")
    onClose()
  }

  const isValid = nome.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Criar Nova Equipe" : "Editar Equipe"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Crie uma nova equipe médica e escolha uma cor para identificá-la." 
              : "Edite o nome e cor da sua equipe médica."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Equipe</Label>
            <Input
              id="nome"
              placeholder="Ex: Cardiologia Manhã, Plantão Noturno..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
            />
            <div className="text-xs text-muted-foreground">
              {nome.length}/100 caracteres
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor da Equipe</Label>
            <div className="flex flex-wrap gap-2">
              {CORES_PREDEFINIDAS.map((corOption) => (
                <button
                  key={corOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    cor === corOption 
                      ? "border-foreground scale-110" 
                      : "border-muted-foreground/30 hover:scale-105"
                  }`}
                  style={{ backgroundColor: corOption }}
                  onClick={() => setCor(corOption)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="cor-custom" className="text-sm">Ou escolha uma cor personalizada:</Label>
              <input
                id="cor-custom"
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-8 h-8 rounded border border-muted-foreground/30 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0" 
              style={{ backgroundColor: cor }}
            />
            <span className="text-sm">
              Pré-visualização: <span className="font-normal">{nome || "Nome da Equipe"}</span>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || saving}
          >
            {saving ? "Salvando..." : (mode === "create" ? "Criar Equipe" : "Salvar Alterações")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
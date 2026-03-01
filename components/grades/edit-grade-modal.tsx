"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UnsavedChangesModal } from "@/components/grades/unsaved-changes-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import { type GradeLine } from "@/hooks/grades"

// Paleta de cores disponíveis
const CORES_DISPONIVEIS = [
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
  "#A855F7", // purple-500
  "#F43F5E", // rose-500
  "#22D3EE", // cyan-400
  "#FBBF24", // amber-400
  "#34D399"  // emerald-400
]

interface EditGradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  grade: GradeLine | null
  onSave: (gradeId: string, updates: {
    nome: string
    cor: string
  }) => Promise<void>
}

export function EditGradeModal({
  open,
  onOpenChange,
  grade,
  onSave
}: EditGradeModalProps) {
  const [formData, setFormData] = useState({
    nome: "",
    cor: "#3B82F6"
  })
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false)
  
  const [originalData, setOriginalData] = useState<typeof formData | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Resetar form quando o modal abrir com uma nova grade
  useEffect(() => {
    if (grade && open) {
      const initialData = {
        nome: grade.nome,
        cor: grade.cor
      }
      setFormData(initialData)
      setOriginalData(initialData)
      setHasChanges(false)
      setIsSaving(false)
    }
  }, [grade, open])
  
  // Detectar mudanças no formulário
  useEffect(() => {
    if (originalData) {
      const hasChanged = 
        formData.nome !== originalData.nome ||
        formData.cor !== originalData.cor
      setHasChanges(hasChanged)
    }
  }, [formData, originalData])

  const handleSave = async () => {
    if (!grade || isSaving) return

    // Validação básica
    if (!formData.nome.trim()) {
      return
    }

    setIsSaving(true)
    try {
      await onSave(grade.id, formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar grade:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      setUnsavedChangesModalOpen(true)
    } else {
      onOpenChange(false)
    }
  }

  if (!grade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Grade
            {hasChanges && (
              <div className="flex items-center gap-1 text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-normal">Alterações pendentes</span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            Altere as informações básicas da grade &quot;{grade.nome}&quot;.
            {hasChanges && (
              <span className="block mt-2 text-orange-600 text-sm">
                ⚠️ As alterações serão aplicadas imediatamente a todas as vagas que usam esta grade.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Nome da Grade */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nome" className="text-right">
              Nome
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              className="col-span-3"
              placeholder="Nome da grade"
            />
          </div>

          {/* Cor da Grade */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Cor</Label>
            <div className="col-span-3">
              <div className="flex gap-2 flex-wrap">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button
                    key={cor}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      formData.cor === cor ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setFormData(prev => ({ ...prev, cor }))}
                    title={cor}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Cor selecionada: {formData.cor}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!formData.nome.trim() || !hasChanges || isSaving}
            className={hasChanges ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : hasChanges ? 'Salvar Alterações' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      <UnsavedChangesModal
        open={unsavedChangesModalOpen}
        onConfirm={() => {
          setUnsavedChangesModalOpen(false)
          onOpenChange(false)
        }}
        onCancel={() => {
          setUnsavedChangesModalOpen(false)
        }}
      />
    </Dialog>
  )
}
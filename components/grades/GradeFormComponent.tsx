"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { Especialidade } from "@/services/parametrosService"
import { Hospital } from "@/services/hospitaisService"
import { HospitalSelector } from "@/components/hospitais/hospital-selector"

// Tipo da nova linha baseado no useState original
export interface NovaLinha {
  nome: string
  especialidade_id: string
  setor_id: string
  hospital_id: string
  cor: string
}

// Interface para setores (baseada na estrutura do banco)
export interface Setor {
  id: string
  nome: string
}

interface GradeFormComponentProps {
  novaLinha: NovaLinha
  setNovaLinha: (linha: NovaLinha) => void
  especialidades: Especialidade[]
  especialidadesLoading: boolean
  setores: Setor[]
  setoresLoading: boolean
  hospitais: Hospital[]
  hospitaisLoading: boolean
  onCreateGrade: () => Promise<void>
  disabled?: boolean
}

// Array de cores padrão (extraído do arquivo original)
const CORES = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CFF", "#EC4899", "#14B8A6", "#F97316",
  "#6366F1", "#EF4675", "#06B6D4", "#84CC16", "#A855F7", "#F43F5E", "#22D3EE", "#FBB040",
  "#8B5CF6", "#F87171", "#34D399", "#FBBF24", "#C084FC", "#FB7185", "#67E8F9", "#FCD34D",
  "#6D28D9", "#DC2626", "#059669", "#D97706", "#7C3AED", "#BE185D", "#0891B2", "#CA8A04"
]

export function GradeFormComponent({
  novaLinha,
  setNovaLinha,
  especialidades,
  especialidadesLoading,
  setores,
  setoresLoading,
  hospitais,
  hospitaisLoading,
  onCreateGrade,
  disabled = false
}: GradeFormComponentProps) {

  const handleInputChange = (field: keyof NovaLinha, value: string) => {
    setNovaLinha({ ...novaLinha, [field]: value })
  }

  const handleColorSelect = (cor: string) => {
    setNovaLinha({ ...novaLinha, cor })
  }

  const handleSubmit = async () => {
    if (!novaLinha.nome.trim()) return
    await onCreateGrade()
  }

  // Validação: todos os campos obrigatórios devem estar preenchidos
  const isFormValid =
    novaLinha.nome.trim() !== '' &&
    novaLinha.especialidade_id !== '' &&
    novaLinha.setor_id !== '' &&
    novaLinha.hospital_id !== '' &&
    novaLinha.cor !== ''

  return (
    <div className="mt-6 mb-6 p-6 bg-white border rounded-md">

      {/* Campos do formulário */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Nome da Grade */}
        <div>
          <Label htmlFor="nome" className="font-normal text-sm mb-2 block">
            Nome da Grade
          </Label>
          <Input
            id="nome"
            value={novaLinha.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            placeholder="Ex: Ortopedia Manhã"
            className="h-9"
            disabled={disabled}
          />
        </div>

        {/* Especialidade */}
        <div>
          <Label htmlFor="especialidade" className="font-normal text-sm mb-2 block">
            Especialidade
          </Label>
          <Select
            value={novaLinha.especialidade_id}
            onValueChange={(value) => handleInputChange('especialidade_id', value)}
            disabled={disabled || especialidadesLoading}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={especialidadesLoading ? "Carregando..." : "Selecione uma especialidade"}
              />
            </SelectTrigger>
            <SelectContent>
              {especialidades.map((especialidade) => (
                <SelectItem
                  key={especialidade.id}
                  value={especialidade.id}
                >
                  {especialidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Setor */}
        <div>
          <Label htmlFor="setor" className="font-normal text-sm mb-2 block">
            Setor
          </Label>
          <Select
            value={novaLinha.setor_id}
            onValueChange={(value) => handleInputChange('setor_id', value)}
            disabled={disabled || setoresLoading}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={setoresLoading ? "Carregando..." : "Selecione um setor"}
              />
            </SelectTrigger>
            <SelectContent>
              {setores.map((setor) => (
                <SelectItem key={setor.id} value={setor.id}>
                  {setor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hospital */}
        <div>
          <Label htmlFor="hospital" className="font-normal text-sm mb-2 block">
            Hospital
          </Label>
          <HospitalSelector
            value={novaLinha.hospital_id}
            onChange={(value) => handleInputChange('hospital_id', value)}
            disabled={disabled || hospitaisLoading}
            placeholder={hospitaisLoading ? "Carregando..." : "Selecione o hospital"}
            label=""
            className="h-9"
          />
        </div>
      </div>

      {/* Seletor de Cores */}
      <div className="mb-4">
        <Label className="font-normal text-sm mb-3 block">Cor</Label>
        <div className="flex gap-2 flex-wrap">
          {CORES.slice(0, 16).map((cor) => (
            <button
              key={cor}
              className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-105 ${novaLinha.cor === cor
                ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400'
                : 'border-gray-300 hover:border-gray-400'
                }`}
              style={{ backgroundColor: cor }}
              onClick={() => handleColorSelect(cor)}
              disabled={disabled}
              title={cor}
            />
          ))}
        </div>
      </div>

      {/* Botão de Criar */}
      <Button
        onClick={handleSubmit}
        disabled={disabled || !isFormValid}
        className="font-normal"
      >
        <Plus className="w-4 h-4 mr-2" />
        Criar Grade
      </Button>
    </div>
  )
}
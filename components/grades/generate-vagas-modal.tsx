"use client"

import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CalendarDays, HelpCircle } from "lucide-react"
import { type GradeLine, type TimeSlot } from "@/hooks/grades"

interface GenerateVagasModalProps {
  isOpen: boolean
  onClose: () => void
  selectedGrade: GradeLine | null
  startDate: Date
  endDate: Date
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
  onGenerate: () => void
  isLoading: boolean
  getEspecialidadeNome: (id: string) => string
  getSetorNome: (id: string) => string
}

export function GenerateVagasModal({
  isOpen,
  onClose,
  selectedGrade,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  isLoading,
  getEspecialidadeNome,
  getSetorNome
}: GenerateVagasModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-600" />
            Gerar Vagas de Plantão
          </DialogTitle>
          <DialogDescription>
            Selecione o período para gerar as vagas de plantão a partir da grade &ldquo;{selectedGrade?.nome}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Período de geração */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline" 
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate.toLocaleDateString('pt-BR')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && onStartDateChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Data de Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate.toLocaleDateString('pt-BR')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && onEndDateChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Preview das configurações */}
          {selectedGrade && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-normal text-gray-900">Configurações da Grade</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Especialidade:</span>
                  <p className="font-normal">{getEspecialidadeNome(selectedGrade.especialidade_id)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Setor:</span>
                  <p className="font-normal">{getSetorNome(selectedGrade.setor_id)}</p>
                </div>
                {selectedGrade.configuracao?.tipoCalculo && (
                  <>
                    <div>
                      <span className="text-gray-600">Tipo de Cálculo:</span>
                      <p className="font-normal">
                        {selectedGrade.configuracao.tipoCalculo === 'valor_hora' ? 'Valor por Hora' : 'Valor por Plantão'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor:</span>
                      <p className="font-normal">
                        {selectedGrade.configuracao.valorPorHora 
                          ? `R$ ${selectedGrade.configuracao.valorPorHora.toFixed(2)}/hora`
                          : selectedGrade.configuracao.valorPorPlantao
                            ? `R$ ${selectedGrade.configuracao.valorPorPlantao.toFixed(2)}/plantão`
                            : 'Não configurado'}
                      </p>
                    </div>
                  </>
                )}
                {selectedGrade.configuracao?.diasPagamento && (
                  <div>
                    <span className="text-gray-600">Pagamento:</span>
                    <p className="font-normal">
                      {selectedGrade.configuracao.diasPagamento === 'vista' ? 'À vista' 
                        : `${selectedGrade.configuracao.diasPagamento.replace('dias', '')} dias`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning sobre configurações */}
          {selectedGrade && !selectedGrade.configuracao?.tipoCalculo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-800 font-normal">Configuração de pagamento não encontrada</p>
                  <p className="text-amber-700 mt-1">
                    Configure os valores de pagamento antes de gerar as vagas para garantir que tenham os valores corretos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={onGenerate}
            disabled={!selectedGrade || startDate >= endDate || isLoading}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {isLoading ? 'Gerando...' : 'Gerar Vagas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
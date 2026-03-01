'use client'

import { useState, useCallback } from 'react'
import { exportCalendarToPdf } from '@/lib/pdf-export'
import { toast } from '@/components/ui/use-toast'

interface VagaData {
  id: string
  hospital_nome: string
  especialidade_nome: string
  setor_nome?: string
  vaga_data: string
  vagas_horainicio: string
  vagas_horafim: string
  vaga_status: 'aberta' | 'fechada' | 'cancelada' | 'anunciada'
  vaga_valor?: number
  medico_nome?: string
  medico_crm?: string
  medico_telefone?: string
  candidaturas_pendentes?: number
}

interface UsePdfExportOptions {
  date?: Date
  view?: 'month' | 'week'
  appliedFilters?: {
    hospitals?: string[]
    specialties?: string[]
    sectors?: string[]
    periods?: string[]
    statuses?: string[]
    doctors?: string[]
  }
  filterNames?: {
    hospitalNames?: string[]
    specialtyNames?: string[]
    sectorNames?: string[]
    periodNames?: string[]
    statusNames?: string[]
    doctorNames?: string[]
  }
  doctorsData?: Array<{
    id: string
    nome: string
    telefone: string
    crm: string
    email?: string
  }>
  vagasData?: VagaData[]
}

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPdf = useCallback(async (
    elementId: string,
    options: UsePdfExportOptions = {}
  ) => {
    if (isExporting) return

    setIsExporting(true)

    try {
      // Mostrar toast de início
      toast({
        title: "Gerando PDF...",
        description: "Por favor, aguarde enquanto o calendário está sendo exportado.",
      })

      // Exportar para PDF (nova implementação não depende de captura de elemento)
      await exportCalendarToPdf(elementId, options)

      // Sucesso
      toast({
        title: "PDF gerado com sucesso!",
        description: "O calendário foi exportado e o download iniciou automaticamente.",
      })

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast({
        title: "Erro ao exportar PDF",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado durante a exportação.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }, [isExporting])

  return {
    exportToPdf,
    isExporting
  }
}
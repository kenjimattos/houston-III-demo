"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { fetchMesesDisponiveis } from "@/services/vagasCandidaturasService"

interface DashboardFiltersProps {
  selectedMonth?: string
  onMonthChange: (month: string | undefined) => void
  onClearFilters: () => void
  className?: string
}

export function DashboardFilters({
  selectedMonth,
  onMonthChange,
  onClearFilters,
  className
}: DashboardFiltersProps) {
  const [mesesDisponiveis, setMesesDisponiveis] = useState<{valor: string, nome: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Carregar meses disponíveis
  useEffect(() => {
    async function loadMeses() {
      try {
        const meses = await fetchMesesDisponiveis()
        setMesesDisponiveis(meses)
      } catch (error) {
        console.error('Erro ao carregar meses:', error)
        // Em caso de erro, usar meses fixos como fallback
        const mesesFallback = [
          { valor: '2024-01', nome: 'Janeiro 2024' },
          { valor: '2024-02', nome: 'Fevereiro 2024' },
          { valor: '2024-03', nome: 'Março 2024' },
          { valor: '2024-04', nome: 'Abril 2024' },
          { valor: '2024-05', nome: 'Maio 2024' },
          { valor: '2024-06', nome: 'Junho 2024' },
          { valor: '2024-07', nome: 'Julho 2024' },
          { valor: '2024-08', nome: 'Agosto 2024' },
          { valor: '2024-09', nome: 'Setembro 2024' },
          { valor: '2024-10', nome: 'Outubro 2024' },
          { valor: '2024-11', nome: 'Novembro 2024' },
          { valor: '2024-12', nome: 'Dezembro 2024' }
        ]
        setMesesDisponiveis(mesesFallback)
      } finally {
        setIsLoading(false)
      }
    }
    loadMeses()
  }, [])

  const handleMonthSelect = (month: string) => {
    const selectedValue = month === 'all' ? undefined : month
    // Month selected...
    onMonthChange(selectedValue)
  }

  return (
    <div className={cn("space-y-2 mb-6", className)}>
      {/* Layout otimizado para apenas dois elementos */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Campo de seleção de mês */}
        <Select
          value={selectedMonth || 'all'}
          onValueChange={handleMonthSelect}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full sm:w-64">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder={isLoading ? "Carregando..." : "Selecionar mês"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {mesesDisponiveis.map((mes) => (
              <SelectItem key={mes.valor} value={mes.valor}>
                {mes.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botão de limpar filtros */}
        <Button 
          variant="outline" 
          className="font-thin px-6 w-full sm:w-auto"
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  )
} 
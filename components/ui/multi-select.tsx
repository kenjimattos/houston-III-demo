"use client"

import * as React from "react"
import { Check, ChevronDown, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxDisplay?: number
  dropdownWidth?: string
  showSearch?: boolean
  searchPlaceholder?: string
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecionar...",
  className,
  disabled = false,
  maxDisplay = 1,
  dropdownWidth = "w-[var(--radix-popover-trigger-width)]",
  showSearch = false,
  searchPlaceholder = "Buscar...",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const selectedOptions = options.filter(option => value.includes(option.value))

  // Filtrar opções baseado no termo de busca
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onValueChange(newValue)
  }

  const handleClear = () => {
    onValueChange([])
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    // Limpar busca quando fechar o popover
    if (!newOpen) {
      setSearchTerm("")
    } else {
      // Focus no campo de busca quando abrir (com delay para garantir renderização)
      if (showSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 100)
      }
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Prevenir que teclas de navegação fechem o popover
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      e.preventDefault()
    }
  }

  // Função para destacar o termo de busca no texto
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5">
          {part}
        </mark>
      ) : part
    )
  }

  const displayText = () => {
    if (selectedOptions.length === 0) {
      return placeholder
    }
    
    if (selectedOptions.length <= maxDisplay) {
      const text = selectedOptions.map(option => option.label).join(", ")
      // Se o texto for muito longo, mostrar apenas a contagem
      if (text.length > 50) {
        return `${selectedOptions.length} selecionado${selectedOptions.length > 1 ? 's' : ''}`
      }
      return text
    }
    
    return `${selectedOptions.length} selecionado${selectedOptions.length > 1 ? 's' : ''}`
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-thin",
            selectedOptions.length === 0 && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{displayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(dropdownWidth, "p-0")} align="start">
        <div className="p-3">
          {/* Campo de busca */}
          {showSearch && (
            <div className="relative mb-3">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 h-9 font-thin"
              />
            </div>
          )}

          {/* Header com contagem e botão limpar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-normal">
              {selectedOptions.length > 0 ? (
                <span className="text-muted-foreground">
                  {selectedOptions.length} de {options.length} selecionado{selectedOptions.length > 1 ? 's' : ''}
                </span>
              ) : searchTerm ? (
                <span className="text-muted-foreground">
                  {filteredOptions.length} de {options.length} resultado{filteredOptions.length !== 1 ? 's' : ''}
                </span>
              ) : null}
            </span>
            {selectedOptions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-xs shrink-0"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Lista de opções com altura aumentada */}
          <div className="max-h-80 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchTerm ? "Nenhum resultado encontrado" : "Nenhuma opção disponível"}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-2 py-2 px-2 hover:bg-accent rounded cursor-pointer"
                  onClick={() => handleSelect(option.value)}
                >
                  <Checkbox
                    checked={value.includes(option.value)}
                    onCheckedChange={() => handleSelect(option.value)}
                    className="mt-0.5 shrink-0"
                  />
                  <label className="flex-1 text-sm font-thin cursor-pointer leading-tight">
                    {showSearch && searchTerm ? 
                      highlightSearchTerm(option.label, searchTerm) : 
                      option.label
                    }
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 
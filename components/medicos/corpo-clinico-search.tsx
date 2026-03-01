"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Search, Plus, UserPlus } from "lucide-react"
import { type Medico, searchInMedicosAndPrecadastro } from "@/services/medicosService"
import { PreCadastroMedicoModal } from "./pre-cadastro-medico-modal"
import { HighlightedText } from "@/components/ui/highlighted-text"

interface CorpoClinicoSearchProps {
  medicosNoCorpoClinico: string[] // IDs dos médicos já no corpo clínico
  corpoClinicoMedicos?: any[] // Lista atual de médicos do corpo clínico para filtrar
  onAddMedico: (medicoId: string) => Promise<void>
  onRefreshMedicos?: () => Promise<void> // Para recarregar a lista após pré-cadastro
  onSearchChange?: (searchTerm: string) => void // Callback para filtrar tabela
}

export function CorpoClinicoSearch({
  medicosNoCorpoClinico,
  corpoClinicoMedicos = [],
  onAddMedico,
  onRefreshMedicos,
  onSearchChange
}: CorpoClinicoSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [showPreCadastroModal, setShowPreCadastroModal] = useState(false)
  const [searchResults, setSearchResults] = useState<Medico[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Verificar se há matches na tabela do corpo clínico (FASE 1)
  const hasTableMatches = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) return false
    
    const termo = searchTerm.toLowerCase()
    return corpoClinicoMedicos.some(medico => {
      const nomeCompleto = `${medico.medico_primeironome} ${medico.medico_sobrenome}`.toLowerCase()
      const crm = medico.medico_crm?.toLowerCase() || ''
      return nomeCompleto.includes(termo) || crm.includes(termo)
    })
  }, [searchTerm, corpoClinicoMedicos])

  // Buscar médicos seguindo a lógica de 2 fases
  const searchMedicos = async (termo: string) => {
    if (!termo.trim() || termo.trim().length < 2) {
      setSearchResults([])
      return
    }

    // FASE 1: Se há matches na tabela do corpo clínico, não mostrar dropdown
    if (hasTableMatches) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      
      // FASE 2: Buscar diretamente nas tabelas medicos e medicos_precadastro
      try {
        const medicosResults = await searchInMedicosAndPrecadastro(termo)
        
        // Filtrar apenas os que não estão no corpo clínico
        const filteredResults = medicosResults.filter(medico => !medicosNoCorpoClinico.includes(medico.id))
        
        setSearchResults(filteredResults.slice(0, 5)) // Limitar a 5 resultados
      } catch (error) {
        console.error('❌ Erro na FASE 2:', error)
        throw error
      }
    } catch (error) {
      console.error('❌ Erro ao buscar médicos:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : 'Not an object'
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce da busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMedicos(searchTerm)
      // Notificar componente pai sobre mudança na busca
      if (onSearchChange) {
        onSearchChange(searchTerm)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, medicosNoCorpoClinico, hasTableMatches]) // eslint-disable-line react-hooks/exhaustive-deps

  const medicosFiltrados = searchResults

  // Detectar se deve mostrar opção de pré-cadastro
  // Mostra apenas se: 1) tem termo de busca válido, 2) não encontrou resultados, 3) não está buscando, 4) não há matches na tabela
  const shouldShowPreCadastro = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) return false
    if (isSearching) return false
    if (medicosFiltrados.length > 0) return false
    if (hasTableMatches) return false // Não mostrar se há matches na tabela

    const termo = searchTerm.trim()

    // Se é só número, pode ser CRM
    if (/^\d+$/.test(termo)) return true

    // Se contém letras, pode ser nome de médico
    if (/[a-zA-ZÀ-ÿ]/.test(termo)) return true

    return false
  }, [searchTerm, medicosFiltrados, isSearching, hasTableMatches])

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mostrar dropdown quando houver resultados ou opção de pré-cadastro
  useEffect(() => {
    setShowDropdown(medicosFiltrados.length > 0 || shouldShowPreCadastro || isSearching)
  }, [medicosFiltrados, shouldShowPreCadastro, isSearching])

  const handleAddMedico = async (medico: Medico) => {
    try {
      setAdding(medico.id)
      await onAddMedico(medico.id)
      resetSearch()
    } catch (error) {
      console.error('Erro ao adicionar médico:', error)
    } finally {
      setAdding(null)
    }
  }

  const resetSearch = () => {
    setSearchTerm("")
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const handleOpenPreCadastro = () => {
    setShowPreCadastroModal(true)
    setShowDropdown(false)
  }

  const handleMedicoPreCadastrado = async (medicoId: string) => {
    try {
      // Recarregar lista de médicos para incluir o pré-cadastrado
      if (onRefreshMedicos) {
        await onRefreshMedicos()
      }
      
      // Adicionar o médico pré-cadastrado ao corpo clínico automaticamente
      await onAddMedico(medicoId)
      resetSearch()
    } catch (error) {
      console.error('Erro ao processar médico pré-cadastrado:', error)
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar por nome completo do médico ou CRM..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => (medicosFiltrados.length > 0 || shouldShowPreCadastro) && setShowDropdown(true)}
        />
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center gap-3 p-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Buscando médicos...</span>
            </div>
          )}
          
          {!isSearching && medicosFiltrados.map((medico) => {
            const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`
            const isAdding = adding === medico.id
            
            return (
              <div
                key={medico.id}
                className={`flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b ${
                  isAdding ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !isAdding && handleAddMedico(medico)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {medico.primeiro_nome?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <HighlightedText 
                      text={nomeCompleto} 
                      searchTerm={searchTerm}
                      className="font-normal truncate"
                    />
                    {!medico.is_precadastro && (
                      <Badge className="text-[10px] px-1.5 py-0">cadastrado</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {medico.especialidade_nome && (
                      <span>{medico.especialidade_nome} •</span>
                    )}
                    <span>CRM: <HighlightedText 
                      text={medico.crm} 
                      searchTerm={searchTerm}
                      className="text-sm text-muted-foreground"
                    /></span>
                  </div>
                </div>
                <div className="flex items-center">
                  {isAdding ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Plus className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            )
          })}
          
          {/* Opção de pré-cadastro */}
          {!isSearching && shouldShowPreCadastro && (
            <div 
              className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-t bg-muted/30"
              onClick={handleOpenPreCadastro}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-normal text-primary">Pré-cadastrar médico</p>
                <p className="text-sm text-muted-foreground">
                  Médico não encontrado? Clique para pré-cadastrar
                </p>
              </div>
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
      )}

      {/* Modal de pré-cadastro */}
      <PreCadastroMedicoModal 
        open={showPreCadastroModal}
        onOpenChange={setShowPreCadastroModal}
        onMedicoPreCadastrado={handleMedicoPreCadastrado}
        searchTerm={searchTerm}
      />
    </div>
  )
}
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus, Loader2, Search, Pin, PinOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchHospitais } from "@/services/hospitaisService"
import { getSupabaseClient } from "@/services/supabaseClient"
import { toast } from "@/components/ui/use-toast"
import { CreateHospitalModal } from "@/components/hospitais/create-hospital-modal"
import { useDebounce } from "@/hooks/hospitais/useDebounce"

interface Hospital {
  hospital_id: string
  hospital_nome: string
  hospital_cnpj?: string
  hospital_endereco?: string
  hospital_telefone?: string
  hospital_email?: string
}

interface HospitalSelectorProps {
  value: string
  onChange: (value: string) => void
  onHospitalCreated?: () => void
  className?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  label?: string
  id?: string
  availableHospitals?: Hospital[] // Lista opcional de hospitais disponíveis para contexto específico
}

export function HospitalSelector({
  value,
  onChange,
  onHospitalCreated,
  className,
  required = false,
  placeholder = "Buscar hospital...",
  disabled = false,
  label = "Hospital",
  id = "hospital",
  availableHospitals
}: HospitalSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pinnedHospitals, setPinnedHospitals] = useState<Hospital[]>([])

  // Debounce da busca
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Carregar hospitais fixados do localStorage
  useEffect(() => {
    const loadPinnedHospitals = async () => {
      try {
        // Verificar se estamos no lado cliente
        if (typeof window === 'undefined') return

        const savedPinned = localStorage.getItem('pinnedHospitals')
        if (savedPinned) {
          const pinnedIds = JSON.parse(savedPinned) as string[]

          if (pinnedIds.length > 0) {
            setLoading(true)
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
              .from('hospitais')
              .select('*')
              .in('id', pinnedIds)
              .order('nome')

            if (error) {
              console.error('Erro ao buscar hospitais fixados:', error)
              return
            }

            if (data) {
              // Mapear os dados do banco para a interface esperada
              const mappedData = data.map(h => ({
                hospital_id: h.id,
                hospital_nome: h.nome,
                hospital_endereco: h.endereco_formatado,
                hospital_cnpj: h.cnpj,
                hospital_telefone: h.telefone,
                hospital_email: h.email
              }))

              // Manter a ordem dos IDs salvos
              const orderedPinned = pinnedIds
                .map(id => mappedData.find(h => h.hospital_id === id))
                .filter(Boolean) as Hospital[]
              setPinnedHospitals(orderedPinned)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar hospitais fixados:', error)
        // Em caso de erro, limpar localStorage corrompido
        try {
          localStorage.removeItem('pinnedHospitals')
        } catch (storageError) {
          console.error('Erro ao limpar localStorage:', storageError)
        }
      } finally {
        setLoading(false)
      }
    }

    loadPinnedHospitals()
  }, [])

  // Listener para sincronização entre componentes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePinnedHospitalsChanged = (event: CustomEvent) => {
      const { pinnedHospitals: newPinnedHospitals } = event.detail
      setPinnedHospitals(newPinnedHospitals || [])
    }

    window.addEventListener('pinnedHospitalsChanged', handlePinnedHospitalsChanged as EventListener)

    return () => {
      window.removeEventListener('pinnedHospitalsChanged', handlePinnedHospitalsChanged as EventListener)
    }
  }, [])

  // Carregar hospital selecionado ou limpar quando value é resetado
  useEffect(() => {
    const loadSelectedHospital = async () => {
      if (value && value.trim() !== '') {
        // Se há value mas não está carregado, buscar dados
        if (!selectedHospital || selectedHospital.hospital_id !== value) {
          try {
            const supabase = getSupabaseClient()
            const { data } = await supabase
              .from('hospitais')
              .select('*')
              .eq('id', value)
              .single()

            if (data) {
              const mappedHospital: Hospital = {
                hospital_id: data.id,
                hospital_nome: data.nome,
                hospital_cnpj: data.cnpj,
                hospital_endereco: data.endereco_formatado,
                hospital_telefone: data.telefone,
                hospital_email: data.email
              }
              setSelectedHospital(mappedHospital)
            }
          } catch (error) {
            console.error('Erro ao carregar hospital selecionado:', error)
            setSelectedHospital(null)
          }
        }
      } else {
        // Se value é vazio/null, limpar hospital selecionado
        setSelectedHospital(null)
      }
    }

    loadSelectedHospital()
  }, [value, selectedHospital])

  // Busca fuzzy de hospitais
  const searchHospitais = useCallback(async (query: string) => {
    // Se há uma lista de hospitais disponíveis, usar ela em vez de buscar no Supabase
    if (availableHospitals) {
      // Se não há query, mostrar todos os hospitais disponíveis
      if (!query || query.length < 1) {
        setHospitais(availableHospitals.slice(0, 20))
        return
      }
      setSearching(true)
      try {
        // Normalizar query para busca mais flexível
        const normalizedQuery = query
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
          .trim()

        // Filtrar hospitais disponíveis
        const filtered = availableHospitals.filter(hospital => {
          const hospitalNome = hospital.hospital_nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')

          return hospitalNome.includes(query.toLowerCase()) || hospitalNome.includes(normalizedQuery)
        })

        setHospitais(filtered.slice(0, 20)) // Limitar a 20 resultados
      } catch (error) {
        console.error('Erro ao filtrar hospitais disponíveis:', error)
        setHospitais([])
      } finally {
        setSearching(false)
      }
      return
    }

    // Para busca geral, manter a lógica original de mínimo 2 caracteres
    if (!query || query.length < 2) {
      setHospitais([])
      return
    }

    setSearching(true)
    try {
      const supabase = getSupabaseClient()

      // Normalizar query para busca mais flexível
      const normalizedQuery = query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
        .trim()

      // Buscar com múltiplas estratégias
      const { data, error } = await supabase
        .from('hospitais')
        .select('*')
        .or(`nome.ilike.%${query}%,nome.ilike.%${normalizedQuery}%`)
        .order('nome')
        .limit(20)

      if (error) throw error

      // Se encontrou poucos resultados, fazer busca mais flexível
      if (data.length < 5) {
        // Quebrar a query em palavras e buscar por cada uma
        const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2)

        if (words.length > 0) {
          const orConditions = words.map(word =>
            `nome.ilike.%${word}%`
          ).join(',')

          const { data: additionalData } = await supabase
            .from('hospitais')
            .select('*')
            .or(orConditions)
            .order('nome')
            .limit(10)

          if (additionalData) {
            // Mapear os dados do banco para a interface esperada
            const mappedData = data.map(h => ({
              hospital_id: h.id,
              hospital_nome: h.nome,
              hospital_endereco: h.endereco_formatado,
              hospital_cnpj: h.cnpj,
              hospital_telefone: h.telefone,
              hospital_email: h.email
            }))

            const mappedAdditionalData = additionalData.map(h => ({
              hospital_id: h.id,
              hospital_nome: h.nome,
              hospital_endereco: h.endereco_formatado,
              hospital_cnpj: h.cnpj,
              hospital_telefone: h.telefone,
              hospital_email: h.email
            }))

            // Combinar resultados removendo duplicatas
            const combined = [...mappedData]
            mappedAdditionalData.forEach(hospital => {
              if (!combined.find(h => h.hospital_id === hospital.hospital_id)) {
                combined.push(hospital)
              }
            })
            setHospitais(combined)
            return
          }
        }
      }

      // Mapear os dados do banco para a interface esperada
      const mappedData = (data || []).map(h => ({
        hospital_id: h.id,
        hospital_nome: h.nome,
        hospital_endereco: h.endereco_formatado,
        hospital_cnpj: h.cnpj,
        hospital_telefone: h.telefone,
        hospital_email: h.email
      }))

      setHospitais(mappedData)
    } catch (error) {
      console.error('Erro ao buscar hospitais:', error)
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar hospitais.",
        variant: "destructive"
      })
    } finally {
      setSearching(false)
    }
  }, [availableHospitals])

  // Executar busca quando query mudar (com debounce)
  useEffect(() => {
    searchHospitais(debouncedSearchQuery)
  }, [debouncedSearchQuery, searchHospitais])

  // Carregar hospitais disponíveis quando o popover abrir
  useEffect(() => {
    if (open && availableHospitals && !searchQuery) {
      setHospitais(availableHospitals.slice(0, 20))
    }
  }, [open, availableHospitals, searchQuery])

  const handleHospitalCreated = () => {
    setShowCreateModal(false)
    setSearchQuery("")
    // Recarregar hospitais se callback fornecido
    onHospitalCreated?.()
    // Buscar novamente para atualizar lista
    searchHospitais(searchQuery)
  }

  // Funções para gerenciar hospitais fixados
  const isPinned = (hospitalId: string) => {
    return pinnedHospitals.some(h => h.hospital_id === hospitalId)
  }

  const togglePin = (hospital: Hospital) => {
    try {
      const currentPinnedIds = pinnedHospitals.map(h => h.hospital_id)
      let newPinnedIds: string[]
      let newPinnedHospitals: Hospital[]

      if (isPinned(hospital.hospital_id)) {
        // Desfixar
        newPinnedIds = currentPinnedIds.filter(id => id !== hospital.hospital_id)
        newPinnedHospitals = pinnedHospitals.filter(h => h.hospital_id !== hospital.hospital_id)
      } else {
        // Fixar (adicionar no início da lista)
        newPinnedIds = [hospital.hospital_id, ...currentPinnedIds]
        newPinnedHospitals = [hospital, ...pinnedHospitals]
      }

      // Atualizar estado primeiro
      setPinnedHospitals(newPinnedHospitals)

      // Salvar no localStorage com tratamento de erro
      if (typeof window !== 'undefined') {
        localStorage.setItem('pinnedHospitals', JSON.stringify(newPinnedIds))

        // Disparar evento customizado para sincronizar outros componentes
        window.dispatchEvent(new CustomEvent('pinnedHospitalsChanged', {
          detail: { pinnedIds: newPinnedIds, pinnedHospitals: newPinnedHospitals }
        }))
      }
    } catch (error) {
      console.error('Erro ao atualizar hospitais fixados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      })
    }
  }

  // Handler para seleção
  const handleSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital)
    onChange(hospital.hospital_id)
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <>
      <div className="space-y-2">
        {label && (
          <Label htmlFor={id} className="font-normal">
            {label}
          </Label>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || loading}
              className={cn(
                "w-full justify-between font-thin",
                !selectedHospital && "text-muted-foreground",
                className
              )}
            >
              {selectedHospital ? (
                selectedHospital.hospital_nome
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {placeholder}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="flex flex-col">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o nome do hospital..."
                  className="h-11 w-full border-0 bg-transparent px-0 py-3 text-sm outline-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {searching && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="max-h-[350px] overflow-y-auto">
                {/* Hospitais fixados - sempre visíveis */}
                {pinnedHospitals.length > 0 && (
                  <div className="border-b">
                    <div className="px-3 py-2 text-xs font-normal text-muted-foreground bg-muted/50">
                      Hospitais Fixados
                    </div>
                    <div className="p-1">
                      {pinnedHospitals.map((hospital) => (
                        <div key={hospital.hospital_id} className="group relative">
                          <button
                            onClick={() => handleSelect(hospital)}
                            className={cn(
                              "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              selectedHospital?.hospital_id === hospital.hospital_id && "bg-accent"
                            )}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedHospital?.hospital_id === hospital.hospital_id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex-1 text-left ml-2">
                              <div className="font-normal flex items-center gap-1">
                                <Pin className="h-3 w-3 text-primary-600 fill-current" />
                                {hospital.hospital_nome}
                              </div>
                              {hospital.hospital_endereco && (
                                <div className="text-xs text-muted-foreground">
                                  {hospital.hospital_endereco}
                                </div>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePin(hospital)
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                            title="Desfixar hospital"
                          >
                            <PinOff className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.length < (availableHospitals ? 1 : 2) && !(availableHospitals && hospitais.length > 0) ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {pinnedHospitals.length > 0 ? (
                      availableHospitals ? (
                        "Digite para buscar mais hospitais"
                      ) : (
                        "Digite pelo menos 2 caracteres para buscar mais hospitais"
                      )
                    ) : (
                      availableHospitals ? (
                        hospitais.length > 0 ? null : "Digite para buscar hospitais"
                      ) : (
                        "Digite pelo menos 2 caracteres para buscar"
                      )
                    )}
                  </div>
                ) : searching ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Buscando hospitais...
                  </div>
                ) : hospitais.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Nenhum hospital encontrado com &ldquo;{searchQuery}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div>
                    {((availableHospitals && hospitais.length > 0) || (searchQuery.length >= 2 && hospitais.length > 0)) && (
                      <div className="px-3 py-2 text-xs font-normal text-muted-foreground bg-muted/30">
                        {availableHospitals && !searchQuery ? "Hospitais Disponíveis" : "Resultados da Busca"}
                      </div>
                    )}
                    <div className="p-1">
                      {hospitais.map((hospital) => {
                        const pinned = isPinned(hospital.hospital_id)
                        return (
                          <div key={hospital.hospital_id} className="group relative">
                            <button
                              onClick={() => handleSelect(hospital)}
                              className={cn(
                                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                selectedHospital?.hospital_id === hospital.hospital_id && "bg-accent"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedHospital?.hospital_id === hospital.hospital_id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex-1 text-left ml-2">
                                <div className="font-normal flex items-center gap-1">
                                  {pinned && <Pin className="h-3 w-3 text-primary-500 fill-current" />}
                                  {hospital.hospital_nome}
                                </div>
                                {hospital.hospital_endereco && (
                                  <div className="text-xs text-muted-foreground">
                                    {hospital.hospital_endereco}
                                  </div>
                                )}
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                togglePin(hospital)
                              }}
                              className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all",
                                pinned
                                  ? "opacity-100 hover:bg-red-100 text-red-500"
                                  : "opacity-0 group-hover:opacity-100 hover:bg-primary-100 text-primary-600"
                              )}
                              title={pinned ? "Desfixar hospital" : "Fixar hospital"}
                            >
                              {pinned ? (
                                <PinOff className="h-3 w-3" />
                              ) : (
                                <Pin className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {(searchQuery.length >= 2 || pinnedHospitals.length > 0) && (
                <div className="border-t p-2">
                  <Button
                    onClick={() => {
                      setOpen(false)
                      setShowCreateModal(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar novo hospital
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Modal de criação usando componente existente */}
      {showCreateModal && (
        <CreateHospitalModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onHospitalCreated={handleHospitalCreated}
        />
      )}
    </>
  )
}
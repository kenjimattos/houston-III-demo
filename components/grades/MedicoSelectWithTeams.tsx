"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Users, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Medico, fetchMedicosCompleto } from "@/services/medicosService"
import { fetchEquipesComMedicos, type EquipeMedicoView } from "@/services/equipesService"
import { fetchCorpoClinicoMedicos } from "@/services/corpoClinicoService"
import { useCurrentUser } from "@/contexts/CurrentUserContext"

interface MedicoSelectWithTeamsProps {
  value: string
  onValueChange: (value: string, medicoData?: { id: string, nome: string, crm: string }) => void
  isSmall?: boolean
  placeholder?: string
  className?: string
}

export function MedicoSelectWithTeams({
  value,
  onValueChange,
  isSmall = false,
  placeholder = "Médico",
  className = ""
}: MedicoSelectWithTeamsProps) {
  // Obter isAdmin do Context
  const { isAdmin } = useCurrentUser();

  const [medicos, setMedicos] = useState<Medico[]>([])
  const [equipes, setEquipes] = useState<{ [key: string]: EquipeMedicoView[] }>({})
  const [corpoClinico, setCorpoClinico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Separar médicos por tipo para administradores
  const medicosPreCadastrados = React.useMemo(() => {
    return medicos
      .filter((m) => m.is_precadastro === true)
      .sort((a, b) => {
        const nomeA = `${a.primeiro_nome} ${a.sobrenome}`;
        const nomeB = `${b.primeiro_nome} ${b.sobrenome}`;
        return nomeA.localeCompare(nomeB);
      });
  }, [medicos]);

  const medicosCadastrados = React.useMemo(() => {
    return medicos
      .filter((m) => !m.is_precadastro)
      .sort((a, b) => {
        const nomeA = `${a.primeiro_nome} ${a.sobrenome}`;
        const nomeB = `${b.primeiro_nome} ${b.sobrenome}`;
        return nomeA.localeCompare(nomeB);
      });
  }, [medicos]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Carregar médicos completos (confirmados + pré-cadastrados)
        const medicosCompletos = await fetchMedicosCompleto()
        setMedicos(medicosCompletos)

        // Se não é administrador, carregar equipes e corpo clínico
        if (!isAdmin) {
          const equipesData = await fetchEquipesComMedicos()

          // Agrupar médicos por equipe
          const equipesPorId: { [key: string]: EquipeMedicoView[] } = {}
          equipesData.forEach(item => {
            if (!equipesPorId[item.equipe_id]) {
              equipesPorId[item.equipe_id] = []
            }
            equipesPorId[item.equipe_id].push(item)
          })
          setEquipes(equipesPorId)

          // Carregar médicos do corpo clínico
          const corpoClinicoData = await fetchCorpoClinicoMedicos()
          setCorpoClinico(corpoClinicoData)
        } else {
          // Se é admin, limpar estados
          setEquipes({})
          setCorpoClinico([])
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setEquipes({})
        setCorpoClinico([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isAdmin])

  // Obter nomes únicos das equipes
  const equipesUnicas = Object.entries(equipes).reduce((acc, [equipeId, medicosList]) => {
    if (medicosList.length > 0) {
      const primeiroMedico = medicosList[0]
      acc[equipeId] = {
        nome: primeiroMedico.equipes_nome,
        cor: primeiroMedico.equipes_cor,
        medicos: medicosList
      }
    }
    return acc
  }, {} as { [key: string]: { nome: string, cor: string, medicos: EquipeMedicoView[] } })

  // Todos os médicos do corpo clínico (sem filtro)
  const medicosCorpoClinicoCompleto = React.useMemo(() => {
    return corpoClinico
  }, [corpoClinico])

  // Prevenir scroll indesejado durante interações
  const [isOpen, setIsOpen] = useState(false)

  // Prevenir scroll automático quando o select abre
  useEffect(() => {
    if (isOpen) {
      // Salvar posição atual do scroll
      const scrollableParent = document.querySelector('.overflow-y-auto, .overflow-auto')
      if (scrollableParent) {
        const currentScrollTop = scrollableParent.scrollTop

        // Restaurar posição após um pequeno delay
        const timeoutId = setTimeout(() => {
          scrollableParent.scrollTop = currentScrollTop
        }, 0)

        return () => clearTimeout(timeoutId)
      }
    }
  }, [isOpen])

  const handleSelectMedico = (medicoId: string) => {
    if (medicoId === "none") {
      onValueChange("none")
      setIsOpen(false)
      return
    }

    // Buscar primeiro na lista de médicos principais
    const medico = medicos.find((m: Medico) => m.id === medicoId)
    if (medico) {
      onValueChange(medicoId, {
        id: medico.id,
        nome: `${medico.primeiro_nome} ${medico.sobrenome}`,
        crm: medico.crm
      })
      setIsOpen(false)
      return
    }

    // Se não encontrou, buscar no corpo clínico
    const medicoCorpo = corpoClinico.find(m => m.medico_id === medicoId)
    if (medicoCorpo) {
      onValueChange(medicoId, {
        id: medicoCorpo.medico_id,
        nome: `${medicoCorpo.primeiro_nome} ${medicoCorpo.sobrenome}`,
        crm: medicoCorpo.crm
      })
      setIsOpen(false)
      return
    }

    // Fallback: apenas o valor
    onValueChange(medicoId)
    setIsOpen(false)
  }

  // Encontrar médico selecionado para exibir
  const selectedMedico = React.useMemo(() => {
    if (value === "none") return null

    // Buscar nos médicos carregados
    const medico = medicos.find(m => m.id === value)
    if (medico) return medico

    // Buscar no corpo clínico
    const medicoCorpo = corpoClinico.find(m => m.medico_id === value)
    if (medicoCorpo) {
      return {
        id: medicoCorpo.medico_id,
        primeiro_nome: medicoCorpo.primeiro_nome,
        sobrenome: medicoCorpo.sobrenome,
        crm: medicoCorpo.crm,
      } as Medico
    }

    return null
  }, [value, medicos, corpoClinico])

  return (
    <div className="relative overflow-visible min-w-0 flex-shrink-0">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "h-6 p-1 text-xs font-thin justify-between pointer-events-auto",
              isSmall ? 'w-16' : 'w-28',
              "min-w-12",
              className
            )}
            disabled={loading}
          >
            {loading ? (
              "Carregando..."
            ) : selectedMedico ? (
              <span className="truncate">
                {selectedMedico.primeiro_nome}
              </span>
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 max-h-80 z-[9999]"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandInput
              placeholder="Digite o nome ou CRM do médico..."
              className="h-9 font-thin text-xs"
            />
            <CommandList className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <CommandEmpty className="font-thin text-xs py-6 text-center">
                Nenhum médico encontrado.
              </CommandEmpty>

              {/* Opção "Nenhum médico (vaga aberta)" */}
              <CommandGroup>
                <CommandItem
                  value="none-vaga-aberta"
                  onSelect={() => handleSelectMedico("none")}
                  className="font-thin text-xs text-muted-foreground"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "none" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Nenhum médico (vaga aberta)
                </CommandItem>
              </CommandGroup>

              {/* PARA ADMINISTRADORES */}
              {isAdmin && (
                <>
                  {/* Médicos Pré-cadastrados */}
                  {medicosPreCadastrados.length > 0 && (
                    <CommandGroup heading="Médicos Pré-cadastrados">
                      {medicosPreCadastrados.map((medico) => (
                        <CommandItem
                          key={`pre-${medico.id}`}
                          value={`pre-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm}`}
                          onSelect={() => handleSelectMedico(medico.id)}
                          className="font-thin text-xs"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === medico.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>
                              {medico.primeiro_nome} {medico.sobrenome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CRM: {medico.crm}
                              {medico.especialidade_nome ? ` • ${medico.especialidade_nome}` : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Médicos Cadastrados */}
                  {medicosCadastrados.length > 0 && (
                    <CommandGroup heading="Médicos Cadastrados">
                      {medicosCadastrados.map((medico) => (
                        <CommandItem
                          key={`cad-${medico.id}`}
                          value={`cad-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm}`}
                          onSelect={() => handleSelectMedico(medico.id)}
                          className="font-thin text-xs"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === medico.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>
                              {medico.primeiro_nome} {medico.sobrenome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CRM: {medico.crm}
                              {medico.especialidade_nome ? ` • ${medico.especialidade_nome}` : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}

              {/* PARA NÃO-ADMINISTRADORES */}
              {!isAdmin && (
                <>
                  {/* Equipes */}
                  {Object.keys(equipesUnicas).length > 0 && (
                    <>
                      {Object.entries(equipesUnicas).map(([equipeId, equipeData]) => (
                        <CommandGroup
                          key={equipeId}
                          heading={
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: equipeData.cor }}
                              />
                              <span>{equipeData.nome}</span>
                            </div>
                          }
                        >
                          {equipeData.medicos.map((medicoEquipe) => {
                            const medico = medicos.find(m => m.id === medicoEquipe.medico_id)
                            if (!medico) return null

                            return (
                              <CommandItem
                                key={`equipe-${equipeId}-${medico.id}`}
                                value={`equipe-${equipeId}-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm}`}
                                onSelect={() => handleSelectMedico(medico.id)}
                                className="font-thin text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    value === medico.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>
                                    {medico.primeiro_nome} {medico.sobrenome}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    CRM: {medico.crm}
                                    {medico.especialidade_nome ? ` • ${medico.especialidade_nome}` : ""}
                                  </span>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      ))}
                    </>
                  )}

                  {/* Corpo Clínico */}
                  {medicosCorpoClinicoCompleto.length > 0 && (
                    <CommandGroup
                      heading={
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>Corpo Clínico</span>
                        </div>
                      }
                    >
                      {medicosCorpoClinicoCompleto.map((medicoCorpo) => {
                        return (
                          <CommandItem
                            key={`corpo-clinico-${medicoCorpo.medico_id}`}
                            value={`corpo-clinico-${medicoCorpo.primeiro_nome} ${medicoCorpo.sobrenome} ${medicoCorpo.crm}`}
                            onSelect={() => handleSelectMedico(medicoCorpo.medico_id)}
                            className="font-thin text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                value === medicoCorpo.medico_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>
                                {medicoCorpo.primeiro_nome} {medicoCorpo.sobrenome}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                CRM: {medicoCorpo.crm}
                              </span>
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
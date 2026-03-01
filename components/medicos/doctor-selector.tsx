"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Medico,
  fetchMedicosCompleto,
  fetchMedicosFavoritos,
} from "@/services/medicosService";
import {
  fetchEquipesComMedicos,
  type EquipeMedicoView,
} from "@/services/equipesService";
import { fetchCorpoClinicoMedicos } from "@/services/corpoClinicoService";
import { UserRoleType } from "@/types/user-roles-shared";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { Separator } from "@/components/ui/separator";
import { is } from "date-fns/locale";

interface DoctorSelectorProps {
  selectedDoctor: string;
  selectedDoctors?: string[];
  onSelectDoctor: (doctorId: string) => void;
  onSelectDoctors?: (doctorIds: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customButtonClassName?: string;
  multiple?: boolean;
}

export function DoctorSelector({
  selectedDoctor,
  selectedDoctors = [],
  onSelectDoctor,
  onSelectDoctors,
  open,
  onOpenChange,
  customButtonClassName,
  multiple = false,
}: DoctorSelectorProps) {
  // Obter isAdmin do Context
  const { isAdmin } = useCurrentUser();

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [equipes, setEquipes] = useState<{ [key: string]: EquipeMedicoView[] }>(
    {}
  );
  const [loadingEquipes, setLoadingEquipes] = useState(false);
  const [corpoClinico, setCorpoClinico] = useState<any[]>([]);
  const [loadingCorpoClinico, setLoadingCorpoClinico] = useState(false);
  const [favoritos, setFavoritos] = useState<Medico[]>([]);
  const [loadingFavoritos, setLoadingFavoritos] = useState(false);
  const hasLoadedRef = useRef(false);

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
        // Carregar médicos completos (confirmados + pré-cadastrados)
        setLoadingDoctors(true);
        const medicosCompletos = await fetchMedicosCompleto();
        setMedicos(medicosCompletos);
        setLoadingDoctors(false);

        // Se não é administrador, carregar equipes, corpo clínico e favoritos
        if (!isAdmin) {
          setLoadingEquipes(true);
          setLoadingCorpoClinico(true);
          setLoadingFavoritos(true);

          const equipesData = await fetchEquipesComMedicos();

          // Agrupar médicos por equipe
          const equipesPorId: { [key: string]: EquipeMedicoView[] } = {};
          equipesData.forEach((item) => {
            if (!equipesPorId[item.equipe_id]) {
              equipesPorId[item.equipe_id] = [];
            }
            equipesPorId[item.equipe_id].push(item);
          });
          setEquipes(equipesPorId);

          // Carregar médicos do corpo clínico
          const corpoClinicoData = await fetchCorpoClinicoMedicos();
          setCorpoClinico(corpoClinicoData);

          // Carregar médicos favoritos
          const favoritosData = await fetchMedicosFavoritos();
          setFavoritos(favoritosData);

          setLoadingEquipes(false);
          setLoadingCorpoClinico(false);
          setLoadingFavoritos(false);
        } else {
          // Se é admin, limpar estados de equipes/corpo clínico/favoritos
          setEquipes({});
          setCorpoClinico([]);
          setFavoritos([]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setEquipes({});
        setCorpoClinico([]);
        setFavoritos([]);
        setLoadingDoctors(false);
        setLoadingEquipes(false);
        setLoadingCorpoClinico(false);
        setLoadingFavoritos(false);
      }
    };

    // Carregar dados na montagem do componente (apenas uma vez)
    // Isso evita recarregamento duplicado ao abrir o dropdown
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, [isAdmin]);

  const selectedMedico = medicos.find((medico) => medico.id === selectedDoctor);

  // Verificar se o médico selecionado está em alguma equipe
  const selectedMedicoEquipe = Object.entries(equipes).find(
    ([_, medicosList]) =>
      medicosList.some((m) => m.medico_id === selectedDoctor)
  );

  const handleSelectDoctor = (doctorId: string) => {
    if (multiple && onSelectDoctors) {
      const isSelected = selectedDoctors.includes(doctorId);
      const newSelection = isSelected
        ? selectedDoctors.filter((id) => id !== doctorId)
        : [...selectedDoctors, doctorId];
      onSelectDoctors(newSelection);
      // Não fecha o popover em modo múltiplo
    } else {
      onSelectDoctor(doctorId);
      onOpenChange(false);
    }
  };

  const clearSelection = () => {
    if (multiple && onSelectDoctors) {
      onSelectDoctors([]);
    } else {
      onSelectDoctor("");
    }
    onOpenChange(false);
  };

  // Obter nomes únicos das equipes
  const equipesUnicas = Object.entries(equipes).reduce(
    (acc, [equipeId, medicosList]) => {
      if (medicosList.length > 0) {
        const primeiroMedico = medicosList[0];
        acc[equipeId] = {
          nome: primeiroMedico.equipes_nome,
          cor: primeiroMedico.equipes_cor,
          medicos: medicosList,
        };
      }
      return acc;
    },
    {} as {
      [key: string]: { nome: string; cor: string; medicos: EquipeMedicoView[] };
    }
  );

  // Médicos favoritos ordenados alfabeticamente
  const medicosFavoritosOrdenados = React.useMemo(() => {
    return favoritos
      .sort((a, b) => {
        const nomeA = `${a.primeiro_nome} ${a.sobrenome}`;
        const nomeB = `${b.primeiro_nome} ${b.sobrenome}`;
        return nomeA.localeCompare(nomeB);
      });
  }, [favoritos]);

  // Médicos do corpo clínico ordenados alfabeticamente
  const medicosCorpoClinicoOrdenados = React.useMemo(() => {
    return corpoClinico
      .map((cc) => {
        const medico = medicos.find((m) => m.id === cc.medico_id);
        return medico;
      })
      .filter((m): m is Medico => m !== undefined)
      .sort((a, b) => {
        const nomeA = `${a.primeiro_nome} ${a.sobrenome}`;
        const nomeB = `${b.primeiro_nome} ${b.sobrenome}`;
        return nomeA.localeCompare(nomeB);
      });
  }, [corpoClinico, medicos]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-thin",
            customButtonClassName
          )}
          disabled={loadingDoctors}
        >
          {loadingDoctors ? (
            "Carregando médicos..."
          ) : multiple && selectedDoctors.length > 0 ? (
            <div className="flex items-center gap-2">
              <span>
                {selectedDoctors.length} médico
                {selectedDoctors.length > 1 ? "s" : ""} selecionado
                {selectedDoctors.length > 1 ? "s" : ""}
              </span>
            </div>
          ) : selectedMedico ? (
            <div className="flex items-center gap-2">
              {selectedMedicoEquipe && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      equipesUnicas[selectedMedicoEquipe[0]]?.cor,
                  }}
                  title={equipesUnicas[selectedMedicoEquipe[0]]?.nome}
                />
              )}
              <span>
                {selectedMedico.primeiro_nome} {selectedMedico.sobrenome} (CRM:{" "}
                {selectedMedico.crm})
              </span>
            </div>
          ) : selectedDoctor && medicos.length === 0 ? (
            // Médico selecionado mas lista ainda não carregou
            "Carregando médicos..."
          ) : selectedDoctor && !selectedMedico ? (
            // Médico selecionado mas não encontrado na lista (pode ser de outro grupo)
            "Médico não encontrado na lista"
          ) : multiple ? (
            "Selecione médicos"
          ) : (
            "Selecione um médico"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-80"
        align="start"
        sideOffset={4}
        onMouseEnter={(e) => {
          // Desabilitar scroll do modal pai
          const modalContent = e.currentTarget.closest('[role="dialog"]');
          if (modalContent) {
            (modalContent as HTMLElement).style.overflow = "hidden";
          }
          // Também desabilitar scroll do body como fallback
          document.body.style.overflow = "hidden";
        }}
        onMouseLeave={(e) => {
          // Reabilitar scroll do modal pai
          const modalContent = e.currentTarget.closest('[role="dialog"]');
          if (modalContent) {
            (modalContent as HTMLElement).style.overflow = "auto";
          }
          // Reabilitar scroll do body
          document.body.style.overflow = "auto";
        }}
      >
        <Command>
          <CommandInput
            placeholder="Digite o nome ou CRM do médico..."
            className="h-9 font-thin"
          />
          <CommandList
            className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            onWheel={(e) => {
              // Interceptar eventos de scroll para impedir propagação para containers pais
              e.stopPropagation();
              const element = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = element;

              // Se chegou no topo ou final da lista, não propagar o evento
              if (
                (e.deltaY < 0 && scrollTop === 0) ||
                (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight)
              ) {
                // Deixar propagar para permitir scroll do container pai
                return;
              }

              // Caso contrário, impedir propagação
              e.preventDefault();
            }}
          >
            <CommandEmpty className="font-thin">
              Nenhum médico encontrado.
            </CommandEmpty>

            {/* Opção para limpar seleção */}
            {(multiple ? selectedDoctors.length > 0 : selectedDoctor) && (
              <CommandGroup>
                <CommandItem
                  onSelect={clearSelection}
                  className="font-thin text-muted-foreground"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  {multiple ? "Limpar seleção" : "Nenhum médico (vaga aberta)"}
                </CommandItem>
              </CommandGroup>
            )}

            {/* PARA ADMINISTRADORES */}
            {isAdmin && (
              <>
                {/* Médicos Pré-cadastrados */}
                {medicosPreCadastrados.length > 0 && (
                  <>
                    <CommandGroup heading="Médicos Pré-cadastrados">
                      {medicosPreCadastrados.map((medico) => (
                        <CommandItem
                          key={`pre-${medico.id}`}
                          value={`pre-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm} ${medico.email}`}
                          onSelect={() => handleSelectDoctor(medico.id)}
                          className="font-thin"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              multiple
                                ? selectedDoctors.includes(medico.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                                : selectedDoctor === medico.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>
                              {medico.primeiro_nome} {medico.sobrenome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CRM: {medico.crm}{" "}
                              {medico.especialidade_nome
                                ? `• ${medico.especialidade_nome}`
                                : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <Separator className="my-1" />
                  </>
                )}

                {/* Médicos Cadastrados */}
                {medicosCadastrados.length > 0 && (
                  <CommandGroup heading="Médicos Cadastrados">
                    {medicosCadastrados.map((medico) => (
                      <CommandItem
                        key={`cad-${medico.id}`}
                        value={`cad-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm} ${medico.email}`}
                        onSelect={() => handleSelectDoctor(medico.id)}
                        className="font-thin"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            multiple
                              ? selectedDoctors.includes(medico.id)
                                ? "opacity-100"
                                : "opacity-0"
                              : selectedDoctor === medico.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>
                            {medico.primeiro_nome} {medico.sobrenome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            CRM: {medico.crm}{" "}
                            {medico.especialidade_nome
                              ? `• ${medico.especialidade_nome}`
                              : ""}
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
                {/* Médicos Favoritos */}
                {medicosFavoritosOrdenados.length > 0 && !loadingFavoritos && (
                  <>
                    <CommandGroup
                      heading={
                        <div className="flex items-center gap-2">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span>Médicos Favoritos</span>
                        </div>
                      }
                    >
                      {medicosFavoritosOrdenados.map((medico) => (
                        <CommandItem
                          key={`fav-${medico.id}`}
                          value={`fav-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm} ${medico.email}`}
                          onSelect={() => handleSelectDoctor(medico.id)}
                          className="font-thin"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              multiple
                                ? selectedDoctors.includes(medico.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                                : selectedDoctor === medico.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>
                              {medico.primeiro_nome} {medico.sobrenome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              CRM: {medico.crm}{" "}
                              {medico.especialidade_nome
                                ? `• ${medico.especialidade_nome}`
                                : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <Separator className="my-1" />
                  </>
                )}

                {/* Equipes */}
                {Object.keys(equipesUnicas).length > 0 && !loadingEquipes && (
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
                          const medico = medicos.find(
                            (m) => m.id === medicoEquipe.medico_id
                          );
                          if (!medico) return null;

                          return (
                            <CommandItem
                              key={`equipe-${equipeId}-${medico.id}`}
                              value={`equipe-${equipeId}-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm} ${medico.email}`}
                              onSelect={() => handleSelectDoctor(medico.id)}
                              className="font-thin"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  multiple
                                    ? selectedDoctors.includes(medico.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                    : selectedDoctor === medico.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {medico.primeiro_nome} {medico.sobrenome}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  CRM: {medico.crm}{" "}
                                  {medico.especialidade_nome
                                    ? `• ${medico.especialidade_nome}`
                                    : ""}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    ))}
                    <Separator className="my-1" />
                  </>
                )}

                {/* Corpo Clínico */}
                {medicosCorpoClinicoOrdenados.length > 0 && !loadingCorpoClinico && (
                  <CommandGroup
                    heading={
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span>Corpo Clínico</span>
                      </div>
                    }
                  >
                    {medicosCorpoClinicoOrdenados.map((medico) => (
                      <CommandItem
                        key={`corpo-clinico-${medico.id}`}
                        value={`corpo-clinico-${medico.primeiro_nome} ${medico.sobrenome} ${medico.crm} ${medico.email}`}
                        onSelect={() => handleSelectDoctor(medico.id)}
                        className="font-thin"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            multiple
                              ? selectedDoctors.includes(medico.id)
                                ? "opacity-100"
                                : "opacity-0"
                              : selectedDoctor === medico.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>
                            {medico.primeiro_nome} {medico.sobrenome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            CRM: {medico.crm}{" "}
                            {medico.especialidade_nome
                              ? `• ${medico.especialidade_nome}`
                              : ""}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

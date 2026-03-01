"use client";

import { CorpoClinicoSearch } from "@/components/medicos/corpo-clinico-search";
import { DoctorDetailsModal } from "@/components/medicos/doctor-details-modal";
import { EquipeCard } from "@/components/medicos/equipe-card";
import { EquipeModal } from "@/components/medicos/equipe-modal";
import { EquipesSearch } from "@/components/medicos/equipes-search";
import { FavoriteButton } from "@/components/medicos/favorite-button";
import { FavoritosCard } from "@/components/medicos/favoritos-card";
import { MedicoRowEquipes } from "@/components/medicos/medico-row-equipes";
import { PreCadastroMedicoModal } from "@/components/medicos/pre-cadastro-medico-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HighlightedText } from "@/components/ui/highlighted-text";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCorpoClinico } from "@/hooks/medicos/useCorpoClinico";
import { useEquipes } from "@/hooks/medicos/useEquipes";
import { useEquipesDragAndDrop } from "@/hooks/medicos/useEquipesDragAndDrop";
import { toast } from "@/hooks/use-toast";
import {
  filterEquipesAndMedicos,
  filterMedicosFavoritos,
} from "@/lib/equipes-filters";
import { filterDoctors } from "@/lib/filters";
import { formatTelefoneBR, getValidProfilePictureUrl } from "@/lib/utils";
import { getCurrentUserWithPermissions } from "@/services/authService";
import {
  fetchMedicosCompleto,
  fetchMedicosEssenciaisCompleto,
  fetchMedicosFavoritos,
  fetchMedicosFavoritosIds,
  fetchMedicosPreCadastro,
  MedicoPreCadastro,
  type Medico,
} from "@/services/medicosService";
import { supabase } from "@/services/supabaseClient";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { UserRoleType } from "@/types/user-roles-shared";
import { is } from "date-fns/locale";
import {
  BadgeAlert,
  BadgeAlertIcon,
  BadgeCheck,
  Info,
  MoreVertical,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export default function MedicosPage() {
  // Obter dados do usuário atual do Context
  const { isAdmin, loading: authLoading } = useCurrentUser();

  // Função debounce customizada
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  const [doctors, setDoctors] = useState<Medico[]>([]);
  const [allDoctors, setAllDoctors] = useState<Medico[]>([]);
  const [doctorsPage, setDoctorsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [equipesSearchTerm, setEquipesSearchTerm] = useState(""); // Estado para busca das equipes
  const [corpoClinicoSearchTerm, setCorpoClinicoSearchTerm] = useState(""); // Estado para busca do corpo clínico
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("todas");
  const [selectedDoctor, setSelectedDoctor] = useState<Medico | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);
  const [medicosFavoritos, setMedicosFavoritos] = useState<Medico[]>([]);
  const [preRegisterMedics, setPreRegisterMedics] = useState<
    MedicoPreCadastro[]
  >([]);
  const [allPreRegisterMedics, setAllPreRegisterMedics] = useState<
    MedicoPreCadastro[]
  >([]);
  const [preRegisterMedicsPage, setPreRegisterMedicsPage] = useState(1);
  const [preRegisterSearchTerm, setPreRegisterSearchTerm] = useState("");
  const [preRegisterSpecialtyFilter, setPreRegisterSpecialtyFilter] =
    useState<string>("todas");

  // Estados internos para debounce
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalCorpoClinicoSearchTerm, setInternalCorpoClinicoSearchTerm] =
    useState("");
  const [internalPreRegisterSearchTerm, setInternalPreRegisterSearchTerm] =
    useState("");
  const [internalEquipesSearchTerm, setInternalEquipesSearchTerm] =
    useState("");

  // Estados para paginação do corpo clínico
  const [allCorpoClinicoMedicos, setAllCorpoClinicoMedicos] = useState<any[]>([]);
  const [displayedCorpoClinicoMedicos, setDisplayedCorpoClinicoMedicos] = useState<any[]>([]);
  const [corpoClinicoPage, setCorpoClinicoPage] = useState(1);

  // Criar funções debounced para pesquisas
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => setSearchTerm(value), 500),
    []
  );

  const debouncedSetCorpoClinicoSearchTerm = useCallback(
    debounce((value: string) => setCorpoClinicoSearchTerm(value), 500),
    []
  );

  const debouncedSetPreRegisterSearchTerm = useCallback(
    debounce((value: string) => setPreRegisterSearchTerm(value), 500),
    []
  );

  const debouncedSetEquipesSearchTerm = useCallback(
    debounce((value: string) => setEquipesSearchTerm(value), 500),
    []
  );

  // Estados para equipes
  const {
    equipes,
    equipesMedicos,
    loading: equipesLoading,
    loadEquipes,
    createEquipe,
    updateEquipe,
    deleteEquipe,
    addMedico,
    removeMedico,
  } = useEquipes();
  const [showEquipeModal, setShowEquipeModal] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState<any>(null);
  const [selectedMedicoForNewEquipe, setSelectedMedicoForNewEquipe] =
    useState<Medico | null>(null);
  const [showPreCadastroModal, setShowPreCadastroModal] = useState(false);

  // Estados para modais de confirmação
  const [confirmDeleteEquipe, setConfirmDeleteEquipe] = useState<{
    open: boolean;
    equipeId: string | null;
  }>({
    open: false,
    equipeId: null,
  });
  const [confirmRemoveMedico, setConfirmRemoveMedico] = useState<{
    open: boolean;
    medicoId: string | null;
  }>({
    open: false,
    medicoId: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Hook para corpo clínico
  const {
    medicos: corpoClinicoMedicos,
    loading: corpoClinicoLoading,
    addMedico: addMedicoToCorpoClinico,
    removeMedico: removeMedicoFromCorpoClinico,
  } = useCorpoClinico();

  // Sincronizar dados do corpo clínico com paginação
  useEffect(() => {
    setAllCorpoClinicoMedicos(corpoClinicoMedicos);
    setDisplayedCorpoClinicoMedicos(corpoClinicoMedicos.slice(0, 20));
    setCorpoClinicoPage(1);
  }, [corpoClinicoMedicos]);

  // Hook para drag and drop de equipes
  const {
    draggedEquipeId,
    dragOverEquipeId,
    orderedEquipes,
    startEquipeDrag,
    endEquipeDrag,
    handleDragOver,
    reorderEquipes,
    isEquipeDragging,
  } = useEquipesDragAndDrop();

  // Sincronizar estados internos com debounce
  useEffect(() => {
    debouncedSetSearchTerm(internalSearchTerm);
  }, [internalSearchTerm, debouncedSetSearchTerm]);

  useEffect(() => {
    debouncedSetCorpoClinicoSearchTerm(internalCorpoClinicoSearchTerm);
  }, [internalCorpoClinicoSearchTerm, debouncedSetCorpoClinicoSearchTerm]);

  useEffect(() => {
    debouncedSetPreRegisterSearchTerm(internalPreRegisterSearchTerm);
  }, [internalPreRegisterSearchTerm, debouncedSetPreRegisterSearchTerm]);

  useEffect(() => {
    debouncedSetEquipesSearchTerm(internalEquipesSearchTerm);
  }, [internalEquipesSearchTerm, debouncedSetEquipesSearchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [medicosData, favoritosData, medicosFavoritosData] =
        await Promise.all([
          fetchMedicosEssenciaisCompleto(),
          fetchMedicosFavoritosIds(),
          fetchMedicosFavoritos(),
        ]);

      if (isAdmin) {
        const allPreRegistredMedics = await fetchMedicosPreCadastro();
        setAllPreRegisterMedics(allPreRegistredMedics);
        setPreRegisterMedics(allPreRegistredMedics.slice(0, 20));
        setPreRegisterMedicsPage(1);
      }
      console.log("🔍 Debug - Dados carregados:");

      setAllDoctors(medicosData);
      setDoctors(medicosData.slice(0, 20));
      setDoctorsPage(1);
      setFavoritosIds(favoritosData);
      setMedicosFavoritos(medicosFavoritosData);

    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshMedicos = async () => {
    try {
      const medicosData = await fetchMedicosEssenciaisCompleto();
      setAllDoctors(medicosData);
      setDoctors(medicosData.slice(0, 20));
      setDoctorsPage(1);
    } catch (error) {
      console.error("Erro ao recarregar médicos:", error);
      toast({
        icon: BadgeAlertIcon,
        title: "Erro",
        description: "Erro ao recarregar lista de médicos",
      });
    }
  };

  const loadMoreDoctors = () => {
    const nextPage = doctorsPage + 1;
    const startIndex = (nextPage - 1) * 20;
    const endIndex = startIndex + 20;
    const nextDoctors = allDoctors.slice(0, endIndex);

    setDoctors(nextDoctors);
    setDoctorsPage(nextPage);
  };

  const loadMorePreRegisterMedics = () => {
    const nextPage = preRegisterMedicsPage + 1;
    const startIndex = (nextPage - 1) * 20;
    const endIndex = startIndex + 20;

    // Aplicar filtros primeiro
    const filtered = allPreRegisterMedics.filter((medico) => {
      const termo = preRegisterSearchTerm.toLowerCase();
      const nomeCompleto =
        `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
      const crm = medico.crm?.toLowerCase() || "";
      const cpf = medico.cpf?.toLowerCase() || "";

      const matchesSearch =
        nomeCompleto.includes(termo) ||
        crm.includes(termo) ||
        cpf.includes(termo);
      const matchesSpecialty =
        preRegisterSpecialtyFilter === "todas" ||
        medico.especialidade_nome === preRegisterSpecialtyFilter;

      return matchesSearch && matchesSpecialty;
    });

    const nextMedics = filtered.slice(0, endIndex);
    setPreRegisterMedics(nextMedics);
    setPreRegisterMedicsPage(nextPage);
  };

  const applyPreRegisterFilters = () => {
    // Aplicar filtros
    const filtered = allPreRegisterMedics.filter((medico) => {
      const termo = preRegisterSearchTerm.toLowerCase();
      const nomeCompleto =
        `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
      const crm = medico.crm?.toLowerCase() || "";
      const cpf = medico.cpf?.toLowerCase() || "";

      const matchesSearch =
        nomeCompleto.includes(termo) ||
        crm.includes(termo) ||
        cpf.includes(termo);
      const matchesSpecialty =
        preRegisterSpecialtyFilter === "todas" ||
        medico.especialidade_nome === preRegisterSpecialtyFilter;

      return matchesSearch && matchesSpecialty;
    });

    // Resetar para os primeiros 20 filtrados
    setPreRegisterMedics(filtered.slice(0, 20));
    setPreRegisterMedicsPage(1);
  };

  // Aplicar filtros quando mudarem os termos de busca
  useEffect(() => {
    if (allPreRegisterMedics.length > 0) {
      applyPreRegisterFilters();
    }
  }, [preRegisterSearchTerm, preRegisterSpecialtyFilter, allPreRegisterMedics]);

  // Função para carregar mais médicos do corpo clínico
  const loadMoreCorpoClinicoMedicos = () => {
    const nextPage = corpoClinicoPage + 1;
    const startIndex = (nextPage - 1) * 20;
    const endIndex = startIndex + 20;

    // Aplicar filtros primeiro
    const filtered = allCorpoClinicoMedicos.filter((medico) => {
      if (!corpoClinicoSearchTerm.trim()) return true;

      const termo = corpoClinicoSearchTerm.toLowerCase();
      const nomeCompleto =
        `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
      const crm = medico.crm?.toLowerCase() || "";

      return nomeCompleto.includes(termo) || crm.includes(termo);
    });

    const nextMedicos = filtered.slice(0, endIndex);
    setDisplayedCorpoClinicoMedicos(nextMedicos);
    setCorpoClinicoPage(nextPage);
  };

  // Função para aplicar filtros no corpo clínico
  const applyCorpoClinicoFilters = () => {
    const filtered = allCorpoClinicoMedicos.filter((medico) => {
      if (!corpoClinicoSearchTerm.trim()) return true;

      const termo = corpoClinicoSearchTerm.toLowerCase();
      const nomeCompleto =
        `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
      const crm = medico.crm?.toLowerCase() || "";

      return nomeCompleto.includes(termo) || crm.includes(termo);
    });

    // Resetar para os primeiros 20 filtrados
    setDisplayedCorpoClinicoMedicos(filtered.slice(0, 20));
    setCorpoClinicoPage(1);
  };

  // Aplicar filtros quando mudar o termo de busca do corpo clínico
  useEffect(() => {
    if (allCorpoClinicoMedicos.length > 0) {
      applyCorpoClinicoFilters();
    }
  }, [corpoClinicoSearchTerm, allCorpoClinicoMedicos]);

  const loadMedicoCompleto = async (medicoId: string) => {
    try {
      const medicosCompletos = await fetchMedicosCompleto();
      const medicoCompleto = medicosCompletos.find((m) => m.id === medicoId);

      console.log("carregando medico completo ", medicoCompleto);
      return medicoCompleto || null;
    } catch (error) {
      console.error("Erro ao carregar dados completos do médico:", error);
      toast({
        icon: BadgeAlertIcon,
        title: "Erro",
        description: "Erro ao carregar dados do médico",
      });
      return null;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reordenar equipes quando a lista mudar
  useEffect(() => {
    if (equipes.length > 0) {
      reorderEquipes(equipes);
    }
  }, [equipes, reorderEquipes]);

  const specialties = Array.from(
    new Set(doctors.map((doctor) => doctor.especialidade_nome || ""))
  )
    .filter(Boolean)
    .sort();

  const filteredDoctors = filterDoctors(doctors, searchTerm).filter(
    (doctor) => {
      const matchesSpecialty =
        specialtyFilter === "todas" ||
        doctor.especialidade_nome === specialtyFilter;
      return matchesSpecialty;
    }
  );

  const handleFavoriteChange = async () => {
    // Recarregar lista de favoritos quando houver mudança
    try {
      const [favoritosData, medicosFavoritosData] = await Promise.all([
        fetchMedicosFavoritosIds(),
        fetchMedicosFavoritos(),
      ]);
      setFavoritosIds(favoritosData);
      setMedicosFavoritos(medicosFavoritosData);
    } catch (error) {
      console.error("Erro ao recarregar favoritos:", error);
    }
  };

  const handleFavoriteSuccess = async () => {
    await handleFavoriteChange();
  };

  // Handlers para equipes
  const handleCreateEquipe = () => {
    setEditingEquipe(null);
    setShowEquipeModal(true);
  };

  const handleEditEquipe = (equipe: any) => {
    setEditingEquipe(equipe);
    setShowEquipeModal(true);
  };

  const handleSaveEquipe = async (nome: string, cor: string) => {
    if (editingEquipe) {
      await updateEquipe(editingEquipe.id, {
        nome,
        cor,
        updated_by: (await supabase.auth.getUser()).data.user?.id || "",
        updated_at: new Date(),
      });
      console.log("Aquele erro criando uma nova Equipe");
      console.log("Aquele erro criando uma nova Equipe---asdasd");
    } else {
      const teamAlreadyExist = equipes.find(
        (currentTeam) => currentTeam.nome === nome
      );
      if (teamAlreadyExist) {
        toast({
          title: "Erro ao criar equipe",
          description: `${nome} já existe, por favor escolhe um nome diferente!`,
          icon: BadgeAlert,
          variant: "destructive",
        });
      } else {
        const newTeam = await createEquipe(nome, cor);
        console.log("Aquele erro criando uma nova Equipe", newTeam);
      }
    }
  };

  const handleDeleteEquipe = (equipeId: string) => {
    setConfirmDeleteEquipe({ open: true, equipeId });
  };

  const confirmDeleteEquipeAction = async () => {
    if (confirmDeleteEquipe.equipeId) {
      setActionLoading(true);
      try {
        await deleteEquipe(confirmDeleteEquipe.equipeId);
      } finally {
        setActionLoading(false);
        setConfirmDeleteEquipe({ open: false, equipeId: null });
      }
    }
  };

  const handleAddMedicoToEquipe = async (
    medicoId: string,
    equipeId: string
  ) => {
    await addMedico(equipeId, medicoId);
  };

  // Handler para adicionar médico ao corpo clínico
  const handleAddMedicoToCorpoClinico = async (medicoId: string) => {
    await addMedicoToCorpoClinico(medicoId);
  };

  // Handler para remover médico do corpo clínico
  const handleRemoveMedicoFromCorpoClinico = (medicoId: string) => {
    setConfirmRemoveMedico({ open: true, medicoId });
  };

  // Handler para abrir modal de pré-cadastro
  const handleOpenPreCadastroModal = () => {
    setShowPreCadastroModal(true);
  };

  // Handler para quando médico for pré-cadastrado
  const handleMedicoPreCadastrado = async (medicoId: string) => {
    try {
      // Recarregar lista de médicos para incluir o pré-cadastrado
      await refreshMedicos();

      // Adicionar o médico pré-cadastrado ao corpo clínico automaticamente
      await handleAddMedicoToCorpoClinico(medicoId);

      toast({
        icon: BadgeCheck,
        title: "Sucesso",
        description:
          "Médico pré-cadastrado e adicionado ao corpo clínico com sucesso",
      });
    } catch (error) {
      console.error("Erro ao processar médico pré-cadastrado:", error);
      toast({
        icon: BadgeAlertIcon,

        title: "Erro",
        description: "Erro ao processar médico pré-cadastrado",
      });
    }
  };

  const confirmRemoveMedicoAction = async () => {
    if (confirmRemoveMedico.medicoId) {
      setActionLoading(true);
      try {
        // Remover do corpo clínico
        await removeMedicoFromCorpoClinico(confirmRemoveMedico.medicoId);

        // Se estiver nos favoritos, remover também
        if (favoritosIds.includes(confirmRemoveMedico.medicoId)) {
          const { removeMedicoFavorito } = await import(
            "@/services/medicosService"
          );
          await removeMedicoFavorito(confirmRemoveMedico.medicoId);

          // Recarregar favoritos
          await handleFavoriteChange();
        }

        toast({
          icon: BadgeCheck,
          title: "Sucesso",
          description: "Médico removido do corpo clínico com sucesso",
        });
      } catch (error) {
        console.error("Erro ao remover médico:", error);

        // Mostrar mensagem específica baseada no tipo de erro
        const errorMessage = error instanceof Error
          ? error.message
          : "Erro ao remover médico do corpo clínico";

        toast({
          icon: BadgeAlertIcon,
          title: "Erro",
          description: errorMessage,
        });
      } finally {
        setActionLoading(false);
        setConfirmRemoveMedico({ open: false, medicoId: null });
      }
    }
  };

  // IDs dos médicos que já estão no corpo clínico
  const medicosNoCorpoClinicoIds = corpoClinicoMedicos.map((m) => m.medico_id);

  // Filtrar equipes e favoritos baseado no termo de busca das equipes
  const equipesFilteredResults = filterEquipesAndMedicos(
    orderedEquipes,
    equipesMedicos,
    equipesSearchTerm
  );
  const favoritosFilteredResult = filterMedicosFavoritos(
    medicosFavoritos,
    equipesSearchTerm
  );

  // Se há busca ativa, só mostrar resultados que fazem match
  const equipesToShow = equipesSearchTerm.trim()
    ? equipesFilteredResults
    : orderedEquipes.map((equipe) => ({
        equipe,
        medicos: equipesMedicos[equipe.id] || [],
        matchedMedicos: new Set(),
        matchReason: "equipe" as const,
      }));

  const shouldShowFavoritos = equipesSearchTerm.trim()
    ? favoritosFilteredResult.matchedMedicos.size > 0
    : medicosFavoritos.length > 0;

  // Verificar se devemos pré-preencher o nome da equipe com o termo de busca
  // Isso acontece quando há busca ativa mas não há resultados
  const shouldPreFillEquipeName =
    equipesSearchTerm.trim() &&
    equipesToShow.length === 0 &&
    !shouldShowFavoritos;
  const initialEquipeName = shouldPreFillEquipeName
    ? equipesSearchTerm.trim()
    : undefined;

  // Filtrar médicos do corpo clínico baseado no termo de busca
  // Função auxiliar para filtrar médicos pré-cadastrados
  const getFilteredPreRegisterCount = () => {
    return allPreRegisterMedics.filter((medico) => {
      const termo = preRegisterSearchTerm.toLowerCase();
      const nomeCompleto =
        `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
      const crm = medico.crm?.toLowerCase() || "";
      const cpf = medico.cpf?.toLowerCase() || "";

      const matchesSearch =
        nomeCompleto.includes(termo) ||
        crm.includes(termo) ||
        cpf.includes(termo);
      const matchesSpecialty =
        preRegisterSpecialtyFilter === "todas" ||
        medico.especialidade_nome === preRegisterSpecialtyFilter;

      return matchesSearch && matchesSpecialty;
    }).length;
  };

  const filteredPreRegisterMedics = preRegisterMedics.filter((medico) => {
    const termo = preRegisterSearchTerm.toLowerCase();
    const nomeCompleto =
      `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
    const crm = medico.crm?.toLowerCase() || "";
    const cpf = medico.cpf?.toLowerCase() || "";

    const matchesSearch =
      nomeCompleto.includes(termo) ||
      crm.includes(termo) ||
      cpf.includes(termo);
    const matchesSpecialty =
      preRegisterSpecialtyFilter === "todas" ||
      medico.especialidade_nome === preRegisterSpecialtyFilter;

    return matchesSearch && matchesSpecialty;
  });

  // Especialidades dos médicos pré-cadastrados
  const preRegisterSpecialties = Array.from(
    new Set(
      allPreRegisterMedics
        .map((m) => m.especialidade_nome)
        .filter((spec): spec is string => Boolean(spec))
    )
  ).sort();

  // Função auxiliar para contar médicos filtrados do corpo clínico
  const getFilteredCorpoClinicoCount = () => {
    return allCorpoClinicoMedicos.filter((medico) => {
      if (!corpoClinicoSearchTerm.trim()) return true;

      const termo = corpoClinicoSearchTerm.toLowerCase();
      const nomeCompleto =
        `${medico.primeiro_nome} ${medico.sobrenome}`.toLowerCase();
      const crm = medico.crm?.toLowerCase() || "";

      return nomeCompleto.includes(termo) || crm.includes(termo);
    }).length;
  };

  const handleRemoveMedicoFromEquipe = async (
    equipeId: string,
    medicoId: string
  ) => {
    await removeMedico(equipeId, medicoId);
  };

  return (
    <div className="space-y-6">
      {/* Seção de Corpo Clínico */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-normal tracking-tight">Médicos</h1>
          </div>

          {/* Seção de Equipes */}
          {!isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-normal text-xl">
                <Users className="h-5 w-5" />
                Minhas equipes ({equipes.length})
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <EquipesSearch
                    searchTerm={internalEquipesSearchTerm}
                    onSearchChange={setInternalEquipesSearchTerm}
                  />

                  <Button onClick={handleCreateEquipe}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Equipe
                  </Button>
                </div>
              </div>

              {equipesLoading ? (
                <LoadingSpinner className="h-32" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card de Médicos Favoritos - só aparece se houver favoritos e se fizer match com a busca */}
                  {shouldShowFavoritos && (
                    <FavoritosCard
                      medicos={medicosFavoritos}
                      equipes={orderedEquipes}
                      favoritosIds={favoritosIds}
                      searchTerm={equipesSearchTerm}
                      matchedMedicos={favoritosFilteredResult.matchedMedicos}
                      onFavoriteChange={handleFavoriteChange}
                      onFavoriteSuccess={handleFavoriteSuccess}
                      onEquipeChange={() => {
                        // Recarregar dados das equipes quando houver mudanças
                        loadEquipes();
                      }}
                      onOpenModal={async (doctor) => {
                        const medicoCompleto = await loadMedicoCompleto(
                          doctor.id
                        );
                        if (medicoCompleto) {
                          setSelectedDoctor(medicoCompleto);
                          setShowModal(true);
                        }
                      }}
                    />
                  )}

                  {/* Cards das Equipes */}
                  {equipesToShow.map((result) => (
                    <div
                      key={result.equipe.id}
                      draggable
                      onDragStart={() => startEquipeDrag(result.equipe.id)}
                      onDragEnd={endEquipeDrag}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver(result.equipe.id);
                      }}
                      className={`transition-all duration-200 ${
                        isEquipeDragging(result.equipe.id)
                          ? "opacity-50 scale-95 rotate-2"
                          : dragOverEquipeId === result.equipe.id
                          ? "scale-105 shadow-lg"
                          : ""
                      }`}
                    >
                      <EquipeCard
                        equipe={result.equipe}
                        medicos={result.medicos}
                        equipes={orderedEquipes}
                        favoritosIds={favoritosIds}
                        doctors={doctors}
                        searchTerm={equipesSearchTerm}
                        matchedMedicos={result.matchedMedicos as Set<string>}
                        onEdit={handleEditEquipe}
                        onDelete={handleDeleteEquipe}
                        onAddMedico={() => {}}
                        onRemoveMedico={handleRemoveMedicoFromEquipe}
                        onFavoriteChange={handleFavoriteChange}
                        onFavoriteSuccess={handleFavoriteSuccess}
                        onEquipeChange={() => {
                          // Recarregar dados das equipes quando houver mudanças
                          loadEquipes();
                        }}
                        onOpenModal={async (doctor) => {
                          const medicoCompleto = await loadMedicoCompleto(
                            doctor.id
                          );
                          if (medicoCompleto) {
                            setSelectedDoctor(medicoCompleto);
                            setShowModal(true);
                          }
                        }}
                      />
                    </div>
                  ))}

                  {/* Mensagem quando não há resultados na busca */}
                  {equipesSearchTerm.trim() &&
                    equipesToShow.length === 0 &&
                    !shouldShowFavoritos && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-normal mb-2">
                          Nenhum resultado encontrado
                        </p>
                        <p className="text-sm mb-4">
                          Tente buscar por outro termo
                        </p>
                      </div>
                    )}

                  {/* Mensagem quando não há equipes e não há favoritos */}
                  {!equipesSearchTerm.trim() &&
                    equipes.length === 0 &&
                    medicosFavoritos.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-normal mb-2">
                          Nenhuma equipe criada
                        </p>
                        <p className="text-sm mb-4">
                          Organize seus médicos em equipes para facilitar o
                          gerenciamento
                        </p>
                        <Button onClick={handleCreateEquipe} variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Criar primeira equipe
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Seção de corpo clínico */}
          {!isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 font-normal text-xl">
                <Stethoscope className="h-5 w-5" />
                Corpo Clínico (
                {corpoClinicoSearchTerm.trim()
                  ? displayedCorpoClinicoMedicos.length
                  : medicosNoCorpoClinicoIds.length}
                )
                {corpoClinicoSearchTerm.trim() &&
                  displayedCorpoClinicoMedicos.length !==
                    allCorpoClinicoMedicos.length && (
                    <span className="text-sm text-muted-foreground">
                      de {allCorpoClinicoMedicos.length}
                    </span>
                  )}
              </div>

              <div className="flex items-center gap-4">
                <CorpoClinicoSearch
                  medicosNoCorpoClinico={medicosNoCorpoClinicoIds}
                  corpoClinicoMedicos={corpoClinicoMedicos}
                  onAddMedico={handleAddMedicoToCorpoClinico}
                  onRefreshMedicos={refreshMedicos}
                  onSearchChange={setInternalCorpoClinicoSearchTerm}
                />
                <Button onClick={handleOpenPreCadastroModal}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Médico
                </Button>
              </div>

              {corpoClinicoLoading ? (
                <LoadingSpinner className="h-32" />
              ) : displayedCorpoClinicoMedicos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {corpoClinicoSearchTerm.trim() ? (
                    <>
                      <p className="text-lg font-normal mb-2">
                        Nenhum resultado encontrado
                      </p>
                      <p className="text-sm">
                        Tente buscar por outro termo ou limpe a busca
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-normal mb-2">
                        Nenhum médico no corpo clínico
                      </p>
                      <p className="text-sm">
                        Use a busca acima para adicionar médicos
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="table-auto">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="min-w-0">Nome</TableHead>
                        <TableHead className="w-24">CRM</TableHead>
                        <TableHead className="w-32">Especialidade</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCorpoClinicoMedicos.map((medico) => {
                        const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`;
                        const medicoOriginal = doctors.find(
                          (d) => d.id === medico.medico_id
                        );

                        const hasMatch =
                          corpoClinicoSearchTerm.trim() &&
                          (nomeCompleto
                            .toLowerCase()
                            .includes(corpoClinicoSearchTerm.toLowerCase()) ||
                            medico.crm
                              ?.toLowerCase()
                              .includes(corpoClinicoSearchTerm.toLowerCase()));

                        return (
                          <TableRow
                            key={medico.medico_id}
                            className={`group hover:bg-muted/50 ${
                              hasMatch
                                ? "bg-primary-50 dark:bg-primary-500/20 border-l-2 border-primary-500"
                                : ""
                            }`}
                          >
                            <TableCell>
                              <Avatar className="h-8 w-8">
                                {getValidProfilePictureUrl(
                                  medicoOriginal?.profile_picture_url
                                ) && (
                                  <AvatarImage
                                    src={getValidProfilePictureUrl(
                                      medicoOriginal?.profile_picture_url
                                    )}
                                    alt={nomeCompleto}
                                  />
                                )}
                                <AvatarFallback>
                                  {medico.primeiro_nome?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-normal">
                              <div className="flex items-center gap-2">
                                <HighlightedText
                                  text={nomeCompleto}
                                  searchTerm={corpoClinicoSearchTerm}
                                  className="font-normal"
                                />
                                {!medico.is_precadastro && (
                                  <Badge className="text-[10px] px-1.5 py-0">cadastrado</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <HighlightedText
                                text={medico.crm}
                                searchTerm={corpoClinicoSearchTerm}
                              />
                            </TableCell>
                            <TableCell>{medico.especialidade_nome}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <FavoriteButton
                                  medicoId={medico.medico_id}
                                  isFavorite={favoritosIds.includes(
                                    medico.medico_id
                                  )}
                                  onToggle={handleFavoriteChange}
                                  onSuccess={handleFavoriteSuccess}
                                  isPrecadastro={medico.is_precadastro}
                                />
                                <MedicoRowEquipes
                                  medicoId={medico.medico_id}
                                  medicoNome={nomeCompleto}
                                  equipes={equipes}
                                  onEquipeChange={() => {
                                    // Recarregar dados das equipes quando houver mudanças
                                    loadEquipes();
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={async () => {
                                    try {
                                      // Para médicos pré-cadastrados, usar o medico.medico_id diretamente
                                      // Para médicos confirmados, usar medicoOriginal.id se encontrado
                                      const medicoId = medico.is_precadastro
                                        ? medico.medico_id
                                        : medicoOriginal?.id ||
                                          medico.medico_id;
                                      const medicoCompleto =
                                        await loadMedicoCompleto(medicoId);
                                      if (medicoCompleto) {
                                        setSelectedDoctor(medicoCompleto);
                                        setShowModal(true);
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Erro ao carregar dados do médico:",
                                        error
                                      );
                                    }
                                  }}
                                  title="Ver detalhes do médico"
                                >
                                  <Info className="h-4 w-4 text-gray-700" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleRemoveMedicoFromCorpoClinico(
                                      medico.medico_id
                                    )
                                  }
                                  title="Remover médico do corpo clínico"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-700" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {displayedCorpoClinicoMedicos.length <
                    getFilteredCorpoClinicoCount() && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreCorpoClinicoMedicos}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Carregar mais (
                        {getFilteredCorpoClinicoCount() -
                          displayedCorpoClinicoMedicos.length}{" "}
                        restantes)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seção de médicos pré-cadastrados */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-normal text-xl">
                  <Stethoscope className="h-5 w-5" />
                  Médicos Pré-cadastrados ({allPreRegisterMedics.length})
                </div>
                <Button
                  onClick={() => setShowPreCadastroModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Pré-cadastrar Médico
                </Button>
              </div>

              {/* Barra de pesquisa e filtros para médicos pré-cadastrados */}
              {allPreRegisterMedics.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Buscar por nome, CRM ou CPF..."
                      className="pl-8"
                      value={internalPreRegisterSearchTerm}
                      onChange={(e) =>
                        setInternalPreRegisterSearchTerm(e.target.value)
                      }
                    />
                  </div>
                  <Select
                    value={preRegisterSpecialtyFilter}
                    onValueChange={setPreRegisterSpecialtyFilter}
                  >
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">
                        Todas as especialidades
                      </SelectItem>
                      {preRegisterSpecialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {allPreRegisterMedics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-normal mb-2">
                    Nenhum médico pré-cadastrado
                  </p>
                  <p className="text-sm">
                    Médicos pré-cadastrados aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="table-auto">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="min-w-0">Nome</TableHead>
                        <TableHead className="w-24">CRM</TableHead>
                        <TableHead className="w-32">Especialidade</TableHead>
                        <TableHead className="w-32">CPF</TableHead>
                        <TableHead className="w-32">Data Criação</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreRegisterMedics.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-10 text-gray-500"
                          >
                            {preRegisterSearchTerm ||
                            preRegisterSpecialtyFilter !== "todas"
                              ? "Nenhum médico encontrado com os filtros aplicados"
                              : "Nenhum médico pré-cadastrado encontrado"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPreRegisterMedics.map((medico) => {
                          const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`;

                          return (
                            <TableRow
                              key={medico.id}
                              className="group hover:bg-muted/50"
                            >
                              <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {medico.primeiro_nome?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell className="font-normal">
                                {nomeCompleto}
                              </TableCell>
                              <TableCell>{medico.crm}</TableCell>
                              <TableCell>{medico.especialidade_nome}</TableCell>
                              <TableCell>{medico.cpf || "-"}</TableCell>
                              <TableCell>
                                {new Date(medico.created_at).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={async () => {
                                      try {
                                        const medicoCompleto =
                                          await loadMedicoCompleto(medico.id);
                                        if (medicoCompleto) {
                                          setSelectedDoctor(medicoCompleto);
                                          setShowModal(true);
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Erro ao carregar dados do médico:",
                                          error
                                        );
                                      }
                                    }}
                                    title="Ver detalhes do médico"
                                  >
                                    <Info className="h-4 w-4 text-gray-700" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  {filteredPreRegisterMedics.length <
                    getFilteredPreRegisterCount() && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={loadMorePreRegisterMedics}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Carregar mais (
                        {getFilteredPreRegisterCount() -
                          filteredPreRegisterMedics.length}{" "}
                        restantes)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Médicos Revoluna */}
          {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-normal">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M20.3942 40C31.2193 40 40 31.0453 40 20.0032V19.9989C40 8.9568 31.2193 0 20.3942 0C14.7115 0 9.5881 2.46996 6 6.41632C14.4537 8.42191 22.5779 13.1853 27.3715 17.8922L27.3728 17.8936L27.3715 17.8943C26.0958 18.5887 25.2287 19.9605 25.2287 21.5394C25.2287 23.3385 26.3535 24.8704 27.9245 25.4388L27.9262 25.4394C27.0409 26.9028 20.8409 36.3485 9.02044 36.2886C12.2294 38.624 16.1589 40 20.3942 40ZM28.0376 23.8577C27.2626 23.4111 26.7389 22.565 26.7389 21.5928C26.7389 20.6207 27.2626 19.7725 28.0376 19.3259C28.0506 19.3184 28.0637 19.311 28.0769 19.3037C28.415 19.1169 28.7982 19.0074 29.2018 18.994C29.2298 18.993 29.2578 18.9926 29.286 18.9926C29.4619 18.9926 29.6337 19.0108 29.7997 19.0454C30.9611 19.2879 31.8351 20.3365 31.8351 21.5929C31.8351 22.8492 30.9611 23.8962 29.7997 24.1383C29.6337 24.1729 29.4619 24.191 29.286 24.191C28.8357 24.191 28.4084 24.0714 28.0376 23.8577Z"
                    fill="hsl(var(--primary))"
                  />
                  <path
                    d="M26 27.3699C23.8869 30.8879 18.142 35.8667 9.37713 35.9997C8.75861 36.0086 8.15114 35.8135 7.65148 35.4411C4.53249 33.1179 -6.10336 23.5215 4.8098 7.16626C4.8098 7.16626 4.9154 7.07759 5.08268 7C0.702451 14.2488 0.603486 20.2962 2.03422 24.6987C4.57871 32.5305 13.7969 35.8445 20.8207 31.6194C23.0152 30.2982 24.7388 28.7354 26 27.3699Z"
                    fill="hsl(var(--primary))"
                  />
                </svg>
              </div>
              Médicos Revoluna <span>({allDoctors.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por nome, CRM ou email..."
                  className="pl-8"
                  value={internalSearchTerm}
                  onChange={(e) => setInternalSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={specialtyFilter}
                onValueChange={setSpecialtyFilter}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as especialidades</SelectItem>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <LoadingSpinner className="h-64" />
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="min-w-0">Nome</TableHead>
                      <TableHead className="w-24">CRM</TableHead>
                      <TableHead className="w-32">Especialidade</TableHead>
                      <TableHead className="min-w-0">Email</TableHead>
                      <TableHead className="w-28">Telefone</TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDoctors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-10 text-gray-500"
                        >
                          Nenhum médico encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDoctors.map((doctor) => {
                        const medico_id = doctor.id;
                        const nomeCompleto = `${doctor.primeiro_nome} ${doctor.sobrenome}`;
                        const isFavorite = favoritosIds.includes(medico_id);

                        return (
                          <TableRow
                            key={medico_id}
                            className="group hover:bg-muted/50"
                          >
                            <TableCell>
                              <span
                                className="cursor-pointer"
                                onClick={async () => {
                                  const medicoCompleto =
                                    await loadMedicoCompleto(doctor.id);
                                  if (medicoCompleto) {
                                    setSelectedDoctor(medicoCompleto);
                                    setShowModal(true);
                                  }
                                }}
                              >
                                <Avatar>
                                  {getValidProfilePictureUrl(
                                    doctor.profile_picture_url
                                  ) && (
                                    <AvatarImage
                                      src={getValidProfilePictureUrl(
                                        doctor.profile_picture_url
                                      )}
                                      alt={nomeCompleto}
                                    />
                                  )}
                                  <AvatarFallback>
                                    {doctor.primeiro_nome?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </span>
                            </TableCell>
                            <TableCell className="font-normal">
                              {nomeCompleto}
                            </TableCell>
                            <TableCell>{doctor.crm}</TableCell>
                            <TableCell>{doctor.especialidade_nome}</TableCell>
                            <TableCell>{doctor.email}</TableCell>
                            <TableCell>
                              {formatTelefoneBR(doctor.telefone)}
                            </TableCell>
                            <TableCell>
                              <FavoriteButton
                                medicoId={medico_id}
                                isFavorite={isFavorite}
                                onToggle={handleFavoriteChange}
                                onSuccess={handleFavoriteSuccess}
                                isPrecadastro={doctor.is_precadastro}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                className="p-2 rounded hover:bg-muted/30"
                                onClick={async () => {
                                  const medicoCompleto =
                                    await loadMedicoCompleto(doctor.id);
                                  if (medicoCompleto) {
                                    setSelectedDoctor(medicoCompleto);
                                    setShowModal(true);
                                  }
                                }}
                              >
                                <MoreVertical className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {doctors.length < allDoctors.length && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreDoctors}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Carregar mais ({allDoctors.length - doctors.length}{" "}
                      restantes)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      {selectedDoctor && (
        <DoctorDetailsModal
          doctor={selectedDoctor}
          open={showModal}
          onClose={() => setShowModal(false)}
          onFavoriteChange={handleFavoriteChange}
          onEquipeChange={() => {
            // Recarregar dados das equipes quando houver mudanças
            loadEquipes();
          }}
          showFavoriteButton={true}
          showEquipesButton={true}
        />
      )}

      <EquipeModal
        open={showEquipeModal}
        onClose={() => setShowEquipeModal(false)}
        onSave={handleSaveEquipe}
        equipe={editingEquipe}
        mode={editingEquipe ? "edit" : "create"}
        initialName={editingEquipe ? undefined : initialEquipeName}
      />

      {/* Modal de confirmação para deletar equipe */}
      <ConfirmDialog
        open={confirmDeleteEquipe.open}
        onOpenChange={(open) =>
          setConfirmDeleteEquipe({ open, equipeId: null })
        }
        title="Excluir equipe"
        description="Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmDeleteEquipeAction}
        loading={actionLoading}
      />

      {/* Modal de confirmação para remover médico do corpo clínico */}
      <ConfirmDialog
        open={confirmRemoveMedico.open}
        onOpenChange={(open) =>
          setConfirmRemoveMedico({ open, medicoId: null })
        }
        title="Remover médico"
        description="Tem certeza que deseja remover este médico do corpo clínico? Ele também será removido dos favoritos."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmRemoveMedicoAction}
        loading={actionLoading}
      />

      {/* Modal de pré-cadastro de médico */}
      <PreCadastroMedicoModal
        open={showPreCadastroModal}
        onOpenChange={setShowPreCadastroModal}
        onMedicoPreCadastrado={handleMedicoPreCadastrado}
        searchTerm={corpoClinicoSearchTerm}
      />
    </div>
  );
}

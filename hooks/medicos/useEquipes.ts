import { useState, useEffect, useCallback } from "react";
import {
  fetchEquipes,
  fetchEquipesComMedicos,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  addMedicoToEquipe,
  removeMedicoFromEquipe,
  type Equipe,
  type EquipeMedicoView,
} from "@/services/equipesService";
import { toast } from "@/hooks/use-toast";
import { BadgeAlert, BadgeCheck } from "lucide-react";

export function useEquipes() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipesMedicos, setEquipesMedicos] = useState<{
    [key: string]: EquipeMedicoView[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar equipes
  const loadEquipes = useCallback(async () => {
    try {
      setLoading(true);
      const [equipesData, equipesMedicosArray] = await Promise.all([
        fetchEquipes(),
        fetchEquipesComMedicos(),
      ]);

      // Converter array em objeto agrupado por equipe_id
      const equipesMedicosObj: { [key: string]: EquipeMedicoView[] } = {};
      equipesMedicosArray.forEach((item) => {
        if (!equipesMedicosObj[item.equipe_id]) {
          equipesMedicosObj[item.equipe_id] = [];
        }
        equipesMedicosObj[item.equipe_id].push(item);
      });

      setEquipes(equipesData);
      setEquipesMedicos(equipesMedicosObj);
    } catch (error) {
      console.error("Erro ao carregar equipes:", error);
      toast({
        title: "Erro criando uma nova equipe!",
        description: "Equipe já existe!",
        icon: BadgeAlert,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar equipe
  const handleCreateEquipe = useCallback(async (nome: string, cor: string) => {
    try {
      setSaving(true);
      const teamAlreadyExists = equipes.find((currentTeam, index) => {
        console.log(`show me current team -> ${index} `, currentTeam);
        return currentTeam.nome === nome;
      });

      if (teamAlreadyExists) {
        toast({
          title: `Equipa já existe`,
          description: `${nome} já existe, por favor escolhe um nome diferente!`,
          icon: BadgeAlert,
          variant: "destructive",
        });
        return;
      } else {
        const novaEquipe = await createEquipe(nome, cor);
        setEquipes((prev) => [...prev, novaEquipe]);
        toast({
          title: "Nova equpe criado!",
          description: `Equipe ${nome} criada com sucesso.`,
          icon: BadgeCheck,
        });
        return novaEquipe;
      }
    } catch (error) {
      console.error("Erro ao criar equipe:", error);
      // toast.error("Erro ao criar equipe")

      toast({
        title: "Erro ao criar equipe",
        description: `${nome} já existe, por favor escolhe um nome diferente!`,
        icon: BadgeAlert,
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  // Atualizar equipe
  const handleUpdateEquipe = useCallback(
    async (
      equipeId: string,
      updates: {
        nome?: string;
        cor?: string;
        updated_by: string;
        updated_at: Date;
      }
    ) => {
      try {
        setSaving(true);
        const equipeAtualizada = await updateEquipe(equipeId, updates);
        setEquipes((prev) =>
          prev.map((e) => (e.id === equipeId ? equipeAtualizada : e))
        );
        toast({
          title: "Nova equpe atualizada!",
          description: `Equipe ${equipeAtualizada.nome} criada com sucesso.`,
          icon: BadgeCheck,
        });
        return equipeAtualizada;
      } catch (error) {
        console.error("Erro ao atualizar equipe:", error);

        toast({
          title: "Erro ao atualizar equipe",
          description: `${error}`,
          icon: BadgeAlert,
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Deletar equipe
  const handleDeleteEquipe = useCallback(async (equipeId: string) => {
    try {
      setSaving(true);
      await deleteEquipe(equipeId);
      setEquipes((prev) => prev.filter((e) => e.id !== equipeId));
      setEquipesMedicos((prev) => {
        const newData = { ...prev };
        delete newData[equipeId];
        return newData;
      });
      toast({
        title: "Equipe removida com sucesso",
        description: ``,
        icon: BadgeCheck,
      });
    } catch (error) {
      console.error("Erro ao deletar equipe:", error);
      toast({
        title: "Erro ao remover equipe!",
        description: `${error}`,
        icon: BadgeAlert,
      });
      // toast.error("Erro ao remover equipe");
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  // Adicionar médico à equipe
  const handleAddMedico = useCallback(
    async (equipeId: string, medicoId: string) => {
      try {
        setSaving(true);

        await addMedicoToEquipe(equipeId, medicoId);

        // Recarregar apenas os médicos das equipes para ser mais eficiente
        const equipesMedicosArray = await fetchEquipesComMedicos();
        const equipesMedicosObj: { [key: string]: EquipeMedicoView[] } = {};
        equipesMedicosArray.forEach((item) => {
          if (!equipesMedicosObj[item.equipe_id]) {
            equipesMedicosObj[item.equipe_id] = [];
          }
          equipesMedicosObj[item.equipe_id].push(item);
        });
        const doctorTeam = equipesMedicosArray.find(
          (currentTeam) => currentTeam.equipe_id === equipeId
        );
        const insertedDoctor = doctorTeam?.primeiro_nome;
        console.log("insertDed ", insertedDoctor);
        setEquipesMedicos(equipesMedicosObj);
        toast({
          title: "Médico adicionado à equipe!",
          description: ``,
          icon: BadgeCheck,
        });
      } catch (error) {
        console.error("Erro ao adicionar médico:", error);
        toast({
          title: "Erro ao adicionar médico à equipe!",
          icon: BadgeAlert,
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Remover médico da equipe
  const handleRemoveMedico = useCallback(
    async (equipeId: string, medicoId: string) => {
      try {
        setSaving(true);
        await removeMedicoFromEquipe(equipeId, medicoId);

        // Atualizar estado local removendo o médico da equipe
        setEquipesMedicos((prev) => ({
          ...prev,
          [equipeId]:
            prev[equipeId]?.filter((m) => m.medico_id !== medicoId) || [],
        }));

        toast({
          title: "Médico removido da equipe.",
          icon: BadgeCheck,
        });
      } catch (error) {
        console.error("Erro ao remover médico:", error);

        toast({
          title: "Erro ao remover médico da equipe.",
          icon: BadgeAlert,
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Carregar dados ao montar
  useEffect(() => {
    loadEquipes();
  }, [loadEquipes]);

  return {
    equipes,
    equipesMedicos,
    loading,
    saving,
    loadEquipes,
    createEquipe: handleCreateEquipe,
    updateEquipe: handleUpdateEquipe,
    deleteEquipe: handleDeleteEquipe,
    addMedico: handleAddMedico,
    removeMedico: handleRemoveMedico,
  };
}

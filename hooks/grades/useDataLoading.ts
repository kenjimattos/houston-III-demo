import { useState, useEffect, useCallback } from "react";
import {
  fetchMedicosEssenciaisCompleto,
  Medico,
} from "@/services/medicosService";
import {
  fetchEspecialidades,
  fetchSetores,
  fetchFormasRecebimento,
  fetchTiposVaga,
  Especialidade,
  ShiftType,
} from "@/services/parametrosService";
import { fetchHospitais, Hospital } from "@/services/hospitaisService";

interface DataLoadingState {
  // Data states
  medicos: Medico[];
  especialidades: Especialidade[];
  setores: any[];
  hospitais: Hospital[];
  formasRecebimento: any[];
  tiposVaga: any[];

  // Loading states
  medicosLoading: boolean;
  especialidadesLoading: boolean;
  setoresLoading: boolean;
  hospitaisLoading: boolean;
}

interface UseDataLoadingReturn {
  // Data states
  medicos: Medico[];
  setMedicos: React.Dispatch<React.SetStateAction<Medico[]>>;
  especialidades: Especialidade[];
  setEspecialidades: React.Dispatch<React.SetStateAction<Especialidade[]>>;
  setores: any[];
  setSetores: React.Dispatch<React.SetStateAction<any[]>>;
  hospitais: Hospital[];
  setHospitais: React.Dispatch<React.SetStateAction<Hospital[]>>;
  formasRecebimento: any[];
  setFormasRecebimento: React.Dispatch<React.SetStateAction<any[]>>;
  tiposVaga: any[];
  setTiposVaga: React.Dispatch<React.SetStateAction<any[]>>;

  // Loading states
  medicosLoading: boolean;
  setMedicosLoading: React.Dispatch<React.SetStateAction<boolean>>;
  especialidadesLoading: boolean;
  setEspecialidadesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setoresLoading: boolean;
  setSetoresLoading: React.Dispatch<React.SetStateAction<boolean>>;
  hospitaisLoading: boolean;
  setHospitaisLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // Utility methods
  loadAllData: () => Promise<void>;
  loadMedicos: () => Promise<void>;
  isAnyLoading: () => boolean;
  hasDataLoaded: () => boolean;
  resetAllData: () => void;
}

export const useDataLoading = (): UseDataLoadingReturn => {
  // Data states
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [formasRecebimento, setFormasRecebimento] = useState<any[]>([]);
  const [tiposVaga, setTiposVaga] = useState<ShiftType[]>([]);

  // Loading states
  const [medicosLoading, setMedicosLoading] = useState(false);
  const [especialidadesLoading, setEspecialidadesLoading] = useState(false);
  const [setoresLoading, setSetoresLoading] = useState(false);
  const [hospitaisLoading, setHospitaisLoading] = useState(false);

  // Load all reference data in parallel
  const loadAllData = useCallback(async () => {
    try {
      setEspecialidadesLoading(true);
      setSetoresLoading(true);
      setHospitaisLoading(true);

      const [
        medicosData,
        especialidadesData,
        setoresData,
        hospitaisData,
        formasRecebimentoData,
        tiposVagaData,
      ] = await Promise.all([
        fetchMedicosEssenciaisCompleto(),
        fetchEspecialidades(),
        fetchSetores(),
        fetchHospitais(),
        fetchFormasRecebimento(),
        fetchTiposVaga(),
      ]);

      setMedicos(medicosData);
      setEspecialidades(especialidadesData);
      setSetores(setoresData);
      setHospitais(hospitaisData);
      setFormasRecebimento(formasRecebimentoData);
      setTiposVaga(tiposVagaData);
    } catch (error) {
      console.error("Erro ao carregar dados de referência:", error);
    } finally {
      setEspecialidadesLoading(false);
      setSetoresLoading(false);
      setHospitaisLoading(false);
    }
  }, []);

  // Load only medicos
  const loadMedicos = useCallback(async () => {
    try {
      setMedicosLoading(true);
      const medicosData = await fetchMedicosEssenciaisCompleto();
      setMedicos(medicosData);
    } catch (error) {
      console.error("Erro ao carregar médicos:", error);
    } finally {
      setMedicosLoading(false);
    }
  }, []);

  // Check if any data is loading
  const isAnyLoading = useCallback(() => {
    return (
      medicosLoading ||
      especialidadesLoading ||
      setoresLoading ||
      hospitaisLoading
    );
  }, [medicosLoading, especialidadesLoading, setoresLoading, hospitaisLoading]);

  // Check if core data has loaded
  const hasDataLoaded = useCallback(() => {
    return (
      especialidades.length > 0 && setores.length > 0 && hospitais.length > 0
    );
  }, [especialidades.length, setores.length, hospitais.length]);

  // Reset all data
  const resetAllData = useCallback(() => {
    setMedicos([]);
    setEspecialidades([]);
    setSetores([]);
    setHospitais([]);
    setFormasRecebimento([]);
    setTiposVaga([]);
  }, []);

  return {
    // Data states
    medicos,
    setMedicos,
    especialidades,
    setEspecialidades,
    setores,
    setSetores,
    hospitais,
    setHospitais,
    formasRecebimento,
    setFormasRecebimento,
    tiposVaga,
    setTiposVaga,

    // Loading states
    medicosLoading,
    setMedicosLoading,
    especialidadesLoading,
    setEspecialidadesLoading,
    setoresLoading,
    setSetoresLoading,
    hospitaisLoading,
    setHospitaisLoading,

    // Utility methods
    loadAllData,
    loadMedicos,
    isAnyLoading,
    hasDataLoaded,
    resetAllData,
  };
};

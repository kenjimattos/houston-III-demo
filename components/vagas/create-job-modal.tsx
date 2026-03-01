"use client";

import type React from "react";

import { HospitalSelector } from "@/components/hospitais/hospital-selector";
import { DoctorSelector } from "@/components/medicos/doctor-selector";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useGrades } from "@/hooks/grades/useGrades";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/services/authService";
import {
  aprovarCandidatura,
  createCandidatura,
  reconsiderarCandidatura,
} from "@/services/candidaturasService";
import { fetchGruposComEscalistas } from "@/services/escalistasService";
import { type Grade } from "@/services/gradesService";
import {
  fetchBeneficios,
  fetchEspecialidades,
  fetchFormasRecebimento,
  fetchPeriodos,
  fetchRequisitos,
  fetchSetores,
  fetchTiposVaga,
  ShiftType,
} from "@/services/parametrosService";
import {
  fetchVagasCandidaturas,
  fetchVagasPorRecorrencia,
} from "@/services/vagasCandidaturasService";
import {
  createVaga,
  createVagasRecorrentes,
  deletarVagasRecorrencia,
  editarVagasRecorrencia,
  fetchBeneficiosDaVaga,
  fetchRequisitosDaVaga,
  verificarConflitoHorario,
} from "@/services/vagasService";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";

// Função para converter da interface antiga para a nova
function convertLegacyVagaToNew(legacyVaga: any) {
  return {
    hospital_id: legacyVaga.vagas_hospital,
    data: legacyVaga.vaga_data,
    periodo_id: legacyVaga.periodo_id,
    hora_inicio: legacyVaga.vaga_horainicio,
    hora_fim: legacyVaga.vaga_horafim,
    valor: legacyVaga.vaga_valor,
    data_pagamento: legacyVaga.vaga_datapagamento,
    tipos_vaga_id: legacyVaga.tipos_vaga_id,
    observacoes: legacyVaga.vaga_observacoes,
    setor_id: legacyVaga.vagas_setor,
    status: legacyVaga.vaga_status,
    total_candidaturas: legacyVaga.vagas_totalcandidaturas,
    especialidade_id: legacyVaga.vaga_especialidade,
    forma_recebimento_id: legacyVaga.forma_recebimento_id,
    grupo_id: legacyVaga.grupo_id,
    escalista_id: legacyVaga.vaga_escalista,
    updated_by: legacyVaga.updated_by,
    updated_at: legacyVaga.updated_at,
    recorrencia_id: legacyVaga.recorrencia_id,
    grade_id: legacyVaga.grade_id,
  };
}

interface CreateJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  editMode?: boolean;
  editData?: {
    id?: string;
    vaga_id?: string;
    hospital?: string;
    hospital_id?: string;
    specialty?: string;
    especialidade_id?: string;
    sector?: string;
    setor_id?: string;
    value?: number;
    vaga_valor?: number;
    vaga_status?: string;
    doctor?: string;
    medico_id?: string;
    beneficios?: string;
    periodo_id?: string;
    forma_recebimento_id?: string;
    tipos_vaga_id?: string;
    vaga_observacoes?: string;
    vaga_escalista?: string;
    vaga_horainicio?: string;
    vaga_horafim?: string;
    vaga_createdate?: string;
    updated_at?: string;
    grade_id?: string;
  };
  preloadedData?: {
    setores?: any[];
    especialidades?: any[];
    formasRecebimento?: any[];
    tiposVaga?: any[];
    beneficios?: any[];
    requisitos?: any[];
    periodos?: any[];
    hospitais?: any[];
    medicos?: any[];
    grupos?: any[];
    grades?: Grade[];
  };
  onUpdateVaga?: (args: {
    vaga_id: string;
    vagaUpdate: any;
    selectedBeneficios: string[];
    selectedRequisitos: string[];
  }) => Promise<void>;
  onVagaCreated?: () => Promise<void>;
  bulkEditMode?: boolean;
  bulkEditCount?: number;
  bulkEditCommonData?: any;
  onBulkUpdate?: (args: {
    vagaUpdate: any;
    selectedBeneficios: string[];
    selectedRequisitos: string[];
    medicoDesignado?: string;
    prazoPagamento?: string;
    dataFechamento?: Date;
  }) => Promise<void>;
}

const TIMEZONE = "America/Sao_Paulo";

// Função para obter o horário local do Brasil (UTC-3) no formato ISO para salvar no banco
function getBrazilNowISO() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace("T", " ").replace("Z", "");
}

// Função para converter string de data do banco em Date local (evita problema de timezone)
function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString || typeof dateString !== "string") return new Date();

  // Se a string já tem horário, usar Date normal
  if (dateString.includes("T") || dateString.includes(" ")) {
    return new Date(dateString);
  }

  // Se é apenas data (YYYY-MM-DD), forçar interpretação como local
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months são 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  // Fallback para Date normal
  return new Date(dateString);
}

export function CreateJobModal({
  open,
  onOpenChange,
  initialDate,
  initialStartTime,
  initialEndTime,
  editMode = false,
  editData,
  preloadedData,
  onUpdateVaga,
  onVagaCreated,
  bulkEditMode = false,
  bulkEditCount = 0,
  bulkEditCommonData = {},
  onBulkUpdate,
}: CreateJobModalProps) {
  const [dates, setDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState(initialStartTime || "");
  const [endTime, setEndTime] = useState(initialEndTime || "");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string>("");
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [jobType, setJobType] = useState<string>("");
  const [observations, setObservations] = useState<string>("");

  // Estados para médico
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");

  // Wrapper para limpar erro de conflito ao mudar médico ou data
  const handleDoctorChange = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    setConflictError(""); // Limpar erro quando mudar médico
    setShowConflictModal(false); // Fechar modal de conflito
  };

  const handleDateChange = (dates: Date[]) => {
    setDates(dates);
    setConflictError(""); // Limpar erro quando mudar data
    setShowConflictModal(false); // Fechar modal de conflito
  };
  const [doctorOpen, setDoctorOpen] = useState(false);

  // Estado para rastrear campos editados em edição em lote
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  // Função para marcar um campo como editado
  const markFieldAsEdited = useCallback(
    (fieldName: string) => {
      if (bulkEditMode) {
        setEditedFields((prev) => new Set([...prev, fieldName]));
      }
    },
    [bulkEditMode]
  );

  // Wrappers para setters que marcam campos como editados
  const setSelectedHospitalAndMark = (value: string) => {
    setSelectedHospital(value);
    markFieldAsEdited("vagas_hospital");
  };

  const setSelectedSpecialtyAndMark = (value: string) => {
    setSelectedSpecialty(value);
    markFieldAsEdited("vaga_especialidade");
  };

  const setSelectedSectorAndMark = (value: string) => {
    setSelectedSector(value);
    markFieldAsEdited("vagas_setor");
  };

  const setStartTimeAndMark = (value: string) => {
    setStartTime(value);
    markFieldAsEdited("vaga_horainicio");
  };

  const setEndTimeAndMark = (value: string) => {
    setEndTime(value);
    markFieldAsEdited("vaga_horafim");
  };

  const setSelectedPeriodoAndMark = (value: string) => {
    setSelectedPeriodo(value);
    markFieldAsEdited("periodo_id");
  };

  const setPaymentMethodAndMark = (value: string) => {
    setPaymentMethod(value);
    markFieldAsEdited("forma_recebimento_id");
  };

  const setJobTypeAndMark = (value: string) => {
    setJobType(value);
    markFieldAsEdited("tipos_vaga_id");
  };

  const setObservationsAndMark = (value: string) => {
    setObservations(value);
    markFieldAsEdited("vaga_observacoes");
  };

  const setSelectedGrupoAndMark = (value: string) => {
    setSelectedGrupo(value);
    markFieldAsEdited("grupo_id");
  };

  const setSelectedEscalistaAndMark = (value: string) => {
    setSelectedEscalista(value);
    markFieldAsEdited("vaga_escalista");
  };

  const setSelectedGradeAndMark = (value: string) => {
    setSelectedGrade(value);
    markFieldAsEdited("grade_id");
  };

  const setPaymentDateAndMark = (value: Date | undefined) => {
    setPaymentDate(value);
    markFieldAsEdited("vaga_datapagamento");
  };

  const handlePrazoPagamentoChange = (
    value: "vista" | "30dias" | "45dias" | "60dias" | "data_fechamento" | ""
  ) => {
    setPrazoPagamento(value);
    if (value !== "" && value !== "data_fechamento") {
      markFieldAsEdited("vaga_datapagamento");
    }
  };

  // Parâmetros reais
  const [setores, setSetores] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [formasRecebimento, setFormasRecebimento] = useState<any[]>([]);
  const [tiposVaga, setTiposVaga] = useState<ShiftType[]>([]);
  const [beneficios, setBeneficios] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [selectedBeneficios, setSelectedBeneficios] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");

  // Estados para requisitos
  const [requisitos, setRequisitos] = useState<any[]>([]);
  const [selectedRequisitos, setSelectedRequisitos] = useState<string[]>([]);

  // Estados para controle de expansão das seções
  const [beneficiosExpanded, setBeneficiosExpanded] = useState(false);
  const [requisitosExpanded, setRequisitosExpanded] = useState(false);

  // NOVO: Estados para prazo de pagamento
  const [prazoPagamento, setPrazoPagamento] = useState<
    "vista" | "30dias" | "45dias" | "60dias" | "data_fechamento" | ""
  >("30dias");
  const [dataFechamento, setDataFechamento] = useState<Date | undefined>(
    undefined
  );

  // Novo estado para grupo e escalista
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [escalistas, setEscalistas] = useState<any[]>([]);
  const [selectedEscalista, setSelectedEscalista] = useState<string>("");

  // Estado para grades
  const { grades } = useGrades();
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  // Novo estado para editar scope
  const [editScope, setEditScope] = useState<"single" | "all">("single");
  const [hasRecorrencia, setHasRecorrencia] = useState(false);

  // Novo estado para resumo
  const [showResumoModal, setShowResumoModal] = useState(false);
  const [vagasResumo, setVagasResumo] = useState<any[]>([]);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);

  // Novo estado para excluir recorrência
  const [showDeleteRecorrenciaModal, setShowDeleteRecorrenciaModal] =
    useState(false);

  // Novo estado para troca de médico designado
  const [previousDoctorId, setPreviousDoctorId] = useState<string>("");
  const [candidaturaAprovadaId, setCandidaturaAprovadaId] =
    useState<string>("");

  // Estado para controlar se escalista já foi inicializado (simplificado)
  const [escalistaInitialized, setEscalistaInitialized] = useState(false);

  // Carregar dados iniciais apenas uma vez quando o modal abrir
  useEffect(() => {
    if (open) {
      // Limpar campos editados ao abrir modal (garantir estado limpo)
      setEditedFields(new Set());

      if (preloadedData) {
        // Usar dados pré-carregados se disponíveis
        if (preloadedData.setores) setSetores(preloadedData.setores);
        if (preloadedData.especialidades)
          setEspecialidades(preloadedData.especialidades);
        if (preloadedData.formasRecebimento)
          setFormasRecebimento(preloadedData.formasRecebimento);
        if (preloadedData.tiposVaga) setTiposVaga(preloadedData.tiposVaga);
        if (preloadedData.beneficios) setBeneficios(preloadedData.beneficios);
        if (preloadedData.requisitos) setRequisitos(preloadedData.requisitos);
        if (preloadedData.periodos) setPeriodos(preloadedData.periodos);
        if (preloadedData.medicos) setMedicos(preloadedData.medicos);
        if (preloadedData.grupos) setGrupos(preloadedData.grupos);
        // Grades são carregados automaticamente pelo hook useGrades
      } else {
        // Fallback: buscar dados se não pré-carregados
        fetchSetores().then(setSetores);
        fetchEspecialidades().then(setEspecialidades);
        fetchFormasRecebimento().then(setFormasRecebimento);
        fetchTiposVaga().then(setTiposVaga);
        fetchBeneficios().then(setBeneficios);
        fetchRequisitos().then(setRequisitos);
        fetchPeriodos().then(setPeriodos);
        fetchGruposComEscalistas().then(setGrupos);
        // Grades são carregados automaticamente pelo hook useGrades
      }
    } else {
      // Resetar inicialização quando modal fechar
      setEscalistaInitialized(false);
    }
  }, [open, preloadedData]);

  // Configurar valores iniciais quando necessário
  useEffect(() => {
    if (open) {
      if (initialDate) setDates([initialDate]);
      if (initialStartTime !== undefined && initialStartTime !== null)
        setStartTime(initialStartTime);
      if (initialEndTime !== undefined && initialEndTime !== null)
        setEndTime(initialEndTime);

      // Se estiver no modo de edição, preencher com os dados existentes
      if (editMode && editData) {
        // Configurar data única para edição
        if ((editData as any).vaga_data) {
          setDates([parseLocalDate((editData as any).vaga_data)]);
        }
        setSelectedHospital(editData.hospital_id ?? "");
        setSelectedSpecialty(editData.especialidade_id ?? "");
        setSelectedSector(editData.setor_id ?? "");
        setSelectedPeriodo(editData.periodo_id ?? "");
        setSelectedGrupo((editData as any).grupo_id ?? "");
        setSelectedEscalista(
          (editData as any).vaga_escalista ??
            (editData as any).escalista_id ??
            ""
        );
        setSelectedGrade((editData as any).grade_id ?? "sem-grade");
        setValue((editData.vaga_valor ?? "").toString());
        setPaymentMethod(editData.forma_recebimento_id ?? "");
        setJobType(editData.tipos_vaga_id ?? "");
        setObservations(editData.vaga_observacoes ?? "");
        // Definir horários de início e fim do editData
        setStartTime(editData.vaga_horainicio ?? "");
        setEndTime(editData.vaga_horafim ?? "");
        // Buscar benefícios e requisitos reais da vaga em paralelo
        if (editData.vaga_id) {
          Promise.all([
            fetchBeneficiosDaVaga(editData.vaga_id),
            fetchRequisitosDaVaga(editData.vaga_id),
          ]).then(([beneficios, requisitos]) => {
            setSelectedBeneficios(beneficios.map((b: any) => b.beneficio_id));
            setSelectedRequisitos(requisitos.map((r: any) => r.requisito_id));

            // Expandir seções se houver itens selecionados
            if (beneficios.length > 0) {
              setBeneficiosExpanded(true);
            }
            if (requisitos.length > 0) {
              setRequisitosExpanded(true);
            }
          });
        } else {
          setSelectedBeneficios([]);
          setSelectedRequisitos([]);
        }
        // Detectar prazo de pagamento baseado na data de pagamento
        const dataPagamentoStr = (editData as any).vaga_datapagamento ?? "";
        const dataPlantaoStr = (editData as any).vaga_data ?? "";
        if (dataPagamentoStr && dataPlantaoStr) {
          const dataPagamento = parseLocalDate(dataPagamentoStr);
          const dataPlantao = parseLocalDate(dataPlantaoStr);
          const diffMs = dataPagamento.getTime() - dataPlantao.getTime();
          const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

          if (diffDias === 1) {
            setPrazoPagamento("vista");
          } else if (diffDias === 30) {
            setPrazoPagamento("30dias");
          } else if (diffDias === 45) {
            setPrazoPagamento("45dias");
          } else if (diffDias === 60) {
            setPrazoPagamento("60dias");
          } else {
            setPrazoPagamento("data_fechamento");
            setDataFechamento(dataPagamento);
          }
        } else {
          setPrazoPagamento("30dias");
        }
        // Buscar médico aprovado baseado nas candidaturas existentes
        if (editData.vaga_id) {
          import("@/services/vagasCandidaturasService").then(async (mod) => {
            try {
              const vagas = await mod.fetchVagasCandidaturas({
                vaga_id: editData.vaga_id,
              });

              // fetchVagasCandidaturas retorna vagas agrupadas com array candidaturas interno
              // Precisamos buscar a candidatura aprovada dentro do array candidaturas da vaga
              const vaga = vagas[0]; // Deve haver apenas uma vaga quando filtrando por vaga_id
              const candidaturasArray = vaga?.candidaturas || [];

              const aprovada = candidaturasArray.find(
                (c: any) => c.candidatura_status === "APROVADO"
              );

              if (aprovada) {
                // O medico_id pode estar em candidatura_medico_id ou medico_id dependendo da estrutura
                const medicoId = aprovada.candidatura_medico_id || aprovada.medico_id;
                if (medicoId) {
                  setSelectedDoctor(medicoId);
                  setPreviousDoctorId(medicoId);
                  setCandidaturaAprovadaId(aprovada.candidatura_id);
                } else {
                  setSelectedDoctor("");
                  setPreviousDoctorId("");
                  setCandidaturaAprovadaId("");
                }
              } else {
                // Vaga sem candidatura aprovada - resetar campos
                setSelectedDoctor("");
                setPreviousDoctorId("");
                setCandidaturaAprovadaId("");

                // Log para debug de vagas fechadas sem médico
                if (editData.vaga_status === "fechada") {
                  // Closed vaga without approved candidatura detected
                }
              }
            } catch (err) {
              setSelectedDoctor("");
              setPreviousDoctorId("");
              setCandidaturaAprovadaId("");
            }
          });
        } else {
          // IMPORTANTE: Não resetar médico se estivermos no modo bulk edit
          // porque o médico será definido posteriormente pelo bulkEditCommonData
          if (!bulkEditMode) {
            setSelectedDoctor("");
            setPreviousDoctorId("");
            setCandidaturaAprovadaId("");
          }
        }
      } else {
        // Valores padrão apenas para novo registro
        setSelectedBeneficios([]);
        setSelectedRequisitos([]);

        // IMPORTANTE: Não resetar médico se estivermos no modo bulk edit
        // porque o médico será definido posteriormente pelo bulkEditCommonData
        if (!bulkEditMode) {
          setSelectedDoctor("");
        } else {
        }

        setSelectedGrade("sem-grade");
      }
    }
  }, [
    open,
    editMode,
    editData,
    grupos,
    initialDate,
    initialStartTime,
    initialEndTime,
    bulkEditMode,
  ]);

  // Atualizar escalistas ao trocar de grupo e limpar escalista selecionado se não estiver na nova lista
  useEffect(() => {
    if (selectedGrupo && grupos.length > 0) {
      const grupo = grupos.find((g) => g.id === selectedGrupo);
      if (grupo) {
        setEscalistas(grupo.escalistas);
        setEscalistaInitialized(true);

        // Limpar escalista selecionado se não estiver na nova lista de escalistas
        const escalistaExiste = grupo.escalistas.some(
          (e: any) => e.id === selectedEscalista
        );
        if (selectedEscalista && !escalistaExiste) {
          setSelectedEscalista("");
        }
      }
    }
  }, [selectedGrupo, grupos, selectedEscalista]);

  // Calcular data de pagamento baseada no tipo (não aplicado no bulk edit)
  useEffect(() => {
    if (
      dates.length > 0 &&
      !bulkEditMode &&
      prazoPagamento !== "" &&
      prazoPagamento !== "data_fechamento"
    ) {
      const primeiraData = dates[0];
      let dataPagamento: Date | undefined = undefined;

      if (prazoPagamento === "vista") {
        dataPagamento = new Date(primeiraData);
        dataPagamento.setDate(dataPagamento.getDate() + 1);
      } else if (prazoPagamento === "30dias") {
        dataPagamento = new Date(primeiraData);
        dataPagamento.setDate(dataPagamento.getDate() + 30);
      } else if (prazoPagamento === "45dias") {
        dataPagamento = new Date(primeiraData);
        dataPagamento.setDate(dataPagamento.getDate() + 45);
      } else if (prazoPagamento === "60dias") {
        dataPagamento = new Date(primeiraData);
        dataPagamento.setDate(dataPagamento.getDate() + 60);
      }

      setPaymentDate(dataPagamento);
    } else if (prazoPagamento === "data_fechamento" && dataFechamento) {
      setPaymentDate(dataFechamento);
    }
  }, [dates, prazoPagamento, dataFechamento, bulkEditMode]);

  // Função para preencher horas conforme período
  useEffect(() => {
    if (selectedPeriodo && periodos.length > 0) {
      const periodo = periodos.find((p) => p.periodo_id === selectedPeriodo);
      if (periodo) {
        let newStartTime = "";
        let newEndTime = "";

        if (periodo.periodo.toLowerCase().includes("cinderela")) {
          newStartTime = "07:00";
          newEndTime = "01:00";
        } else if (periodo.periodo.toLowerCase().includes("diurno")) {
          newStartTime = "07:00";
          newEndTime = "19:00";
        } else if (periodo.periodo.toLowerCase().includes("noturno")) {
          newStartTime = "19:00";
          newEndTime = "07:00";
        } else if (periodo.periodo.toLowerCase().includes("manhã")) {
          newStartTime = "07:00";
          newEndTime = "13:00";
        } else if (periodo.periodo.toLowerCase().includes("tarde")) {
          newStartTime = "13:00";
          newEndTime = "19:00";
        }

        // Só preencher automaticamente se não estiver no modo de edição ou se os horários estiverem vazios
        if (
          newStartTime &&
          newEndTime &&
          (!editMode || (startTime === "" && endTime === ""))
        ) {
          setStartTime(newStartTime);
          setEndTime(newEndTime);

          // Na edição em lote, marcar os horários como editados quando são atualizados automaticamente pelo período
          if (bulkEditMode) {
            markFieldAsEdited("vaga_horainicio");
            markFieldAsEdited("vaga_horafim");
          }
        }
      }
    }
  }, [
    selectedPeriodo,
    periodos,
    bulkEditMode,
    markFieldAsEdited,
    editMode,
    startTime,
    endTime,
  ]);

  // Detectar recorrencia_id ao abrir em modo edição
  useEffect(() => {
    if (open && editMode && editData && (editData as any).recorrencia_id) {
      setHasRecorrencia(!!(editData as any).recorrencia_id);
      setEditScope("single");
    } else {
      setHasRecorrencia(false);
      setEditScope("single");
    }
  }, [open, editMode, editData]);

  const weekDays = [
    { value: 1, label: "Segunda" },
    { value: 2, label: "Terça" },
    { value: 3, label: "Quarta" },
    { value: 4, label: "Quinta" },
    { value: 5, label: "Sexta" },
    { value: 6, label: "Sábado" },
    { value: 0, label: "Domingo" },
  ];

  // Efeito para popular campos com dados comuns em edição em lote
  useEffect(() => {
    if (
      !open ||
      !bulkEditMode ||
      !bulkEditCommonData ||
      Object.keys(bulkEditCommonData).length === 0
    ) {
      return;
    }

    // Aguardar um tick para garantir que outros useEffects tenham sido executados
    const timer = setTimeout(() => {
      // IMPORTANTE: Limpar todos os campos primeiro e preencher apenas os que têm valores comuns
      // Isso garante que campos diferentes entre as vagas selecionadas fiquem vazios

      // Limpar todos os campos básicos
      setSelectedHospital("");
      setSelectedSpecialty("");
      setSelectedSector("");
      setValue("");
      setStartTime("");
      setEndTime("");
      setSelectedPeriodo("");
      setPaymentMethod("");
      setJobType("");
      setObservations("");
      setDates([]);
      setSelectedDoctor("");
      setSelectedGrupo("");
      setSelectedEscalista("");
      setSelectedGrade("sem-grade");

      // Agora popular apenas campos com dados comuns
      if (bulkEditCommonData.hospital_id)
        setSelectedHospital(bulkEditCommonData.hospital_id);
      if (bulkEditCommonData.especialidade_id)
        setSelectedSpecialty(bulkEditCommonData.especialidade_id);
      if (bulkEditCommonData.setor_id)
        setSelectedSector(bulkEditCommonData.setor_id);
      if (bulkEditCommonData.vaga_valor)
        setValue(bulkEditCommonData.vaga_valor.toString());
      if (
        bulkEditCommonData.vaga_horainicio !== undefined &&
        bulkEditCommonData.vaga_horainicio !== null
      )
        setStartTime(bulkEditCommonData.vaga_horainicio);
      if (
        bulkEditCommonData.vaga_horafim !== undefined &&
        bulkEditCommonData.vaga_horafim !== null
      )
        setEndTime(bulkEditCommonData.vaga_horafim);
      if (bulkEditCommonData.periodo_id)
        setSelectedPeriodo(bulkEditCommonData.periodo_id);
      if (bulkEditCommonData.forma_recebimento_id)
        setPaymentMethod(bulkEditCommonData.forma_recebimento_id);
      if (bulkEditCommonData.tipos_vaga_id)
        setJobType(bulkEditCommonData.tipos_vaga_id);
      if (bulkEditCommonData.vaga_observacoes)
        setObservations(bulkEditCommonData.vaga_observacoes);

      // Data da vaga
      if (bulkEditCommonData.vaga_data) {
        const dataVaga = parseLocalDate(bulkEditCommonData.vaga_data);
        setDates([dataVaga]);
      }

      // Grupo e escalista (ordem importante)
      if (bulkEditCommonData.grupo_id) {
        setSelectedGrupo(bulkEditCommonData.grupo_id);
        // Aguardar escalistas carregarem
        setTimeout(() => {
          if (
            bulkEditCommonData.vaga_escalista ||
            bulkEditCommonData.escalista_id
          ) {
            setSelectedEscalista(
              bulkEditCommonData.vaga_escalista ||
                bulkEditCommonData.escalista_id
            );
          }
        }, 50);
      } else if (
        bulkEditCommonData.vaga_escalista ||
        bulkEditCommonData.escalista_id
      ) {
        setSelectedEscalista(
          bulkEditCommonData.vaga_escalista || bulkEditCommonData.escalista_id
        );
      }

      // Grade comum
      if (bulkEditCommonData.grade_id) {
        setSelectedGrade(bulkEditCommonData.grade_id);
      }

      // Médico designado comum
      if (bulkEditCommonData.medico_designado) {
        setSelectedDoctor(bulkEditCommonData.medico_designado);
      }

      // Prazo de pagamento comum (calculado com base na diferença das datas)
      if (bulkEditCommonData.prazo_pagamento_comum) {
        setPrazoPagamento(bulkEditCommonData.prazo_pagamento_comum);
        if (
          bulkEditCommonData.prazo_pagamento_comum === "data_fechamento" &&
          bulkEditCommonData.data_fechamento_comum
        ) {
          setDataFechamento(
            parseLocalDate(bulkEditCommonData.data_fechamento_comum)
          );
        }
      } else {
        // Limpar campos específicos de bulk edit se não há valor comum
        setPaymentDate(undefined);
        setPrazoPagamento("");
        setDataFechamento(undefined);
      }

      setEditedFields(new Set());
    }, 100);

    return () => clearTimeout(timer);
  }, [open, bulkEditMode, bulkEditCommonData]);

  // Máscara para valor inteiro com separador de milhares
  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g, "");
    setValue(raw);
    markFieldAsEdited("vaga_valor");
  }
  function getValorMasked() {
    if (!value) return "";
    return new Intl.NumberFormat("pt-BR").format(Number(value));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validação específica para edição em lote
    if (bulkEditMode) {
      // Na edição em lote, pelo menos um campo deve ter sido editado
      if (editedFields.size === 0) {
        toast({
          title: "Nenhum campo editado",
          description:
            "Por favor, edite pelo menos um campo para aplicar as alterações.",
          variant: "destructive",
        });
        return;
      }

      // Validar apenas os campos que foram editados
      if (
        editedFields.has("vaga_datapagamento") &&
        prazoPagamento === "data_fechamento" &&
        !dataFechamento
      ) {
        toast({
          title: "Data obrigatória",
          description:
            "Por favor, selecione uma data personalizada para o pagamento.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Validação original para criação/edição individual
      if (
        dates.length === 0 ||
        !startTime ||
        !endTime ||
        !selectedHospital ||
        !selectedSpecialty ||
        !selectedSector ||
        !value ||
        !selectedPeriodo ||
        !selectedGrupo ||
        !selectedEscalista
      ) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Validação de pagamento para modo individual
      if (prazoPagamento === "data_fechamento" && !dataFechamento) {
        toast({
          title: "Data obrigatória",
          description:
            "Por favor, selecione uma data personalizada para o pagamento.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      const user = await getCurrentUser();
      const now = getBrazilNowISO();

      // Lógica para edição em lote
      if (bulkEditMode && onBulkUpdate) {
        // Construir objeto apenas com os campos editados

        // Construir objeto com apenas os campos que foram editados
        const vagaUpdate: any = {};

        if (editedFields.has("vagas_hospital") && selectedHospital) {
          vagaUpdate.vagas_hospital = selectedHospital;
        }
        if (editedFields.has("vaga_especialidade") && selectedSpecialty) {
          vagaUpdate.vaga_especialidade = selectedSpecialty;
        }
        if (editedFields.has("vagas_setor") && selectedSector) {
          vagaUpdate.vagas_setor = selectedSector;
        }
        if (editedFields.has("vaga_valor") && value) {
          vagaUpdate.vaga_valor = parseFloat(
            value.replace(/\./g, "").replace(",", ".")
          );
        }
        if (editedFields.has("periodo_id") && selectedPeriodo) {
          vagaUpdate.periodo_id = selectedPeriodo;
        }
        if (editedFields.has("vaga_horainicio") && startTime) {
          vagaUpdate.vaga_horainicio = startTime;
        }
        if (editedFields.has("vaga_horafim") && endTime) {
          vagaUpdate.vaga_horafim = endTime;
        }
        if (editedFields.has("forma_recebimento_id") && paymentMethod) {
          vagaUpdate.forma_recebimento_id = paymentMethod;
        }
        if (editedFields.has("tipos_vaga_id") && jobType) {
          vagaUpdate.tipos_vaga_id = jobType;
        }
        if (editedFields.has("vaga_observacoes")) {
          // Para observações, permitir string vazia (limpar campo)
          vagaUpdate.vaga_observacoes = observations;
        }
        // REMOVIDO: Status não deve ser alterado automaticamente na edição em lote
        // O status só deve mudar quando há designação/remoção de médico, que é gerenciado separadamente
        if (editedFields.has("grupo_id") && selectedGrupo) {
          vagaUpdate.grupo_id = selectedGrupo;
        }
        if (editedFields.has("vaga_escalista") && selectedEscalista) {
          vagaUpdate.vaga_escalista = selectedEscalista;
        }
        if (editedFields.has("grade_id")) {
          vagaUpdate.grade_id =
            selectedGrade === "sem-grade" ? undefined : selectedGrade;
        }

        // Data de pagamento será calculada individualmente para cada vaga na função handleBulkUpdate
        // Não incluir no vagaUpdate para evitar sobrescrever o cálculo individual

        await onBulkUpdate({
          vagaUpdate,
          selectedBeneficios,
          selectedRequisitos,
          medicoDesignado: editedFields.has("medico_designado")
            ? selectedDoctor || undefined
            : undefined,
          prazoPagamento: prazoPagamento || undefined,
          dataFechamento: dataFechamento,
        });

        return;
      }

      if (editMode && editData && editData.vaga_id && onUpdateVaga) {
        // Verificar se é edição de recorrência
        if (
          hasRecorrencia &&
          editScope === "all" &&
          (editData as any).recorrencia_id
        ) {
          // Edição de todas as vagas da recorrência
          const primeiraData = dates[0];

          // Calcular dias de pagamento baseado no tipo selecionado
          let diasPagamento: number | null = null;
          if (prazoPagamento === "vista") {
            diasPagamento = 1;
          } else if (prazoPagamento === "30dias") {
            diasPagamento = 30;
          } else if (prazoPagamento === "45dias") {
            diasPagamento = 45;
          } else if (prazoPagamento === "60dias") {
            diasPagamento = 60;
          } else if (prazoPagamento === "data_fechamento") {
            // Para data de fechamento específica, calcular dias baseado na primeira vaga
            if (dataFechamento && primeiraData) {
              const diffMs = dataFechamento.getTime() - primeiraData.getTime();
              diasPagamento = Math.round(diffMs / (1000 * 60 * 60 * 24));
            }
          }

          // Determinar status das vagas recorrentes baseado no médico designado
          let novoStatus: "aberta" | "fechada" | "cancelada" = "aberta";
          if (selectedDoctor) {
            novoStatus = "fechada";
          }

          const vagaUpdateRecorrencia = {
            vagas_hospital: selectedHospital || editData?.hospital_id || "",
            periodo_id: selectedPeriodo || editData?.periodo_id || "",
            vaga_horainicio:
              startTime || (editData as any)?.vaga_horainicio || "",
            vaga_horafim: endTime || (editData as any)?.vaga_horafim || "",
            vaga_valor: value
              ? Number.parseInt(value, 10)
              : editData?.vaga_valor ?? 0,
            forma_recebimento_id:
              paymentMethod || editData?.forma_recebimento_id || "",
            tipos_vaga_id: jobType || editData?.tipos_vaga_id || "",
            vagas_setor: selectedSector || editData?.setor_id || "",
            vaga_escalista:
              selectedEscalista || (editData as any)?.vaga_escalista || "",
            updated_at: now,
            vaga_status: novoStatus,
            vaga_especialidade:
              selectedSpecialty || editData?.especialidade_id || "",
            updated_by: user.id,
            grupo_id: selectedGrupo || (editData as any)?.grupo_id || "",
            vaga_observacoes: observations,
            medico_designado: selectedDoctor || null, // Campo especial para indicar médico designado na edição em massa
            grade_id:
              selectedGrade === "sem-grade"
                ? undefined
                : selectedGrade || (editData as any)?.grade_id || undefined,
          };

          // Buscar vagas da recorrência para mostrar resumo
          const vagasData = await fetchVagasPorRecorrencia(
            (editData as any).recorrencia_id
          );
          setVagasResumo(vagasData);

          // Preparar update pendente
          setPendingUpdate({
            recorrencia_id: (editData as any).recorrencia_id,
            update: vagaUpdateRecorrencia,
            updateby: user.id,
            selectedBeneficios,
            selectedRequisitos,
            diasPagamento,
            medicoDesignado: selectedDoctor,
          });

          // Mostrar modal de resumo
          setShowResumoModal(true);
          setLoading(false);
          return;
        } else {
          // Edição de vaga única
          const primeiraData = dates[0];
          let dataPagamentoCalculada: Date | undefined = undefined;

          if (prazoPagamento === "vista") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 1
            );
          } else if (prazoPagamento === "30dias") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 30
            );
          } else if (prazoPagamento === "45dias") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 45
            );
          } else if (prazoPagamento === "60dias") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 60
            );
          } else if (prazoPagamento === "data_fechamento") {
            dataPagamentoCalculada = dataFechamento;
          }

          // Garantir que dataPagamentoCalculada tenha um valor válido
          if (!dataPagamentoCalculada) {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 30
            ); // Padrão 30 dias
          }

          // Determinar o novo status da vaga baseado no médico designado
          let novoStatus = editData?.vaga_status;
          if (selectedDoctor && !previousDoctorId) {
            // Recebendo médico designado pela primeira vez - deve fechar
            novoStatus = "fechada";
          } else if (!selectedDoctor && previousDoctorId) {
            // Perdendo médico designado - deve reabrir
            novoStatus = "aberta";
          } else if (selectedDoctor) {
            // Tem médico designado - deve estar fechada
            novoStatus = "fechada";
          }

          const vagaUpdate = {
            hospital_id: selectedHospital || editData?.hospital_id || "",
            data: primeiraData.toISOString().slice(0, 10),
            periodo_id: selectedPeriodo || editData?.periodo_id || "",
            hora_inicio: startTime || (editData as any)?.vaga_horainicio || "",
            hora_fim: endTime || (editData as any)?.vaga_horafim || "",
            valor: value
              ? Number.parseInt(value, 10)
              : editData?.vaga_valor ?? 0,
            forma_recebimento_id:
              paymentMethod || editData?.forma_recebimento_id || "",
            data_pagamento: dataPagamentoCalculada.toISOString().slice(0, 10),
            tipos_vaga_id: jobType || editData?.tipos_vaga_id || "",
            setor_id: selectedSector || editData?.setor_id || "",
            escalista_id:
              selectedEscalista || (editData as any)?.vaga_escalista || "",
            updated_at: now,
            status: novoStatus,
            especialidade_id:
              selectedSpecialty || editData?.especialidade_id || "",
            updated_by: user.id,
            grupo_id: selectedGrupo || (editData as any)?.grupo_id || "",
            observacoes: observations,
            grade_id:
              selectedGrade === "sem-grade"
                ? undefined
                : selectedGrade || (editData as any)?.grade_id || undefined,
            // Nota: O médico designado é gerenciado via candidaturas aprovadas, não há campo direto na vaga
          };

          // Verificar conflito de horário ANTES de atualizar APENAS se há mudança de médico designado
          // Nota: Ao aprovar um novo médico, o banco de dados automaticamente reprova a candidatura anterior
          if (selectedDoctor && selectedDoctor !== previousDoctorId) {
            try {
              await verificarConflitoHorario({
                medico_id: selectedDoctor,
                data: vagaUpdate.data,
                hora_inicio: vagaUpdate.hora_inicio,
                hora_fim: vagaUpdate.hora_fim,
              });
            } catch (error: any) {
              // Se houver conflito, mostrar modal e não prosseguir
              toast({
                title: "Conflito de horário detectado",
                description:
                  error.message ||
                  "Este médico já possui um plantão agendado que conflita com o horário selecionado.",
                variant: "destructive",
                duration: 8000,
              });
              setShowConflictModal(true);
              setLoading(false);
              return; // Não prosseguir com a atualização
            }
          }

          // Atualizar a vaga primeiro
          await onUpdateVaga({
            vaga_id: editData.vaga_id,
            vagaUpdate,
            selectedBeneficios,
            selectedRequisitos,
          });

          // Gerenciar candidaturas baseado nas mudanças do médico designado
          if (
            selectedDoctor &&
            previousDoctorId &&
            selectedDoctor !== previousDoctorId
          ) {
            // Trocando médico designado - criar/aprovar candidatura do novo médico
            // O banco de dados automaticamente reprova a candidatura anterior ao aprovar a nova
            try {
              // Verificar se já existe candidatura para o novo médico nesta vaga
              const candidaturasExistentes = await fetchVagasCandidaturas({
                vaga_id: editData.vaga_id,
              });
              const vaga = candidaturasExistentes?.[0];
              const candidaturasArray = vaga?.candidaturas || [];
              const candidaturaNovoMedico = candidaturasArray.find(
                (c: any) =>
                  (c.candidatura_medico_id || c.medico_id) === selectedDoctor
              );

              if (candidaturaNovoMedico) {
                // Já existe candidatura, aprovar
                await aprovarCandidatura({
                  candidatura_id: candidaturaNovoMedico.candidatura_id,
                  vaga_id: editData.vaga_id,
                });
              } else {
                // Criar nova candidatura aprovada
                await createCandidatura({
                  vaga_id: editData.vaga_id,
                  medico_id: selectedDoctor,
                  status: "APROVADO",
                  vaga_valor: Number.parseInt(value, 10),
                });
              }
              toast({
                title: "Médico designado alterado",
                description:
                  "O médico designado foi alterado com sucesso.",
              });
            } catch (candidaturaError: any) {
              // Verificar se é erro de conflito
              const errorMessage =
                candidaturaError?.message ||
                candidaturaError?.details ||
                candidaturaError?.hint ||
                candidaturaError?.toString() ||
                "";
              const isConflictError =
                errorMessage.toUpperCase().includes("CONFLITO_HORARIO") ||
                errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO");

              if (isConflictError) {
                const conflictMatch = errorMessage.match(
                  /Plantão já aprovado: ([^|]+)/
                );
                const conflictInfo = conflictMatch
                  ? conflictMatch[1]
                  : "horário conflitante";
                setConflictError(
                  `O médico selecionado já possui ${conflictInfo}. Este plantão pode ter sido escalado por outro grupo ou hospital.`
                );
                setShowConflictModal(true);
                setLoading(false);
                return;
              }
              throw candidaturaError; // Re-throw se não for conflito
            }
          } else if (selectedDoctor && !previousDoctorId) {
            // Recebendo médico designado pela primeira vez - criar candidatura aprovada
            try {
              await createCandidatura({
                vaga_id: editData.vaga_id,
                medico_id: selectedDoctor,
                status: "APROVADO",
                vaga_valor: Number.parseInt(value, 10),
              });
              toast({
                title: "Vaga fechada e médico designado",
                description:
                  "A vaga foi fechada e uma candidatura aprovada foi criada para o médico selecionado.",
              });
            } catch (candidaturaError: any) {
              // Verificar se é erro de conflito
              const errorMessage =
                candidaturaError?.message ||
                candidaturaError?.details ||
                candidaturaError?.hint ||
                candidaturaError?.toString() ||
                "";
              const isConflictError =
                errorMessage.toUpperCase().includes("CONFLITO_HORARIO") ||
                errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO");

              if (isConflictError) {
                const conflictMatch = errorMessage.match(
                  /Plantão já aprovado: ([^|]+)/
                );
                const conflictInfo = conflictMatch
                  ? conflictMatch[1]
                  : "horário conflitante";
                setConflictError(
                  `O médico selecionado já possui ${conflictInfo}. Este plantão pode ter sido escalado por outro grupo ou hospital.`
                );
                setShowConflictModal(true);
                setLoading(false);
                return;
              }
              throw candidaturaError; // Re-throw se não for conflito
            }
          } else if (
            !selectedDoctor &&
            previousDoctorId &&
            candidaturaAprovadaId
          ) {
            // Perdendo médico designado - reconsiderar candidatura anterior
            await reconsiderarCandidatura({
              candidatura_id: candidaturaAprovadaId,
            });
            toast({
              title: "Vaga reaberta",
              description:
                "A vaga foi reaberta e a candidatura anterior foi reconsiderada.",
            });
          } else if (selectedDoctor && !candidaturaAprovadaId) {
            // Vaga fechada sem candidatura aprovada recebendo médico - corrigir inconsistência
            try {
              await createCandidatura({
                vaga_id: editData.vaga_id,
                medico_id: selectedDoctor,
                status: "APROVADO",
                vaga_valor: Number.parseInt(value, 10),
              });
              toast({
                title: "Vaga atualizada e médico designado",
                description:
                  "A vaga foi atualizada e uma candidatura aprovada foi criada para corrigir inconsistência.",
              });
            } catch (candidaturaError: any) {
              // Verificar se é erro de conflito
              const errorMessage =
                candidaturaError?.message ||
                candidaturaError?.details ||
                candidaturaError?.hint ||
                candidaturaError?.toString() ||
                "";
              const isConflictError =
                errorMessage.toUpperCase().includes("CONFLITO_HORARIO") ||
                errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO");

              if (isConflictError) {
                const conflictMatch = errorMessage.match(
                  /Plantão já aprovado: ([^|]+)/
                );
                const conflictInfo = conflictMatch
                  ? conflictMatch[1]
                  : "horário conflitante";
                setConflictError(
                  `O médico selecionado já possui ${conflictInfo}. Este plantão pode ter sido escalado por outro grupo ou hospital.`
                );
                setShowConflictModal(true);
                setLoading(false);
                return;
              }
              throw candidaturaError; // Re-throw se não for conflito
            }
          } else {
            toast({
              title: "Vaga atualizada",
              description: "A vaga foi atualizada com sucesso.",
            });
          }
        }
      } else {
        // Modo de criação - uma ou múltiplas vagas
        const isMultiple = dates.length > 1;

        if (isMultiple) {
          // Detectar se as datas formam um padrão de recorrência
          const diasSemana = [...new Set(dates.map((date) => date.getDay()))];
          const shouldUseRecurrence =
            dates.length >= 4 && diasSemana.length <= 2;

          if (shouldUseRecurrence) {
            // Usar sistema de recorrência
            const dataInicio = new Date(
              Math.min(...dates.map((d) => d.getTime()))
            );
            const dataFim = new Date(
              Math.max(...dates.map((d) => d.getTime()))
            );

            // Calcular dias de pagamento baseado no tipo selecionado
            let diasPagamento: number | null = null;
            if (prazoPagamento === "vista") {
              diasPagamento = 1;
            } else if (prazoPagamento === "30dias") {
              diasPagamento = 30;
            } else if (prazoPagamento === "45dias") {
              diasPagamento = 45;
            } else if (prazoPagamento === "60dias") {
              diasPagamento = 60;
            } else if (prazoPagamento === "data_fechamento") {
              if (dataFechamento && dataInicio) {
                const diffMs = dataFechamento.getTime() - dataInicio.getTime();
                diasPagamento = Math.round(diffMs / (1000 * 60 * 60 * 24));
              }
            }

            // Preparar vaga base para recorrência
            const primeiraData = dates[0];
            let dataPagamentoCalculada: Date | undefined = undefined;

            if (prazoPagamento === "vista") {
              dataPagamentoCalculada = new Date(primeiraData);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 1
              );
            } else if (prazoPagamento === "30dias") {
              dataPagamentoCalculada = new Date(primeiraData);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 30
              );
            } else if (prazoPagamento === "45dias") {
              dataPagamentoCalculada = new Date(primeiraData);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 45
              );
            } else if (prazoPagamento === "60dias") {
              dataPagamentoCalculada = new Date(primeiraData);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 60
              );
            } else if (prazoPagamento === "data_fechamento") {
              dataPagamentoCalculada = dataFechamento;
            }

            // Garantir que dataPagamentoCalculada não seja null
            if (!dataPagamentoCalculada) {
              dataPagamentoCalculada = new Date(primeiraData);
              dataPagamentoCalculada.setDate(
                dataPagamentoCalculada.getDate() + 30
              ); // Padrão 30 dias
            }

            const vagaBase = {
              vagas_hospital: selectedHospital,
              vaga_data: primeiraData.toISOString().slice(0, 10),
              periodo_id: selectedPeriodo,
              vaga_horainicio: startTime,
              vaga_horafim: endTime,
              vaga_valor: Number.parseInt(value, 10),
              vaga_datapagamento: dataPagamentoCalculada
                .toISOString()
                .slice(0, 10),
              forma_recebimento_id: paymentMethod,
              tipos_vaga_id: jobType,
              vagas_setor: selectedSector,
              vaga_escalista: selectedEscalista,
              updated_by: user.id,
              vaga_especialidade: selectedSpecialty,
              grupo_id: selectedGrupo,
              vaga_observacoes: observations,
              vaga_status: (selectedDoctor ? "fechada" : "aberta") as
                | "aberta"
                | "fechada"
                | "cancelada",
              vagas_totalcandidaturas: 0,
              updated_at: now,
              grade_id:
                selectedGrade === "sem-grade"
                  ? undefined
                  : selectedGrade || undefined,
            };

            // Criar recorrência
            await createVagasRecorrentes({
              data_inicio: dataInicio.toISOString().slice(0, 10),
              data_fim: dataFim.toISOString().slice(0, 10),
              dias_semana: diasSemana,
              vaga_base: vagaBase,
              created_by: user.id,
              medico_id: selectedDoctor || null,
              observacoes: `Recorrência criada automaticamente - ${diasSemana
                .map(
                  (d) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d]
                )
                .join(", ")}`,
              selectedBeneficios,
              selectedRequisitos,
              diasPagamento,
            });

            toast({
              title: "Recorrência criada",
              description: `${
                dates.length
              } vagas foram criadas como recorrência para ${diasSemana
                .map(
                  (d) =>
                    [
                      "domingos",
                      "segundas",
                      "terças",
                      "quartas",
                      "quintas",
                      "sextas",
                      "sábados",
                    ][d]
                )
                .join(" e ")}.`,
            });
          } else {
            // Criar múltiplas vagas individuais (padrão antigo)
            const vagasData = dates.map((date) => {
              let dataPagamentoCalculada: Date | undefined = undefined;

              if (prazoPagamento === "vista") {
                dataPagamentoCalculada = new Date(date);
                dataPagamentoCalculada.setDate(
                  dataPagamentoCalculada.getDate() + 1
                );
              } else if (prazoPagamento === "30dias") {
                dataPagamentoCalculada = new Date(date);
                dataPagamentoCalculada.setDate(
                  dataPagamentoCalculada.getDate() + 30
                );
              } else if (prazoPagamento === "45dias") {
                dataPagamentoCalculada = new Date(date);
                dataPagamentoCalculada.setDate(
                  dataPagamentoCalculada.getDate() + 45
                );
              } else if (prazoPagamento === "60dias") {
                dataPagamentoCalculada = new Date(date);
                dataPagamentoCalculada.setDate(
                  dataPagamentoCalculada.getDate() + 60
                );
              } else if (prazoPagamento === "data_fechamento") {
                dataPagamentoCalculada = dataFechamento;
              }

              // Garantir que dataPagamentoCalculada não seja null
              if (!dataPagamentoCalculada) {
                dataPagamentoCalculada = new Date(date);
                dataPagamentoCalculada.setDate(
                  dataPagamentoCalculada.getDate() + 30
                ); // Padrão 30 dias
              }

              return {
                vagas_hospital: selectedHospital,
                vaga_data: date.toISOString().slice(0, 10),
                periodo_id: selectedPeriodo,
                vaga_horainicio: startTime,
                vaga_horafim: endTime,
                vaga_valor: Number.parseInt(value, 10),
                vaga_datapagamento: dataPagamentoCalculada
                  .toISOString()
                  .slice(0, 10),
                forma_recebimento_id: paymentMethod,
                tipos_vaga_id: jobType,
                vagas_setor: selectedSector,
                vaga_escalista: selectedEscalista,
                updated_by: user.id,
                vaga_especialidade: selectedSpecialty,
                grupo_id: selectedGrupo,
                vaga_observacoes: observations,
                vaga_status: (selectedDoctor ? "fechada" : "aberta") as
                  | "aberta"
                  | "fechada"
                  | "cancelada",
                vagas_totalcandidaturas: 0,
                updated_at: now,
                grade_id:
                  selectedGrade === "sem-grade"
                    ? undefined
                    : selectedGrade || undefined,
              };
            });

            // Criar todas as vagas individuais
            for (const vagaData of vagasData) {
              // Verificar conflito ANTES de criar cada vaga se há médico designado
              if (selectedDoctor) {
                try {
                  await verificarConflitoHorario({
                    medico_id: selectedDoctor,
                    data: vagaData.vaga_data,
                    hora_inicio: vagaData.vaga_horainicio,
                    hora_fim: vagaData.vaga_horafim,
                  });
                } catch (error: any) {
                  // Se houver exception, pular esta vaga e continuar com as próximas
                  toast({
                    title: "Conflito detectado",
                    description: `Vaga do dia ${new Date(
                      vagaData.vaga_data
                    ).toLocaleDateString("pt-BR")} não criada: ${
                      error.message || "médico já possui plantão conflitante"
                    }`,
                    variant: "destructive",
                    duration: 8000,
                  });
                  continue; // Pular para próxima vaga
                }
              }

              const vagaCriada = await createVaga({
                vagaInsert: convertLegacyVagaToNew(vagaData),
                selectedBeneficios,
                selectedRequisitos,
              });
              if (selectedDoctor) {
                await createCandidatura({
                  vaga_id: vagaCriada.id,
                  medico_id: selectedDoctor,
                  status: "APROVADO",
                  vaga_valor: vagaCriada.valor,
                });
              }
            }

            toast({
              title: "Vagas criadas",
              description: `${dates.length} vagas foram criadas individualmente com sucesso.`,
            });
          }
        } else {
          // Criar vaga única
          const primeiraData = dates[0];
          let dataPagamentoCalculada: Date | undefined = undefined;

          if (prazoPagamento === "vista") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 1
            );
          } else if (prazoPagamento === "30dias") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 30
            );
          } else if (prazoPagamento === "45dias") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 45
            );
          } else if (prazoPagamento === "60dias") {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 60
            );
          } else if (prazoPagamento === "data_fechamento") {
            dataPagamentoCalculada = dataFechamento;
          }

          // Garantir que dataPagamentoCalculada não seja null
          if (!dataPagamentoCalculada) {
            dataPagamentoCalculada = new Date(primeiraData);
            dataPagamentoCalculada.setDate(
              dataPagamentoCalculada.getDate() + 30
            ); // Padrão 30 dias
          }

          const vagaBase = {
            vagas_hospital: selectedHospital,
            vaga_data: primeiraData.toISOString().slice(0, 10),
            periodo_id: selectedPeriodo,
            vaga_horainicio: startTime,
            vaga_horafim: endTime,
            vaga_valor: Number.parseInt(value, 10),
            vaga_datapagamento: dataPagamentoCalculada
              .toISOString()
              .slice(0, 10),
            forma_recebimento_id: paymentMethod,
            tipos_vaga_id: jobType,
            vagas_setor: selectedSector,
            vaga_escalista: selectedEscalista,
            updated_by: user.id,
            vaga_especialidade: selectedSpecialty,
            grupo_id: selectedGrupo,
            vaga_observacoes: observations,
            vaga_status: (selectedDoctor ? "fechada" : "aberta") as
              | "aberta"
              | "fechada"
              | "cancelada",
            vagas_totalcandidaturas: 0,
            updated_at: now,
            grade_id:
              selectedGrade === "sem-grade"
                ? undefined
                : selectedGrade || undefined,
          };

          // Verificar conflito ANTES de criar vaga se há médico designado
          if (selectedDoctor) {
            try {
              await verificarConflitoHorario({
                medico_id: selectedDoctor,
                data: primeiraData.toISOString().slice(0, 10),
                hora_inicio: startTime,
                hora_fim: endTime,
              });
            } catch (error: any) {
              // Se houver exception, é conflito - mostrar modal
              setConflictError(
                error.message ||
                  "O médico já possui plantão conflitante neste horário."
              );
              setShowConflictModal(true);
              setLoading(false);
              return;
            }
          }

          const vagaCriada = await createVaga({
            vagaInsert: convertLegacyVagaToNew(vagaBase),
            selectedBeneficios,
            selectedRequisitos,
          });
          if (selectedDoctor) {
            await createCandidatura({
              vaga_id: vagaCriada.id,
              medico_id: selectedDoctor,
              status: "APROVADO",
              vaga_valor: vagaCriada.valor,
            });
          }

          toast({
            title: "Vaga criada",
            description: "A vaga foi criada com sucesso.",
          });
        }
      }

      onOpenChange(false);
      resetForm();
      if (onVagaCreated) {
        await onVagaCreated();
      }
    } catch (error: any) {
      console.error(
        editMode ? "Erro ao atualizar vaga:" : "Erro ao criar vaga:",
        error
      );

      // Verificar se é erro de conflito de horário
      // Verificar em múltiplos lugares onde a mensagem pode estar
      const errorMessage =
        error?.message ||
        error?.details ||
        error?.hint ||
        error?.toString() ||
        "";
      const isConflictError =
        errorMessage.toUpperCase().includes("CONFLITO_HORARIO") ||
        errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO");

      if (isConflictError) {
        // Extrair informações do conflito da mensagem de erro
        const conflictMatch = errorMessage.match(
          /Plantão já aprovado: ([^|]+)/
        );
        const conflictInfo = conflictMatch
          ? conflictMatch[1]
          : "horário conflitante";

        // Definir mensagem de erro e abrir modal
        setConflictError(
          `O médico selecionado já possui ${conflictInfo}. Este plantão pode ter sido escalado por outro grupo ou hospital.`
        );
        setShowConflictModal(true);

        // Limpar o loading já que não vamos fechar o modal
        setLoading(false);
        return; // Interromper execução para não cair no else
      } else {
        toast({
          title: "Erro",
          description: editMode
            ? "Não foi possível atualizar a vaga. Tente novamente."
            : "Não foi possível criar a vaga. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResumo = async () => {
    if (!pendingUpdate) return;
    setLoading(true);
    try {
      // Verificar conflito de horário ANTES de editar se há médico designado
      if (pendingUpdate.medicoDesignado) {
        // Buscar as vagas da recorrência para verificar conflitos
        const vagasRecorrencia = await fetchVagasPorRecorrencia(
          pendingUpdate.recorrencia_id
        );

        // Verificar conflito para cada vaga da recorrência
        for (const vaga of vagasRecorrencia) {
          try {
            const { verificarConflitoHorario } = await import(
              "@/services/vagasService"
            );
            await verificarConflitoHorario({
              medico_id: pendingUpdate.medicoDesignado,
              data: vaga.vaga_data,
              hora_inicio:
                pendingUpdate.update.vaga_horainicio || vaga.vaga_horainicio,
              hora_fim: pendingUpdate.update.vaga_horafim || vaga.vaga_horafim,
            });
          } catch (error: any) {
            // Se houver conflito em qualquer vaga, mostrar erro e não prosseguir
            toast({
              title: "Conflito de horário detectado",
              description: `Conflito encontrado na vaga do dia ${new Date(
                vaga.vaga_data
              ).toLocaleDateString("pt-BR")}: ${
                error.message || "médico já possui plantão conflitante"
              }`,
              variant: "destructive",
              duration: 8000,
            });
            setShowConflictModal(true);
            setLoading(false);
            setShowResumoModal(false);
            return; // Não prosseguir com a atualização
          }
        }
      }

      // Primeiro, atualizar todas as vagas da recorrência
      await editarVagasRecorrencia({
        recorrencia_id: pendingUpdate.recorrencia_id,
        update: pendingUpdate.update,
        updateby: pendingUpdate.updateby,
        selectedBeneficios: pendingUpdate.selectedBeneficios || [],
        selectedRequisitos: pendingUpdate.selectedRequisitos || [],
        diasPagamento: pendingUpdate.diasPagamento,
      });

      // Se há médico designado, gerenciar candidaturas para todas as vagas
      if (pendingUpdate.medicoDesignado) {
        // Buscar todas as vagas da recorrência
        const vagasData = await fetchVagasPorRecorrencia(
          pendingUpdate.recorrencia_id
        );

        for (const vaga of vagasData) {
          // Buscar candidaturas existentes para esta vaga
          const candidaturas = await fetchVagasCandidaturas({
            vaga_id: vaga.vaga_id,
          });
          const candidaturaAprovada = candidaturas.find(
            (c: any) => c.candidatura_status === "APROVADO"
          );
          const candidaturaNovoMedico = candidaturas.find(
            (c: any) => c.medico_id === pendingUpdate.medicoDesignado
          );

          if (
            candidaturaAprovada &&
            candidaturaAprovada.medico_id !== pendingUpdate.medicoDesignado
          ) {
            // Há candidatura aprovada de outro médico - marcar como pendente
            await reconsiderarCandidatura({
              candidatura_id: candidaturaAprovada.candidatura_id,
            });
          }

          if (candidaturaNovoMedico) {
            // Já existe candidatura do novo médico - aprovar
            if (candidaturaNovoMedico.candidatura_status !== "APROVADO") {
              await aprovarCandidatura({
                candidatura_id: candidaturaNovoMedico.candidatura_id,
                vaga_id: vaga.vaga_id,
              });
            }
          } else {
            // Não existe candidatura do novo médico - criar aprovada
            await createCandidatura({
              vaga_id: vaga.vaga_id,
              medico_id: pendingUpdate.medicoDesignado,
              status: "APROVADO",
              vaga_valor: vaga.vaga_valor,
            });
          }
        }

        toast({
          title: "Vagas recorrentes atualizadas com médico designado",
          description: `Todas as ${vagasData.length} vagas foram fechadas e candidaturas aprovadas criadas para o médico selecionado.`,
        });
      } else if (pendingUpdate.update.vaga_status === "aberta") {
        // Se mudou para aberta (removeu médico), reconsiderar candidaturas aprovadas
        const vagasData = await fetchVagasPorRecorrencia(
          pendingUpdate.recorrencia_id
        );

        for (const vaga of vagasData) {
          const candidaturas = await fetchVagasCandidaturas({
            vaga_id: vaga.vaga_id,
          });
          const candidaturaAprovada = candidaturas.find(
            (c: any) => c.candidatura_status === "APROVADO"
          );

          if (candidaturaAprovada) {
            await reconsiderarCandidatura({
              candidatura_id: candidaturaAprovada.candidatura_id,
            });
          }
        }

        toast({
          title: "Vagas recorrentes reabertas",
          description: `Todas as ${vagasData.length} vagas foram reabertas e candidaturas aprovadas reconsideradas.`,
        });
      } else {
        toast({
          title: "Vagas recorrentes atualizadas",
          description: "Todas as vagas da recorrência foram atualizadas.",
        });
      }

      onOpenChange(false);
      resetForm();
      // Atualizar tabela após edição bem-sucedida
      if (onVagaCreated) {
        await onVagaCreated();
      }
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar vagas recorrentes",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowResumoModal(false);
      setVagasResumo([]);
      setPendingUpdate(null);
    }
  };

  const handleCancelResumo = () => {
    setShowResumoModal(false);
    setVagasResumo([]);
    setPendingUpdate(null);
  };

  const handleDeleteRecorrencia = async () => {
    if (!editData || !(editData as any).recorrencia_id) return;
    setLoading(true);
    try {
      const user = await getCurrentUser();
      await deletarVagasRecorrencia({
        recorrencia_id: (editData as any).recorrencia_id,
        updateby: user.id,
      });
      toast({
        title: "Vagas recorrentes excluídas",
        description:
          "Todas as vagas, candidaturas e benefícios desta recorrência foram excluídos.",
      });
      onOpenChange(false);
      resetForm();
      // Atualizar tabela após exclusão bem-sucedida
      if (onVagaCreated) {
        await onVagaCreated();
      }
    } catch (err: any) {
      toast({
        title: "Erro ao excluir recorrência",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteRecorrenciaModal(false);
    }
  };

  const resetForm = () => {
    setDates([]);
    setStartTime("");
    setEndTime("");
    setPaymentDate(undefined);
    setSelectedHospital("");
    setSelectedSpecialty("");
    setSelectedSector("");
    setValue("");
    setPaymentMethod("");
    setJobType("");
    setConflictError(""); // Limpar erro de conflito
    setShowConflictModal(false); // Fechar modal de conflito
    setObservations("");
    setSelectedDoctor("");
    setSelectedBeneficios([]);
    setSelectedRequisitos([]);
    setBeneficiosExpanded(false);
    setRequisitosExpanded(false);
    setSelectedPeriodo("");
    setPrazoPagamento("30dias");
    setDataFechamento(undefined);
    setSelectedGrupo("");
    setSelectedEscalista("");
    setEditScope("single");
    setHasRecorrencia(false);
    setShowResumoModal(false);
    setVagasResumo([]);
    setPendingUpdate(null);
    setShowDeleteRecorrenciaModal(false);
    setPreviousDoctorId("");
    setCandidaturaAprovadaId("");
    setEscalistaInitialized(false);
    setSelectedGrade("sem-grade");
    setEditedFields(new Set()); // Limpar campos editados no reset
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-normal">
              {bulkEditMode
                ? "Editar Vagas em Lote"
                : editMode
                ? "Editar Vaga"
                : "Nova Vaga"}
            </DialogTitle>
            <DialogDescription className="font-thin">
              {bulkEditMode
                ? `Editando ${bulkEditCount} vaga${
                    bulkEditCount !== 1 ? "s" : ""
                  } simultaneamente. Os campos preenchidos serão aplicados a todas as vagas selecionadas.`
                : editMode
                ? "Atualize os dados da vaga de plantão."
                : dates.length > 1
                ? `Criando ${dates.length} vagas de plantão para as datas selecionadas.`
                : "Preencha os dados abaixo para criar uma nova vaga de plantão."}
            </DialogDescription>

            {bulkEditMode && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Modo de edição em massa:</strong> Apenas os campos que
                  você alterar serão atualizados. Campos vazios ou não
                  modificados manterão seus valores originais.
                </p>
              </div>
            )}
          </DialogHeader>
          {editMode && hasRecorrencia && (
            <div className="mb-4 p-3 border rounded bg-yellow-50 text-yellow-900">
              <div className="mb-2 font-normal">
                Esta vaga faz parte de uma recorrência.
              </div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="editScope"
                    value="single"
                    checked={editScope === "single"}
                    onChange={() => setEditScope("single")}
                  />
                  Editar apenas esta vaga
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="editScope"
                    value="all"
                    checked={editScope === "all"}
                    onChange={() => setEditScope("all")}
                  />
                  Editar todas as vagas da recorrência
                </label>
              </div>
            </div>
          )}
          {editMode && hasRecorrencia && (
            <div className="flex justify-end mb-2">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteRecorrenciaModal(true)}
                disabled={loading}
              >
                Excluir todas as vagas desta recorrência
              </Button>
            </div>
          )}
          {showResumoModal && (
            <Dialog open={showResumoModal} onOpenChange={handleCancelResumo}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Resumo da edição em massa</DialogTitle>
                  <DialogDescription>
                    Você está prestes a atualizar <b>{vagasResumo.length}</b>{" "}
                    vagas desta recorrência. Confira os principais campos que
                    serão alterados:
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4 space-y-2">
                  <div>
                    <b>Valor:</b> R$ {value}
                  </div>
                  <div>
                    <b>Horário:</b> {startTime} - {endTime}
                  </div>
                  <div>
                    <b>Setor:</b>{" "}
                    {setores.find((s) => s.setor_id === selectedSector)
                      ?.setor_nome || "-"}
                  </div>
                  <div>
                    <b>Especialidade:</b>{" "}
                    {especialidades.find(
                      (e) => e.especialidade_id === selectedSpecialty
                    )?.especialidade_nome || "-"}
                  </div>
                  <div>
                    <b>Médico designado:</b>{" "}
                    {selectedDoctor
                      ? medicos.find((m) => m.id === selectedDoctor)
                          ?.medico_primeironome +
                        " " +
                        medicos.find((m) => m.id === selectedDoctor)
                          ?.medico_sobrenome
                      : "Nenhum"}
                  </div>
                  <div>
                    <b>Grupo:</b>{" "}
                    {grupos.find((g) => g.grupo_id === selectedGrupo)
                      ?.grupo_nome || "-"}
                  </div>
                  <div>
                    <b>Benefícios:</b>{" "}
                    {selectedBeneficios.length > 0
                      ? selectedBeneficios
                          .map(
                            (id) =>
                              beneficios.find((b) => b.beneficio_id === id)
                                ?.beneficio_nome
                          )
                          .join(", ")
                      : "Nenhum"}
                  </div>
                  <div>
                    <b>Requisitos:</b>{" "}
                    {selectedRequisitos.length > 0
                      ? selectedRequisitos
                          .map(
                            (id) =>
                              requisitos.find((r) => r.requisito_id === id)
                                ?.requisito_nome
                          )
                          .join(", ")
                      : "Nenhum"}
                  </div>
                  <div>
                    <b>Observações:</b> {observations || "-"}
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    onClick={handleConfirmResumo}
                    disabled={loading}
                    className="w-1/3"
                  >
                    Confirmar e salvar
                  </Button>
                  <Button
                    onClick={handleCancelResumo}
                    disabled={loading}
                    variant="outline"
                    className="w-1/3"
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {showDeleteRecorrenciaModal && (
            <Dialog
              open={showDeleteRecorrenciaModal}
              onOpenChange={setShowDeleteRecorrenciaModal}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Excluir recorrência</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir <b>todas as vagas</b> desta
                    recorrência? Esta ação é <b>irreversível</b> e todas as
                    vagas, candidaturas e benefícios relacionados serão
                    removidos.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    onClick={handleDeleteRecorrencia}
                    disabled={loading}
                    variant="destructive"
                    className="w-1/3"
                  >
                    Excluir tudo
                  </Button>
                  <Button
                    onClick={() => setShowDeleteRecorrenciaModal(false)}
                    disabled={loading}
                    variant="outline"
                    className="w-1/3"
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HospitalSelector
                value={selectedHospital}
                onChange={
                  bulkEditMode
                    ? setSelectedHospitalAndMark
                    : setSelectedHospital
                }
                required={!bulkEditMode}
                placeholder={
                  bulkEditMode
                    ? "Buscar hospital... (manter atual se vazio)"
                    : "Buscar hospital..."
                }
                onHospitalCreated={() => {
                  // Hospital criado com sucesso
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="dates" className="font-normal">
                  {dates.length > 1
                    ? `Datas do Plantão (${dates.length} selecionadas)`
                    : "Data do Plantão"}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dates"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-thin",
                        dates.length === 0 && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dates.length > 0 ? (
                        dates.length === 1 ? (
                          format(dates[0], "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          `${dates.length} datas selecionadas`
                        )
                      ) : (
                        <span>Selecione as datas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="multiple"
                      selected={dates}
                      onSelect={(selectedDates) =>
                        handleDateChange(selectedDates || [])
                      }
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {dates.length > 1 &&
                  (() => {
                    const diasSemana = [
                      ...new Set(dates.map((date) => date.getDay())),
                    ];
                    const shouldUseRecurrence =
                      dates.length >= 4 && diasSemana.length <= 2;
                    return (
                      <p
                        className={`text-xs font-thin ${
                          shouldUseRecurrence
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {shouldUseRecurrence
                          ? `🔄 Recorrência detectada: ${
                              dates.length
                            } vagas serão criadas como recorrência para ${diasSemana
                              .map(
                                (d) =>
                                  [
                                    "domingos",
                                    "segundas",
                                    "terças",
                                    "quartas",
                                    "quintas",
                                    "sextas",
                                    "sábados",
                                  ][d]
                              )
                              .join(" e ")}`
                          : `Múltiplas datas selecionadas - será criada uma vaga individual para cada data (${dates.length} vagas)`}
                      </p>
                    );
                  })()}
              </div>
            </div>
            <div style={{ height: 1 }} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo" className="font-normal">
                  Período
                </Label>
                <Select
                  value={selectedPeriodo}
                  onValueChange={
                    bulkEditMode
                      ? setSelectedPeriodoAndMark
                      : setSelectedPeriodo
                  }
                  required={!bulkEditMode}
                >
                  <SelectTrigger id="periodo" className="font-thin">
                    <SelectValue
                      placeholder={
                        bulkEditMode
                          ? "Manter período atual"
                          : "Selecione o período"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((periodo) => (
                      <SelectItem
                        key={periodo.id}
                        value={periodo.id}
                        className="font-thin"
                      >
                        {periodo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime" className="font-normal">
                  Hora de Início
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  required={!bulkEditMode}
                  value={startTime}
                  onChange={(e) =>
                    bulkEditMode
                      ? setStartTimeAndMark(e.target.value)
                      : setStartTime(e.target.value)
                  }
                  className="font-thin"
                  placeholder={bulkEditMode ? "Manter horário atual" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="font-normal">
                  Hora de Fim
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  required={!bulkEditMode}
                  value={endTime}
                  onChange={(e) =>
                    bulkEditMode
                      ? setEndTimeAndMark(e.target.value)
                      : setEndTime(e.target.value)
                  }
                  className="font-thin"
                  placeholder={bulkEditMode ? "Manter horário atual" : ""}
                />
              </div>
            </div>
            <div style={{ height: 1 }} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector" className="font-normal">
                  Setor
                </Label>
                <Select
                  value={selectedSector}
                  onValueChange={
                    bulkEditMode ? setSelectedSectorAndMark : setSelectedSector
                  }
                  required={!bulkEditMode}
                >
                  <SelectTrigger id="sector" className="font-thin">
                    <SelectValue
                      placeholder={
                        bulkEditMode
                          ? "Manter setor atual"
                          : "Selecione o setor"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((setor) => (
                      <SelectItem
                        key={setor.id}
                        value={setor.id}
                        className="font-thin"
                      >
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty" className="font-normal">
                  Especialidade
                </Label>
                <Select
                  value={selectedSpecialty}
                  onValueChange={
                    bulkEditMode
                      ? setSelectedSpecialtyAndMark
                      : setSelectedSpecialty
                  }
                  required={!bulkEditMode}
                >
                  <SelectTrigger id="specialty" className="font-thin">
                    <SelectValue
                      placeholder={
                        bulkEditMode
                          ? "Manter especialidade atual"
                          : "Selecione a especialidade"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {especialidades.map((esp) => (
                      <SelectItem
                        key={esp.id}
                        value={esp.id}
                        className="font-thin"
                      >
                        {esp.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobType" className="font-normal">
                  Tipo de Vaga
                </Label>
                <Select value={jobType} onValueChange={setJobType} required>
                  <SelectTrigger id="jobType" className="font-thin">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposVaga.map((tipo) => (
                      <SelectItem
                        key={tipo.id}
                        value={tipo.id}
                        className="font-thin"
                      >
                        {tipo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ height: 1 }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value" className="font-normal">
                  Valor (R$)
                </Label>
                <Input
                  id="value"
                  type="text"
                  inputMode="numeric"
                  required={!bulkEditMode}
                  className="font-thin"
                  value={getValorMasked()}
                  onChange={handleValorChange}
                  maxLength={15}
                  aria-label="Valor do plantão"
                  placeholder={bulkEditMode ? "Manter valor atual" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="font-normal">
                  Forma de Recebimento
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={
                    bulkEditMode ? setPaymentMethodAndMark : setPaymentMethod
                  }
                  required={!bulkEditMode}
                >
                  <SelectTrigger id="paymentMethod" className="font-thin">
                    <SelectValue
                      placeholder={
                        bulkEditMode
                          ? "Manter forma atual"
                          : "Selecione a forma"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {formasRecebimento.map((forma) => (
                      <SelectItem
                        key={forma.id}
                        value={forma.id}
                        className="font-thin"
                      >
                        {forma.forma_recebimento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ height: 1 }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-normal">Prazo de Pagamento</Label>
                <Select
                  value={prazoPagamento}
                  onValueChange={handlePrazoPagamentoChange}
                >
                  <SelectTrigger className="font-thin">
                    <SelectValue placeholder="Selecione prazo de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vista" className="font-thin">
                      À vista (1 dia)
                    </SelectItem>
                    <SelectItem value="30dias" className="font-thin">
                      30 dias
                    </SelectItem>
                    <SelectItem value="45dias" className="font-thin">
                      45 dias
                    </SelectItem>
                    <SelectItem value="60dias" className="font-thin">
                      60 dias
                    </SelectItem>
                    <SelectItem value="data_fechamento" className="font-thin">
                      Outro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-normal">
                  {prazoPagamento === "data_fechamento"
                    ? "Data Personalizada"
                    : "Data de Pagamento"}
                </Label>
                {prazoPagamento === "data_fechamento" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-thin",
                          !dataFechamento && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataFechamento ? (
                          format(dataFechamento, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataFechamento}
                        onSelect={setDataFechamento}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    type="text"
                    className="font-thin bg-gray-50"
                    value={
                      paymentDate
                        ? format(paymentDate, "dd/MM/yyyy", { locale: ptBR })
                        : ""
                    }
                    readOnly
                    placeholder="Calculado automaticamente"
                  />
                )}
              </div>
            </div>
            <div style={{ height: 1 }} />
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grupo" className="font-normal">
                  Grupo
                </Label>
                <Select
                  value={selectedGrupo}
                  onValueChange={setSelectedGrupoAndMark}
                  required={!bulkEditMode}
                >
                  <SelectTrigger id="grupo" className="font-thin">
                    <SelectValue
                      placeholder={
                        bulkEditMode
                          ? "Manter grupo atual"
                          : "Selecione o grupo"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((grupo) => (
                      <SelectItem
                        key={grupo.id}
                        value={grupo.id}
                        className="font-thin"
                      >
                        {grupo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="escalista" className="font-normal">
                  Escalista
                </Label>
                <Select
                  value={selectedEscalista}
                  onValueChange={setSelectedEscalistaAndMark}
                  required={!bulkEditMode}
                  disabled={escalistas.length === 0}
                >
                  <SelectTrigger id="escalista" className="font-thin">
                    <SelectValue
                      placeholder={
                        bulkEditMode
                          ? "Manter escalista atual"
                          : escalistas.length === 0
                          ? "Grupo não contem escalistas"
                          : "Selecione o escalista"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {escalistas.map((escalista) => (
                      <SelectItem
                        key={escalista.id}
                        value={escalista.id}
                        className="font-thin"
                      >
                        {escalista.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ height: 1 }} />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="beneficios" className="font-normal">
                  Benefícios
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBeneficiosExpanded(!beneficiosExpanded)}
                  className="h-auto p-2 text-xs"
                >
                  {selectedBeneficios.length > 0 && !beneficiosExpanded && (
                    <span className="mr-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {selectedBeneficios.length} selecionado
                      {selectedBeneficios.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {selectedBeneficios.length === 0 && !beneficiosExpanded && (
                    <span className="mr-2 text-gray-500 text-xs">
                      Clique para selecionar
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      beneficiosExpanded && "rotate-180"
                    )}
                  />
                </Button>
              </div>
              {beneficiosExpanded && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {beneficios.map((beneficio) => (
                    <div
                      key={beneficio.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`beneficio-${beneficio.id}`}
                        checked={selectedBeneficios.includes(beneficio.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBeneficios([
                              ...selectedBeneficios,
                              beneficio.id,
                            ]);
                          } else {
                            setSelectedBeneficios(
                              selectedBeneficios.filter(
                                (id) => id !== beneficio.id
                              )
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`beneficio-${beneficio.id}`}
                        className="font-thin text-sm"
                      >
                        {beneficio.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 1 }} />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="requisitos" className="font-normal">
                  Requisitos
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRequisitosExpanded(!requisitosExpanded)}
                  className="h-auto p-2 text-xs"
                >
                  {selectedRequisitos.length > 0 && !requisitosExpanded && (
                    <span className="mr-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {selectedRequisitos.length} selecionado
                      {selectedRequisitos.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {selectedRequisitos.length === 0 && !requisitosExpanded && (
                    <span className="mr-2 text-gray-500 text-xs">
                      Clique para selecionar
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      requisitosExpanded && "rotate-180"
                    )}
                  />
                </Button>
              </div>
              {requisitosExpanded && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {requisitos.map((requisito) => (
                    <div
                      key={requisito.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`requisito-${requisito.id}`}
                        checked={selectedRequisitos.includes(requisito.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRequisitos([
                              ...selectedRequisitos,
                              requisito.id,
                            ]);
                          } else {
                            setSelectedRequisitos(
                              selectedRequisitos.filter(
                                (id) => id !== requisito.id
                              )
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`requisito-${requisito.id}`}
                        className="font-thin text-sm"
                      >
                        {requisito.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 1 }} />
            <div className="space-y-2">
              <Label htmlFor="grade" className="font-normal">
                Grade (opcional)
              </Label>
              <Select
                value={selectedGrade}
                onValueChange={
                  bulkEditMode ? setSelectedGradeAndMark : setSelectedGrade
                }
              >
                <SelectTrigger id="grade" className="font-thin">
                  <SelectValue placeholder="Selecione a grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="sem-grade"
                    className="font-thin text-gray-500"
                  >
                    Nenhuma grade
                  </SelectItem>
                  {grades.map((grade) => (
                    <SelectItem
                      key={grade.id}
                      value={grade.id}
                      className="font-thin"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: grade.cor }}
                        />
                        {grade.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1 font-thin">
                Relacionar esta vaga com uma grade específica para organização e
                filtros.
              </p>
            </div>
            <div style={{ height: 1 }} />
            <div className="space-y-2">
              <Label htmlFor="doctor" className="font-normal">
                Médico Designado (opcional)
              </Label>
              <DoctorSelector
                selectedDoctor={selectedDoctor}
                onSelectDoctor={
                  bulkEditMode
                    ? (value) => {
                        setSelectedDoctor(value);
                        markFieldAsEdited("medico_designado");
                        setConflictError(""); // Limpar erro no modo bulk também
                        setShowConflictModal(false); // Fechar modal de conflito no bulk
                      }
                    : handleDoctorChange
                }
                open={doctorOpen}
                onOpenChange={setDoctorOpen}
              />
              <p className="text-xs text-muted-foreground mt-1 font-thin">
                {bulkEditMode
                  ? "Se um médico for designado, as vagas serão fechadas automaticamente e candidaturas aprovadas serão criadas."
                  : 'Se um médico for designado, a vaga será criada como "fechada". Caso contrário, será "aberta".'}
              </p>
            </div>

            <div style={{ height: 1 }} />
            <div className="space-y-2">
              <Label htmlFor="observations" className="font-normal">
                Observações
              </Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) =>
                  bulkEditMode
                    ? setObservationsAndMark(e.target.value)
                    : setObservations(e.target.value)
                }
                className="font-thin"
              />
              {editMode && editData?.vaga_id && (
                <div className="text-xs text-muted-foreground mr-auto">
                  ID da vaga: {editData.vaga_id}
                </div>
              )}
            </div>
            <div style={{ height: 12 }} />
            <DialogFooter className="gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="rounded px-2 py-1 w-1/4"
              >
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                disabled={loading}
                onClick={resetForm}
                className="font-thin w-1/4 text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white shadow-sm transition-all"
              >
                {loading ? "Limpando..." : "Limpar campos"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Conflito de Horário */}
      {showConflictModal && (
        <Dialog open={showConflictModal} onOpenChange={setShowConflictModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-normal">!</span>
                </div>
                Conflito de Horário Detectado
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-sm font-thin p-2 text-justify-left space-y-2">
              Não foi possível prosseguir. Este médico já possui um plantão
              agendado que conflita com o horário selecionado.
            </DialogDescription>
            <DialogFooter className="gap-2">
              <Button
                onClick={() => setShowConflictModal(false)}
                className="w-full"
              >
                Ok
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

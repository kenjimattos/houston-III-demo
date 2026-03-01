"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  DollarSign,
  ChevronDown,
  Copy,
  Eraser,
  Trash2,
  Info,
  Users,
  Calendar,
} from "lucide-react";
import { type GradeLine, type TimeSlot } from "@/hooks/grades";
import { TimeSlotGridComponent } from "./TimeSlotGridComponent";
import { ShiftType } from "@/services/parametrosService";

// Componente auxiliar para Label com Tooltip
const LabelWithTooltip = ({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) => (
  <Label className="font-normal text-gray-700" title={tooltip}>
    {label}
  </Label>
);

interface GradeCardEditingModeProps {
  line: GradeLine;

  // Estados de edição
  editingPaymentGradeId: string | null;
  editingDayIndex: number | null;
  activeLineIndex: number;

  // Dados para edição
  slotLines: TimeSlot[][];
  selectedDays: { [lineIndex: number]: boolean[] };
  weekStartHours: { [lineIndex: number]: number };
  dayRowCounts: { [lineIndex: number]: { [dayIndex: number]: number } };
  slotsByDay: { [lineIndex: number]: { [dayIndex: number]: TimeSlot[] } };
  editingGradeHorario: number;

  // Estados de drag & drop
  isDragging: boolean;
  dragRowIndex: number | null;
  dragStart: number | null;
  dragEnd: number | null;
  hasDragged: boolean;

  // Estados de menu contextual
  showPlantaoMenu: boolean;
  menuPosition: { x: number; y: number };
  menuClickedHour: number | null;
  menuTargetRow: number | null;

  // Dados de referência
  medicos: any[];
  formasRecebimento: any[];
  tiposVaga: ShiftType[];
  diasSemana: string[];

  // Callbacks de edição
  setEditingPaymentGradeId: (id: string | null) => void;
  addNewSlotLine: () => void;
  updateGradeConfig: (gradeId: string, key: string, value: any) => void;
  setWeekStartHours: (hours: { [lineIndex: number]: number }) => void;
  clearWeek: (lineIndex: number) => void;
  duplicateWeek: (lineIndex: number, withMedicos: boolean) => void;
  removeSlotLine: (lineIndex: number) => void;
  updateSlotMedico: (
    slotId: string,
    medico: { medicoId: string; medicoNome: string } | null
  ) => void;
  addAdditionalHourLine: (slotId: string) => void;
  removeSlot: (slotId: string) => void;
  addSlot: (lineIndex: number, dayIndex: number, startHour: number) => void;
  handleSlotResize: (
    slotId: string,
    direction: "start" | "end",
    e: React.MouseEvent
  ) => void;
  setEditingDayIndex: (dayIndex: number | null) => void;
  setActiveLineIndex: (lineIndex: number) => void;
  updateDayRowCount: (
    lineIndex: number,
    dayIndex: number,
    rowCount: number
  ) => void;
  getDayRowCount: (lineIndex: number, dayIndex: number) => number;
  cleanupEmptyRowsForDay: (lineIndex: number, dayIndex: number) => void;
  replicateDayToOtherDays: (
    fromDayIndex: number,
    toDayIndices: number[]
  ) => void;

  // Callbacks de drag & drop
  setIsDragging: (isDragging: boolean) => void;
  setDragRowIndex: (rowIndex: number | null) => void;
  setDragStart: (start: number | null) => void;
  setDragEnd: (end: number | null) => void;
  setHasDragged: (hasDragged: boolean) => void;

  // Callbacks de menu contextual
  setShowPlantaoMenu: (show: boolean) => void;
  setMenuPosition: (position: { x: number; y: number }) => void;
  setMenuClickedHour: (hour: number | null) => void;
  setMenuTargetRow: (row: number | null) => void;
  handleDragEnd: (startHour: number, endHour: number) => void;

  // Funções utilitárias
  formatHourDisplay: (hour: number) => string;
}

// Função utilitária para calcular estatísticas dos slots
const getSlotStats = (
  daySlots: TimeSlot[],
  startHour: number,
  endHour: number
) => {
  const relevantSlots = daySlots.filter(
    (slot) => slot.startHour === startHour && slot.endHour === endHour
  );

  const fechadas = relevantSlots.filter(
    (slot) =>
      slot.assignedVagas &&
      slot.assignedVagas.length > 0 &&
      slot.assignedVagas[0]?.medicoId
  ).length;

  const total = Math.max(1, relevantSlots.length);
  return { fechadas, total };
};

export const GradeCardEditingMode = memo(function GradeCardEditingMode({
  line,
  editingPaymentGradeId,
  editingDayIndex,
  activeLineIndex,
  slotLines,
  selectedDays,
  weekStartHours,
  dayRowCounts,
  slotsByDay,
  editingGradeHorario,
  isDragging,
  dragRowIndex,
  dragStart,
  dragEnd,
  hasDragged,
  showPlantaoMenu,
  menuPosition,
  menuClickedHour,
  menuTargetRow,
  medicos,
  formasRecebimento,
  tiposVaga,
  diasSemana,
  setEditingPaymentGradeId,
  addNewSlotLine,
  updateGradeConfig,
  setWeekStartHours,
  clearWeek,
  duplicateWeek,
  removeSlotLine,
  updateSlotMedico,
  addAdditionalHourLine,
  removeSlot,
  addSlot,
  handleSlotResize,
  setEditingDayIndex,
  setActiveLineIndex,
  updateDayRowCount,
  getDayRowCount,
  cleanupEmptyRowsForDay,
  replicateDayToOtherDays,
  setIsDragging,
  setDragRowIndex,
  setDragStart,
  setDragEnd,
  setHasDragged,
  setShowPlantaoMenu,
  setMenuPosition,
  setMenuClickedHour,
  setMenuTargetRow,
  handleDragEnd,
  formatHourDisplay,
}: GradeCardEditingModeProps) {
  return (
    <div className="space-y-6">
      {editingDayIndex === null ? (
        /* Interface de edição - similar à visualização mas clicável */
        <>
          {/* Controles de edição */}
          <div className="flex gap-4 py-4">
            <Button
              onClick={addNewSlotLine}
              variant="outline"
              size="sm"
              className="h-8 text-sm font-thin border-2 rounded"
              title="Adicionar nova semana de plantões"
              style={{
                borderColor: line.cor,
                backgroundColor: line.cor + "15",
              }}
            >
              <Plus className="w-4 h-4" style={{ color: line.cor }} />
              Adicionar Semana
            </Button>

            <Button
              onClick={() =>
                setEditingPaymentGradeId(
                  editingPaymentGradeId === line.id ? null : line.id
                )
              }
              variant="outline"
              size="sm"
              className="h-8 text-sm font-thin border-2 rounded"
              title="Configurar valores e pagamentos"
              style={{
                borderColor: line.cor,
                backgroundColor:
                  editingPaymentGradeId === line.id
                    ? line.cor + "25"
                    : line.cor + "15",
              }}
            >
              <DollarSign className="w-4 h-4" style={{ color: line.cor }} />
              Configurar Pagamentos
            </Button>
          </div>

          {/* Módulo de Configuração de Pagamentos */}
          {editingPaymentGradeId === line.id && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-normal text-gray-700">
                  Configurações de Pagamento
                </h4>
                <Button
                  onClick={() => setEditingPaymentGradeId(null)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tipo de Cálculo */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    label="Tipo de Cálculo"
                    tooltip="Escolha entre definir valor por hora ou valor fixo por plantão. O sistema calculará automaticamente com base na duração dos horários."
                  />
                  <select
                    value={line.configuracao?.tipoCalculo || "valor_hora"}
                    onChange={(e) =>
                      updateGradeConfig(line.id, "tipoCalculo", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="valor_hora">Valor por Hora</option>
                    <option value="valor_plantao">Valor por Plantão</option>
                  </select>
                </div>

                {/* Valor - Condicional baseado no tipo */}
                {line.configuracao?.tipoCalculo === "valor_plantao" ? (
                  <>
                    <div className="space-y-2">
                      <LabelWithTooltip
                        label="Valor do Plantão (R$)"
                        tooltip="Valor total fixo que será pago por plantão, independente da duração. O valor por hora será calculado automaticamente."
                      />
                      <input
                        type="number"
                        placeholder="600,00"
                        step="0.01"
                        value={line.configuracao?.valorPorPlantao || ""}
                        onChange={(e) =>
                          updateGradeConfig(
                            line.id,
                            "valorPorPlantao",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <LabelWithTooltip
                        label="Horas do Plantão"
                        tooltip="Quantidade de horas que representa um plantão completo para calcular o valor por hora. Ex: 12h para plantão diurno."
                      />
                      <input
                        type="number"
                        placeholder="12"
                        step="0.5"
                        value={line.configuracao?.horasPlantao || ""}
                        onChange={(e) =>
                          updateGradeConfig(
                            line.id,
                            "horasPlantao",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <LabelWithTooltip
                      label="Valor por Hora (R$)"
                      tooltip="Valor que será pago por cada hora trabalhada. O valor total será calculado multiplicando pelas horas de duração do plantão."
                    />
                    <input
                      type="number"
                      placeholder="50,00"
                      step="0.01"
                      value={line.configuracao?.valorPorHora || ""}
                      onChange={(e) =>
                        updateGradeConfig(
                          line.id,
                          "valorPorHora",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Prazo de Pagamento */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    label="Prazo de Pagamento"
                    tooltip="Prazo para pagamento após a data do plantão. A data de pagamento será calculada automaticamente somando estes dias à data do plantão."
                  />
                  <select
                    value={line.configuracao?.diasPagamento || "30dias"}
                    onChange={(e) =>
                      updateGradeConfig(
                        line.id,
                        "diasPagamento",
                        e.target.value
                      )
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="vista">À vista (1 dia)</option>
                    <option value="30dias">30 dias</option>
                    <option value="45dias">45 dias</option>
                    <option value="60dias">60 dias</option>
                  </select>
                </div>

                {/* Forma de Recebimento */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    label="Forma de Recebimento"
                    tooltip="Método de pagamento que será utilizado para quitar as vagas criadas a partir desta grade."
                  />
                  <select
                    value={line.configuracao?.formaRecebimento || ""}
                    onChange={(e) =>
                      updateGradeConfig(
                        line.id,
                        "formaRecebimento",
                        e.target.value
                      )
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecionar...</option>
                    {formasRecebimento.map((forma) => (
                      <option key={forma.id} value={forma.id}>
                        {forma.forma_recebimento}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Vaga */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    label="Tipo de Vaga"
                    tooltip="Classificação da vaga (Plantão, Sobreaviso, etc.). Tipo 'Fixo' criará vagas em sistema de recorrência que poderão ser editadas em conjunto posteriormente. Demais tipos criam vagas individuais."
                  />
                  <select
                    value={line.configuracao?.tipoVaga || ""}
                    onChange={(e) =>
                      updateGradeConfig(line.id, "tipoVaga", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecionar...</option>
                    {tiposVaga.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview de Cálculo */}
              {(line.configuracao?.valorPorHora ||
                line.configuracao?.valorPorPlantao) && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm">
                    {line.configuracao?.tipoCalculo === "valor_plantao" &&
                    line.configuracao?.valorPorPlantao &&
                    line.configuracao?.horasPlantao
                      ? `R$ ${(
                          line.configuracao.valorPorPlantao /
                          line.configuracao.horasPlantao
                        ).toFixed(
                          2
                        )} por hora (R$ ${line.configuracao.valorPorPlantao.toFixed(
                          2
                        )} ÷ ${line.configuracao.horasPlantao}h)`
                      : line.configuracao?.valorPorHora
                      ? `R$ ${line.configuracao.valorPorHora.toFixed(
                          2
                        )} por hora`
                      : ""}
                  </p>
                  {line.configuracao?.diasPagamento && (
                    <p className="text-sm mt-1">
                      Pagamento:{" "}
                      {line.configuracao.diasPagamento === "vista"
                        ? "À vista (1 dia)"
                        : line.configuracao.diasPagamento === "30dias"
                        ? "30 dias após plantão"
                        : line.configuracao.diasPagamento === "45dias"
                        ? "45 dias após plantão"
                        : "60 dias após plantão"}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setEditingPaymentGradeId(null)}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  Fechar Configurações
                </Button>
              </div>
            </div>
          )}

          {/* Visualização por dias da semana - SIMILAR AO MODO SALVO */}
          <div className="space-y-4">
            {(() => {
              // Verificar se existe estrutura de semanas - USAR slotsByDay PROP (estado local)
              // Uma semana pode existir mesmo sem horários (arrays vazios)
              const hasWeeks = slotsByDay && Object.keys(slotsByDay).length > 0;

              if (!hasWeeks) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum horário definido</p>
                    <p className="text-sm">
                      Use os controles acima para adicionar semanas
                    </p>
                  </div>
                );
              }

              // Se existem slots por dia, use essa estrutura - USAR slotsByDay PROP (estado local)
              return Object.keys(slotsByDay || {}).map((key) => {
                const lineIndex = parseInt(key);

                // Verificar se a semana tem algum slot
                const weekHasSlots = Object.values(
                  slotsByDay[lineIndex] || {}
                ).some(
                  (daySlots) => Array.isArray(daySlots) && daySlots.length > 0
                );

                return (
                  <div key={lineIndex} className="space-y-3">
                    {/* Header da linha com controles de edição */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 px-3 text-sm border rounded flex items-center shrink-0 font-normal gap-2"
                        style={{ borderColor: line.cor, color: line.cor }}
                      >
                        Semana {lineIndex + 1}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <ChevronDown className="w-4 h-4 p-0 hover:bg-gray-100 rounded cursor-pointer" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-48 mt-2 ml-2">
                            <DropdownMenuItem
                              onClick={() => clearWeek(lineIndex)}
                              className="flex items-center gap-2 text-gray-600"
                              title="Apaga todos os horários da semana"
                            >
                              <Eraser
                                className="w-4 h-4"
                                style={{ color: line.cor }}
                              />
                              Limpar semana
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => duplicateWeek(lineIndex, true)}
                              className="flex items-center gap-2 text-gray-600"
                              title="Duplica a semana com médicos designados"
                            >
                              <Users className="w-4 h-4 text-blue-500" />
                              Duplicar fechada
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => duplicateWeek(lineIndex, false)}
                              className="flex items-center gap-2 text-gray-600"
                              title="Duplica a semana sem médicos designados"
                            >
                              <Calendar className="w-4 h-4 text-green-500" />
                              Duplicar aberta
                            </DropdownMenuItem>

                            {Object.keys(slotsByDay || {}).length > 1 && (
                              <DropdownMenuItem
                                onClick={() => removeSlotLine(lineIndex)}
                                className="flex items-center gap-2 text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir semana
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Label className="text-sm font-thin text-gray-600">
                          Início:
                        </Label>
                        {weekHasSlots && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">
                                  Para alterar o horário de início, primeiro
                                  limpe todos os plantões desta semana
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Select
                          value={
                            weekStartHours?.[lineIndex]?.toString() ||
                            line.horarioInicial?.toString() ||
                            "7"
                          }
                          onValueChange={(value) => {
                            // Só permitir mudança se a semana estiver vazia
                            if (!weekHasSlots) {
                              const newHour = parseInt(value);
                              setWeekStartHours({
                                ...weekStartHours,
                                [lineIndex]: newHour,
                              });
                              // Também salvar na configuração da grade
                              updateGradeConfig(line.id, "weekStartHours", {
                                ...weekStartHours,
                                [lineIndex]: newHour,
                              });
                            }
                          }}
                          disabled={weekHasSlots}
                        >
                          <SelectTrigger
                            className={`h-6 px-2 text-sm font-thin border rounded w-16 ${
                              weekHasSlots
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            title={
                              weekHasSlots
                                ? "Limpe a semana antes de alterar o horário de início"
                                : "Clique para alterar o horário de início"
                            }
                          >
                            <SelectValue>
                              {(
                                weekStartHours?.[lineIndex] ||
                                line.horarioInicial ||
                                7
                              )
                                .toString()
                                .padStart(2, "0")}
                              h
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {Array.from({ length: 13 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, "0")}h
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Grid dos 7 dias da semana - IGUAL AO MODO SALVO MAS CLICÁVEL */}
                    <div className="grid grid-cols-7 gap-2">
                      {diasSemana.map((dia, dayIndex) => {
                        // Slots para este dia - USAR slotsByDay PROP (estado local)
                        const daySlots =
                          slotsByDay?.[lineIndex]?.[dayIndex] || [];

                        return (
                          <div
                            key={dayIndex}
                            className="p-2 rounded-md border-2 transition-all border-solid shadow-sm min-h-[120px] flex flex-col cursor-pointer hover:shadow-md"
                            style={{
                              borderColor: line.cor,
                              backgroundColor: line.cor + "08",
                            }}
                            onClick={() => {
                              // Limpar linhas vazias do dia anterior antes de trocar
                              if (
                                editingDayIndex !== null &&
                                editingDayIndex !== dayIndex
                              ) {
                                cleanupEmptyRowsForDay(
                                  activeLineIndex,
                                  editingDayIndex
                                );
                              }
                              setActiveLineIndex(lineIndex);
                              setEditingDayIndex(dayIndex);
                            }}
                            title={`Clique para editar ${dia}`}
                          >
                            {/* Nome do dia */}
                            <div className="text-center mb-2 flex-shrink-0">
                              <h4 className="text-sm font-normal text-gray-800">
                                {dia}
                              </h4>
                            </div>

                            {daySlots.length > 0 ? (
                              <div className="flex-1 flex flex-col justify-start space-y-1">
                                {/* Representação visual dos horários - IGUAL AO MODO SALVO */}
                                <div className="space-y-1 overflow-hidden">
                                  {(() => {
                                    // Agrupar slots por horário (startHour-endHour)
                                    const groupedSlots: {
                                      [key: string]: TimeSlot[];
                                    } = {};
                                    daySlots.forEach((slot) => {
                                      const key = `${slot.startHour}-${slot.endHour}`;
                                      if (!groupedSlots[key]) {
                                        groupedSlots[key] = [];
                                      }
                                      groupedSlots[key].push(slot);
                                    });

                                    // Ordenar por hora de início e renderizar grupos
                                    return Object.entries(groupedSlots)
                                      .sort(([keyA], [keyB]) => {
                                        const [startA] = keyA
                                          .split("-")
                                          .map(Number);
                                        const [startB] = keyB
                                          .split("-")
                                          .map(Number);
                                        return startA - startB;
                                      })
                                      .map(([timeKey, slotsGroup]) => {
                                        const [startHour, endHour] = timeKey
                                          .split("-")
                                          .map(Number);
                                        const stats = getSlotStats(
                                          daySlots,
                                          startHour,
                                          endHour
                                        );
                                        // Garantir intensidade baseada na presença de médico
                                        const intensidade =
                                          stats.fechadas === 0 ? 80 : 200;

                                        return (
                                          <TooltipProvider key={timeKey}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div>
                                                  {/* Barra visual do horário com todas as informações */}
                                                  <div
                                                    className="h-5 rounded flex items-center justify-between text-gray-700 font-thin text-xs px-2 cursor-pointer hover:opacity-80 transition-opacity"
                                                    style={{
                                                      backgroundColor: `rgba(${parseInt(
                                                        line.cor.slice(1, 3),
                                                        16
                                                      )}, ${parseInt(
                                                        line.cor.slice(3, 5),
                                                        16
                                                      )}, ${parseInt(
                                                        line.cor.slice(5, 7),
                                                        16
                                                      )}, ${
                                                        intensidade / 255
                                                      })`,
                                                      minWidth: "100%",
                                                    }}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveLineIndex(
                                                        lineIndex
                                                      );
                                                      setEditingDayIndex(
                                                        dayIndex
                                                      );
                                                    }}
                                                  >
                                                    <span className="text-gray-700 font-normal">
                                                      {formatHourDisplay(
                                                        startHour
                                                      )}
                                                      -
                                                      {formatHourDisplay(
                                                        endHour
                                                      )}
                                                    </span>
                                                    <span className="text-gray-700 font-thin">
                                                      {stats.fechadas}/
                                                      {stats.total}
                                                    </span>
                                                  </div>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent
                                                side="top"
                                                className="max-w-xs"
                                              >
                                                <div className="text-xs">
                                                  <p className="font-normal">
                                                    {formatHourDisplay(
                                                      startHour
                                                    )}{" "}
                                                    -{" "}
                                                    {formatHourDisplay(endHour)}
                                                  </p>
                                                  <p>
                                                    {stats.fechadas} fechada
                                                    {stats.fechadas !== 1
                                                      ? "s"
                                                      : ""}{" "}
                                                    de {stats.total} total
                                                  </p>
                                                  <p className="text-gray-400 mt-1">
                                                    Clique para editar
                                                  </p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        );
                                      });
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <div className="w-8 h-8 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-2">
                                  <Plus className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-400">
                                  Sem plantões
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      ) : (
        /* Modo de edição de dia específico - Interface avançada TimeSlotGridComponent */
        <TimeSlotGridComponent
          line={line}
          editingDayIndex={editingDayIndex}
          activeLineIndex={activeLineIndex}
          // Dados para edição
          slotsByDay={slotsByDay}
          dayRowCounts={dayRowCounts}
          weekStartHours={weekStartHours}
          editingGradeHorario={editingGradeHorario}
          // Dados de referência
          medicos={medicos}
          diasSemana={diasSemana}
          // Estados de drag
          isDragging={isDragging}
          dragRowIndex={dragRowIndex}
          dragStart={dragStart}
          dragEnd={dragEnd}
          hasDragged={hasDragged}
          // Callbacks
          setEditingDayIndex={setEditingDayIndex}
          updateDayRowCount={updateDayRowCount}
          getDayRowCount={getDayRowCount}
          cleanupEmptyRowsForDay={cleanupEmptyRowsForDay}
          // Drag callbacks
          setIsDragging={setIsDragging}
          setDragRowIndex={setDragRowIndex}
          setDragStart={setDragStart}
          setDragEnd={setDragEnd}
          setHasDragged={setHasDragged}
          // Slot management
          handleDragEnd={handleDragEnd}
          updateSlotMedico={updateSlotMedico}
          replicateDayToOtherDays={replicateDayToOtherDays}
          addAdditionalHourLine={addAdditionalHourLine}
          removeSlot={removeSlot}
          handleSlotResize={handleSlotResize}
          formatHourDisplay={formatHourDisplay}
        />
      )}
    </div>
  );
});

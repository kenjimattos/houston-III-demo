"use client";

import React, { useMemo, useEffect, useRef } from "react";
import moment from "moment";
import "moment/locale/pt-br";
import { cn, cleanHospitalNameSync } from "@/lib/utils";
import { DoctorNameLink } from "@/components/medicos/doctor-name-link";
import { VagasContextActions } from "@/components/vagas/context-actions/VagasContextActions";

// Garantir que o moment esteja configurado para português
moment.locale("pt-br");

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  hospital: string;
  specialty: string;
  sector: string;
  status: "aberta" | "fechada" | "cancelada" | "anunciada";
  doctor?: string;
  candidates: number;
  value: number;
  resource?: any;
}

interface CustomMonthCalendarProps {
  events: CalendarEvent[];
  date: Date;
  vagaCandidaturas: Record<string, any[]>;
  vagasData: any[];
  grades?: Array<{ id: string; nome: string; cor: string; ordem?: number }>;
  onViewDetails?: (vagaId: string) => void;
  onViewApplications?: (vagaId: string) => void;
  onEditVaga?: (vagaId: string) => void;
  onCancelVaga?: (vagaId: string) => void;
  onAnnounceVaga?: (vagaId: string) => void;
  onCloseVaga?: (vagaId: string) => void;
  onDeleteVaga?: (vagaId: string) => void;
  onRefreshData?: () => Promise<void>;
  onDayClick?: (date: Date) => void;
  clickedDay?: Date | null;
  highlightedVaga?: string | null;
  fetchTimeInterval?: (date: Date) => void;
}

export function CustomMonthCalendar({
  events,
  date,
  vagaCandidaturas,
  vagasData,
  grades = [],
  onViewDetails,
  onViewApplications,
  onEditVaga,
  onCancelVaga,
  onAnnounceVaga,
  onCloseVaga,
  onDeleteVaga,
  onRefreshData,
  onDayClick,
  clickedDay,
  highlightedVaga,
}: CustomMonthCalendarProps) {
  // Ref para a vaga destacada para scroll automático
  const highlightedVagaRef = useRef<HTMLDivElement>(null);

  // Scroll automático para vaga destacada
  useEffect(() => {
    if (highlightedVaga && highlightedVagaRef.current) {
      // Aguardar um delay maior para garantir que o DOM e layout foram completamente renderizados
      const scrollTimer = setTimeout(() => {
        if (highlightedVagaRef.current) {
          // Verificar se o elemento está visível na viewport
          const rect = highlightedVagaRef.current.getBoundingClientRect();
          const isVisible =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <=
              (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <=
              (window.innerWidth || document.documentElement.clientWidth);

          // Apenas fazer scroll se não estiver visível ou não estiver centralizado
          if (
            !isVisible ||
            rect.top < window.innerHeight * 0.2 ||
            rect.top > window.innerHeight * 0.8
          ) {
            highlightedVagaRef.current.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }
        }
      }, 1000); // Aumentado para 1 segundo

      return () => clearTimeout(scrollTimer);
    }
  }, [highlightedVaga]);

  // Calcular dias do mês atual
  const monthData = useMemo(() => {
    const startOfMonth = moment(date).startOf("month");
    const endOfMonth = moment(date).endOf("month");
    const startOfWeek = moment(startOfMonth).startOf("week");
    const endOfWeek = moment(endOfMonth).endOf("week");

    const days = [];
    const current = moment(startOfWeek);
    while (current.isSameOrBefore(endOfWeek)) {
      days.push({
        date: current.clone().toDate(),
        dayNumber: current.date(),
        isCurrentMonth: current.month() === moment(date).month(),
        isToday: current.isSame(moment(), "day"),
        dateKey: current.format("YYYY-MM-DD"),
      });
      current.add(1, "day");
    }

    console.log("resultado de dias", days);
    return days;
  }, [date]);

  // Agrupar eventos por data
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};

    events.forEach((event) => {
      const dateKey = moment(event.start).format("YYYY-MM-DD");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  // Função para contar candidaturas pendentes de uma vaga
  const countPendingCandidatures = (vagaId: string) => {
    const candidaturas = vagaCandidaturas[vagaId] || [];
    return candidaturas.filter((c) => c.candidatura_status === "PENDENTE")
      .length;
  };

  // Função para obter a cor da grade de uma vaga
  const getGradeColor = (vaga: any) => {
    // O grade_id está no objeto resource (vaga completa)
    const gradeId = vaga.resource?.grade_id;
    if (!gradeId) return null;

    const grade = grades.find((g) => g.id === gradeId);
    return grade?.cor || null;
  };

  // Função auxiliar para obter o nome da grade de uma vaga
  const getGradeName = (vaga: any) => {
    const gradeId = vaga.resource?.grade_id;
    if (!gradeId) return "zzz-sem-grade"; // Colocar no final da ordenação

    const grade = grades.find((g) => g.id === gradeId);
    return grade?.nome || "zzz-sem-grade";
  };

  // Função auxiliar para obter a ordem da grade de uma vaga
  const getGradeOrder = (vaga: any): number => {
    const gradeId = vaga.resource?.grade_id;
    if (!gradeId) return 999999; // Vagas sem grade vão para o final

    const grade = grades.find((g) => g.id === gradeId);
    return grade?.ordem ?? 999999; // Se não tiver ordem, vai para o final
  };

  // Função auxiliar para obter o nome do médico de uma vaga
  const getMedicoName = (event: any) => {
    if (event.status === "fechada" || event.status === "anunciada") {
      if (vagaCandidaturas[event.id]) {
        const candidaturaAprovada = vagaCandidaturas[event.id].find(
          (c) => c.candidatura_status === "APROVADO"
        );
        if (candidaturaAprovada) {
          return `${candidaturaAprovada.medico_primeironome || ""} ${
            candidaturaAprovada.medico_sobrenome || ""
          }`.trim();
        }
      }
      return "zzz-sem-medico"; // Colocar no final da ordenação
    }
    return "aaa-vaga-" + event.status; // Vagas abertas/canceladas vêm primeiro
  };

  // Função para renderizar conteúdo de um dia
  const renderDayContent = (day: any) => {
    const dayEvents = eventsByDate[day.dateKey] || [];

    if (dayEvents.length === 0) {
      return null;
    }

    // Ordenar eventos por: 1) Ordem da grade (numérica), 2) Nome do médico (alfabético)
    const sortedEvents = [...dayEvents].sort((a, b) => {
      // Primeira ordenação: por ordem da grade (numérica)
      const ordemA = getGradeOrder(a);
      const ordemB = getGradeOrder(b);

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      // Segunda ordenação: por nome do médico (alfabética)
      const medicoA = getMedicoName(a);
      const medicoB = getMedicoName(b);
      return medicoA.localeCompare(medicoB);
    });

    // Separar eventos ordenados por status
    const vagasAbertas = sortedEvents.filter((e) => e.status === "aberta");
    const vagasFechadas = sortedEvents.filter((e) => e.status === "fechada");
    const vagasCanceladas = sortedEvents.filter(
      (e) => e.status === "cancelada"
    );
    const vagasAnunciadas = sortedEvents.filter(
      (e) => e.status === "anunciada"
    );

    // Agrupar vagas fechadas por horário
    const vagasFechadasPorHorario: Record<
      string,
      {
        horario: string;
        vagas: { nome: string; vaga: any; candidaturaAprovada?: any }[];
      }
    > = {};

    for (const vaga of vagasFechadas) {
      // Formatar horário
      const horaInicioRaw =
        vaga.resource?.vaga_horainicio || vaga.start.toTimeString();
      const horaFimRaw = vaga.resource?.vaga_horafim || vaga.end.toTimeString();

      // Extrair apenas a hora (formato HH)
      const horaInicio = horaInicioRaw.slice(0, 2);
      const horaFim = horaFimRaw.slice(0, 2);

      const horarioKey = `${horaInicio}h - ${horaFim}h`;

      // Buscar médico aprovado
      let nomeCompleto = "Vaga Fechada";
      let candidaturaAprovada = null;

      if (vagaCandidaturas[vaga.id]) {
        candidaturaAprovada = vagaCandidaturas[vaga.id].find(
          (c) => c.candidatura_status === "APROVADO"
        );
        if (candidaturaAprovada) {
          const nomeEncontrado = `${
            candidaturaAprovada.medico_primeironome || ""
          } ${candidaturaAprovada.medico_sobrenome || ""}`.trim();
          if (nomeEncontrado) {
            nomeCompleto = nomeEncontrado;
          }
        }
      }

      if (!vagasFechadasPorHorario[horarioKey]) {
        vagasFechadasPorHorario[horarioKey] = {
          horario: horarioKey,
          vagas: [],
        };
      }

      vagasFechadasPorHorario[horarioKey].vagas.push({
        nome: nomeCompleto,
        vaga: vaga,
        candidaturaAprovada: candidaturaAprovada,
      });
    }

    // Agrupar vagas anunciadas por horário
    const vagasAnunciadasPorHorario: Record<
      string,
      {
        horario: string;
        vagas: { nome: string; vaga: any; candidaturaAprovada?: any }[];
      }
    > = {};

    for (const vaga of vagasAnunciadas) {
      // Formatar horário
      const horaInicioRaw =
        vaga.resource?.vaga_horainicio || vaga.start.toTimeString();
      const horaFimRaw = vaga.resource?.vaga_horafim || vaga.end.toTimeString();

      // Extrair apenas a hora (formato HH)
      const horaInicio = horaInicioRaw.slice(0, 2);
      const horaFim = horaFimRaw.slice(0, 2);

      const horarioKey = `${horaInicio}h - ${horaFim}h`;

      // Buscar médico aprovado
      let nomeCompleto = "Vaga Anunciada";
      let candidaturaAprovada = null;

      if (vagaCandidaturas[vaga.id]) {
        candidaturaAprovada = vagaCandidaturas[vaga.id].find(
          (c) => c.candidatura_status === "APROVADO"
        );
        if (candidaturaAprovada) {
          const nomeEncontrado = `${
            candidaturaAprovada.medico_primeironome || ""
          } ${candidaturaAprovada.medico_sobrenome || ""}`.trim();
          if (nomeEncontrado) {
            nomeCompleto = nomeEncontrado;
          }
        }
      }

      if (!vagasAnunciadasPorHorario[horarioKey]) {
        vagasAnunciadasPorHorario[horarioKey] = {
          horario: horarioKey,
          vagas: [],
        };
      }

      vagasAnunciadasPorHorario[horarioKey].vagas.push({
        nome: nomeCompleto,
        vaga: vaga,
        candidaturaAprovada: candidaturaAprovada,
      });
    }

    // Agrupar vagas abertas por horário
    const vagasAbertasPorHorario: Record<
      string,
      { horario: string; vagas: { vaga: any }[] }
    > = {};

    for (const vaga of vagasAbertas) {
      // Formatar horário
      const horaInicioRaw =
        vaga.resource?.vaga_horainicio || vaga.start.toTimeString();
      const horaFimRaw = vaga.resource?.vaga_horafim || vaga.end.toTimeString();

      // Extrair apenas a hora (formato HH)
      const horaInicio = horaInicioRaw.slice(0, 2);
      const horaFim = horaFimRaw.slice(0, 2);

      const horarioKey = `${horaInicio}h - ${horaFim}h`;

      if (!vagasAbertasPorHorario[horarioKey]) {
        vagasAbertasPorHorario[horarioKey] = {
          horario: horarioKey,
          vagas: [],
        };
      }

      vagasAbertasPorHorario[horarioKey].vagas.push({
        vaga: vaga,
      });
    }

    // Agrupar vagas canceladas por horário
    const vagasCanceladasPorHorario: Record<
      string,
      { horario: string; vagas: { vaga: any }[] }
    > = {};

    for (const vaga of vagasCanceladas) {
      // Formatar horário
      const horaInicioRaw =
        vaga.resource?.vaga_horainicio || vaga.start.toTimeString();
      const horaFimRaw = vaga.resource?.vaga_horafim || vaga.end.toTimeString();

      // Extrair apenas a hora (formato HH)
      const horaInicio = horaInicioRaw.slice(0, 2);
      const horaFim = horaFimRaw.slice(0, 2);

      const horarioKey = `${horaInicio}h - ${horaFim}h`;

      if (!vagasCanceladasPorHorario[horarioKey]) {
        vagasCanceladasPorHorario[horarioKey] = {
          horario: horarioKey,
          vagas: [],
        };
      }

      vagasCanceladasPorHorario[horarioKey].vagas.push({
        vaga: vaga,
      });
    }

    // Criar estrutura unificada de horários
    const todosHorarios: Record<
      string,
      {
        horario: string;
        fechadas: { nome: string; vaga: any; candidaturaAprovada?: any }[];
        anunciadas: { nome: string; vaga: any; candidaturaAprovada?: any }[];
        abertas: { vaga: any }[];
        canceladas: { vaga: any }[];
      }
    > = {};

    // Adicionar vagas fechadas
    Object.values(vagasFechadasPorHorario).forEach((grupo) => {
      todosHorarios[grupo.horario] = {
        horario: grupo.horario,
        fechadas: grupo.vagas,
        anunciadas: [],
        abertas: [],
        canceladas: [],
      };
    });

    // Adicionar vagas anunciadas
    Object.values(vagasAnunciadasPorHorario).forEach((grupo) => {
      if (!todosHorarios[grupo.horario]) {
        todosHorarios[grupo.horario] = {
          horario: grupo.horario,
          fechadas: [],
          anunciadas: [],
          abertas: [],
          canceladas: [],
        };
      }
      todosHorarios[grupo.horario].anunciadas = grupo.vagas;
    });

    // Adicionar vagas abertas
    Object.values(vagasAbertasPorHorario).forEach((grupo) => {
      if (!todosHorarios[grupo.horario]) {
        todosHorarios[grupo.horario] = {
          horario: grupo.horario,
          fechadas: [],
          anunciadas: [],
          abertas: [],
          canceladas: [],
        };
      }
      todosHorarios[grupo.horario].abertas = grupo.vagas;
    });

    // Adicionar vagas canceladas
    Object.values(vagasCanceladasPorHorario).forEach((grupo) => {
      if (!todosHorarios[grupo.horario]) {
        todosHorarios[grupo.horario] = {
          horario: grupo.horario,
          fechadas: [],
          anunciadas: [],
          abertas: [],
          canceladas: [],
        };
      }
      todosHorarios[grupo.horario].canceladas = grupo.vagas;
    });

    // Ordenar horários por horário de início e fim
    const horariosOrdenados = Object.values(todosHorarios).sort((a, b) => {
      const [inicioA, fimA] = a.horario.split(" - ");
      const [inicioB, fimB] = b.horario.split(" - ");

      // Primeiro ordenar por horário de início
      const compareInicio = inicioA.localeCompare(inicioB);
      if (compareInicio !== 0) {
        return compareInicio;
      }

      // Se horários de início são iguais, ordenar por horário de fim
      return fimA.localeCompare(fimB);
    });

    return (
      <div className="flex flex-col gap-1 text-xs">
        {/* Vagas organizadas por horário */}
        {horariosOrdenados.map((horario, index) => (
          <div key={`horario-${index}`} className="flex flex-col gap-0.5">
            {/* Cabeçalho do horário - só uma vez por grupo */}
            <div className="text-gray-700 font-thin text-xs">
              {horario.horario}
            </div>

            {/* Vagas fechadas do horário */}
            {horario.fechadas.map((item, vagaIndex) => {
              const gradeColor = getGradeColor(item.vaga);
              return (
                <div
                  key={`fechada-${index}-${vagaIndex}`}
                  ref={
                    highlightedVaga === item.vaga.id ? highlightedVagaRef : null
                  }
                  className={cn(
                    "text-gray-800 bg-blue-50 px-1 py-0.5 rounded ml-2 font-thin text-xs truncate relative group flex items-center gap-1",
                    highlightedVaga === item.vaga.id &&
                      "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
                  )}
                  style={{ lineHeight: "1.2" }}
                  title={item.nome}
                >
                  {/* Marcador de cor da grade */}
                  {gradeColor && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gradeColor }}
                      title={`Grade: ${
                        grades.find(
                          (g) => g.id === item.vaga.resource?.grade_id
                        )?.nome || ""
                      }`}
                    />
                  )}
                  {/* Menu de ações */}
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden export-hidden">
                    <VagasContextActions
                      vaga={{ vaga_id: item.vaga.id, ...item.vaga.resource }}
                      vagasData={vagasData}
                      onRefreshData={onRefreshData}
                      onViewDetails={() => onViewDetails?.(item.vaga.id)}
                      onViewApplications={() =>
                        onViewApplications?.(item.vaga.id)
                      }
                      onEditVaga={() => onEditVaga?.(item.vaga.id)}
                      onCancelVaga={() => onCancelVaga?.(item.vaga.id)}
                      onAnnounceVaga={() => onAnnounceVaga?.(item.vaga.id)}
                      onCloseVaga={() => onCloseVaga?.(item.vaga.id)}
                      onDeleteVaga={() => onDeleteVaga?.(item.vaga.id)}
                      vagaCandidaturas={vagaCandidaturas}
                      triggerClassName="h-4 w-4 p-0 bg-white/80 hover:bg-white"
                      contentAlign="end"
                    />
                  </div>

                  <div className="flex-1 truncate">
                    {item.candidaturaAprovada &&
                    item.nome !== "Vaga Fechada" ? (
                      <DoctorNameLink
                        doctorId={item.candidaturaAprovada.medico_id}
                        doctorName={item.nome}
                      />
                    ) : (
                      item.nome
                    )}
                  </div>

                  {/* Badge de candidatos pendentes */}
                  {countPendingCandidatures(item.vaga.id) > 0 && (
                    <div className="ml-1">
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-1 py-0.5 rounded-full border border-yellow-200">
                        {countPendingCandidatures(item.vaga.id)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Vagas anunciadas do horário */}
            {horario.anunciadas.map((item, vagaIndex) => {
              const gradeColor = getGradeColor(item.vaga);
              return (
                <div
                  key={`anunciada-${index}-${vagaIndex}`}
                  ref={
                    highlightedVaga === item.vaga.id ? highlightedVagaRef : null
                  }
                  className={cn(
                    "text-yellow-800 bg-yellow-50 px-1 py-0.5 rounded ml-2 font-thin text-xs truncate relative group flex items-center gap-1",
                    highlightedVaga === item.vaga.id &&
                      "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
                  )}
                  style={{ lineHeight: "1.2" }}
                  title={item.nome}
                >
                  {/* Marcador de cor da grade */}
                  {gradeColor && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gradeColor }}
                      title={`Grade: ${
                        grades.find(
                          (g) => g.id === item.vaga.resource?.grade_id
                        )?.nome || ""
                      }`}
                    />
                  )}
                  {/* Menu de ações */}
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden export-hidden">
                    <VagasContextActions
                      vaga={{ vaga_id: item.vaga.id, ...item.vaga.resource }}
                      vagasData={vagasData}
                      onRefreshData={onRefreshData}
                      onViewDetails={() => onViewDetails?.(item.vaga.id)}
                      onViewApplications={() =>
                        onViewApplications?.(item.vaga.id)
                      }
                      onEditVaga={() => onEditVaga?.(item.vaga.id)}
                      onCancelVaga={() => onCancelVaga?.(item.vaga.id)}
                      onAnnounceVaga={() => onAnnounceVaga?.(item.vaga.id)}
                      onCloseVaga={() => onCloseVaga?.(item.vaga.id)}
                      onDeleteVaga={() => onDeleteVaga?.(item.vaga.id)}
                      vagaCandidaturas={vagaCandidaturas}
                      triggerClassName="h-4 w-4 p-0 bg-white/80 hover:bg-white"
                      contentAlign="end"
                    />
                  </div>

                  <div className="flex-1 truncate">
                    {item.candidaturaAprovada &&
                    item.nome !== "Vaga Anunciada" ? (
                      <DoctorNameLink
                        doctorId={item.candidaturaAprovada.medico_id}
                        doctorName={item.nome}
                      />
                    ) : (
                      item.nome
                    )}
                  </div>

                  {/* Badge de candidatos pendentes */}
                  {countPendingCandidatures(item.vaga.id) > 0 && (
                    <div className="ml-1">
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-1 py-0.5 rounded-full border border-yellow-200">
                        {countPendingCandidatures(item.vaga.id)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Vagas abertas do horário */}
            {horario.abertas.length > 0 && (
              <div
                ref={
                  horario.abertas.some(
                    (item) => highlightedVaga === item.vaga.id
                  )
                    ? highlightedVagaRef
                    : null
                }
                className={cn(
                  "text-gray-800 bg-green-50 px-1 py-0.5 rounded ml-2 font-thin text-xs flex items-center justify-between",
                  horario.abertas.some(
                    (item) => highlightedVaga === item.vaga.id
                  ) &&
                    "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
                )}
              >
                <span>
                  {horario.abertas.length} vaga
                  {horario.abertas.length > 1 ? "s" : ""} aberta
                  {horario.abertas.length > 1 ? "s" : ""}
                </span>
                {(() => {
                  const totalPendentes = horario.abertas.reduce(
                    (total, item) =>
                      total + countPendingCandidatures(item.vaga.id),
                    0
                  );
                  return totalPendentes > 0 ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-normal px-1 py-0.5 rounded-full border border-yellow-200 ml-1">
                      {totalPendentes}
                    </span>
                  ) : null;
                })()}
              </div>
            )}

            {/* Vagas canceladas do horário */}
            {horario.canceladas.length > 0 && (
              <div
                ref={
                  horario.canceladas.some(
                    (item) => highlightedVaga === item.vaga.id
                  )
                    ? highlightedVagaRef
                    : null
                }
                className={cn(
                  "text-gray-500 bg-gray-50 px-1 py-0.5 rounded ml-2 font-thin text-xs",
                  horario.canceladas.some(
                    (item) => highlightedVaga === item.vaga.id
                  ) &&
                    "border-primary border-2 bg-primary/10 shadow-lg animate-pulse"
                )}
              >
                {horario.canceladas.length} cancelada
                {horario.canceladas.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Dividir dias em semanas
  const weeks = [];
  for (let i = 0; i < monthData.length; i += 7) {
    weeks.push(monthData.slice(i, i + 7));
  }

  return (
    <div className="w-full bg-white" id="monthly-calendar-content">
      {/* Header dos dias da semana */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-300">
        {[
          "Domingo",
          "Segunda",
          "Terça",
          "Quarta",
          "Quinta",
          "Sexta",
          "Sábado",
        ].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-normal text-gray-700 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid das semanas */}
      <div className="flex flex-col">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 min-h-[80px]"
            style={{ height: "auto" }}
          >
            {week.map((day) => {
              // Verificar se este dia é o dia clicado
              const isClickedDay =
                clickedDay &&
                moment(day.date).isSame(moment(clickedDay), "day");

              return (
                <div
                  key={day.dateKey}
                  className={cn(
                    "border-r border-b border-gray-300 last:border-r-0",
                    "flex flex-col relative bg-white",
                    !day.isCurrentMonth && "bg-gray-50 text-gray-400",
                    "group transition-all duration-300"
                  )}
                  style={{
                    minHeight: "100px",
                    height: "auto",
                  }}
                >
                  {/* Número do dia - área clicável */}
                  <div className="flex justify-end p-2 relative z-10">
                    <span
                      className={cn(
                        "text-sm font-normal cursor-pointer rounded-full w-6 h-6 flex items-center justify-center text-xs transition-all duration-200",
                        "hover:bg-primary/20 hover:text-primary",
                        day.isToday && "bg-primary text-primary-foreground",
                        isClickedDay &&
                          !day.isToday &&
                          "bg-primary/10 border-2 border-primary text-primary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDayClick) {
                          onDayClick(day.date);
                        }
                      }}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {/* Conteúdo do dia */}
                  <div className="flex-1 overflow-visible px-2 pb-2 relative z-10">
                    {renderDayContent(day)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Hospital } from "@/services/hospitaisService";
import { cleanHospitalNameSync } from "@/lib/utils";
import { type GradeLine } from "@/hooks/grades";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HospitalTabsComponentProps {
  hospitais: Hospital[];
  gradeLines: GradeLine[];
  activeHospitalTab: string;
  setActiveHospitalTab: (hospitalId: string) => void;
}

// Componente de aba individual sortable
interface SortableTabProps {
  hospital: Hospital;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

function SortableTab({
  hospital,
  isActive,
  isFirst,
  isLast,
  onClick,
  isDragging = false,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: hospital.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        relative px-6 py-3 text-sm font-normal transition-all duration-200 cursor-grab active:cursor-grabbing
        ${
          isActive
            ? `bg-white border-l border-r border-t border-gray-200 text-gray-700 -mb-px z-10`
            : "bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-400 font-thin hover:text-gray-800 hover:font-normal"
        }
        ${isFirst ? "rounded-tl-lg border-l" : ""}
        ${isLast ? "rounded-tr-lg" : ""}
        ${isSortableDragging ? "shadow-lg ring-opacity-50" : ""}
        hover:z-20
      `}
    >
      <span className="relative z-10 select-none">
        {cleanHospitalNameSync(hospital.nome)}
      </span>
      {/* Indicador visual de drop zone */}
      <div className="absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-200" />
    </button>
  );
}

export function HospitalTabsComponent({
  hospitais,
  gradeLines,
  activeHospitalTab,
  setActiveHospitalTab,
}: HospitalTabsComponentProps) {
  const [hospitalOrder, setHospitalOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo de 8px para iniciar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Função para obter hospitais que possuem grades
  const getHospitalsWithGrades = () => {
    const hospitalIds = new Set(gradeLines.map((grade) => grade.hospital_id));
    return hospitais.filter((hospital) => hospitalIds.has(hospital.id));
  };

  // Inicializar ordem dos hospitais (carregar do localStorage ou usar ordem original)
  useEffect(() => {
    const hospitalIds = new Set(gradeLines.map((grade) => grade.hospital_id));
    const hospitalsWithGrades = hospitais.filter((hospital) =>
      hospitalIds.has(hospital.id)
    );

    const savedOrder = localStorage.getItem("hospital-tabs-order");

    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder) as string[];
        // Verificar se todos os IDs ainda são válidos
        const validIds = parsedOrder.filter((id) =>
          hospitalsWithGrades.some((h) => h.id === id)
        );
        // Adicionar novos hospitais que não estavam na ordem salva
        const newIds = hospitalsWithGrades
          .filter((h) => !validIds.includes(h.id))
          .map((h) => h.id);

        setHospitalOrder([...validIds, ...newIds]);
      } catch (error) {
        console.error("Erro ao carregar ordem dos hospitais:", error);
        setHospitalOrder(hospitalsWithGrades.map((h) => h.id));
      }
    } else {
      setHospitalOrder(hospitalsWithGrades.map((h) => h.id));
    }
  }, [hospitais, gradeLines]);

  // Salvar ordem no localStorage quando mudar
  useEffect(() => {
    if (hospitalOrder.length > 0) {
      localStorage.setItem(
        "hospital-tabs-order",
        JSON.stringify(hospitalOrder)
      );
    }
  }, [hospitalOrder]);

  // Obter hospitais ordenados
  const getOrderedHospitalsWithGrades = () => {
    const hospitalsWithGrades = getHospitalsWithGrades();
    if (hospitalOrder.length === 0) return hospitalsWithGrades;

    const ordered = hospitalOrder
      .map((id) => hospitalsWithGrades.find((h) => h.id === id))
      .filter(Boolean) as Hospital[];

    // Adicionar hospitais que não estavam na ordem
    const unordered = hospitalsWithGrades.filter(
      (h) => !hospitalOrder.includes(h.id)
    );

    return [...ordered, ...unordered];
  };

  const hospitalsWithGrades = getOrderedHospitalsWithGrades();

  // Handlers de drag
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setHospitalOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }

      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Se não há hospitais com grades, não renderizar
  if (hospitalsWithGrades.length === 0) {
    return null;
  }

  // Encontrar hospital ativo para overlay
  const activeHospital = activeId
    ? hospitalsWithGrades.find((h) => h.id === activeId)
    : null;

  return (
    <div className="mb-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={hospitalsWithGrades.map((h) => h.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex -mb-px relative">
            {hospitalsWithGrades.map((hospital, index) => (
              <SortableTab
                key={hospital.id}
                hospital={hospital}
                isActive={activeHospitalTab === hospital.id}
                isFirst={index === 0}
                isLast={index === hospitalsWithGrades.length - 1}
                onClick={() => setActiveHospitalTab(hospital.id)}
                isDragging={activeId === hospital.id}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay></DragOverlay>
      </DndContext>
    </div>
  );
}

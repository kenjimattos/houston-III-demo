"use client"

import { useState } from "react"
import { DoctorDetailsModal } from "@/components/medicos/doctor-details-modal"
import { type Medico, fetchMedicosCompleto } from "@/services/medicosService"

interface DoctorNameLinkProps {
  doctorId: string
  doctorName: string
}

export function DoctorNameLink({ doctorId, doctorName }: DoctorNameLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [doctor, setDoctor] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!doctor && !loading) {
      setLoading(true)
      try {
        const allDoctors = await fetchMedicosCompleto()
        const doctorData = allDoctors.find((d) => d.id === doctorId)
        if (doctorData) {
          setDoctor(doctorData)
          setIsModalOpen(true)
        } else {
          console.warn("Médico não encontrado:", doctorId)
          // Ainda assim mostrar o nome, mas sem modal
        }
      } catch (error) {
        console.error("Erro ao carregar dados do médico:", error)
      } finally {
        setLoading(false)
      }
    } else {
      setIsModalOpen(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="text-gray-800 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        disabled={loading}
      >
        {loading ? "Carregando..." : doctorName}
      </button>

      {doctor && (
        <DoctorDetailsModal
          doctor={doctor}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          showFavoriteButton={true}
          showEquipesButton={true}
        />
      )}
    </>
  )
}

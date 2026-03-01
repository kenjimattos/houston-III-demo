import { Medico } from "@/services/medicosService"

export function filterDoctors(doctors: Medico[], search: string): Medico[] {
  if (!search) return doctors
  const lower = search.toLowerCase()
  return doctors.filter((doctor) => {
    const nomeCompleto = `${doctor.primeiro_nome} ${doctor.sobrenome}`.toLowerCase()
    return (
      nomeCompleto.includes(lower) ||
      (doctor.crm || "").toLowerCase().includes(lower) ||
      (doctor.email || "").toLowerCase().includes(lower)
    )
  })
} 
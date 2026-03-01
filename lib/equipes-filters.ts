import { type Medico } from "@/services/medicosService"
import { type Equipe, type EquipeMedicoView } from "@/services/equipesService"

export interface EquipeSearchResult {
  equipe: Equipe
  medicos: EquipeMedicoView[]
  matchedMedicos: Set<string> // IDs dos médicos que fizeram match com a busca
  matchReason: 'equipe' | 'medico' // Se o match foi pelo nome da equipe ou pelos médicos
}

export interface FavoritosSearchResult {
  medicos: Medico[]
  matchedMedicos: Set<string>
}

/**
 * Normaliza uma string para busca (remove acentos, converte para lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
}

/**
 * Verifica se um médico faz match com o termo de busca
 */
function medicoMatchesSearch(medico: EquipeMedicoView | Medico, searchTerm: string): boolean {
  const normalizedSearch = normalizeString(searchTerm)

  // Buscar por nome completo
  const nomeCompleto = `${medico.primeiro_nome} ${medico.sobrenome}`

  if (normalizeString(nomeCompleto).includes(normalizedSearch)) {
    return true
  }

  // Buscar por primeiro nome
  if (normalizeString(medico.primeiro_nome || '').includes(normalizedSearch)) {
    return true
  }

  // Buscar por sobrenome
  if (normalizeString(medico.sobrenome || '').includes(normalizedSearch)) {
    return true
  }

  // Buscar por CRM (apenas números ou com formatação)
  const crm = medico.crm
  if (crm) {
    // Busca exata por CRM
    if (normalizeString(crm).includes(normalizedSearch)) {
      return true
    }

    // Busca apenas pelos números do CRM
    const crmNumbers = crm.replace(/\D/g, '')
    const searchNumbers = searchTerm.replace(/\D/g, '')
    if (searchNumbers && crmNumbers.includes(searchNumbers)) {
      return true
    }
  }

  return false
}

/**
 * Filtra equipes e seus médicos baseado no termo de busca
 */
export function filterEquipesAndMedicos(
  equipes: Equipe[],
  equipesMedicos: Record<string, EquipeMedicoView[]>,
  searchTerm: string
): EquipeSearchResult[] {
  if (!searchTerm.trim()) {
    // Se não há termo de busca, retorna todas as equipes sem destaque
    return equipes.map(equipe => ({
      equipe,
      medicos: equipesMedicos[equipe.id] || [],
      matchedMedicos: new Set(),
      matchReason: 'equipe' as const
    }))
  }

  const normalizedSearch = normalizeString(searchTerm)
  const results: EquipeSearchResult[] = []

  for (const equipe of equipes) {
    const medicosEquipe = equipesMedicos[equipe.id] || []

    // Verifica se o nome da equipe faz match
    const equipeMatches = normalizeString(equipe.nome).includes(normalizedSearch)

    // Verifica quais médicos fazem match
    const matchedMedicos = new Set<string>()
    for (const medico of medicosEquipe) {
      if (medicoMatchesSearch(medico, searchTerm)) {
        matchedMedicos.add(medico.medico_id)
      }
    }

    // Inclui a equipe se o nome dela faz match OU se algum médico faz match
    if (equipeMatches || matchedMedicos.size > 0) {
      results.push({
        equipe,
        medicos: medicosEquipe,
        matchedMedicos,
        matchReason: equipeMatches ? 'equipe' : 'medico'
      })
    }
  }

  return results
}

/**
 * Filtra médicos favoritos baseado no termo de busca
 */
export function filterMedicosFavoritos(
  favoritos: Medico[],
  searchTerm: string
): FavoritosSearchResult {
  if (!searchTerm.trim()) {
    return {
      medicos: favoritos,
      matchedMedicos: new Set()
    }
  }

  const matchedMedicos = new Set<string>()

  for (const medico of favoritos) {
    if (medicoMatchesSearch(medico, searchTerm)) {
      matchedMedicos.add(medico.id)
    }
  }

  return {
    medicos: favoritos,
    matchedMedicos
  }
}
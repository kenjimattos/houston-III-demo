import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { fetchCleanHospitalTerms } from '@/services/hospitaisService'
import moment, { Moment } from "moment";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Cache para os termos de limpeza
let cleanTermsCache: string[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

async function getCleanTerms(): Promise<string[]> {
  const now = Date.now()
  
  // Se o cache ainda é válido, retorna do cache
  if (cleanTermsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return cleanTermsCache
  }
  
  // Busca termos do banco
  cleanTermsCache = await fetchCleanHospitalTerms()
  cacheTimestamp = now
  return cleanTermsCache
}

/**
 * Remove palavras óbvias dos nomes de hospitais para uma exibição mais limpa
 * Versão assíncrona que busca termos do banco de dados
 * @param hospitalName - Nome completo do hospital
 * @returns Nome limpo do hospital
 */
export async function cleanHospitalName(hospitalName: string): Promise<string> {
  if (!hospitalName) return hospitalName

  const termsToRemove = await getCleanTerms()
  let cleanName = hospitalName.trim()

  // Remove os termos da lista, preservando case das outras palavras
  termsToRemove.forEach(term => {
    // Regex para remover o termo no início, no final ou isolado
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    cleanName = cleanName.replace(regex, '').trim()
  })

  // Remove espaços múltiplos e vírgulas/hífen no início ou final
  cleanName = cleanName
    .replace(/\s+/g, ' ')
    .replace(/^[,\-\s]+|[,\-\s]+$/g, '')
    .trim()

  // Se ficou vazio ou muito curto, retorna o nome original
  if (cleanName.length < 3) {
    return hospitalName
  }

  return cleanName
}

// Cache para versão síncrona
let syncTermsCache: string[] | null = null
let syncCacheInitialized = false

/**
 * Versão síncrona para compatibilidade com código existente
 * Usa dados do banco quando disponíveis, senão retorna nome original
 * @param hospitalName - Nome completo do hospital
 * @returns Nome limpo do hospital
 */
export function cleanHospitalNameSync(hospitalName: string): string {
  if (!hospitalName) return hospitalName

  // Se os termos não foram carregados ainda e não estamos inicializando, inicializar
  if (!syncCacheInitialized && !syncTermsCache) {
    syncCacheInitialized = true
    // Inicializar cache de forma assíncrona (não bloqueia)
    fetchCleanHospitalTerms().then(terms => {
      syncTermsCache = terms
    }).catch(error => {
      console.warn('Erro ao carregar termos de limpeza para versão síncrona:', error)
      syncTermsCache = [] // Cache vazio em caso de erro
    })
  }

  // Se não há termos carregados, retorna nome original
  if (!syncTermsCache || syncTermsCache.length === 0) {
    return hospitalName
  }

  let cleanName = hospitalName.trim()

  // Remove os termos da lista, preservando case das outras palavras
  syncTermsCache.forEach(term => {
    // Regex para remover o termo no início, no final ou isolado
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    cleanName = cleanName.replace(regex, '').trim()
  })

  // Remove espaços múltiplos e vírgulas/hífen no início ou final
  cleanName = cleanName
    .replace(/\s+/g, ' ')
    .replace(/^[,\-\s]+|[,\-\s]+$/g, '')
    .trim()

  // Se ficou vazio ou muito curto, retorna o nome original
  if (cleanName.length < 3) {
    return hospitalName
  }

  return cleanName
}

// PHONE FORMATTING UTILITIES
export function formatTelefoneBR(telefone?: string): string {
  if (!telefone) return "-";
  const cleaned = telefone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    // Celular: (99) 99999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(
      7
    )}`;
  } else if (cleaned.length === 10) {
    // Fixo: (99) 9999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(
      6
    )}`;
  }
  return telefone;
}

// TIME UTILITIES
export function normalizeHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

function numberToHourString(hour: number): string {
  const normalizedHour = normalizeHour(hour);
  return normalizedHour.toString().padStart(2, "0") + ":00";
}
export function compareHoursWithCrossing(startHour: number, endHour: number) {
  const startHourStr = numberToHourString(startHour);
  const endHourStr = numberToHourString(endHour);

  console.warn("Comparing hours:", { startHourStr, endHourStr });
  return compareTimesWithCrossing({
    startHour: startHourStr,
    endHour: endHourStr,
  });
}
function compareTimesWithCrossing({
  startHour,
  endHour,
}: {
  startHour: string;
  endHour: string;
}) {
  const today = moment().format("YYYY-MM-DD");
  const tomorrow = moment().add(1, "day").format("YYYY-MM-DD");

  // Criar os momentos para ambas as horas no dia atual
  const momento1 = moment(`${today} ${startHour}`, "YYYY-MM-DD HH:mm");
  const momento2DiaAtual = moment(`${today} ${endHour}`, "YYYY-MM-DD HH:mm");

  // Criar também uma versão da hora2 no dia seguinte
  const momento2DiaSeguinte = moment(
    `${tomorrow} ${endHour}`,
    "YYYY-MM-DD HH:mm"
  );

  // Calcular as diferenças
  const diffDiaAtual = momento2DiaAtual.diff(momento1, "minutes");
  const diffDiaSeguinte = momento2DiaSeguinte.diff(momento1, "minutes");

  // Se a diferença for negativa no dia atual, mas positiva no dia seguinte,
  // significa que a hora2 pertence ao dia seguinte
  if (diffDiaAtual < 0 && diffDiaSeguinte > 0) {
    return {
      startHour: startHour,
      endHour: endHour,
      endHourBelongsToTheSameDay: true,
      diferencaMinutos: diffDiaSeguinte,
      diferencaHoras: (diffDiaSeguinte / 60).toFixed(2),
      momento1: momento1.format(),
      momento2: momento2DiaSeguinte.format(),
    };
  } else {
    return {
      startHour: startHour,
      endHour: endHour,
      endHourBelongsToTheSameDay: false,
      diferencaMinutos: diffDiaAtual,
      diferencaHoras: (diffDiaAtual / 60).toFixed(2),
      momento1: momento1.format(),
      momento2: momento2DiaAtual.format(),
    };
  }
}

// PROFILE PICTURE URL UTILITIES
/**
 * Valida e processa URLs de profile pictures
 * Suporta URLs do Google (googleusercontent.com) e do Supabase Storage
 */
export function validateProfilePictureUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null

  try {
    const urlObj = new URL(url)

    // Verificar se é uma URL válida do Google
    if (urlObj.hostname.includes('googleusercontent.com')) {
      return url
    }

    // Verificar se é uma URL válida do Supabase
    if (urlObj.hostname.includes('supabase.co') && urlObj.pathname.includes('/storage/v1/object/public/profilepictures/')) {
      // Rejeitar o Avatar.png padrão (placeholder)
      if (urlObj.pathname.endsWith('/Avatar.png') || urlObj.pathname.endsWith('//Avatar.png')) {
        return null
      }
      return url
    }

    // Se chegou até aqui, não é um tipo de URL suportado
    return null
  } catch (error) {
    // URL inválida
    return null
  }
}

/**
 * Wrapper para uso em componentes React
 * Retorna a URL validada ou undefined para uso direto em src de imagens
 */
export function getValidProfilePictureUrl(url?: string | null): string | undefined {
  const validUrl = validateProfilePictureUrl(url)
  return validUrl || undefined
}


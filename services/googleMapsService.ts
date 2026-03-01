const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export function isGoogleMapsConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 0)
}

// Flag para controlar se o script já está sendo carregado
let isLoading = false
let loadPromise: Promise<void> | null = null

export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('window not available')

    // Modo demo: permite a aplicação funcionar sem chave externa.
    if (!isGoogleMapsConfigured()) return resolve()
    
    // Se já está carregado, resolve imediatamente
    if ((window as any).google && (window as any).google.maps) return resolve()
    
    // Se já está sendo carregado, retorna a promise existente
    if (isLoading && loadPromise) return loadPromise.then(resolve).catch(reject)
    
    // Se já existe um script carregando, aguarda
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', reject)
      return
    }
    
    // Marca como carregando e cria nova promise
    isLoading = true
    loadPromise = new Promise<void>((innerResolve, innerReject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,core&v=weekly&language=pt-BR&region=BR&loading=async`;
      script.async = true
      script.defer = true
      script.onload = () => {
        isLoading = false
        // Aguardar um pouco para garantir que as bibliotecas estejam carregadas
        setTimeout(() => {
          innerResolve()
        }, 100)
      }
      script.onerror = (error) => {
        isLoading = false
        loadPromise = null
        innerReject(error)
      }
      document.body.appendChild(script)
    })
    
    loadPromise.then(resolve).catch(reject)
  })
}

export async function searchHospitalsByName(nome: string, cidade?: string): Promise<any[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return []
  let query = encodeURIComponent(nome + (cidade ? ' ' + cidade : ''))
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&type=hospital&language=pt-BR&region=BR&key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Erro ao buscar hospitais na API Google Places')
  const data = await response.json()
  return data.results || []
}

export async function geocodeEndereco(endereco: string): Promise<{ latitude: number | undefined, longitude: number | undefined }> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return { latitude: undefined, longitude: undefined }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${apiKey}&language=pt-BR&region=BR`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === 'OK' && data.results && data.results[0]) {
      const location = data.results[0].geometry.location
      return { latitude: location.lat, longitude: location.lng }
    }
  } catch (e) {}
  return { latitude: undefined, longitude: undefined }
} 

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting simples em memória (produção deve usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Configurações de rate limiting
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 10000, // máximo de requests por IP (aumentado para dev)
  apiMaxRequests: 5000, // máximo para APIs específicas (aumentado para dev)
}

function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`
}

function isRateLimited(key: string, maxRequests: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    return false
  }
  
  if (record.count >= maxRequests) {
    return true
  }
  
  record.count++
  return false
}

function getClientIP(request: NextRequest): string {
  // Tentar obter IP real através de headers de proxy
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)
  
  // Aplicar rate limiting mais restritivo para APIs
  if (pathname.startsWith('/api/')) {
    const apiKey = getRateLimitKey(ip, '/api/*')
    if (isRateLimited(apiKey, RATE_LIMIT.apiMaxRequests)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Tente novamente em alguns minutos.' 
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900', // 15 minutos
            'X-RateLimit-Limit': RATE_LIMIT.apiMaxRequests.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
  }
  
  // Rate limiting geral
  const generalKey = getRateLimitKey(ip, 'general')
  if (isRateLimited(generalKey, RATE_LIMIT.maxRequests)) {
    // Para páginas HTML, redirecionar para página de erro
    if (request.headers.get('accept')?.includes('text/html')) {
      return NextResponse.redirect(new URL('/rate-limit-exceeded', request.url))
    }
    
    // Para APIs, retornar erro JSON
    return new NextResponse(
      JSON.stringify({ 
        error: 'Muitas solicitações. Tente novamente mais tarde.' 
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900',
        },
      }
    )
  }
  
  // Headers de segurança para todas as respostas
  // IMPORTANTE: Passar a request para preservar cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Proteger contra clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Proteger contra MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Proteção XSS
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Política de referrer restritiva
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy básica
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://maps.gstatic.com https://*.googleusercontent.com; frame-src 'self' https://*.supabase.co; connect-src 'self' https://*.supabase.co https://maps.googleapis.com https://places.googleapis.com http://127.0.0.1:54321;"
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 
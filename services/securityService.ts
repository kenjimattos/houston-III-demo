import { getSupabaseClient } from "./supabaseClient"

interface SecurityEvent {
  event_type: 'suspicious_activity' | 'rate_limit_hit' | 'unauthorized_access' | 'api_abuse'
  user_id?: string
  ip_address?: string
  user_agent?: string
  details: Record<string, any>
  timestamp: string
}

// Função para registrar eventos de segurança
export async function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
  try {
    const supabase = getSupabaseClient()
    
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }
    
    // Security event logged (removed console output for production)
    
    // Em produção, isso deveria ir para um sistema de logging dedicado
    // Por enquanto, vamos simular com um log local
    
    // Verificar se há muitos eventos suspeitos do mesmo IP
    if (event.ip_address) {
      await checkForSuspiciousActivity(event.ip_address)
    }
    
    return true
  } catch (error) {
    console.error('Erro ao registrar evento de segurança:', error)
    return false
  }
}

// Verificar atividade suspeita de um IP
async function checkForSuspiciousActivity(ipAddress: string) {
  try {
    // Em produção, isso deveria consultar um banco de dados de eventos
    // Por enquanto, vamos simular
    
    const suspiciousPatterns = [
      // IPs conhecidos por ataques
      /^10\.0\.0\./,
      /^192\.168\./,
      // Padrões de bots
      /crawler|bot|spider/i,
    ]
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(ipAddress)
    )
    
    if (isSuspicious) {
      await logSecurityEvent({
        event_type: 'suspicious_activity',
        ip_address: ipAddress,
        details: {
          reason: 'IP pattern match',
          action: 'flagged_for_review'
        }
      })
    }
  } catch (error) {
    console.error('Erro ao verificar atividade suspeita:', error)
  }
}

// Monitorar uso da API Supabase
export function monitorSupabaseUsage() {
  // Interceptar chamadas do Supabase para detectar padrões suspeitos
  const originalFetch = window.fetch
  
  window.fetch = async (...args) => {
    const [url, options] = args
    
    // Verificar se é uma chamada para o Supabase
    if (typeof url === 'string' && url.includes('supabase.co')) {
      const startTime = Date.now()
      
      try {
        const response = await originalFetch(...args)
        const duration = Date.now() - startTime
        
        // Detectar padrões suspeitos
        if (duration > 10000) { // Requisições muito lentas
          await logSecurityEvent({
            event_type: 'api_abuse',
            details: {
              url,
              duration,
              status: response.status,
              reason: 'slow_request'
            }
          })
        }
        
        if (!response.ok && response.status === 429) {
          await logSecurityEvent({
            event_type: 'rate_limit_hit',
            details: {
              url,
              status: response.status,
              reason: 'rate_limit_exceeded'
            }
          })
        }
        
        return response
      } catch (error) {
        await logSecurityEvent({
          event_type: 'api_abuse',
          details: {
            url,
            error: error instanceof Error ? error.message : 'Unknown error',
            reason: 'request_failed'
          }
        })
        throw error
      }
    }
    
    return originalFetch(...args)
  }
}

// Detectar tentativas de acesso não autorizado
export async function detectUnauthorizedAccess(error: any, context: string) {
  if (error?.message?.includes('JWT') || 
      error?.message?.includes('unauthorized') ||
      error?.message?.includes('permission denied')) {
    
    await logSecurityEvent({
      event_type: 'unauthorized_access',
      details: {
        context,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    })
  }
}

// Inicializar monitoramento de segurança
export function initializeSecurityMonitoring() {
  if (typeof window !== 'undefined') {
    monitorSupabaseUsage()
    
    // Detectar tentativas de abertura de ferramentas de desenvolvedor
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C')) {
        
        logSecurityEvent({
          event_type: 'suspicious_activity',
          details: {
            action: 'devtools_access_attempt',
            timestamp: new Date().toISOString()
          }
        })
      }
    })
    
    // Security monitoring initialized
  }
} 
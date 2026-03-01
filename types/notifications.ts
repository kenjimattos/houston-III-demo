export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type NotificationType =
  | 'nova_candidatura'
  | 'vaga_anunciada'
  | 'vaga_proxima'
  | 'candidatura_reprovada'
  | 'vaga_cancelada'
  | 'vaga_urgente'
  | 'vaga_fechada'
  | 'vaga_sem_candidatos'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  timestamp: Date
  read: boolean
  data?: {
    vaga_id?: string
    candidatura_id?: string
    hospital_id?: string
    medico_id?: string
    vaga_data?: string
    hospital_nome?: string
    especialidade_nome?: string
    medico_nome?: string
    valor?: number
    aprovado_por?: string
    aprovado_por_nome?: string
    anunciado_por?: string
    anunciado_por_nome?: string
    is_favorito_aprovacao?: boolean
  }
}

export interface NotificationCount {
  total: number
  unread: number
  byPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
}

export interface NotificationFilters {
  types?: NotificationType[]
  priorities?: NotificationPriority[]
  read?: boolean
  dateFrom?: Date
  dateTo?: Date
}
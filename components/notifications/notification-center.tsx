"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  Info,
  X,
  Users,
  Calendar,
  Eye,
  EyeOff,
  ChevronDown
} from "lucide-react"
import { NotificationService } from "@/services/notificationsService"
import { Notification, NotificationCount, NotificationType, NotificationPriority } from "@/types/notifications"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface NotificationCenterProps {
  compact?: boolean
}

export function NotificationCenter({ compact = false }: NotificationCenterProps) {
  const router = useRouter()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [count, setCount] = useState<NotificationCount>({
    total: 0,
    unread: 0,
    byPriority: { urgent: 0, high: 0, medium: 0, low: 0 }
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{
    types: NotificationType[];
    priorities: NotificationPriority[];
    showRead: boolean;
    showUnread: boolean;
  }>({
    types: [],
    priorities: [],
    showRead: true,
    showUnread: true
  })

  useEffect(() => {
    loadNotifications()

    // Auto-refresh a cada 5 minutos
    const interval = setInterval(loadNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const [notifs, notifCount] = await Promise.all([
        NotificationService.getNotifications(),
        NotificationService.getNotificationCount()
      ])
      setNotifications(notifs)
      setCount(notifCount)
    } catch (error) {
      console.error('❌ Erro ao carregar notificações:', error)
      toast.error('Erro ao carregar notificações')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshNotifications = async () => {
    try {
      setIsLoading(true)
      // Limpar cache antes de recarregar
      NotificationService.clearCache()
      const [notifs, notifCount] = await Promise.all([
        NotificationService.getNotifications(),
        NotificationService.getNotificationCount()
      ])
      setNotifications(notifs)
      setCount(notifCount)
      toast.success('Notificações atualizadas')
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error)
      toast.error('Erro ao atualizar notificações')
    } finally {
      setIsLoading(false)
    }
  }

  // Aplicar filtros sempre que notifications ou filters mudarem
  useEffect(() => {
    let filtered = [...notifications]

    // Filtro por tipo
    if (filters.types.length > 0) {
      filtered = filtered.filter(n => filters.types.includes(n.type))
    }

    // Filtro por prioridade
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(n => filters.priorities.includes(n.priority))
    }

    // Filtro por status de leitura
    if (!filters.showRead || !filters.showUnread) {
      filtered = filtered.filter(n => {
        if (!filters.showRead && n.read) return false
        if (!filters.showUnread && !n.read) return false
        return true
      })
    }

    setFilteredNotifications(filtered)
  }, [notifications, filters])

  const toggleTypeFilter = (type: NotificationType) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }))
  }

  const togglePriorityFilter = (priority: NotificationPriority) => {
    setFilters(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }))
  }

  const toggleReadFilter = (showRead: boolean) => {
    setFilters(prev => ({ ...prev, showRead }))
  }

  const toggleUnreadFilter = (showUnread: boolean) => {
    setFilters(prev => ({ ...prev, showUnread }))
  }

  const clearAllFilters = () => {
    setFilters({
      types: [],
      priorities: [],
      showRead: true,
      showUnread: true
    })
  }

  const hasActiveFilters = filters.types.length > 0 || filters.priorities.length > 0 || !filters.showRead || !filters.showUnread

  // Obter tipos únicos das notificações
  const availableTypes = Array.from(new Set(notifications.map(n => n.type)))
  const availablePriorities = Array.from(new Set(notifications.map(n => n.priority)))

  // Função para obter ícone do tipo
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'nova_candidatura':
      case 'candidatura_reprovada':
        return <Users className="h-4 w-4" />
      case 'vaga_anunciada':
      case 'vaga_proxima':
      case 'vaga_urgente':
      case 'vaga_sem_candidatos':
      case 'vaga_cancelada':
      case 'vaga_fechada':
        return <Calendar className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  // Função para obter cor do botão de tipo
  const getTypeButtonColor = (type: NotificationType, isActive: boolean) => {
    if (!isActive) return 'border-gray-200 text-gray-600 hover:bg-gray-100'

    switch (type) {
      case 'nova_candidatura':
      case 'candidatura_reprovada':
        return 'border-green-200 bg-green-100 text-green-700'
      case 'vaga_anunciada':
      case 'vaga_proxima':
      case 'vaga_urgente':
      case 'vaga_sem_candidatos':
      case 'vaga_cancelada':
      case 'vaga_fechada':
        return 'border-blue-200 bg-blue-100 text-blue-700'
      default:
        return 'border-gray-200 bg-gray-100 text-gray-700'
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId)
      await loadNotifications()
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
      toast.error('Erro ao marcar como lida')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead()
      await loadNotifications()
      toast.success('Todas as notificações foram marcadas como lidas')
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
      toast.error('Erro ao marcar todas como lidas')
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId)
      await loadNotifications()
      toast.success('Notificação removida')
    } catch (error) {
      console.error('Erro ao remover notificação:', error)
      toast.error('Erro ao remover notificação')
    }
  }

  const handleClearOld = async () => {
    try {
      await NotificationService.clearOldNotifications(7)
      // Recarregar apenas as notificações da memória, não do servidor
      const [notifs, notifCount] = await Promise.all([
        NotificationService.getNotifications(),
        NotificationService.getNotificationCount()
      ])
      setNotifications(notifs)
      setCount(notifCount)
      toast.success('Notificações antigas removidas')
    } catch (error) {
      console.error('Erro ao limpar notificações:', error)
      toast.error('Erro ao limpar notificações')
    }
  }


  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida ao clicar
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }

    // Navegar baseado no tipo da notificação
    switch (notification.type) {
      case 'nova_candidatura':
        // Ir para escala na data específica com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      case 'vaga_anunciada':
        // Ir para escala na data específica com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      case 'vaga_proxima':
      case 'vaga_urgente':
        // Ir para escala na data específica com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      case 'vaga_sem_candidatos':
        // Ir para escala na data específica com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      case 'candidatura_reprovada':
        // Ir para escala na data específica com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      case 'vaga_cancelada':
        // Ir para escala na data com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      case 'vaga_fechada':
        // Ir para escala na data específica com destaque na vaga
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break

      default:
        // Fallback para escala (todas as notificações são relacionadas a vagas)
        if (notification.data?.vaga_data && notification.data?.vaga_id) {
          const date = new Date(notification.data.vaga_data)
          const dateStr = date.toISOString().split('T')[0]
          const url = `/escala?date=${dateStr}&highlight=${notification.data.vaga_id}`

          router.push(url)
        } else {
          router.push('/escala')
        }
        break
    }
  }

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'nova_candidatura':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'vaga_anunciada':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'vaga_proxima':
      case 'vaga_urgente':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'vaga_fechada':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'vaga_sem_candidatos':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (compact) {
    return (
      <>
        <Card className="w-1/3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {count.unread > 0 ? (
                  <BellRing className="h-5 w-5 text-orange-500" />
                ) : (
                  <Bell className="h-5 w-5 text-gray-500" />
                )}
                Notificações
              </CardTitle>
              <div className="flex items-center gap-2">
                {count.unread > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {count.unread}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshNotifications}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {count.byPriority.urgent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Urgente
                  </span>
                  <Badge variant="destructive">{count.byPriority.urgent}</Badge>
                </div>
              )}
              {count.byPriority.high > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    Alta
                  </span>
                  <Badge variant="secondary">{count.byPriority.high}</Badge>
                </div>
              )}
              {count.byPriority.medium > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-yellow-600">
                    <Info className="h-3 w-3" />
                    Média
                  </span>
                  <Badge variant="outline">{count.byPriority.medium}</Badge>
                </div>
              )}
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredNotifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer hover:shadow-sm ${!notification.read
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getPriorityIcon(notification.priority)}
                        <div className="min-w-0 flex-1">
                          <p className="font-normal text-sm text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(notification.timestamp, "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {filteredNotifications.length === 0 && notifications.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Filtros ativos</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(true)}
                      className="text-xs mt-1"
                    >
                      Ver filtros
                    </Button>
                  </div>
                )}

                {notifications.length === 0 && (
                  isLoading ? (
                    <LoadingSpinner message="Carregando notificações..." className="py-8" />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2" />
                      <p>Suas notificações estão em dia</p>
                    </div>
                  )
                )}

                {filteredNotifications.length > 5 && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(true)}
                      className="text-xs"
                    >
                      Ver todas ({filteredNotifications.length - 5} mais)
                    </Button>
                  </div>
                )}

                {filteredNotifications.length <= 5 && filteredNotifications.length < notifications.length && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(true)}
                      className="text-xs"
                    >
                      Ver todas ({notifications.length} total)
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {count.unread > 0 && (
              <div className="pt-3 mt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="w-full text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Marcar todas como lidas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal expandido - funciona para versão compact também */}
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setIsExpanded(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-normal flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Todas as Notificações ({notifications.length})
                    {count.unread > 0 && (
                      <Badge variant="destructive">{count.unread} não lidas</Badge>
                    )}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4 mt-4">
                  {/* Botões de ações */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearOld}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar antigas
                    </Button>
                    {count.unread > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Marcar todas como lidas
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshNotifications}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Filtros
                      {hasActiveFilters && (
                        <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 text-xs">
                          {(filters.types.length || 0) + (filters.priorities.length || 0) + (filters.showRead && filters.showUnread ? 0 : 1)}
                        </Badge>
                      )}
                      <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>

                  {/* Painel de Filtros */}
                  {showFilters && (
                    <div className="bg-gray-50 rounded-lg p-4 border space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-normal text-sm text-gray-700">Filtros Ativos</h4>
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-xs h-6"
                          >
                            Limpar todos
                          </Button>
                        )}
                      </div>

                      {/* Filtros por Tipo */}
                      <div className="space-y-2">
                        <label className="text-xs font-normal text-gray-600">Por Tipo:</label>
                        <div className="flex flex-wrap gap-2">
                          {availableTypes.map(type => {
                            const isActive = filters.types.includes(type)
                            const count = notifications.filter(n => n.type === type).length
                            return (
                              <Button
                                key={type}
                                variant="outline"
                                size="sm"
                                onClick={() => toggleTypeFilter(type)}
                                className={`text-xs h-7 ${getTypeButtonColor(type, isActive)}`}
                              >
                                {getTypeIcon(type)}
                                <span className="ml-1">{NotificationService.getTypeLabel(type)}</span>
                                <Badge variant="secondary" className="ml-1 h-4 text-xs">{count}</Badge>
                              </Button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Filtros por Prioridade */}
                      <div className="space-y-2">
                        <label className="text-xs font-normal text-gray-600">Por Prioridade:</label>
                        <div className="flex flex-wrap gap-2">
                          {(['urgent', 'high', 'medium', 'low'] as NotificationPriority[]).filter(p => availablePriorities.includes(p)).map(priority => {
                            const isActive = filters.priorities.includes(priority)
                            const count = notifications.filter(n => n.priority === priority).length
                            const priorityLabels = { urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' }
                            const priorityColors = {
                              urgent: isActive ? 'border-red-300 bg-red-100 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-red-50',
                              high: isActive ? 'border-orange-300 bg-orange-100 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-orange-50',
                              medium: isActive ? 'border-yellow-300 bg-yellow-100 text-yellow-700' : 'border-gray-200 text-gray-600 hover:bg-yellow-50',
                              low: isActive ? 'border-blue-300 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-blue-50'
                            }
                            return (
                              <Button
                                key={priority}
                                variant="outline"
                                size="sm"
                                onClick={() => togglePriorityFilter(priority)}
                                className={`text-xs h-7 ${priorityColors[priority]}`}
                              >
                                {getPriorityIcon(priority)}
                                <span className="ml-1">{priorityLabels[priority]}</span>
                                <Badge variant="secondary" className="ml-1 h-4 text-xs">{count}</Badge>
                              </Button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Filtros por Status de Leitura */}
                      <div className="space-y-2">
                        <label className="text-xs font-normal text-gray-600">Por Status:</label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleReadFilter(!filters.showRead)}
                            className={`text-xs h-7 ${filters.showRead
                              ? 'border-green-300 bg-green-100 text-green-700'
                              : 'border-gray-200 text-gray-600 hover:bg-green-50'
                              }`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Lidas ({notifications.filter(n => n.read).length})
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUnreadFilter(!filters.showUnread)}
                            className={`text-xs h-7 ${filters.showUnread
                              ? 'border-blue-300 bg-blue-100 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:bg-blue-50'
                              }`}
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Não Lidas ({notifications.filter(n => !n.read).length})
                          </Button>
                        </div>
                      </div>

                      {/* Resumo dos Filtros */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Mostrando <span className="font-normal">{filteredNotifications.length}</span> de <span className="font-normal">{notifications.length}</span> notificações
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-sm ${!notification.read
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        : 'bg-white border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {getPriorityIcon(notification.priority)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-normal text-gray-900">
                                {notification.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getTypeColor(notification.type)}`}
                              >
                                {NotificationService.getTypeLabel(notification.type)}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(notification.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                              {notification.data?.hospital_nome && (
                                <span>{notification.data.hospital_nome}</span>
                              )}
                              {notification.data?.valor && (
                                <span>R$ {notification.data.valor.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredNotifications.length === 0 && notifications.length > 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma notificação corresponde aos filtros aplicados</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Tente ajustar os filtros ou limpar todos para ver mais notificações
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="mt-2"
                      >
                        Limpar filtros
                      </Button>
                    </div>
                  )}

                  {notifications.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      {isLoading ? (
                        <LoadingSpinner message="Carregando notificações..." />
                      ) : (
                        <>
                          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p></p>
                          <p className="text-sm text-gray-400 mt-1">
                            Suas notificações estão em dia
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Debug info - remover depois */}
                  <div className="text-xs text-red-500 mt-2 p-2 bg-red-100 rounded border">
                    DEBUG: notifications.length={notifications.length}, isLoading={isLoading.toString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {count.unread > 0 ? (
                <BellRing className="h-5 w-5 text-orange-500" />
              ) : (
                <Bell className="h-5 w-5 text-gray-500" />
              )}
              Central de Notificações
              {count.unread > 0 && (
                <Badge variant="destructive">{count.unread}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearOld}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar antigas
              </Button>
              {count.unread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNotifications}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3 relative">
              {/* Overlay de carregamento */}
              {isLoading && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded">
                  <LoadingSpinner message="Carregando notificações..." size="sm" />
                </div>
              )}
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${!notification.read
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getPriorityIcon(notification.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-normal text-gray-900">
                            {notification.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getTypeColor(notification.type)}`}
                          >
                            {NotificationService.getTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(notification.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {notification.data?.hospital_nome && (
                            <span>{notification.data.hospital_nome}</span>
                          )}
                          {notification.data?.valor && (
                            <span>R$ {notification.data.valor.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {isLoading ? (
                    <LoadingSpinner message="Carregando notificações..." />
                  ) : (
                    <>
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-green-600 font-bold">✅ ÓTIMO! Tudo lido</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Novas notificações aparecerão aqui
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Debug info - remover depois */}
              <div className="text-xs text-red-500 mt-2 p-2 bg-red-100 rounded border">
                DEBUG: notifications.length={notifications.length}, isLoading={isLoading.toString()}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  )
}
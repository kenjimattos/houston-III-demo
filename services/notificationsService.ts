import { getSupabaseClient } from "@/services/supabaseClient";
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationCount,
  NotificationFilters,
} from "@/types/notifications";
import {
  format,
  differenceInHours,
  differenceInDays,
  isAfter,
  isBefore,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUserProfile } from "./authService";

const STORAGE_KEY = "houston-notifications";

// Janela de relevância por tipo de notificação (em dias)
const NOTIFICATION_RELEVANCE_DAYS: Record<NotificationType, number> = {
  nova_candidatura: 7, // 7 dias - candidaturas recentes são importantes
  vaga_anunciada: 7, // 7 dias - trocas anunciadas precisam de tempo para candidatura
  vaga_proxima: 2, // 2 dias - apenas vagas muito próximas
  vaga_urgente: 1, // 1 dia - apenas urgências do dia
  vaga_fechada: 3, // 3 dias - vagas recém fechadas
  candidatura_reprovada: 7, // 7 dias - feedback recente é relevante
  vaga_cancelada: 3, // 3 dias - cancelamentos recentes
  vaga_sem_candidatos: 3, // 3 dias - vagas descobertas recentes
};

export class NotificationService {
  private static notifications: Notification[] = [];
  private static initialized = false;
  private static userCache = new Map<string, { id: string; name: string }>();
  private static medicoFavoritoCache = new Map<string, boolean>();

  // Calcula a data mínima relevante para um tipo de notificação
  private static getRelevantSinceDate(type: NotificationType): string {
    const now = new Date();
    const daysBack = NOTIFICATION_RELEVANCE_DAYS[type];
    const relevantSince = new Date(
      now.getTime() - daysBack * 24 * 60 * 60 * 1000
    );
    return format(relevantSince, "yyyy-MM-dd HH:mm:ss");
  }

  // Busca informações do usuário por ID com cache
  private static async getUserInfo(
    userId: string
  ): Promise<{ id: string; name: string } | null> {
    // Verificar cache primeiro
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    try {
      const userProfile = await getUserProfile(userId);

      if (userProfile) {
        const userInfo = {
          id: userProfile.id,
          name: userProfile.displayname || "Usuário",
        };
        this.userCache.set(userId, userInfo);
        return userInfo;
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar informações do usuário:", error);
      return null;
    }
  }

  // Verifica se um médico é favorito do grupo com cache
  private static async isMedicoFavorito(medicoId: string, grupoId: string): Promise<boolean> {
    const cacheKey = `${medicoId}-${grupoId}`

    // Verificar cache primeiro
    if (this.medicoFavoritoCache.has(cacheKey)) {
      return this.medicoFavoritoCache.get(cacheKey)!;
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("medicos_favoritos")
        .select("id")
        .eq("medico_id", medicoId)
        .single();

      const isFavorito = !!data;
      this.medicoFavoritoCache.set(cacheKey, isFavorito);
      return isFavorito;
    } catch (error) {
      // Cache como não favorito para evitar consultas repetidas
      this.medicoFavoritoCache.set(cacheKey, false);
      return false;
    }
  }

  static async initialize() {
    if (this.initialized) return

    await this.loadNotifications()
    this.initialized = true
  }

  // Função helper para obter nome do médico
  private static getMedicoNome(item: any): string {
    const primeiroNome = item.medico_primeiro_nome || ''
    const sobrenome = item.medico_sobrenome || ''
    const nomeCompleto = `${primeiroNome} ${sobrenome}`.trim()
    return nomeCompleto || 'Médico não identificado'
  }

  static async loadNotifications(): Promise<Notification[]> {
    try {
      const supabase = getSupabaseClient();
      const now = new Date();
      const hojeStr = format(now, "yyyy-MM-dd");
      const amanha = new Date(now);
      amanha.setDate(now.getDate() + 1);
      const amanhaStr = format(amanha, "yyyy-MM-dd");
      const doisDias = new Date(now);
      doisDias.setDate(now.getDate() + 2);
      const doisDiasStr = format(doisDias, "yyyy-MM-dd");

      const notifications: Notification[] = [];

      // Executar todas as queries principais em paralelo
      const [
        candidaturasPendentes,
        vagasAnunciadasRaw,
        vagasProximas,
        vagasUrgentes,
        vagasSemCandidatos,
        candidaturasReprovadas,
        vagasFechadasRaw,
        vagasCanceladas,
      ] = await Promise.all([
        // 1. Novas candidaturas (PENDENTES) - últimos 7 dias
        supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .eq('candidatura_status', 'PENDENTE')
          .gte('candidatura_createdate', this.getRelevantSinceDate('nova_candidatura'))
          .lte('candidatura_createdate', format(now, 'yyyy-MM-dd HH:mm:ss')),

        // 2. Vagas anunciadas - últimos 7 dias
        supabase
          .from('vagas')
          .select(`
            id,
            created_at,
            updated_by,
            data,
            valor,
            status
          `)
          .eq('status', 'anunciada')
          .gte('created_at', this.getRelevantSinceDate('vaga_anunciada'))
          .lte('created_at', format(now, 'yyyy-MM-dd HH:mm:ss')),

        // 3. Vagas próximas (próximos 2 dias)
        supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .eq('vaga_status', 'aberta')
          .gte('vaga_data', hojeStr)
          .lte('vaga_data', doisDiasStr),

        // 4. Vagas urgentes (menos de 24h)
        supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .eq('vaga_status', 'aberta')
          .gte('vaga_data', hojeStr)
          .lt('vaga_data', amanhaStr),

        // 5. Vagas sem candidatos
        supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .eq('vaga_status', 'aberta')
          .lt('vaga_createdate', format(new Date(now.getTime() - 48 * 60 * 60 * 1000), 'yyyy-MM-dd HH:mm:ss'))
          .gte('vaga_createdate', this.getRelevantSinceDate('vaga_sem_candidatos'))
          .is('candidatura_id', null),

        // 6. Candidaturas reprovadas
        supabase
          .from('candidaturas')
          .select(`
            id,
            status,
            updated_at,
            updated_by,
            vaga_id,
            medico_id
          `)
          .eq('status', 'REPROVADO')
          .gte('updated_at', this.getRelevantSinceDate('candidatura_reprovada'))
          .lte('updated_at', format(now, 'yyyy-MM-dd HH:mm:ss')),

        // 7. Vagas fechadas
        supabase
          .from('vagas')
          .select(`
            id,
            status,
            updated_at,
            updated_by
          `)
          .eq('status', 'fechada')
          .gte('updated_at', this.getRelevantSinceDate('vaga_fechada'))
          .lte('updated_at', format(now, 'yyyy-MM-dd HH:mm:ss')),

        // 8. Vagas canceladas
        supabase
          .from('vagas')
          .select(`
            id,
            status,
            updated_at,
            updated_by
          `)
          .eq('status', 'cancelada')
          .gte('updated_at', this.getRelevantSinceDate('vaga_cancelada'))
          .lte('updated_at', format(now, 'yyyy-MM-dd HH:mm:ss'))
      ])

      // Processar candidaturas pendentes
      if (candidaturasPendentes.data) {
        candidaturasPendentes.data.forEach((item) => {
          const medicoNome = this.getMedicoNome(item);
          notifications.push({
            id: `candidatura-${item.candidatura_id}`,
            type: 'nova_candidatura',
            title: 'Nova Candidatura',
            message: `${medicoNome} se candidatou para ${item.especialidade_nome} no ${item.hospital_nome}`,
            priority: 'high',
            timestamp: new Date(item.candidatura_createdate),
            read: false,
            data: {
              vaga_id: item.vaga_id,
              vaga_data: item.vaga_data,
              candidatura_id: item.candidatura_id,
              hospital_id: item.hospital_id,
              medico_id: item.medico_id,
              hospital_nome: item.hospital_nome,
              especialidade_nome: item.especialidade_nome,
              medico_nome: medicoNome,
              valor: item.vaga_valor
            }
          })
        })
      }

      // Para vagas anunciadas - buscar informações em batch
      if (vagasAnunciadasRaw.data && vagasAnunciadasRaw.data.length > 0) {
        const vagasIds = vagasAnunciadasRaw.data.map(v => v.id)
        const { data: vagasInfo } = await supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .in('vaga_id', vagasIds)

        const vagasInfoMap = new Map(vagasInfo?.map(v => [v.vaga_id, v]) || [])

        // Processar vagas anunciadas com informações em batch
        for (const vaga of vagasAnunciadasRaw.data) {
          const vagaInfo = vagasInfoMap.get(vaga.id)
          if (vagaInfo) {
            const anunciadoPor = await this.getUserInfo(vaga.updated_by)
            const anunciadoPorNome = anunciadoPor?.name || 'Usuário não identificado'

            notifications.push({
              id: `vaga-anunciada-${vaga.id}`,
              type: 'vaga_anunciada',
              title: 'Troca de Plantão Anunciada',
              message: `${anunciadoPorNome} anunciou troca: ${vagaInfo.especialidade_nome} no ${vagaInfo.hospital_nome}`,
              priority: 'high',
              timestamp: new Date(vaga.created_at),
              read: false,
              data: {
                vaga_id: vaga.id,
                hospital_id: vagaInfo.hospital_id,
                vaga_data: vaga.data,
                hospital_nome: vagaInfo.hospital_nome,
                especialidade_nome: vagaInfo.especialidade_nome,
                valor: vaga.valor,
                anunciado_por: vaga.updated_by,
                anunciado_por_nome: anunciadoPorNome
              }
            })
          }
        }
      }

      // Processar vagas próximas
      if (vagasProximas.data) {
        const uniqueVagas = Array.from(new Map(vagasProximas.data.map(v => [v.vaga_id, v])).values())
        uniqueVagas.forEach(item => {
          const dataVaga = new Date(item.vaga_data)
          const horasRestantes = differenceInHours(dataVaga, now)

          notifications.push({
            id: `vaga-proxima-${item.vaga_id}`,
            type: 'vaga_proxima',
            title: 'Vaga Próxima',
            message: `Vaga em ${horasRestantes}h: ${item.especialidade_nome} no ${item.hospital_nome}`,
            priority: horasRestantes <= 24 ? 'urgent' : 'high',
            timestamp: new Date(item.vaga_createdate),
            read: false,
            data: {
              vaga_id: item.vaga_id,
              hospital_id: item.hospital_id,
              vaga_data: item.vaga_data,
              hospital_nome: item.hospital_nome,
              especialidade_nome: item.especialidade_nome,
              valor: item.vaga_valor
            }
          })
        })
      }

      // Processar vagas urgentes
      if (vagasUrgentes.data) {
        const uniqueVagas = Array.from(new Map(vagasUrgentes.data.map(v => [v.vaga_id, v])).values())
        uniqueVagas.forEach(item => {
          const dataVaga = new Date(item.vaga_data)
          const horasRestantes = differenceInHours(dataVaga, now)

          notifications.push({
            id: `vaga-urgente-${item.vaga_id}`,
            type: 'vaga_urgente',
            title: 'Vaga Urgente',
            message: `URGENTE: Vaga em ${horasRestantes}h sem cobertura - ${item.especialidade_nome}`,
            priority: 'urgent',
            timestamp: new Date(item.vaga_createdate),
            read: false,
            data: {
              vaga_id: item.vaga_id,
              hospital_id: item.hospital_id,
              vaga_data: item.vaga_data,
              hospital_nome: item.hospital_nome,
              especialidade_nome: item.especialidade_nome,
              valor: item.vaga_valor
            }
          })
        })
      }

      // Processar vagas sem candidatos
      if (vagasSemCandidatos.data) {
        const uniqueVagas = Array.from(new Map(vagasSemCandidatos.data.map(v => [v.vaga_id, v])).values())
        uniqueVagas.forEach(item => {
          const diasAberta = differenceInDays(now, new Date(item.vaga_createdate))

          notifications.push({
            id: `vaga-sem-candidatos-${item.vaga_id}`,
            type: 'vaga_sem_candidatos',
            title: 'Vaga Sem Candidatos',
            message: `Vaga há ${diasAberta} dias sem candidatos: ${item.especialidade_nome} no ${item.hospital_nome}`,
            priority: 'medium',
            timestamp: new Date(item.vaga_createdate),
            read: false,
            data: {
              vaga_id: item.vaga_id,
              hospital_id: item.hospital_id,
              vaga_data: item.vaga_data,
              hospital_nome: item.hospital_nome,
              especialidade_nome: item.especialidade_nome,
              valor: item.vaga_valor
            }
          })
        })
      }

      // Para candidaturas reprovadas - buscar informações em batch
      if (candidaturasReprovadas.data && candidaturasReprovadas.data.length > 0) {
        const vagasIds = candidaturasReprovadas.data.map(c => c.vaga_id)
        const { data: vagasInfo } = await supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .in('vaga_id', vagasIds)

        const vagasInfoMap = new Map<string, any>()
        vagasInfo?.forEach(v => {
          const key = `${v.vaga_id}-${v.medico_id}`
          vagasInfoMap.set(key, v)
        })

        candidaturasReprovadas.data.forEach(candidatura => {
          const vagaInfo = vagasInfoMap.get(`${candidatura.vaga_id}-${candidatura.medico_id}`)
          if (vagaInfo) {
            const medicoNome = this.getMedicoNome(vagaInfo);
            notifications.push({
              id: `candidatura-reprovada-${candidatura.id}`,
              type: 'candidatura_reprovada',
              title: 'Candidatura Reprovada',
              message: `${medicoNome} teve candidatura reprovada para ${vagaInfo.especialidade_nome} no ${vagaInfo.hospital_nome}`,
              priority: 'medium',
              timestamp: new Date(candidatura.updated_at),
              read: false,
              data: {
                vaga_id: candidatura.vaga_id,
                candidatura_id: candidatura.id,
                hospital_id: vagaInfo.hospital_id,
                medico_id: candidatura.medico_id,
                vaga_data: vagaInfo.vaga_data,
                hospital_nome: vagaInfo.hospital_nome,
                especialidade_nome: vagaInfo.especialidade_nome,
                medico_nome: medicoNome,
                valor: vagaInfo.vaga_valor
              }
            })
          }
        });
      }

      // Para vagas fechadas - processar em batch
      if (vagasFechadasRaw.data && vagasFechadasRaw.data.length > 0) {
        const vagasIds = vagasFechadasRaw.data.map(v => v.id)

        // Buscar candidaturas aprovadas em batch
        const { data: candidaturasAprovadas } = await supabase
          .from('candidaturas')
          .select(`
            id,
            updated_by,
            medico_id,
            vaga_id,
            status,
            updated_at
          `)
          .in('vaga_id', vagasIds)
          .eq('status', 'APROVADO')

        if (candidaturasAprovadas && candidaturasAprovadas.length > 0) {
          // Buscar informações das vagas em batch
          const { data: vagasInfo } = await supabase
            .from('vw_vagas_candidaturas')
            .select('*')
            .in('vaga_id', vagasIds)

          const vagasInfoMap = new Map<string, any>()
          vagasInfo?.forEach(v => {
            const key = `${v.vaga_id}-${v.medico_id}`
            vagasInfoMap.set(key, v)
          })

          // Processar cada vaga fechada
          for (const candidatura of candidaturasAprovadas) {
            const vaga = vagasFechadasRaw.data.find(v => v.id === candidatura.vaga_id)
            if (!vaga) continue

            const vagaInfo = vagasInfoMap.get(`${candidatura.vaga_id}-${candidatura.medico_id}`)
            if (vagaInfo) {
              const [aprovadoPor, isFavorito] = await Promise.all([
                this.getUserInfo(candidatura.updated_by),
                this.isMedicoFavorito(candidatura.medico_id, vagaInfo.grupo_id || '')
              ])

              const aprovadoPorNome = aprovadoPor?.name || 'Sistema'
              const medicoNome = this.getMedicoNome(vagaInfo)

              let message: string
              if (isFavorito && aprovadoPorNome === 'Sistema') {
                message = `Vaga fechada automaticamente: ${medicoNome} (favorito) foi aprovado para ${vagaInfo.especialidade_nome}`
              } else {
                message = `Vaga fechada por ${aprovadoPorNome}: ${medicoNome} aprovado para ${vagaInfo.especialidade_nome}`;
              }

              notifications.push({
                id: `vaga-fechada-${vaga.id}`,
                type: 'vaga_fechada',
                title: 'Vaga Fechada',
                message: message,
                priority: 'medium',
                timestamp: new Date(vaga.updated_at),
                read: false,
                data: {
                  vaga_id: vaga.id,
                  candidatura_id: candidatura.id,
                  hospital_id: vagaInfo.hospital_id,
                  medico_id: candidatura.medico_id,
                  vaga_data: vagaInfo.vaga_data,
                  hospital_nome: vagaInfo.hospital_nome,
                  especialidade_nome: vagaInfo.especialidade_nome,
                  medico_nome: medicoNome,
                  valor: vagaInfo.vaga_valor,
                  aprovado_por: candidatura.updated_by,
                  aprovado_por_nome: aprovadoPorNome,
                  is_favorito_aprovacao: isFavorito,
                },
              });
            }
          }
        }
      }

      // Para vagas canceladas - buscar informações em batch
      if (vagasCanceladas.data && vagasCanceladas.data.length > 0) {
        const vagasIds = vagasCanceladas.data.map(v => v.id)
        const { data: vagasInfo } = await supabase
          .from('vw_vagas_candidaturas')
          .select('*')
          .in('vaga_id', vagasIds)

        const vagasInfoMap = new Map(vagasInfo?.map(v => [v.vaga_id, v]) || [])

        vagasCanceladas.data.forEach(vaga => {
          const vagaInfo = vagasInfoMap.get(vaga.id)
          if (vagaInfo) {
            notifications.push({
              id: `vaga-cancelada-${vaga.id}`,
              type: 'vaga_cancelada',
              title: 'Vaga Cancelada',
              message: `Vaga cancelada: ${vagaInfo.especialidade_nome} no ${vagaInfo.hospital_nome} - ${format(new Date(vagaInfo.vaga_data), 'dd/MM/yyyy')}`,
              priority: 'medium',
              timestamp: new Date(vaga.updated_at),
              read: false,
              data: {
                vaga_id: vaga.id,
                hospital_id: vagaInfo.hospital_id,
                vaga_data: vagaInfo.vaga_data,
                hospital_nome: vagaInfo.hospital_nome,
                especialidade_nome: vagaInfo.especialidade_nome,
                valor: vagaInfo.vaga_valor
              }
            })
          }
        });
      }

      // Merge com notificações salvas
      const saved = this.getSavedNotifications()
      const merged = this.mergeNotifications(notifications, saved)

      // Filtrar notificações válidas
      const validNotifications = merged.filter(n => {
        if (n.timestamp > now) return false

        const relevanceDays = NOTIFICATION_RELEVANCE_DAYS[n.type]
        const relevanceCutoff = new Date(now.getTime() - (relevanceDays * 24 * 60 * 60 * 1000))

        return n.timestamp >= relevanceCutoff
      })

      // Ordenar por prioridade e timestamp
      this.notifications = validNotifications.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]

        if (priorityDiff === 0) {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }

        return priorityDiff
      })

      this.saveNotifications()

      return this.notifications
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      return [];
    }
  }

  private static mergeNotifications(fresh: Notification[], saved: Notification[]): Notification[] {
    const merged = new Map<string, Notification>()

    // Adicionar notificações salvas
    saved.forEach(notification => {
      merged.set(notification.id, notification)
    })

    // Adicionar novas notificações ou atualizar existentes
    fresh.forEach((notification) => {
      const existing = merged.get(notification.id);
      if (existing) {
        // SEMPRE substituir se a versão salva tem undefined mas a nova não
        if (
          existing.message?.includes("undefined") &&
          !notification.message?.includes("undefined")
        ) {
          merged.set(notification.id, { ...notification, read: existing.read });
        }
        // SEMPRE substituir se a versão salva tem dados undefined no nome do médico
        else if (
          existing.data?.medico_nome?.includes("undefined") &&
          notification.data?.medico_nome &&
          !notification.data.medico_nome.includes("undefined")
        ) {
          merged.set(notification.id, { ...notification, read: existing.read });
        } else {
          // Manter status de lida se já existe
          merged.set(notification.id, { ...notification, read: existing.read });
        }
      } else {
        merged.set(notification.id, notification);
      }
    })

    return Array.from(merged.values())
  }

  private static getSavedNotifications(): Notification[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return []

      const parsed = JSON.parse(saved)
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
    } catch {
      return [];
    }
  }

  private static saveNotifications() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error("Erro ao salvar notificações:", error);
    }
  }

  static async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    await this.initialize()

    let filtered = [...this.notifications]

    if (filters?.types?.length) {
      filtered = filtered.filter((n) => filters.types!.includes(n.type));
    }

    if (filters?.priorities?.length) {
      filtered = filtered.filter((n) =>
        filters.priorities!.includes(n.priority)
      );
    }

    if (filters?.read !== undefined) {
      filtered = filtered.filter((n) => n.read === filters.read);
    }

    if (filters?.dateFrom) {
      filtered = filtered.filter((n) =>
        isAfter(n.timestamp, filters.dateFrom!)
      );
    }

    if (filters?.dateTo) {
      filtered = filtered.filter((n) => isBefore(n.timestamp, filters.dateTo!));
    }

    return filtered
  }

  static async getNotificationCount(): Promise<NotificationCount> {
    await this.initialize()

    const unread = this.notifications.filter(n => !n.read)

    return {
      total: this.notifications.length,
      unread: unread.length,
      byPriority: {
        urgent: unread.filter((n) => n.priority === "urgent").length,
        high: unread.filter((n) => n.priority === "high").length,
        medium: unread.filter((n) => n.priority === "medium").length,
        low: unread.filter((n) => n.priority === "low").length,
      },
    };
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await this.initialize()

    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  static async markAllAsRead(): Promise<void> {
    await this.initialize()

    this.notifications.forEach(n => n.read = true)
    this.saveNotifications()
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    await this.initialize()

    this.notifications = this.notifications.filter(n => n.id !== notificationId)
    this.saveNotifications()
  }

  static async clearOldNotifications(daysOld = 7): Promise<void> {
    await this.initialize()

    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
    this.notifications = this.notifications.filter(n =>
      isAfter(n.timestamp, cutoff) || !n.read
    )
    this.saveNotifications()
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notifications = [];
      this.initialized = false;
      this.userCache.clear();
      this.medicoFavoritoCache.clear();
    } catch (error) {
      console.error("Erro ao limpar cache de notificações:", error);
    }
  }

  // Função para limpar todos os caches relacionados ao usuário
  static clearAllUserCache(): void {
    if (typeof window === 'undefined') return

    try {
      // Cache de notificações
      this.clearCache()

      // Outros caches de interface do usuário
      const userCacheKeys = [
        'pinnedHospitals',
        'hospital-tabs-order',
        'dashboard-hospital-order',
        'grades-collapsed',
        'grades-order',
        'escala-view'
      ]

      userCacheKeys.forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.error("Erro ao limpar caches do usuário:", error);
    }
  }

  static getTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      nova_candidatura: "Nova Candidatura",
      vaga_anunciada: "Troca Anunciada",
      vaga_proxima: "Vaga Próxima",
      candidatura_reprovada: "Candidatura Reprovada",
      vaga_cancelada: "Vaga Cancelada",
      vaga_urgente: "Vaga Urgente",
      vaga_fechada: "Vaga Fechada",
      vaga_sem_candidatos: "Sem Candidatos",
    };
    return labels[type];
  }

  static getPriorityColor(priority: NotificationPriority): string {
    const colors: Record<NotificationPriority, string> = {
      urgent: "text-red-600 bg-red-50 border-red-200",
      high: "text-orange-600 bg-orange-50 border-orange-200",
      medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
      low: "text-blue-600 bg-blue-50 border-blue-200",
    };
    return colors[priority];
  }

  static getPriorityIcon(priority: NotificationPriority): string {
    const icons: Record<NotificationPriority, string> = {
      urgent: "🚨",
      high: "⚠️",
      medium: "📋",
      low: "ℹ️",
    };
    return icons[priority];
  }

  // Função utilitária para obter informações sobre a janela de relevância
  static getRelevanceInfo(): Record<
    NotificationType,
    { days: number; description: string }
  > {
    return {
      nova_candidatura: {
        days: 7,
        description: "Candidaturas recentes são importantes",
      },
      vaga_anunciada: {
        days: 7,
        description: "Trocas anunciadas precisam de tempo para candidatura",
      },
      vaga_proxima: { days: 2, description: "Apenas vagas muito próximas" },
      vaga_urgente: { days: 1, description: "Apenas urgências do dia" },
      vaga_fechada: { days: 3, description: "Vagas recém fechadas" },
      candidatura_reprovada: {
        days: 7,
        description: "Feedback recente é relevante",
      },
      vaga_cancelada: { days: 3, description: "Cancelamentos recentes" },
      vaga_sem_candidatos: {
        days: 3,
        description: "Vagas descobertas recentes",
      },
    };
  }
}

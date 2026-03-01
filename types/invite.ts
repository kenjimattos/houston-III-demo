// Tipos para convite de usuários
export interface InviteUserData {
  /** Nome completo do usuário */
  name: string;

  /** Email do usuário (obrigatório) */
  email: string;

  /** Número de telefone (opcional) */
  phone?: string;

  /** ID do grupo ao qual o usuário pertence */
  grupo_id: string;

  /** Role/função do usuário no sistema */
  role?: UserRole;

  platform: "houston";
}

/** Tipos de roles disponíveis no sistema */
export type UserRole =
  | "escalista" // Role padrão
  | "admin" // Administrador
  | "super_admin" // Super administrador
  | "medico" // Médico
  | "enfermeiro" // Enfermeiro
  | "tecnico" // Técnico
  | "coordenador"; // Coordenador

/** Dados completos do convite incluindo metadados do sistema */
export interface InviteUserPayload {
  /** Dados do usuário */
  userData: InviteUserData;

  /** URL de redirecionamento após aceitar o convite (opcional) */
  redirectTo?: string;
}

/** Resposta da API de convite */
export interface InviteUserResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    created_at: string;
  };
  invite_sent_at: string;
}

/** Dados de erro da API */
export interface InviteErrorResponse {
  error: string;
}

/** Metadados adicionais salvos com o usuário */
export interface UserMetadata extends InviteUserData {
  /** Data do convite */
  invited_at: string;

  /** Status do convite */
  invite_status: "pending" | "accepted" | "expired";

  /** ID de quem enviou o convite */
  invited_by?: string;
}

// Tipos centralizados para o sistema de roles de usuários

export type UserRoleType =
  | "administrador"
  | "moderador"
  | "gestor"
  | "coordenador"
  | "escalista";

export interface UserWithRoles {
  id: string;
  email: string;
  name?: string;
  currentRoles?: UserRoleType[];
}

export interface Group {
  id: string;
  name: string;
}

export interface Hospital {
  id: string;
  name: string;
  logradouro: string;
  numero: string;
  cidade: string;
  bairro: string;
  estado: string;
  pais: string;
  cep: string;
  latitude?: number | null;
  longitude?: number | null;
  enderecoFormatado?: string | null;
  avatar?: string;
}

export interface Setor {
  id: string;
  name: string;
}

export interface UserAssignment {
  role: UserRoleType;
  grupo_ids: string[];
  hospital_ids: string[];
  setor_ids: string[];
}

// Configuração das roles com labels e descrições
export const ROLE_CONFIG: Record<
  UserRoleType,
  { label: string; description: string; color: string }
> = {
  escalista: {
    label: "Escalista",
    description: "Usuário padrão com acesso básico",
    color: "bg-blue-100 text-blue-800",
  },
  administrador: {
    label: "Administrador",
    description: "Acesso administrativo completo",
    color: "bg-purple-100 text-purple-800",
  },
  moderador: {
    label: "Moderador",
    description: "Usuário com permissões de moderação",
    color: "bg-green-100 text-green-800",
  },
  gestor: {
    label: "Gestor",
    description: "Gestor com permissões avançadas",
    color: "bg-yellow-100 text-yellow-800",
  },
  coordenador: {
    label: "Coordenador",
    description: "Coordenador de equipe",
    color: "bg-indigo-100 text-indigo-800",
  },
};

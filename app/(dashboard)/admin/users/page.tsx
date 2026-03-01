"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserRoleManager } from "@/components/users/user-role-manager";
import { UserAssignmentManager } from "@/components/users/user-assignment-manager";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserCheck, Settings, Search, Users } from "lucide-react";
import { useGroupsDropdown } from "@/hooks/useGroups";
import { useHospitalsDropdown } from "@/hooks/useHospitals";

// Tipos centralizados
type UserRoleType =
  | "administrador"
  | "moderador"
  | "gestor"
  | "coordenador"
  | "escalista";

interface UserWithRoles {
  id: string;
  email: string;
  name?: string;
  currentRoles?: UserRoleType[];
}

interface Group {
  id: string;
  name: string;
}

interface Hospital {
  id: string;
  name: string;
}

const ROLE_CONFIG: Record<
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

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showAssignmentManager, setShowAssignmentManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Hooks para carregar dados
  const { groups } = useGroupsDropdown();
  const { hospitals } = useHospitalsDropdown();

  const mockUsers: UserWithRoles[] = [
    {
      id: "1",
      email: "joao@hospital.com",
      name: "João Silva",
      currentRoles: ["escalista", "coordenador"],
    },
    {
      id: "2",
      email: "maria@hospital.com",
      name: "Maria Santos",
      currentRoles: ["administrador"],
    },
    {
      id: "3",
      email: "pedro@hospital.com",
      name: "Pedro Costa",
      currentRoles: ["gestor"],
    },
  ];

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const handleOpenRoleManager = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowRoleManager(true);
  };

  const handleOpenAssignmentManager = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowAssignmentManager(true);
  };

  const handleRefreshUsers = () => {
    // Recarregar dados dos usuários
    setLoading(true);
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestão de Usuários
          </h1>
          <p className="text-gray-600">
            Gerencie roles e atribuições dos usuários do sistema
          </p>
        </div>
        <Button onClick={handleRefreshUsers} disabled={loading}>
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Grupos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Hospitais Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hospitals.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Lista de todos os usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando usuários...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "Sem nome"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.currentRoles?.map((role: UserRoleType) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        )) || (
                          <span className="text-gray-500 text-sm">
                            Nenhuma role
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoleManager(user)}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Roles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignmentManager(user)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Atribuições
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum usuário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals de Gerenciamento */}
      <UserRoleManager
        open={showRoleManager}
        onOpenChange={setShowRoleManager}
        user={selectedUser}
        onSuccess={handleRefreshUsers}
      />

      <UserAssignmentManager
        open={showAssignmentManager}
        onOpenChange={setShowAssignmentManager}
        user={selectedUser}
        onSuccess={handleRefreshUsers}
      />
    </div>
  );
}

"use client";

import { CreateHospitalModal } from "@/components/hospitais/create-hospital-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUserWithPermissions } from "@/services/authService";
import {
  deleteHospital,
  fetchHospitais,
  getHospitalAvatarUrl,
  Hospital,
  updateHospital,
} from "@/services/hospitaisService";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Permission } from "@/types/permission";

// Interface estendida para incluir URL do avatar
interface HospitalWithAvatar extends Hospital {
  avatarUrl?: string;
}

export default function HospitaisPage() {
  const [hospitais, setHospitais] = useState<HospitalWithAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      setIsCheckingAccess(true);

      try {
        // Primeiro, verificar role do usuário
        const { roles } = await getCurrentUserWithPermissions();
        const role = roles[0] || "escalista";
        setUserRole(role);
        setIsCheckingAccess(false);
        // Carregar hospitais apenas para usuários com permissão
        const hospitaisData =  Permission.HOSPITAIS_REMOVE ? await fetchHospitais() : [];

        // Carregar URLs dos avatares dinamicamente
        const hospitaisWithAvatars = hospitaisData.map((hospital) => {
          let avatarUrl = undefined;
          if (hospital.avatar) {
            try {
              avatarUrl = getHospitalAvatarUrl(hospital.avatar);
            } catch (e) {
              // Error loading hospital avatar, skipping...
            }
          }
          return { ...hospital, avatarUrl };
        });

        setHospitais(hospitaisWithAvatars);
      } catch (err: any) {
        setError("Erro ao carregar dados");
        setIsCheckingAccess(false);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function reloadHospitais() {
    setLoading(true);
    setError(null);
    try {
      const hospitaisData = await fetchHospitais();

      // Carregar URLs dos avatares dinamicamente
      const hospitaisWithAvatars = hospitaisData.map((hospital) => {
        let avatarUrl = undefined;
        if (hospital.avatar) {
          try {
            avatarUrl = getHospitalAvatarUrl(hospital.avatar);
          } catch (e) {
            // Error loading hospital avatar, skipping...
          }
        }
        return { ...hospital, avatarUrl };
      });

      setHospitais(hospitaisWithAvatars);
    } catch (err) {
      setError("Erro ao carregar hospitais");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este hospital?")) return;
    try {
      await deleteHospital(id);
      setHospitais(hospitais.filter((h) => h.id !== id));
    } catch {
      alert("Erro ao deletar hospital");
    }
  };

  function handleEditHospital(hospital: Hospital) {
    setEditingHospital(hospital);
    setIsEditModalOpen(true);
  }

  // Mostrar carregamento enquanto verifica acesso
  if (isCheckingAccess) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-normal tracking-tight">Hospitais</h1>
            </div>
            <p>Verificando permissões...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-normal tracking-tight">Hospitais</h1>
          </div>
          <div className="flex justify-between mb-10">
            <h3 className="text-lg font-normal">
              Hospitais cadastrados ({hospitais.length})
            </h3>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Novo Hospital
            </Button>

            {/* </RequirePermission> */}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>Carregando...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5}>{error}</TableCell>
                </TableRow>
              ) : hospitais.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>Nenhum hospital encontrado.</TableCell>
                </TableRow>
              ) : (
                hospitais.map((hospital, index) => (
                  <TableRow key={hospital.id || `hospital-${index}`}>
                    <TableCell>
                      {hospital.avatarUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          <Image
                            src={hospital.avatarUrl}
                            alt={hospital.nome}
                            width={40}
                            height={40}
                            unoptimized={true} // Desabilita otimização para forçar reload
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                          <span className="text-lg font-normal">
                            {hospital.nome?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{hospital.nome}</TableCell>
                    <TableCell>{hospital.bairro}</TableCell>
                    <TableCell>{hospital.cidade}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditHospital(hospital)}
                          >
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(hospital.id)}
                              className="text-red-600 hover:bg-red-50 focus:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CreateHospitalModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onHospitalCreated={reloadHospitais}
      />
      <CreateHospitalModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        editMode={true}
        editData={editingHospital ?? undefined}
        onUpdateHospital={async ({ hospital_id, hospitalUpdate }) => {
          await updateHospital(hospital_id, hospitalUpdate);
          setIsEditModalOpen(false);
          reloadHospitais();
        }}
      />
    </div>
  );
}

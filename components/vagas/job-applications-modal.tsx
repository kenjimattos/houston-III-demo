"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { DoctorNameLink } from "@/components/medicos/doctor-name-link";
import { formatCurrency } from "@/lib/utils";
import { fetchVagasCandidaturas } from "@/services/vagasCandidaturasService";
import {
  aprovarCandidatura,
  reprovarCandidatura,
  reconsiderarCandidatura,
} from "@/services/candidaturasService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  User,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
} from "lucide-react";

interface JobApplicationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vagaId: string;
  vagaInfo?: {
    hospital_nome: string
    especialidade_nome: string
    setor_nome: string
    vaga_data: string
    vaga_horainicio: string
    vaga_horafim: string
    vaga_valor: number
  }
  onApplicationsChange?: () => void
}

export function JobApplicationsModal({
  open,
  onOpenChange,
  vagaId,
  vagaInfo,
  onApplicationsChange,
}: JobApplicationsModalProps) {
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCandidaturas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVagasCandidaturas({ vaga_id: vagaId })
      // A função retorna dados agrupados por vaga com candidaturas em array aninhado
      // Ex: [{ vaga_id, candidaturas: [{candidatura_id, candidatura_status, ...}] }]
      const vaga = data?.[0];
      const candidaturasArray = vaga?.candidaturas || [];

      // Mapear para o formato esperado pelo componente
      const candidaturasMapeadas = candidaturasArray.map((c: any) => ({
        ...c,
        vaga_id: vagaId,
        medico_id: c.candidatura_medico_id || c.medico_id,
        medico_primeironome: c.medico_primeiro_nome,
        medico_sobrenome: c.medico_sobrenome,
        medico_crm: c.medico_crm,
        medico_telefone: c.medico_telefone || c.medico_celular,
        candidatos_createdate: c.candidatura_createdate,
      }));

      setCandidaturas(candidaturasMapeadas)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar candidaturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [vagaId]);

  // Carregar candidaturas da vaga específica
  useEffect(() => {
    if (open && vagaId) {
      loadCandidaturas();
    }
  }, [open, vagaId, loadCandidaturas]);

  // Ações de candidatura
  const handleAprovar = async (candidaturaId: string, vagaId: string) => {
    setActionLoading(candidaturaId);
    try {
      await aprovarCandidatura({ candidatura_id: candidaturaId, vaga_id: vagaId })
      await loadCandidaturas()
      onApplicationsChange?.()
      toast({
        title: "Candidatura aprovada",
        description: "A candidatura foi aprovada com sucesso",
      });
    } catch (error: any) {
      // Verificar se é erro de conflito de horário
      const errorMessage = error?.message || error?.details || error?.hint || error?.toString() || ""
      const isConflictError = errorMessage.toUpperCase().includes("CONFLITO_HORARIO") || errorMessage.toUpperCase().includes("CONFLITO DE HORÁRIO")

      if (isConflictError) {
        const conflictMatch = errorMessage.match(/Plantão já aprovado: ([^|]+)/)
        const conflictInfo = conflictMatch ? conflictMatch[1] : "horário conflitante"

        // Buscar o nome do médico da candidatura
        const candidatura = candidaturas.find(c => c.candidatura_id === candidaturaId)
        const nomeMedico = candidatura ? `${candidatura.medico_primeironome} ${candidatura.medico_sobrenome}` : "O médico"

        toast({
          title: "Conflito de Horário Detectado",
          description: `${nomeMedico} já possui ${conflictInfo}. Este plantão pode ter sido escalado por outro grupo ou hospital.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao aprovar candidatura",
          description:
            errorMessage ||
            "Ocorreu um erro ao aprovar a candidatura. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReprovar = async (candidaturaId: string) => {
    setActionLoading(candidaturaId);
    try {
      await reprovarCandidatura({ candidatura_id: candidaturaId });
      await loadCandidaturas();
      onApplicationsChange?.();
      toast({
        title: "Candidatura reprovada",
        description: "A candidatura foi reprovada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao reprovar candidatura",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconsiderar = async (candidaturaId: string) => {
    setActionLoading(candidaturaId);
    try {
      await reconsiderarCandidatura({ candidatura_id: candidaturaId });
      await loadCandidaturas();
      onApplicationsChange?.();
      toast({
        title: "Candidatura reconsiderada",
        description: "A candidatura voltou para pendente",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao reconsiderar candidatura",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Formatação de status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pendente
          </Badge>
        );
      case "APROVADO":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Aprovado
          </Badge>
        );
      case "REPROVADO":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Reprovado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Contar candidaturas por status
  const candidaturasPendentes = candidaturas.filter(
    (c) => c.candidatura_status === "PENDENTE"
  ).length;
  const candidaturasAprovadas = candidaturas.filter(
    (c) => c.candidatura_status === "APROVADO"
  ).length;
  const candidaturasReprovadas = candidaturas.filter(
    (c) => c.candidatura_status === "REPROVADO"
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Candidaturas da Vaga
          </DialogTitle>
        </DialogHeader>

        {/* Informações da vaga */}
        {vagaInfo && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Detalhes da Vaga</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Hospital:</span>
                  <span>{vagaInfo.hospital_nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Especialidade:</span>
                  <span>{vagaInfo.especialidade_nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Setor:</span>
                  <span>{vagaInfo.setor_nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Data:</span>
                  <span>{format(new Date(vagaInfo.vaga_data), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Horário:</span>
                  <span>{vagaInfo.vaga_horainicio.slice(0, 5)} - {vagaInfo.vaga_horafim.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Valor:</span>
                  <span>{formatCurrency(vagaInfo.vaga_valor)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de candidaturas */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : candidaturas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                Nenhuma candidatura encontrada para esta vaga.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Médico</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data da Candidatura</TableHead>
                    <TableHead className="w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidaturas
                    .filter((candidatura) => candidatura.candidatura_status) // Filtrar apenas candidaturas válidas
                    .map((candidatura, index) => (
                      <TableRow key={candidatura.candidatura_id || `candidatura-${index}`}>
                        <TableCell>
                          <DoctorNameLink
                            doctorId={candidatura.medico_id}
                            doctorName={`${candidatura.medico_primeironome || ''} ${candidatura.medico_sobrenome || ''}`.trim()}
                          />
                        </TableCell>
                        <TableCell>{candidatura.medico_crm || '-'}</TableCell>
                        <TableCell>{candidatura.medico_telefone || '-'}</TableCell>
                        <TableCell>{getStatusBadge(candidatura.candidatura_status)}</TableCell>
                        <TableCell>
                          {candidatura.candidatos_createdate
                            ? format(new Date(candidatura.candidatos_createdate), "dd/MM/yyyy", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {candidatura.candidatura_status === 'PENDENTE' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAprovar(
                                    candidatura.candidatura_id,
                                    candidatura.vaga_id
                                  )}
                                  disabled={actionLoading === candidatura.candidatura_id}
                                  className="text-green-700 border-green-200 hover:bg-green-50"
                                >
                                  {actionLoading === candidatura.candidatura_id ? "..." : "Aprovar"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReprovar(candidatura.candidatura_id)}
                                  disabled={actionLoading === candidatura.candidatura_id}
                                  className="text-red-700 border-red-200 hover:bg-red-50"
                                >
                                  {actionLoading === candidatura.candidatura_id ? "..." : "Reprovar"}
                                </Button>
                              </>
                            )}
                            {(candidatura.candidatura_status === 'APROVADO' || candidatura.candidatura_status === 'REPROVADO') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReconsiderar(candidatura.candidatura_id)}
                                disabled={actionLoading === candidatura.candidatura_id}
                                className="text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                {actionLoading === candidatura.candidatura_id ? "..." : "Reconsiderar"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}

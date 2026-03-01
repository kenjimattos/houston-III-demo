"use client";

import { DocumentViewerModal } from "@/components/medicos/document-viewer-modal";
import { FavoriteButton } from "@/components/medicos/favorite-button";
import { MedicoRowEquipesWithText } from "@/components/medicos/medico-row-equipes-with-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DOCUMENTOS_PRINCIPAIS } from "@/constants/principal-documents";
import { formatTelefoneBR, getValidProfilePictureUrl } from "@/lib/utils";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { fetchEquipes } from "@/services/equipesService";
import {
  type DocumentoMedico,
  type Medico,
  deleteMedicoDocumento,
  fetchMedicoDocumentos,
  fetchMedicoDocumentosOutros,
  fetchMedicoDocumentosOutrosSubpasta,
  isMedicoFavorito,
  uploadMedicoDocumento,
} from "@/services/medicosService";
import { useEffect, useState } from "react";

interface DoctorDetailsModalProps {
  doctor: Medico;
  open: boolean;
  onClose: () => void;
  // Callbacks opcionais para atualizar dados quando usado em outras páginas
  onFavoriteChange?: () => void;
  onEquipeChange?: () => void;
  showFavoriteButton?: boolean;
  showEquipesButton?: boolean;
}

function formatDataBR(data?: string) {
  if (!data) return "-";
  // Espera data no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
  const d = data.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4);
  }
  return data;
}

export function DoctorDetailsModal({
  doctor,
  open,
  onClose,
  onFavoriteChange,
  onEquipeChange,
  showFavoriteButton = true,
  showEquipesButton = true,
}: DoctorDetailsModalProps) {
  // Obter isAdmin do Context
  const { isAdmin } = useCurrentUser();

  const [documents, setDocuments] = useState<DocumentoMedico[]>([]);
  const [outrosDocuments, setOutrosDocuments] = useState<DocumentoMedico[]>([]);
  const [outrosNamesMap, setOutrosNamesMap] = useState<Record<string, string>>(
    {}
  ); // Mapeia nome normalizado -> nome original
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocs, setViewerDocs] = useState<DocumentoMedico[]>([]);
  const [currentUploadType, setCurrentUploadType] = useState<string>(""); // Para saber qual tipo está sendo feito upload
  const [isFavorite, setIsFavorite] = useState(false);
  const [equipes, setEquipes] = useState<any[]>([]);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (doctor?.id) {
        // Carregar status de favorito se necessário
        if (showFavoriteButton) {
          try {
            const favoritoStatus = await isMedicoFavorito(doctor.id);
            setIsFavorite(favoritoStatus);
          } catch (error) {
            console.error("Erro ao carregar status de favorito:", error);
          }
        }

        // Carregar equipes se necessário
        if (showEquipesButton) {
          try {
            const equipesData = await fetchEquipes();
            setEquipes(equipesData);
          } catch (error) {
            console.error("Erro ao carregar equipes:", error);
          }
        }

        // Carregar documentos principais (todos os tipos principais)
        Promise.all(
          DOCUMENTOS_PRINCIPAIS.map((doc) =>
            fetchMedicoDocumentos(doctor.id, doc.tipo)
          )
        ).then((results) => {
          const allDocs = results.flat();
          setDocuments(allDocs);
        });

        // Carregar documentos "outros"
        fetchMedicoDocumentosOutros(doctor.id).then(setOutrosDocuments);
      }
    }

    loadData();
  }, [doctor, showFavoriteButton, showEquipesButton]);

  const handleFileUpload = async (file: File, type: string) => {
    let nomeCustomizado: string | undefined = undefined;
    if (type === "outros") {
      nomeCustomizado = prompt("Digite o nome do documento:") || undefined;
      if (!nomeCustomizado) return;
    }
    try {
      setUploading(true);
      await uploadMedicoDocumento(doctor.id, type, file, nomeCustomizado);

      if (type === "outros") {
        // Recarregar documentos "outros"
        const outrosDocs = await fetchMedicoDocumentosOutros(doctor.id);
        setOutrosDocuments(outrosDocs);

        // Atualizar mapeamento de nomes se necessário
        if (nomeCustomizado) {
          const nomeNormalizado = nomeCustomizado
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_")
            .toLowerCase();
          setOutrosNamesMap((prev) => ({
            ...prev,
            [nomeNormalizado]: nomeCustomizado,
          }));
        }
      } else {
        // Recarregar documentos principais
        const results = await Promise.all(
          DOCUMENTOS_PRINCIPAIS.map((doc) =>
            fetchMedicoDocumentos(doctor.id, doc.tipo)
          )
        );
        setDocuments(results.flat());
      }
    } catch (error) {
      alert("Erro ao fazer upload do documento");
    } finally {
      setUploading(false);
      setCurrentUploadType("");
    }
  };

  const handleDocumentClick = (tipo: string) => {
    const found = documents.find((d) => d.tipo === tipo);
    if (!found) {
      // Se não tem documento, permitir upload
      setCurrentUploadType(tipo);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(file, tipo);
        }
      };
      input.click();
    }
  };

  const handleOutrosClick = () => {
    const nomeCustomizado = prompt("Digite o nome do documento:");
    if (!nomeCustomizado) return;

    setCurrentUploadType("outros");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, "outros");
      }
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {doctor.primeiro_nome} {doctor.sobrenome}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center mb-6">
          <Avatar className="w-32 h-32 mb-3">
            {getValidProfilePictureUrl(doctor.profile_picture_url) && (
              <AvatarImage
                src={getValidProfilePictureUrl(doctor.profile_picture_url)}
                alt={doctor.primeiro_nome}
                className="object-cover w-full h-full rounded-full"
              />
            )}
            <AvatarFallback className="text-3xl">
              {doctor.primeiro_nome?.[0] || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Botões de ação abaixo da imagem */}
          <div className="flex items-center gap-3 mb-2">
            {showFavoriteButton && (
              <FavoriteButton
                medicoId={doctor.id}
                isFavorite={isFavorite}
                onToggle={(newFavoriteState) => {
                  setIsFavorite(newFavoriteState);
                  onFavoriteChange?.();
                }}
                size="md"
                variant="button"
                isPrecadastro={doctor.is_precadastro}
              />
            )}
            {showEquipesButton && (
              <MedicoRowEquipesWithText
                medicoId={doctor.id}
                medicoNome={`${doctor.primeiro_nome} ${doctor.sobrenome}`}
                equipes={equipes}
                onEquipeChange={() => {
                  onEquipeChange?.();
                }}
              />
            )}
          </div>

          <div className="text-muted-foreground text-sm">ID: {doctor.id}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Nome Completo</Label>
            <Input
              value={`${doctor.primeiro_nome} ${doctor.sobrenome}`}
              readOnly
            />
          </div>
          <div>
            <Label>CRM</Label>
            <Input value={doctor.crm || "-"} readOnly />
          </div>
          <div>
            <Label>Especialidade</Label>
            <Input value={doctor.especialidade_nome || "-"} readOnly />
          </div>
          <div>
            <Label>RQE</Label>
            <Input value={doctor.rqe || "-"} readOnly />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={doctor.email || "-"} readOnly />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={formatTelefoneBR(doctor.telefone)} readOnly />
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input value={formatDataBR(doctor.data_nascimento)} readOnly />
          </div>
          <div>
            <Label>CPF</Label>
            <Input value={doctor.cpf || "-"} readOnly />
          </div>
          <div>
            <Label>RG</Label>
            <Input value={doctor.rg || "-"} readOnly />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={
                `${doctor.logradouro || ""} ${doctor.numero || ""} ${
                  doctor.bairro || ""
                }`.trim() || "-"
              }
              readOnly
            />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={doctor.cidade || "-"} readOnly />
          </div>
          <div>
            <Label>Estado</Label>
            <Input value={doctor.estado || "-"} readOnly />
          </div>
        </div>
        <Separator className="my-4" />
        <h3 className="font-normal mb-2">Documentos do Médico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {DOCUMENTOS_PRINCIPAIS.map((doc) => {
            const found = documents.find((d) => d.tipo === doc.tipo);
            const isUploading = uploading && currentUploadType === doc.tipo;

            return (
              <div
                key={doc.tipo}
                className={`border rounded p-3 ${
                  found
                    ? "bg-white"
                    : isUploading
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-gray-50 hover:bg-gray-100 cursor-pointer border-dashed"
                }`}
                onClick={() =>
                  !found && !isUploading && handleDocumentClick(doc.tipo)
                }
              >
                <div className="font-normal mb-1">{doc.label}</div>
                {isUploading ? (
                  <div className="flex items-center text-sm text-yellow-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
                    Enviando...
                  </div>
                ) : found ? (
                  <button
                    className="text-primary underline text-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const versoes = await fetchMedicoDocumentos(
                        doctor.id,
                        doc.tipo
                      );
                      setViewerDocs(versoes);
                      setViewerOpen(true);
                    }}
                  >
                    Visualizar
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">
                    Clique para enviar
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Seção de Outros Documentos */}
        <>
          <h4 className="font-normal mb-2 mt-4">Outros Documentos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {outrosDocuments.length > 0 &&
              (() => {
                // Agrupar documentos por tipo (subpasta)
                const agrupados = outrosDocuments.reduce((acc, doc) => {
                  if (!acc[doc.tipo]) acc[doc.tipo] = [];
                  acc[doc.tipo].push(doc);
                  return acc;
                }, {} as Record<string, DocumentoMedico[]>);

                return Object.entries(agrupados).map(([tipo, docs]) => {
                  const nomeExibicao =
                    outrosNamesMap[tipo] || tipo.replace(/_/g, " ");
                  const docMaisRecente = docs[0]; // Já está ordenado por data

                  return (
                    <div key={tipo} className="border rounded p-3 bg-blue-50">
                      <div className="font-normal mb-1 capitalize">
                        {nomeExibicao}
                      </div>
                      <button
                        className="text-primary underline text-sm"
                        onClick={async () => {
                          const versoes =
                            await fetchMedicoDocumentosOutrosSubpasta(
                              doctor.id,
                              tipo
                            );
                          setViewerDocs(versoes);
                          setViewerOpen(true);
                        }}
                      >
                        Visualizar{" "}
                        {docs.length > 1 ? `(${docs.length} versões)` : ""}
                      </button>
                    </div>
                  );
                });
              })()}

            {/* Botão para adicionar novo documento "outros" */}
            <div
              className={`border rounded p-3 ${
                uploading && currentUploadType === "outros"
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-gray-50 hover:bg-gray-100 cursor-pointer border-dashed"
              }`}
              onClick={() => !uploading && handleOutrosClick()}
            >
              <div className="font-normal mb-1">+ Novo Documento</div>
              {uploading && currentUploadType === "outros" ? (
                <div className="flex items-center text-sm text-yellow-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
                  Enviando...
                </div>
              ) : (
                <span className="text-xs text-gray-400">
                  Clique para adicionar
                </span>
              )}
            </div>
          </div>
        </>
        <DocumentViewerModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          documentos={viewerDocs}
          uploading={uploading}
          canDelete={isAdmin} // Apenas administradores podem deletar
          onUpload={async (file: File) => {
            if (viewerDocs.length === 0) return;

            const doc = viewerDocs[0];

            // Se é documento "outros", precisa usar o nome da subpasta existente
            if (doc.path.includes("/outros/")) {
              // Extrair o nome original da subpasta do mapeamento ou do tipo
              const nomeOriginal =
                outrosNamesMap[doc.tipo] || doc.tipo.replace(/_/g, " ");

              try {
                setUploading(true);
                setCurrentUploadType("outros");
                await uploadMedicoDocumento(
                  doctor.id,
                  "outros",
                  file,
                  nomeOriginal
                );

                // Recarregar documentos "outros"
                const outrosDocs = await fetchMedicoDocumentosOutros(doctor.id);
                setOutrosDocuments(outrosDocs);

                // Recarregar versões da subpasta específica
                const versoes = await fetchMedicoDocumentosOutrosSubpasta(
                  doctor.id,
                  doc.tipo
                );
                setViewerDocs(versoes);
              } catch (error) {
                alert("Erro ao fazer upload do documento");
              } finally {
                setUploading(false);
                setCurrentUploadType("");
              }
            } else {
              // É documento principal - usar handleFileUpload normal
              await handleFileUpload(file, doc.tipo);
            }
          }}
          onDelete={
            isAdmin
              ? async (doc) => {
                  await deleteMedicoDocumento(doc.path);

                  // Verificar se é documento "outros" (se path contém "/outros/")
                  if (doc.path.includes("/outros/")) {
                    // Recarregar documentos "outros"
                    const outrosDocs = await fetchMedicoDocumentosOutros(
                      doctor.id
                    );
                    setOutrosDocuments(outrosDocs);

                    // Recarregar versões da subpasta específica
                    const versoes = await fetchMedicoDocumentosOutrosSubpasta(
                      doctor.id,
                      doc.tipo
                    );
                    setViewerDocs(versoes);

                    if (versoes.length === 0) {
                      setViewerOpen(false);
                    }
                  } else {
                    // Recarregar documentos principais
                    const results = await Promise.all(
                      DOCUMENTOS_PRINCIPAIS.map((docType) =>
                        fetchMedicoDocumentos(doctor.id, docType.tipo)
                      )
                    );
                    setDocuments(results.flat());

                    const tipo = doc.tipo;
                    const versoes = await fetchMedicoDocumentos(
                      doctor.id,
                      tipo
                    );
                    setViewerDocs(versoes);

                    if (versoes.length === 0) {
                      setViewerOpen(false);
                    }
                  }
                }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}

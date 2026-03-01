"use client";

import { UnifiedPlaceSearch } from "@/components/hospitais/unified-place-search";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Hospital,
  createHospital,
  uploadHospitalAvatar
} from "@/services/hospitaisService";
import { BadgeAlertIcon, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { v4 as uuidv4 } from "uuid";

interface CreateHospitalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHospitalCreated?: () => void;
  editMode?: boolean;
  editData?: Hospital;
  onUpdateHospital?: (args: {
    hospital_id: string;
    hospitalUpdate: any;
  }) => Promise<void>;
}

export function CreateHospitalModal({
  open,
  onOpenChange,
  onHospitalCreated,
  editMode = false,
  editData,
  onUpdateHospital,
}: CreateHospitalModalProps) {
  const [searchValue, setSearchValue] = useState("");
  const [nome, setNome] = useState("");
  const [tempAddressData, setTempAddressData] = useState<{
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    cep: string;
  } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<
    string | undefined
  >(undefined);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (open && editMode && editData) {
      setNome(editData.nome || "");
      setSearchValue(editData.nome || "");

      // Reconstruct tempAddressData from individual fields
      setTempAddressData({
        logradouro: editData.logradouro || "",
        numero: editData.numero || "",
        complemento: "", // complemento is not stored in database
        bairro: editData.bairro || "",
        cidade: editData.cidade || "",
        estado: editData.estado || "",
        pais: editData.pais || "",
        cep: editData.cep || "",
      });

      setExistingAvatarUrl(editData.avatar || undefined);
      setLatitude(editData.latitude);
      setLongitude(editData.longitude);
    }
    if (open && !editMode) {
      handleClearFields();
    }
  }, [open, editMode, editData]);

  // Função para abreviar logradouro
  function abreviarLogradouro(valor: string) {
    if (!valor) return "";
    return valor
      .replace(/^rua/i, "R.")
      .replace(/^avenida/i, "Av.")
      .replace(/^estrada/i, "Estr.")
      .replace(/^travessa/i, "Tv.")
      .replace(/^alameda/i, "Al.")
      .replace(/^praça/i, "Pç.")
      .replace(/^rodovia/i, "Rod.")
      .replace(/^largo/i, "Lgo.");
  }

  // Função para formatar endereço padrão Google Maps
  function formatarEnderecoGoogle(addressData: typeof tempAddressData) {
    if (!addressData) return "";

    return `${abreviarLogradouro(addressData.logradouro)}, ${addressData.numero}${
      addressData.complemento ? " " + addressData.complemento : ""
    }, ${addressData.bairro}, ${addressData.cidade} - ${addressData.estado}, ${addressData.cep}, ${addressData.pais}`;
  }

  // Função para processar o crop e redimensionar para 120x120
  async function getCroppedImage(): Promise<Blob | null> {
    if (!avatarFile || !croppedAreaPixels || !avatarPreview) return null;

    return new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          120,
          120
        );
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.95
        );
      };
      image.src = avatarPreview;
    });
  }

  // Função utilitária para extrair campos do address_components do Google Maps
  function extrairCamposEndereco(address_components: any[]) {
    let logradouro = "";
    let numero = "";
    let bairro = "";
    let cidade = "";
    let estado = "";
    let pais = "";
    let cep = "";
    let complemento = "";

    if (!address_components || !Array.isArray(address_components)) {
      return {
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        pais,
        cep,
        complemento,
      };
    }

    address_components.forEach((comp: any) => {
      // Nova API pode usar longText ou long_name
      const longName = comp.longText || comp.long_name || "";
      const shortName = comp.shortText || comp.short_name || "";

      if (comp.types.includes("route")) logradouro = longName;
      if (comp.types.includes("street_number")) numero = longName;
      if (
        comp.types.includes("sublocality") ||
        comp.types.includes("sublocality_level_1") ||
        comp.types.includes("political")
      ) {
        if (!bairro) bairro = longName;
      }
      if (comp.types.includes("administrative_area_level_2")) cidade = longName;
      if (comp.types.includes("administrative_area_level_1"))
        estado = shortName;
      if (comp.types.includes("country")) {
        pais = longName === "Brazil" ? "Brasil" : longName;
      }
      if (comp.types.includes("postal_code")) cep = longName;
      if (comp.types.includes("subpremise")) complemento = longName;
    });
    return {
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
      pais,
      cep,
      complemento,
    };
  }

  // Handler para seleção do local (nome, endereço ou CEP)
  function handlePlaceSelected(place: any) {
    // Lidar com dados da nova API Place
    if (place.displayName) {
      setNome(place.displayName || "");
    } else {
      setNome(place.name || "");
    }

    // Nova API usa addressComponents (camelCase) em vez de address_components
    const addressComponents =
      place.addressComponents || place.address_components;
    if (addressComponents) {
      const campos = extrairCamposEndereco(addressComponents);
      setTempAddressData({
        logradouro: campos.logradouro,
        numero: campos.numero,
        bairro: campos.bairro,
        cidade: campos.cidade,
        estado: campos.estado,
        pais: campos.pais,
        cep: campos.cep,
        complemento: campos.complemento,
      });
    }

    // Extrair latitude e longitude - nova API usa location diretamente
    if (place.location) {
      // Nova API
      const lat =
        typeof place.location.lat === "function"
          ? place.location.lat()
          : place.location.lat;
      const lng =
        typeof place.location.lng === "function"
          ? place.location.lng()
          : place.location.lng;
      setLatitude(lat);
      setLongitude(lng);
    } else if (place.geometry && place.geometry.location) {
      // API antiga
      const lat =
        typeof place.geometry.location.lat === "function"
          ? place.geometry.location.lat()
          : place.geometry.location.lat;
      const lng =
        typeof place.geometry.location.lng === "function"
          ? place.geometry.location.lng()
          : place.geometry.location.lng;
      setLatitude(lat);
      setLongitude(lng);
    } else {
      setLatitude(undefined);
      setLongitude(undefined);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validar se tem foto (novo arquivo ou existente em modo edição)
    if (!avatarFile && !existingAvatarUrl) {
      toast({
        title: "Foto do hospital obrigatória",
        description: "Por favor, selecione uma foto para o hospital.",
        variant: "destructive",
        icon: BadgeAlertIcon,
      });
      return;
    }

    // Validar coordenadas (agora obrigatórias)
    if (!latitude || !longitude) {
      toast({
        title: "Localização obrigatória",
        description: "Por favor, selecione um local através da busca. Digite o nome do hospital, endereço completo ou CEP.",
        variant: "destructive",
        icon: BadgeAlertIcon,
      });
      return;
    }

    // Validar dados de endereço
    if (!tempAddressData) {
      toast({
        title: "Endereço incompleto",
        description: "Por favor, selecione um resultado da busca de endereço.",
        variant: "destructive",
        icon: BadgeAlertIcon,
      });
      return;
    }

    // Validar nome
    if (!nome || nome.trim() === "") {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome do hospital.",
        variant: "destructive",
        icon: BadgeAlertIcon,
      });
      return;
    }

    setLoading(true);
    try {
      let hospital_id = editMode && editData ? editData.id : uuidv4();
      const endereco_formatado = formatarEnderecoGoogle(tempAddressData);

      let avatarUrlFinal: string | undefined = existingAvatarUrl;

      // Só faz upload se há um novo arquivo selecionado
      if (avatarFile && croppedAreaPixels) {
        const croppedBlob = await getCroppedImage();
        if (croppedBlob) {
          avatarUrlFinal = await uploadHospitalAvatar(croppedBlob, hospital_id);
        }
      }

      const hospitalPayload = {
        nome: nome,
        logradouro: abreviarLogradouro(tempAddressData.logradouro),
        numero: tempAddressData.numero,
        bairro: tempAddressData.bairro,
        cidade: tempAddressData.cidade,
        estado: tempAddressData.estado,
        pais: tempAddressData.pais,
        cep: tempAddressData.cep,
        avatar: avatarUrlFinal,
        endereco_formatado,
        latitude: latitude,
        longitude: longitude,
      };

      if (editMode && editData && onUpdateHospital) {
        await onUpdateHospital({
          hospital_id,
          hospitalUpdate: hospitalPayload,
        });
      } else {
        await createHospital({ ...hospitalPayload });
        if (onHospitalCreated) onHospitalCreated();
      }
      onOpenChange(false);
    } catch (e) {
      console.error(
        editMode ? "Erro ao atualizar hospital" : "Erro ao criar hospital",
        e
      );
      toast({
        title: editMode
          ? "Erro ao atualizar hospital"
          : "Erro ao criar hospital",
        description:
          "Ocorreu um erro ao salvar o hospital. Por favor, tente novamente.",
        variant: "destructive",
        icon: BadgeAlertIcon,
      });
    } finally {
      setLoading(false);
    }
  }

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Criar preview usando FileReader para evitar problemas de CSP
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Limpar URL do avatar existente quando novo arquivo é selecionado
      setExistingAvatarUrl(undefined);
    }
  }

  // Função para limpar todos os campos do formulário
  function handleClearFields() {
    setSearchValue("");
    setNome("");
    setTempAddressData(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setExistingAvatarUrl(undefined);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setLatitude(undefined);
    setLongitude(undefined);
    // Limpar o input file
    const fileInput = document.getElementById(
      "avatar-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setExistingAvatarUrl(undefined);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    // Limpar o input file
    const fileInput = document.getElementById(
      "avatar-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }

  function handleSearchAgain() {
    setSearchValue("");
    setTempAddressData(null);
    setLatitude(undefined);
    setLongitude(undefined);
  }

  // Determinar qual imagem mostrar no preview
  const imageToShow = avatarPreview || existingAvatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-normal">
            {editMode ? "Editar Hospital" : "Novo Hospital"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo de busca unificado */}
          <div className="space-y-2">
            <Label>Busca</Label>
            <UnifiedPlaceSearch
              value={searchValue}
              onChange={setSearchValue}
              onPlaceSelected={handlePlaceSelected}
              placeholder="Digite o nome do hospital, endereço completo ou CEP..."
            />
            <p className="text-xs text-gray-500">
              Ex: &#34;Hospital Sírio-Libanês&#34;, &#34;Rua Augusta 1234, São Paulo&#34; ou &#34;01310-100&#34;
            </p>
          </div>

          {/* Preview do Endereço (read-only) */}
          {tempAddressData && (
            <div className="space-y-2">
              <Label>Endereço Selecionado</Label>
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-sm text-gray-700">
                  {formatarEnderecoGoogle(tempAddressData)}
                </p>
                <button
                  type="button"
                  onClick={handleSearchAgain}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  Buscar outro endereço
                </button>
              </div>
            </div>
          )}

          {/* Nome do Hospital (editável) */}
          <div className="space-y-2">
            <Label>Nome do Hospital *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do hospital"
              required
            />
            <p className="text-xs text-gray-500">
              Você pode editar o nome após selecionar um resultado da busca
            </p>
          </div>

          {/* Upload de Foto */}
          <div className="space-y-2">
            <Label>Foto do Hospital (120x120px) *</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                className="hidden"
                id="avatar-upload"
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById("avatar-upload")?.click()
                }
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white shadow-sm transition-all"
              >
                {avatarFile ? "Alterar foto" : "Escolher foto"}
              </button>
              {!avatarFile && !existingAvatarUrl && (
                <span className="text-xs text-red-500">Obrigatório</span>
              )}
            </div>

            {imageToShow && (
              <div className="space-y-2">
                <div className="relative w-40 h-40 border border-gray-200 rounded-lg overflow-hidden">
                  <Cropper
                    image={imageToShow}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="rect"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, croppedPixels) =>
                      setCroppedAreaPixels(croppedPixels)
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Zoom:</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white shadow-sm transition-all"
                  >
                    Remover foto
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClearFields}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white shadow-sm transition-all"
              title="Limpar campos"
            >
              Limpar campos
            </button>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                loading ||
                !latitude ||
                !longitude ||
                !tempAddressData ||
                (!avatarFile && !existingAvatarUrl)
              }
              className="w-full mx-auto mt-4 mb-2"
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

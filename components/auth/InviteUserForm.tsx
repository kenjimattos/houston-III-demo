import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInviteUser } from "@/hooks/useInviteUser";
import { useToast } from "@/hooks/use-toast";
import { InviteUserData, UserRole } from "@/types/invite";

interface InviteUserFormProps {
  onSuccess?: () => void;
}

export function InviteUserForm({ onSuccess }: InviteUserFormProps) {
  const [formData, setFormData] = useState<InviteUserData>({
    name: "",
    email: "",
    phone: "",
    grupo_id: "",
    role: "escalista", // Valor padrão
    platform: "houston",
  });

  const { invite, loading, error } = useInviteUser();
  const { toast } = useToast();

  const roles: { value: UserRole; label: string }[] = [
    { value: "escalista", label: "Escalista" },
    { value: "medico", label: "Médico" },
    { value: "enfermeiro", label: "Enfermeiro" },
    { value: "tecnico", label: "Técnico" },
    { value: "coordenador", label: "Coordenador" },
    { value: "admin", label: "Administrador" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!formData.name || !formData.email || !formData.grupo_id) {
      toast({
        title: "Erro",
        description: "Nome, email e grupo são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    const userData: InviteUserData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      grupo_id: formData.grupo_id,
      role: formData.role,
      platform: "houston",
    };
    const result = await invite(userData);

    if (result.success) {
      toast({
        title: "Convite enviado!",
        description: `Um convite foi enviado para ${formData.email}`,
      });

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        phone: "",
        grupo_id: "",
        role: "escalista",
        platform: "houston",
      });

      onSuccess?.();
    } else {
      toast({
        title: "Erro ao enviar convite",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const updateFormData = (field: keyof InviteUserData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData("name", e.target.value)}
          placeholder="Ex: João Silva"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData("email", e.target.value)}
          placeholder="usuario@exemplo.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => updateFormData("phone", e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="group_id">ID do Grupo *</Label>
        <Input
          id="grupo_id"
          type="text"
          value={formData.grupo_id}
          onChange={(e) => updateFormData("grupo_id", e.target.value)}
          placeholder="UUID do grupo"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Função</Label>
        <Select
          value={formData.role}
          onValueChange={(value: UserRole) => updateFormData("role", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Enviar Convite"}
      </Button>
    </form>
  );
}

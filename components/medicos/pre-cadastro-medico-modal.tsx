"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_BRASILEIROS } from "@/constants/estados";
import { formatCPF } from "@/lib/formatters/cpfFormatter";
import { formatCRM } from "@/lib/formatters/crmFormatter";
import { formatTelefone } from "@/lib/formatters/telefoneFormatter";
import { getCurrentUser } from "@/services/authService";
import { searchMedicosByCpfOrCrm } from "@/services/medicosService";
import { getSupabaseClient } from "@/services/supabaseClient";
import { isValidCPF } from "@/validators/cpfValidator";
import { isValidCRM } from "@/validators/crmValidator";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

// Schema de validação com Zod
const preCadastroSchema = z.object({
  primeiroNome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  sobrenome: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  crm: z
    .string()
    .min(1, "CRM é obrigatório")
    .refine((value) => {
      return isValidCRM(value);
    }, "CRM deve ter entre 5 e 6 dígitos e conter apenas números"),
  estado: z.string().min(1, "Estado é obrigatório"),
  cpf: z
    .string()
    .optional()
    .refine((value) => {
      if (!value || value.length === 0) return true;
      const cpfClean = value.replace(/\D/g, "");
      return isValidCPF(cpfClean);
    }, "CPF inválido"),
  email: z
    .string()
    .optional()
    .refine((value) => {
      if (!value || value.length === 0) return true;
      return z.string().email().safeParse(value).success;
    }, "Email inválido"),
  telefone: z
    .string()
    .optional()
    .refine((value) => {
      if (!value || value.length === 0) return true;
      const phoneClean = value.replace(/\D/g, "");
      return phoneClean.length >= 10;
    }, "Telefone deve ter pelo menos 10 dígitos"),
  especialidadeId: z.string().min(1, "Especialidade é obrigatória"),
});

type PreCadastroFormData = z.infer<typeof preCadastroSchema>;

// Componente para exibir erro do campo
const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-sm text-red-500 mt-1">{error}</p>;
};

interface Especialidade {
  id: string;
  nome: string;
}

interface PreCadastroMedicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMedicoPreCadastrado?: (medicoId: string) => void;
  searchTerm?: string; // Termo que foi buscado para pré-popular os campos
}

export function PreCadastroMedicoModal({
  open,
  onOpenChange,
  onMedicoPreCadastrado,
  searchTerm = "",
}: PreCadastroMedicoModalProps) {
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [crm, setCrm] = useState("");
  const [estado, setEstado] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidadeId, setEspecialidadeId] = useState("");
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de validação com Zod
  const [errors, setErrors] = useState<
    Partial<Record<keyof PreCadastroFormData, string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof PreCadastroFormData, boolean>>
  >({});

  // Funções de validação usando Zod
  const validateField = (
    fieldName: keyof PreCadastroFormData,
    value: string
  ) => {
    const formData = {
      primeiroNome: fieldName === "primeiroNome" ? value : primeiroNome,
      sobrenome: fieldName === "sobrenome" ? value : sobrenome,
      crm: fieldName === "crm" ? value : crm,
      estado: fieldName === "estado" ? value : estado,
      cpf: fieldName === "cpf" ? value : cpf,
      email: fieldName === "email" ? value : email,
      telefone: fieldName === "telefone" ? value : telefone,
      especialidadeId:
        fieldName === "especialidadeId" ? value : especialidadeId,
    };

    const result = preCadastroSchema.safeParse(formData);
    if (result.success) return "";

    const fieldError = result.error.errors.find(
      (error) => error.path[0] === fieldName
    );
    return fieldError?.message || "";
  };

  const handleFieldChange = (
    fieldName: keyof PreCadastroFormData,
    value: string
  ) => {
    // Atualizar valor
    switch (fieldName) {
      case "primeiroNome":
        setPrimeiroNome(value);
        break;
      case "sobrenome":
        setSobrenome(value);
        break;
      case "crm":
        setCrm(formatCRM(value));
        break;
      case "estado":
        setEstado(value);
        break;
      case "cpf":
        setCpf(formatCPF(value));
        break;
      case "email":
        setEmail(value);
        break;
      case "telefone":
        setTelefone(formatTelefone(value));
        break;
      case "especialidadeId":
        setEspecialidadeId(value);
        break;
    }

    // Marcar campo como tocado e validar
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const fieldError = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: fieldError }));
  };

  // Verificar se o formulário está válido
  const isFormValid = () => {
    const formData: PreCadastroFormData = {
      primeiroNome,
      sobrenome,
      crm,
      estado,
      cpf,
      email,
      telefone,
      especialidadeId,
    };

    const result = preCadastroSchema.safeParse(formData);
    return result.success;
  };

  const validateCpfField = (value: string) => {
    const valueIsValid = isValidCPF(value);
    if (valueIsValid) {
      setError(null);
    } else {
      setError("CPF inválido!");
    }
  };

  // Função para limpar o formulário
  const clearForm = () => {
    setPrimeiroNome("");
    setSobrenome("");
    setCrm("");
    setEstado("");
    setCpf("");
    setEmail("");
    setTelefone("");
    setEspecialidadeId("");
    setErrors({});
    setTouched({});
    setError(null);
  };

  // Pré-popular campos baseado no termo de busca
  useEffect(() => {
    if (open && searchTerm) {
      // Se o termo parece ser um CRM (números), colocar no campo CRM
      if (/^\d+$/.test(searchTerm.trim())) {
        setCrm(searchTerm.trim());
      } else {
        // Assumir que é um nome e tentar separar
        const parts = searchTerm.trim().split(" ");
        if (parts.length >= 2) {
          setPrimeiroNome(parts[0]);
          setSobrenome(parts.slice(1).join(" "));
        } else if (parts.length === 1) {
          setPrimeiroNome(parts[0]);
        }
      }
    }
  }, [open, searchTerm]);

  // Carregar especialidades
  useEffect(() => {
    if (open) {
      fetchEspecialidades();
    }
  }, [open]);

  // Limpar formulário quando fechar
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const fetchEspecialidades = async () => {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("especialidades")
        .select("id, nome")
        .order("nome");

      if (error) throw error;
      setEspecialidades(data || []);
    } catch (error) {
      console.error("Erro ao carregar especialidades:", error);
    }
  };

  const resetForm = () => {
    clearForm();
  };

  const validateForm = () => {
    if (!primeiroNome.trim()) return "Primeiro nome é obrigatório";
    if (!sobrenome.trim()) return "Sobrenome é obrigatório";
    if (!crm.trim()) return "CRM é obrigatório";
    if (!estado.trim()) return "Estado do CRM é obrigatório";

    return null;
  };

  const handleSubmit = async () => {
    // Validar formulário completo com Zod
    const formData: PreCadastroFormData = {
      primeiroNome,
      sobrenome,
      crm,
      estado,
      cpf,
      email,
      telefone,
      especialidadeId,
    };

    const validationResult = preCadastroSchema.safeParse(formData);
    if (!validationResult.success) {
      // Marcar todos os campos como tocados para mostrar os erros
      const allFields: (keyof PreCadastroFormData)[] = [
        "primeiroNome",
        "sobrenome",
        "crm",
        "estado",
        "cpf",
        "email",
        "telefone",
        "especialidadeId",
      ];
      const newTouched = allFields.reduce(
        (acc, field) => ({ ...acc, [field]: true }),
        {}
      );
      setTouched(newTouched);

      // Mapear erros do Zod para o estado de erros
      const zodErrors = validationResult.error.errors.reduce((acc, error) => {
        const fieldName = error.path[0] as keyof PreCadastroFormData;
        acc[fieldName] = error.message;
        return acc;
      }, {} as Partial<Record<keyof PreCadastroFormData, string>>);
      setErrors(zodErrors);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const user = await getCurrentUser();

      // Verificar se CRM já existe

      // Buscar por CRM
      const existingMedicosByCrm = await searchMedicosByCpfOrCrm(crm);
      if (existingMedicosByCrm.length > 0) {
        const existingMedico = existingMedicosByCrm[0];
        if (existingMedico.is_precadastro) {
          setError("Este CRM já está no pré-cadastro");
        } else {
          setError("Este CRM já está cadastrado no sistema");
        }
        return;
      }
      const currentCPFAlreadyExists = await supabase
        .from("medicos_precadastro")
        .select("cpf")
        .eq("cpf", cpf);

      if ((currentCPFAlreadyExists?.count ?? -1) > 0) {
        setError("CPF já existe no sistema!");

        return;
      }
      // Inserir pré-cadastro
      const { data, error } = await supabase
        .from("medicos_precadastro")
        .insert([
          {
            primeiro_nome: primeiroNome.trim(),
            sobrenome: sobrenome.trim(),
            crm: crm.trim(),
            estado: estado.trim(),
            cpf: cpf ? cpf : null, // Salvar CPF com pontos e traços
            email: email.trim() || null,
            telefone: telefone.replace(/\D/g, "") || null,
            especialidade_id: especialidadeId || null,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      onMedicoPreCadastrado?.(data.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao pré-cadastrar médico:", error);
      let errorMessage = "";
      if (error.code == 23505) {
        if (error.message.includes("medicos_precadastro_email_key")) {
          errorMessage = "Email já esta sendo utilizado!";
        }
        if (error.message.includes("medicos_precadastro_cpf_key")) {
          errorMessage = " CPF já está em uso!";
        }
      } else {
        errorMessage = "Erro ao pré-cadastrar médico";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-2">
          <DialogTitle>Pré-cadastrar médico</DialogTitle>
          <DialogDescription>
            O médico será adicionado ao seu corpo clínico. Mas, sem acesso ao
            aplicativo Revoluna. Você poderá convidá-lo a criar uma conta
            posteriormente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="primeiroNome">Primeiro Nome *</Label>
              <Input
                id="primeiroNome"
                value={primeiroNome}
                onChange={(e) =>
                  handleFieldChange("primeiroNome", e.target.value)
                }
                placeholder="Ex: João"
                className={
                  errors.primeiroNome && touched.primeiroNome
                    ? "border-red-500"
                    : ""
                }
              />
              <FieldError
                error={touched.primeiroNome ? errors.primeiroNome : ""}
              />
            </div>
            <div>
              <Label htmlFor="sobrenome">Sobrenome *</Label>
              <Input
                id="sobrenome"
                value={sobrenome}
                onChange={(e) => handleFieldChange("sobrenome", e.target.value)}
                placeholder="Ex: Silva Santos"
                className={
                  errors.sobrenome && touched.sobrenome ? "border-red-500" : ""
                }
              />
              <FieldError error={touched.sobrenome ? errors.sobrenome : ""} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="crm">CRM *</Label>
              <Input
                id="crm"
                value={crm}
                onChange={(e) => {
                  handleFieldChange("crm", e.target.value);
                }}
                placeholder="Ex: 12345"
                maxLength={6}
                className={errors.crm && touched.crm ? "border-red-500" : ""}
              />
              <FieldError error={touched.crm ? errors.crm : ""} />
            </div>
            <div>
              <Label htmlFor="estado">Estado CRM *</Label>
              <Select
                value={estado}
                onValueChange={(value) => handleFieldChange("estado", value)}
              >
                <SelectTrigger
                  className={
                    errors.estado && touched.estado ? "border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASILEIROS.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError error={touched.estado ? errors.estado : ""} />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => handleFieldChange("cpf", e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
                className={errors.cpf && touched.cpf ? "border-red-500" : ""}
              />
              <FieldError error={touched.cpf ? errors.cpf : ""} />
            </div>
          </div>

          <div>
            <Label htmlFor="especialidade">Especialidade *</Label>
            <Select
              value={especialidadeId}
              onValueChange={(value) =>
                handleFieldChange("especialidadeId", value)
              }
            >
              <SelectTrigger
                className={
                  errors.especialidadeId && touched.especialidadeId
                    ? "border-red-500"
                    : ""
                }
              >
                <SelectValue placeholder="Selecione a especialidade" />
              </SelectTrigger>
              <SelectContent>
                {especialidades.map((esp) => (
                  <SelectItem key={esp.id} value={esp.id}>
                    {esp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              error={touched.especialidadeId ? errors.especialidadeId : ""}
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="medico@exemplo.com"
              className={errors.email && touched.email ? "border-red-500" : ""}
            />
            <FieldError error={touched.email ? errors.email : ""} />
          </div>

          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => handleFieldChange("telefone", e.target.value)}
              placeholder="(11) 99999-9999"
              maxLength={15}
              className={
                errors.telefone && touched.telefone ? "border-red-500" : ""
              }
            />
            <FieldError error={touched.telefone ? errors.telefone : ""} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !isFormValid()}>
            {loading ? "Salvando..." : "Pré-cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

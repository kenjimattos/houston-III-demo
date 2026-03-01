"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface BankingData {
  razaoSocial?: string
  cnpj?: string
  bancoAgencia?: string
  bancoDigito?: string
  bancoConta?: string
  bancoPix?: string
}

interface EditBankingDataModalProps {
  isOpen: boolean
  onClose: () => void
  doctorName: string
  doctorId: string
  isPrecadastro: boolean
  initialData: BankingData
  onSave: (data: BankingData) => Promise<boolean>
}

export function EditBankingDataModal({
  isOpen,
  onClose,
  doctorName,
  doctorId,
  isPrecadastro,
  initialData,
  onSave,
}: EditBankingDataModalProps) {
  const [formData, setFormData] = useState<BankingData>(initialData)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const success = await onSave(formData)
      if (success) {
        toast.success("Dados bancários salvos com sucesso!")
        onClose()
      } else {
        toast.error("Erro ao salvar dados bancários")
      }
    } catch (error) {
      console.error("Erro ao salvar dados bancários:", error)
      toast.error("Erro ao salvar dados bancários")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof BankingData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              Editar Dados Bancários - {doctorName}
              {!isPrecadastro && (
                <Badge className="text-[10px] px-1.5 py-0">cadastrado</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input
                id="razaoSocial"
                value={formData.razaoSocial || ''}
                onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
                placeholder="Nome da empresa/pessoa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj || ''}
                onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bancoAgencia">Agência</Label>
              <Input
                id="bancoAgencia"
                value={formData.bancoAgencia || ''}
                onChange={(e) => handleInputChange('bancoAgencia', e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bancoConta">Número da Conta</Label>
              <Input
                id="bancoConta"
                value={formData.bancoConta || ''}
                onChange={(e) => handleInputChange('bancoConta', e.target.value.replace(/\D/g, ''))}
                placeholder="00000000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bancoDigito">Dígito da Conta</Label>
              <Input
                id="bancoDigito"
                value={formData.bancoDigito || ''}
                onChange={(e) => handleInputChange('bancoDigito', e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bancoPix">Chave PIX</Label>
            <Input
              id="bancoPix"
              value={formData.bancoPix || ''}
              onChange={(e) => handleInputChange('bancoPix', e.target.value)}
              placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
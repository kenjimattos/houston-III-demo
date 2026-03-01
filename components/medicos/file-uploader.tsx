"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, FileText, FileImage, File } from "lucide-react"
import { cn } from "@/lib/utils"

const TIPOS_DOCUMENTOS = [
  { value: "cnh", label: "CNH" },
  { value: "rg", label: "RG" },
  { value: "crm", label: "CRM" },
  { value: "rqe", label: "RQE" },
  { value: "diploma", label: "Diploma" },
  { value: "comprovante_residencia", label: "Comprovante de residência" },
  { value: "contrato", label: "Contrato" },
  { value: "procuracao", label: "Procuração" },
  { value: "certidoes", label: "Certidões" },
  { value: "fotos", label: "Fotos" },
  { value: "curriculo", label: "Currículo" },
  { value: "outros", label: "Outros" },
]

interface FileUploaderProps {
  onUpload: (file: File, type: string) => Promise<void>
  uploading: boolean
}

export function FileUploader({ onUpload, uploading }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (selectedFile && documentType) {
      await onUpload(selectedFile, documentType)
      setSelectedFile(null)
      setDocumentType("")
    }
  }

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-10 w-10 text-gray-400" />

    const fileType = selectedFile.type

    if (fileType.includes("pdf")) {
      return <FileText className="h-10 w-10 text-red-500" />
    } else if (fileType.includes("image")) {
      return <FileImage className="h-10 w-10 text-blue-500" />
    } else {
      return <File className="h-10 w-10 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="document-type">Tipo de Documento</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Selecione o tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTOS.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50",
          selectedFile && "border-green-500 bg-green-50",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          {getFileIcon()}

          {selectedFile ? (
            <>
              <p className="text-sm font-normal">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-normal">Arraste e solte um arquivo ou clique para selecionar</p>
              <p className="text-xs text-gray-500">Suporta PDF, JPG, PNG e DOC (máx. 10MB)</p>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !documentType || uploading}
          className="w-full md:w-auto"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Documento
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

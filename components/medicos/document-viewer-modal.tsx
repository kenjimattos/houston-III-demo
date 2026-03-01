"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/services/supabaseClient"
import { format } from "date-fns"
import { Trash2, Upload } from "lucide-react"
import Image from "next/image"

interface DocumentoMedico {
  nome: string
  url: string
  tipo: string
  uploadedAt: string
  path: string
}

interface DocumentViewerModalProps {
  open: boolean
  onClose: () => void
  documentos: DocumentoMedico[]
  onDelete?: (doc: DocumentoMedico) => void
  onUpload?: (file: File) => Promise<void>
  uploading?: boolean
  canDelete?: boolean
}

export function DocumentViewerModal({ open, onClose, documentos, onDelete, onUpload, uploading = false, canDelete = true }: DocumentViewerModalProps) {
  const [selected, setSelected] = useState<DocumentoMedico | null>(null)
  const [signedUrl, setSignedUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && documentos.length > 0) {
      setSelected(documentos[0]) // mais recente
    } else {
      setSelected(null)
    }
  }, [open, documentos])

  useEffect(() => {
    async function fetchSignedUrl() {
      if (!selected) return
      setLoading(true)
      try {
        const supabase = getSupabaseClient()
        const path = selected.path
        const { data, error } = await supabase.storage.from("carteira-digital").createSignedUrl(path, 120)
        if (error) throw error
        setSignedUrl(data.signedUrl)
      } catch (e) {
        setSignedUrl("")
      } finally {
        setLoading(false)
      }
    }
    if (selected) fetchSignedUrl()
    else setSignedUrl("")
  }, [selected])

  if (!selected) return null

  const ext = selected.nome.split(".").pop()?.toLowerCase() || ""
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)
  const isPDF = ext === "pdf"

  const handleUploadClick = () => {
    if (!onUpload || uploading) return
    
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onUpload(file)
      }
    }
    input.click()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Visualizar Documento</DialogTitle>
        </DialogHeader>
        <div className="mb-2 font-normal flex items-center gap-2">
          {selected.nome}
          {canDelete && onDelete && (
            <Button size="icon" variant="ghost" onClick={() => onDelete(selected)} title="Excluir versão atual">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="mb-2 text-xs text-muted-foreground">Enviado em {format(new Date(selected.uploadedAt), "dd/MM/yyyy HH:mm")}</div>
        {loading ? (
          <div className="text-center py-8">Carregando documento...</div>
        ) : signedUrl ? (
          isImage ? (
            <div className="relative max-h-[60vh] mx-auto rounded shadow overflow-hidden">
              <Image 
                src={signedUrl} 
                alt={selected.nome} 
                width={800}
                height={600}
                className="object-contain"
                style={{ maxHeight: '60vh', width: 'auto' }}
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={signedUrl}
              title={selected.nome}
              className="w-full h-[60vh] border rounded"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <span>Formato não suportado para visualização direta.</span>
              <Button asChild>
                <a href={signedUrl} target="_blank" rel="noopener noreferrer" download={selected.nome}>
                  Baixar documento
                </a>
              </Button>
            </div>
          )
        ) : (
          <div className="text-center text-destructive">Não foi possível carregar o documento.</div>
        )}
        {documentos.length > 1 && (
          <div className="mt-6">
            <div className="font-normal mb-2">Versões anteriores</div>
            <ul className="space-y-2">
              {documentos.slice(1).map((doc, idx) => (
                <li key={doc.path} className="flex items-center justify-between gap-2 border rounded px-2 py-1 bg-muted/50">
                  <div>
                    <button
                      className="text-primary underline text-sm mr-2"
                      onClick={() => setSelected(doc)}
                    >
                      {doc.nome}
                    </button>
                    <span className="text-xs text-muted-foreground">{format(new Date(doc.uploadedAt), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                  {canDelete && onDelete && (
                    <Button size="icon" variant="ghost" onClick={() => onDelete(doc)} title="Excluir versão">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Rodapé com botão de upload */}
        {onUpload && (
          <div className="border-t pt-4 mt-6">
            <Button 
              onClick={handleUploadClick}
              disabled={uploading}
              className="w-full"
              variant="outline"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Enviando nova versão...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Nova Versão
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 
"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText } from "lucide-react"

interface ExportButtonProps {
  onExport: (format: "pdf" | "excel") => void
}

export function ExportButton({ onExport }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("pdf")} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" /> Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("excel")} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" /> Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

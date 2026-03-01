"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Edit } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PayrollData, Doctor } from "@/services/relatoriosService"
import { updateDoctorBankingData } from "@/services/relatoriosService"
import { formatCurrency } from "@/lib/utils"
import { EditBankingDataModal } from "./edit-banking-data-modal"

interface PayrollReportProps {
  data: PayrollData[]
  onDataUpdate?: () => void
}

export function PayrollReport({ data, onDataUpdate }: PayrollReportProps) {
  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({})
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  // Função para alternar a expansão de um médico
  const toggleExpand = (doctorId: string) => {
    setExpandedDoctors((prev) => ({
      ...prev,
      [doctorId]: !prev[doctorId],
    }))
  }

  // Verificar se um médico está expandido
  const isExpanded = (doctorId: string) => !!expandedDoctors[doctorId]

  // Função para abrir modal de edição de dados bancários
  const handleEditBankingData = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setEditModalOpen(true)
  }

  // Função para salvar dados bancários
  const handleSaveBankingData = async (bankingData: {
    razaoSocial?: string
    cnpj?: string
    bancoAgencia?: string
    bancoDigito?: string
    bancoConta?: string
    bancoPix?: string
  }) => {
    if (!selectedDoctor) return false

    const success = await updateDoctorBankingData(
      selectedDoctor.id,
      selectedDoctor.isPrecadastro || false,
      bankingData
    )

    if (success && onDataUpdate) {
      onDataUpdate()
    }

    return success
  }

  // Função para formatar timestamp de check-in/check-out
  const formatCheckinTime = (timestamp?: string) => {
    if (!timestamp) return "-"
    try {
      const date = new Date(timestamp)
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
    } catch {
      return "-"
    }
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Nenhum dado encontrado para o período selecionado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Médico</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>CRM</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead className="text-center">Plantões</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <React.Fragment key={item.doctor.id}>
              <TableRow className="hover:bg-muted/50">
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleExpand(item.doctor.id)}>
                    {isExpanded(item.doctor.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-normal">
                  <div className="flex items-center gap-2">
                    {item.doctor.name}
                    {!item.doctor.isPrecadastro && (
                      <Badge className="text-[10px] px-1.5 py-0">cadastrado</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{item.doctor.cpf}</TableCell>
                <TableCell>{item.doctor.crm}</TableCell>
                <TableCell>{item.doctor.specialty}</TableCell>
                <TableCell className="text-center">{item.jobs.length}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalValue)}</TableCell>
              </TableRow>

              {/* Detalhes dos plantões quando expandido */}
              {isExpanded(item.doctor.id) && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={7} className="p-0">
                    <div className="px-4 py-2">
                      {/* Dados bancários do médico */}
                      <div className="mb-4 p-3 bg-white rounded-md border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Dados Bancários:</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBankingData(item.doctor)}
                            className="h-7 px-2 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {item.doctor.razaoSocial && (
                            <div>
                              <span className="text-muted-foreground">Razão Social:</span>
                              <div className="font-medium">{item.doctor.razaoSocial}</div>
                            </div>
                          )}
                          {item.doctor.cnpj && (
                            <div>
                              <span className="text-muted-foreground">CNPJ:</span>
                              <div className="font-medium">{item.doctor.cnpj}</div>
                            </div>
                          )}
                          {item.doctor.bancoAgencia && (
                            <div>
                              <span className="text-muted-foreground">Agência:</span>
                              <div className="font-medium">{item.doctor.bancoAgencia}</div>
                            </div>
                          )}
                          {item.doctor.bancoConta && (
                            <div>
                              <span className="text-muted-foreground">Conta:</span>
                              <div className="font-medium">
                                {item.doctor.bancoConta}{item.doctor.bancoDigito && `-${item.doctor.bancoDigito}`}
                              </div>
                            </div>
                          )}
                          {item.doctor.bancoPix && (
                            <div>
                              <span className="text-muted-foreground">Chave PIX:</span>
                              <div className="font-medium">{item.doctor.bancoPix}</div>
                            </div>
                          )}
                        </div>
                        {!item.doctor.bancoAgencia && !item.doctor.bancoConta && !item.doctor.bancoPix && !item.doctor.razaoSocial && !item.doctor.cnpj && (
                          <div className="text-sm text-muted-foreground">Dados bancários não informados</div>
                        )}
                      </div>
                      
                      <h4 className="text-sm font-normal mb-2">Plantões realizados:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data do Plantão</TableHead>
                            <TableHead>Data de Aprovação</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Horário</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Check-out</TableHead>
                            <TableHead>Hospital</TableHead>
                            <TableHead>Setor</TableHead>
                            <TableHead>Contratação</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {item.jobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell>
                                {job.date ? format(new Date(job.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {job.dataAprovacao ? format(new Date(job.dataAprovacao), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                              </TableCell>
                              <TableCell>{job.periodo}</TableCell>
                              <TableCell>
                                {job.start.split('T')[1]} - {job.end.split('T')[1]}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatCheckinTime(job.checkinTime)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatCheckinTime(job.checkoutTime)}
                              </TableCell>
                              <TableCell>{job.hospitalName}</TableCell>
                              <TableCell>{job.sectorName}</TableCell>
                              <TableCell>{job.paymentMethod || '-'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(job.value)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Modal de edição de dados bancários */}
      {selectedDoctor && (
        <EditBankingDataModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedDoctor(null)
          }}
          doctorName={selectedDoctor.name}
          doctorId={selectedDoctor.id}
          isPrecadastro={selectedDoctor.isPrecadastro || false}
          initialData={{
            razaoSocial: selectedDoctor.razaoSocial,
            cnpj: selectedDoctor.cnpj,
            bancoAgencia: selectedDoctor.bancoAgencia,
            bancoDigito: selectedDoctor.bancoDigito,
            bancoConta: selectedDoctor.bancoConta,
            bancoPix: selectedDoctor.bancoPix,
          }}
          onSave={handleSaveBankingData}
        />
      )}
    </div>
  )
}

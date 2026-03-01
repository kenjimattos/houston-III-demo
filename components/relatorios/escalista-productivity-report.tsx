"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type EscalistaProductivity } from "@/services/relatoriosService"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface EscalistaProductivityReportProps {
  data: EscalistaProductivity[]
}

export function EscalistaProductivityReport({ data }: EscalistaProductivityReportProps) {
  const [expandedEscalistas, setExpandedEscalistas] = useState<Record<string, boolean>>({})

  // Função para alternar a expansão de um escalista
  const toggleExpand = (escalistaId: string) => {
    setExpandedEscalistas((prev) => ({
      ...prev,
      [escalistaId]: !prev[escalistaId],
    }))
  }

  // Verificar se um escalista está expandido
  const isExpanded = (escalistaId: string) => !!expandedEscalistas[escalistaId]

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    try {
      return format(new Date(dateTimeString), "dd/MM/yyyy HH:mm", { locale: ptBR })
    } catch {
      return dateTimeString
    }
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado de produtividade encontrado para o período selecionado.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Escalista</TableHead>
            <TableHead className="text-center">Total Aprovações</TableHead>
            <TableHead className="text-center">Média por Aprovação</TableHead>
            <TableHead>Período de Atividade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((escalista, index) => {
            const escalistaId = escalista.escalista_nome
            const escalistaNome = escalista.escalista_nome || "Escalista desconhecido"

            // Calcular estatísticas do escalista
            const primeiraCandidatura = escalista.candidaturas.reduce((min, c) =>
              c.vaga_data < min ? c.vaga_data : min, escalista.candidaturas[0]?.vaga_data || ""
            )
            const ultimaCandidatura = escalista.candidaturas.reduce((max, c) =>
              c.vaga_data > max ? c.vaga_data : max, escalista.candidaturas[0]?.vaga_data || ""
            )

            return (
              <React.Fragment key={index}>
                {/* Linha principal do escalista */}
                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(escalistaId)}>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded(escalistaId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{escalistaNome}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{escalista.total_candidaturas_aprovadas}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {escalista.candidaturas.length > 0
                      ? Math.round(escalista.candidaturas.reduce((sum, c) => sum + c.total_candidaturas, 0) / escalista.candidaturas.length)
                      : 0
                    }
                  </TableCell>
                  <TableCell className="text-sm">
                    {primeiraCandidatura && ultimaCandidatura && (
                      <>
                        {formatDate(primeiraCandidatura)} - {formatDate(ultimaCandidatura)}
                      </>
                    )}
                  </TableCell>
                </TableRow>

                {/* Linhas expandidas com detalhes das aprovações */}
                {isExpanded(escalistaId) && escalista.candidaturas.map((candidatura, candidaturaIndex) => (
                  <TableRow key={`${index}-${candidaturaIndex}`} className="bg-muted/30">
                    <TableCell></TableCell>
                    <TableCell colSpan={4}>
                      <div className="pl-4 py-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-muted-foreground">Data da Vaga</div>
                            <div>{formatDate(candidatura.vaga_data)}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Aprovação</div>
                            <div>{formatDateTime(candidatura.candidatura_updatedat || candidatura.candidatura_createdate)}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Médico</div>
                            <div>{candidatura.medico_nome}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Hospital</div>
                            <div>{candidatura.hospital_nome}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Especialidade</div>
                            <div>{candidatura.especialidade_nome}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Setor</div>
                            <div>{candidatura.setor_nome}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Horário</div>
                            <div>{candidatura.vaga_horainicio} - {candidatura.vaga_horafim}</div>
                          </div>
                          <div>
                            <div className="font-medium text-muted-foreground">Total Candidaturas</div>
                            <div>
                              <Badge variant="outline">{candidatura.total_candidaturas}</Badge>
                            </div>
                          </div>
                        </div>
                        {candidatura.grade_nome && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium text-muted-foreground">Grade:</span> {candidatura.grade_nome}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
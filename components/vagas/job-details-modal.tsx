"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Clock, DollarSign, MapPin, Users, User } from "lucide-react"

interface JobDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: {
    id: string
    hospital: string
    date: string
    sector: string
    specialty: string
    startTime: string
    endTime: string
    value: number
    paymentDate: string
    periodo: string
    grupoNome?: string
    escalistaNome?: string
  }
}

export function JobDetailsModal({ open, onOpenChange, job }: JobDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-normal">Detalhes da Vaga</DialogTitle>
          <DialogDescription>Informações sobre a vaga de plantão.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-normal text-md">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Hospital:</span>
                  <span className="ml-2">{job.hospital}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-normal">Setor:</span>
                  <span className="ml-2">{job.sector}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-normal">Especialidade:</span>
                  <span className="ml-2">{job.specialty}</span>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Data do Plantão:</span>
                  <span className="ml-2">{job.date}</span>
                </div>
                <div className="flex items-center text-sm">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Período:</span>
                  <span className="ml-2">{job.periodo || '-'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Horário:</span>
                  <span className="ml-2">
                    {job.startTime} - {job.endTime}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col space-y-2">
                <div className="flex items-center text-sm">
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Valor:</span>
                  <span className="ml-2">{formatCurrency(job.value)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-normal">Data de Pagamento:</span>
                  <span className="ml-2">{job.paymentDate}</span>
                </div>
              </div>

              {(job.grupoNome || job.escalistaNome) && (
                <>
                  <Separator />
                  
                  <div className="flex flex-col space-y-2">
                    {job.grupoNome && (
                      <div className="flex items-center text-sm">
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="font-normal">Grupo:</span>
                        <span className="ml-2">{job.grupoNome}</span>
                      </div>
                    )}
                    {job.escalistaNome && (
                      <div className="flex items-center text-sm">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="font-normal">Escalista:</span>
                        <span className="ml-2">{job.escalistaNome}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 